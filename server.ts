/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { exec } from 'child_process';

// Load environment variables
dotenv.config();

let envAiClient: GoogleGenAI | null = null;
const AI_MODEL_FALLBACKS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
].filter((model, index, models) => Boolean(model) && models.indexOf(model) === index);

const RETRYABLE_AI_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractAiErrorInfo(error: any) {
  const rawMessage = String(error?.message || error || '');
  const status = Number(error?.status || error?.code || error?.response?.status || 0);
  let parsedStatus = status;
  let parsedReason = String(error?.statusText || error?.status || '');
  let parsedMessage = rawMessage;

  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart));
      parsedStatus = Number(parsed?.error?.code || parsedStatus || 0);
      parsedReason = String(parsed?.error?.status || parsedReason || '');
      parsedMessage = String(parsed?.error?.message || parsedMessage);
    } catch {
      // Keep the SDK message if it is not valid JSON.
    }
  }

  return {
    statusCode: parsedStatus,
    reason: parsedReason,
    message: parsedMessage,
    rawMessage,
  };
}

function isRetryableAiError(error: any) {
  const info = extractAiErrorInfo(error);
  return RETRYABLE_AI_STATUS_CODES.has(info.statusCode) || ['UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'INTERNAL'].includes(info.reason);
}

function toUserFacingAiError(error: any) {
  const info = extractAiErrorInfo(error);
  if (info.statusCode === 503 || info.reason === 'UNAVAILABLE') {
    return 'Gemini modeli şu anda yoğun veya geçici olarak ulaşılamıyor. Birkaç dakika sonra tekrar deneyin; uygulama mümkün olduğunda alternatif Gemini modellerini de denedi.';
  }
  if (info.statusCode === 429 || info.reason === 'RESOURCE_EXHAUSTED') {
    return 'Gemini kullanım limitine veya hız sınırına takıldınız. Biraz bekleyip tekrar deneyin ya da Google AI Studio limitlerinizi kontrol edin.';
  }
  if (info.statusCode === 400 || info.statusCode === 401 || info.statusCode === 403) {
    return 'Gemini API key kabul edilmedi veya bu proje için yetki yok. Anahtarı, faturalandırma/proje izinlerini ve Gemini API erişimini kontrol edin.';
  }
  return info.message || 'Gemini isteği tamamlanamadı.';
}

function getRequestApiKey(req?: any) {
  const headerKey = typeof req?.header === 'function' ? req.header('x-gemini-api-key') : null;
  const userKey = typeof headerKey === 'string' ? headerKey.trim() : '';
  return userKey || process.env.GEMINI_API_KEY || '';
}

function getAiStatus(apiKey = process.env.GEMINI_API_KEY || '') {
  const enabled = Boolean(apiKey);
  return {
    enabled,
    provider: enabled ? 'gemini' : 'none',
    source: enabled && apiKey === process.env.GEMINI_API_KEY ? 'environment' : enabled ? 'user' : 'none'
  };
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'velox-local',
      }
    }
  });
}

function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!apiKey) {
    throw new Error('AI kullanmak için Ayarlar bölümünden Gemini API anahtarı girin veya sunucuda GEMINI_API_KEY tanımlayın.');
  }

  if (apiKey === process.env.GEMINI_API_KEY) {
    if (!envAiClient) envAiClient = createGeminiClient(apiKey);
    return envAiClient;
  }

  return createGeminiClient(apiKey);
}

async function generateContentWithFallback(
  client: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;

  for (const model of AI_MODEL_FALLBACKS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        if (attempt > 1) {
          console.log(`[AI] Retrying model ${model}. Attempt ${attempt}/2`);
        }
        return await client.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
      } catch (error: any) {
        lastError = error;
        const info = extractAiErrorInfo(error);
        console.warn(`[AI Warning] Model ${model} failed. Status: ${info.statusCode || info.reason || 'unknown'}. Attempt ${attempt}/2`);

        if (!isRetryableAiError(error)) {
          throw new Error(toUserFacingAiError(error));
        }

        if (attempt < 2) {
          await wait(900);
        }
      }
    }
  }

  console.error('[AI Error] All Gemini models failed:', lastError?.message || lastError);
  throw new Error(toUserFacingAiError(lastError));
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/ai/status', (req, res) => {
    res.json(getAiStatus(getRequestApiKey(req)));
  });

  // 1. AI Summarize Route
  app.post(['/api/ai/summarize', '/api/gemini/summarize'], async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Geçersiz metin verisi.' });
      return;
    }

    try {
      const client = getGeminiClient(getRequestApiKey(req));
      console.log(`[AI] Summarize requested. Text length: ${text.length}`);

      const response = await generateContentWithFallback(client, {
        contents: `Aşağıdaki metni analiz et ve şu 3 alanı içeren Türkçe bir özet çıkar:
1. Ana Fikir (Kısa ve net bir cümle)
2. Önemli Noktalar (En fazla 5 adet can alıcı madde)
3. Özet (Metnin ana hatlarını açıklayan 2-3 cümlelik akıcı paragraf)

Metin:
${text.slice(0, 5000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mainIdea: {
                type: Type.STRING,
                description: 'Metnin ana fikri veya temel tezi (Tek cümle)'
              },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Metinden çıkarılan en önemli 3-5 nokta'
              },
              summary: {
                type: Type.STRING,
                description: 'Metnin 2-3 cümlelik sade ve akıcı Türkçe özeti'
              }
            },
            required: ['mainIdea', 'keyPoints', 'summary']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Yapay zekadan boş yanıt döndü.");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Summarize failed:', error);
      res.status(500).json({ error: error.message || 'Özet oluşturulurken hata meydan geldi.' });
    }
  });

  // 2. AI Analyze Difficulty Route
  app.post(['/api/ai/analyze-difficulty', '/api/gemini/analyze-difficulty'], async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Geçersiz metin verisi.' });
      return;
    }

    try {
      const client = getGeminiClient(getRequestApiKey(req));
      console.log(`[AI] Difficulty Analysis requested. Text length: ${text.length}`);

      const response = await generateContentWithFallback(client, {
        contents: `Aşağıdaki Türkçe veya yabancı dildeki metnin okuma zorluğunu analiz et.
Zorluk seviyesini (Kolay, Orta, Zor şeklinde), zorluk puanını (1-100 ölçeğinde), metinde geçen zor/tıbbi/sektörel/akademik 3-7 kelimeyi ayırt et ve neden bu düzeyde olduğunu açıklayan kısa bir değerlendirme metni yaz.

Metin:
${text.slice(0, 3000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: '1 ile 100 arasında zorluk puanı (1=Çok Basit, 100=İleri Seviye İngilizce/Akademik Türkçe)'
              },
              level: {
                type: Type.STRING,
                description: 'Okuma kolaylığı düzeyi. Sadece şu üçünden biri olmalı: "Kolay", "Orta", "Zor"'
              },
              complexWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Metinde geçen zor, az bilinen veya teknik kelimeler/kavramlar listesi'
              },
              description: {
                type: Type.STRING,
                description: 'Metnin neden bu seviyede olduğuna dair Türkçe açıklamalı 1-2 cümlelik değerlendirme'
              }
            },
            required: ['score', 'level', 'complexWords', 'description']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Yapay zekadan boş analiz döndü.");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Difficulty Analysis failed:', error);
      res.status(500).json({ error: error.message || 'Zorluk analizi yapılamadı.' });
    }
  });

  // 3. AI Define Word / Vocabulary Lookup Route
  app.post(['/api/ai/define-word', '/api/gemini/define-word'], async (req, res) => {
    const { word, context } = req.body;
    if (!word || typeof word !== 'string') {
      res.status(400).json({ error: 'Geçersiz aranan kelime.' });
      return;
    }

    try {
      const client = getGeminiClient(getRequestApiKey(req));
      console.log(`[AI] Define requested for: "${word}" in Context: "${context || 'No context'}"`);

      const response = await generateContentWithFallback(client, {
        contents: `Aşağıdaki kelimenin anlamını${context ? ` (verilen bağlam dikkate alınarak)` : ''} Türkçe olarak açıkla. Eş anlamlılarını ve kelimenin yer aldığı 2 tane örnek cümle yaz.

Aranan Kelime: "${word}"
${context ? `Bağlam / Cümle: "${context}"` : ''}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              definition: {
                type: Type.STRING,
                description: 'Kelimenin net, sade ve anlaşılır Türkçe sözlük anlamı'
              },
              synonyms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Eş anlamlı olan veya benzer anlama gelen 2-4 kelime'
              },
              examples: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Kelimenin kullanımını gösteren 2 adet örnek Türkçe cümle'
              }
            },
            required: ['word', 'definition', 'synonyms', 'examples']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Kelime anlamı üretilemedi.");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Word Definition failed:', error);
      res.status(500).json({ error: error.message || 'Sözlük anlamı çıkarılamadı.' });
    }
  });

  // 3.5 Active Recall & Comprehension Quiz Route
  app.post(['/api/ai/comprehension', '/api/gemini/comprehension'], async (req, res) => {
    const { text, title, questionCount = 3, difficulty = 'Orta' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Geçersiz metin verisi.' });
      return;
    }

    try {
      const client = getGeminiClient(getRequestApiKey(req));
      console.log(`[AI] Comprehension Quiz requested for: "${title || 'Untitled'}" (Questions: ${questionCount}, Difficulty: ${difficulty})`);

      const response = await generateContentWithFallback(client, {
        contents: `Aşağıdaki metinden ${questionCount} adet çoktan seçmeli (A, B, C, D) Türkçe kavrama sorusu oluştur. Okuduğunu anlama seviyesini test etsin.
Sınavın zorluk derecesi "${difficulty}" olsun. Metnin tahmini kavrama zorluk derecesini (1-100 arasında) belirle.

Metin Başlığı: "${title || 'Metin'}"
Metin İçeriği:
${text.slice(0, 4000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: 'Sorunun metni' },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '4 adet cevap şıkkı (A, B, C, D)'
                    },
                    correctOptionIndex: { type: Type.INTEGER, description: 'Doğru şıkkın sıfır tabanlı indeksi (0-3)' },
                    explanation: { type: Type.STRING, description: 'Neden bu şıkkın doğru olduğuna dair kısa açıklama' }
                  },
                  required: ['question', 'options', 'correctOptionIndex', 'explanation']
                }
              },
              difficultyRating: {
                type: Type.INTEGER,
                description: 'Metnin anlama ve kavrama zorluk derecesi (1-100)'
              }
            },
            required: ['questions', 'difficultyRating']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Soru üretilemedi.");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Comprehension Quiz generation failed:', error);
      res.status(500).json({ error: error.message || 'Kavrama testi üretilemedi.' });
    }
  });

  // 3.6 Knowledge Transfer Insights Route
  app.post(['/api/ai/insights', '/api/gemini/insights'], async (req, res) => {
    const { text, title } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Geçersiz metin verisi.' });
      return;
    }

    try {
      const client = getGeminiClient(getRequestApiKey(req));
      console.log(`[AI] Knowledge Insights requested for: "${title || 'Untitled'}"`);

      const response = await generateContentWithFallback(client, {
        contents: `Aşağıdaki metinden 3 adet kilit öngörü (insight), 1 adet günlük hayatta doğrudan uygulanabilir eylemsel alışkanlık/fikir (Actionable Idea) ve metinle uyuşan 1 adet disiplinlerarası zihinsel model (Mental Model) çıkar. Çıktıyı tamamen Türkçe olarak ver.

Metin Başlığı: "${title || 'Metin'}"
Metin İçeriği:
${text.slice(0, 4000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keyInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Metinden çıkarılan en önemli 3 adet kilit felsefi veya teknik bulgu (insight)'
              },
              actionableIdea: {
                type: Type.STRING,
                description: 'Kullanıcının bugün kendi hayatında veya işinde uygulayabileceği somut bir aksiyon/alışkanlık adımı'
              },
              mentalModel: {
                type: Type.STRING,
                description: 'Metindeki dinamikleri açıklayan bir zihinsel model (Örn. Pareto İlkesi, Ebbinghaus Unutma Eğrisi, Sunk Cost Fallacy vb.)'
              }
            },
            required: ['keyInsights', 'actionableIdea', 'mentalModel']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Öngörüler üretilemedi.");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Insights failed:', error);
      res.status(500).json({ error: error.message || 'Uygulanabilir öngörüler çıkarılamadı.' });
    }
  });

  // 3.7 Flashcard Generation Route
  app.post(['/api/ai/flashcards', '/api/gemini/flashcards'], async (req, res) => {
    const { text, title, count = 5, topic = 'Genel' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Geçersiz metin verisi.' });
      return;
    }

    try {
      const client = getGeminiClient(getRequestApiKey(req));
      console.log(`[AI] Flashcards requested for: "${title || 'Untitled'}" (Count: ${count}, Topic: ${topic})`);

      const response = await generateContentWithFallback(client, {
        contents: `Aşağıdaki metinden ${count} adet öğretici bilgi kartı (flashcard) oluştur. 
Her kartın bir ön yüzü (soru/kavram) ve bir arka yüzü (cevap/açıklama) olmalıdır. 
Kartların odak konusu veya türü: "${topic}" olsun. Çıktı dilinin tamamen Türkçe olmasına dikkat et.

Metin Başlığı: "${title || 'Metin'}"
Metin İçeriği:
${text.slice(0, 4000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING, description: 'Bilgi kartının ön yüzü (Soru, kavram veya terim)' },
                    back: { type: Type.STRING, description: 'Bilgi kartının arka yüzü (Cevap, tanım veya detaylı açıklama)' }
                  },
                  required: ['front', 'back']
                }
              }
            },
            required: ['flashcards']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Bilgi kartları üretilemedi.");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Flashcards failed:', error);
      res.status(500).json({ error: error.message || 'Bilgi kartları üretilemedi.' });
    }
  });

  // 4. Extract text from URL
  app.post(['/api/content/extract-url', '/api/gemini/extract-url'], async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      res.status(400).json({ error: 'Geçersiz veya eksik web sitesi adresi (URL).' });
      return;
    }

    try {
      console.log(`[Scraper] Fetching URL: ${url}`);
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!fetchResponse.ok) {
        throw new Error(`Web sayfası yüklenemedi. HTTP Durum: ${fetchResponse.status}`);
      }

      const html = await fetchResponse.text();

      // Extract basic title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Web Sayfası İçeriği';

      // Clean HTML comments
      let cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');

      // Remove script, style, header, footer, nav, head, svg elements to keep pure content
      cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
      cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
      cleanHtml = cleanHtml.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ');
      cleanHtml = cleanHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');
      cleanHtml = cleanHtml.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ');
      cleanHtml = cleanHtml.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ');
      cleanHtml = cleanHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ');

      // Also clean forms, sidebars, inline metadata
      cleanHtml = cleanHtml.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ');

      // Replace HTML tags with space
      let text = cleanHtml.replace(/<[^>]+>/g, ' ');

      // Decode basic HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&uuml;/g, 'ü')
        .replace(/&ouml;/g, 'ö')
        .replace(/&ccedil;/g, 'ç')
        .replace(/&s_cedil;/g, 'ş')
        .replace(/&g_breve;/g, 'ğ')
        .replace(/&I_dot;/g, 'İ')
        .replace(/&Uuml;/g, 'Ü')
        .replace(/&Ouml;/g, 'Ö')
        .replace(/&Ccedil;/g, 'Ç')
        .replace(/&Scedil;/g, 'Ş')
        .replace(/&Gbreve;/g, 'Ğ');

      // Condense multiple spaces and empty lines
      text = text.replace(/[ \t]+/g, ' ');
      text = text.replace(/\n\s*\n+/g, '\n\n');
      text = text.trim();

      // If text is super long, keep the first 30,000 characters
      if (text.length > 30000) {
        text = text.slice(0, 30000) + '... (Metin uzunluğu nedeniyle kırpıldı)';
      }

      // If text is still empty, throw an error
      if (text.length < 50) {
        throw new Error('Web sayfasından anlamlı bir okuma metni çıkarılamadı. Sayfa korumalı olabilir ya da boş görünmektedir.');
      }

      res.json({ title, text });
    } catch (error: any) {
      console.error('[Scraper Error] Failed to extract from URL:', error);
      res.status(500).json({ error: error.message || 'Web sayfasından metin okunamadı.' });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Velox] Server listening on http://0.0.0.0:${PORT}`);
    
    // Automatically open in app mode when starting
    const url = `http://localhost:${PORT}`;
    if (process.platform === 'win32') {
      exec(`start msedge --app=${url}`, (err) => {
        if (err) {
          exec(`start chrome --app=${url}`, (err2) => {
            if (err2) {
              exec(`start ${url}`);
            }
          });
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`open -a "Google Chrome" --args --app=${url}`, (err) => {
        if (err) {
          exec(`open ${url}`);
        }
      });
    } else {
      exec(`xdg-open ${url}`);
    }
  });
}

startServer();
