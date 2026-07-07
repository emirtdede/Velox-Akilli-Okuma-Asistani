/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { exec } from 'child_process';

// Load environment variables
dotenv.config();

let envAiClient: GoogleGenAI | null = null;
const AI_MODEL_FALLBACKS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  'gemini-3.1-pro',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
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
  return info.message || 'Gemini isteği başarısız oldu.';
}

interface AiConfig {
  provider: string;
  apiKey: string;
  localUrl: string;
  model: string;
}

function getRequestAiConfig(req: any): AiConfig {
  const provider = String(req.header('x-ai-provider') || 'gemini').trim().toLowerCase();
  
  // Legacy support for x-gemini-api-key
  let apiKey = String(req.header('x-ai-api-key') || req.header('x-gemini-api-key') || '').trim();
  
  if (!apiKey) {
    if (provider === 'gemini') {
      apiKey = process.env.GEMINI_API_KEY || '';
    } else if (provider === 'openai') {
      apiKey = process.env.OPENAI_API_KEY || '';
    } else if (provider === 'claude') {
      apiKey = process.env.ANTHROPIC_API_KEY || '';
    }
  }

  const localUrl = String(req.header('x-ai-local-url') || process.env.LOCAL_AI_URL || 'http://localhost:11434').trim();
  const model = String(req.header('x-ai-model') || '').trim();

  return { provider, apiKey, localUrl, model };
}

function getAiStatus(config: AiConfig) {
  let enabled = false;
  if (config.provider === 'gemini' || config.provider === 'openai' || config.provider === 'claude') {
    enabled = Boolean(config.apiKey);
  } else if (config.provider === 'local') {
    enabled = Boolean(config.localUrl);
  }

  return {
    enabled,
    provider: config.provider,
    source: enabled ? 'user' : 'none'
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

function cleanAndParseJson(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
  }
  
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error('[JSON Parse Error] Raw text was:', text);
    throw new Error(`JSON ayrıştırma hatası: ${e.message}`);
  }
}

async function generateStructuredJson(
  config: AiConfig,
  prompt: string,
  schema: any
): Promise<any> {
  const { provider, apiKey, localUrl, model } = config;

  if (provider === 'gemini') {
    const client = getGeminiClient(apiKey);
    const modelsToTry = model ? [model, ...AI_MODEL_FALLBACKS] : AI_MODEL_FALLBACKS;
    
    let lastError: any = null;
    for (const currentModel of modelsToTry) {
      try {
        console.log(`[AI] Attempting Gemini content generation with model: ${currentModel}`);
        const response = await client.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema
          }
        });

        const text = response.text;
        if (!text) throw new Error("Gemini modelinden boş yanıt döndü.");
        return JSON.parse(text.trim());
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Warning] Gemini generation failed with model ${currentModel}:`, err.message || err);
      }
    }
    
    const friendlyMessage = toUserFacingAiError(lastError);
    throw new Error(friendlyMessage);
  }

  if (provider === 'openai') {
    if (!apiKey) {
      throw new Error("OpenAI API Key bulunamadı. Ayarlar kısmından ekleyin.");
    }
    const openaiModel = model || 'gpt-5.4-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: openaiModel,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for the Velox Speed Reading App. You must output ONLY a valid JSON object matching the requested schema. Schema: ${JSON.stringify(schema)}`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Hatası: ${errData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI'dan boş yanıt döndü.");
    return JSON.parse(text.trim());
  }

  if (provider === 'claude') {
    if (!apiKey) {
      throw new Error("Claude (Anthropic) API Key bulunamadı. Ayarlar kısmından ekleyin.");
    }
    const claudeModel = model || 'claude-sonnet-5';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object matching this schema, without any conversational prefix/suffix, markdown blocks (like \`\`\`json), or extra text:\n${JSON.stringify(schema)}`
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Claude API Hatası: ${errData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Claude'dan boş yanıt döndü.");
    return cleanAndParseJson(text);
  }

  if (provider === 'local') {
    const localModel = model || 'llama3';
    const cleanUrl = localUrl.replace(/\/$/, '');
    
    try {
      const response = await fetch(`${cleanUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: localModel,
          prompt: `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object matching this schema, without any conversational prefix/suffix, markdown blocks, or extra text:\n${JSON.stringify(schema)}`,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.1
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.response;
        if (!text) throw new Error("Lokal modelden boş yanıt döndü.");
        return cleanAndParseJson(text);
      }
    } catch (err: any) {
      console.warn('[AI Local] Native Ollama /api/generate failed, trying OpenAI-compatible /v1/chat/completions...', err.message);
    }

    const chatUrl = cleanUrl.endsWith('/v1') ? `${cleanUrl}/chat/completions` : `${cleanUrl}/v1/chat/completions`;
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: localModel,
        messages: [
          {
            role: 'system',
            content: `You must output ONLY a valid JSON object matching the requested schema. Schema: ${JSON.stringify(schema)}`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Lokal model bağlantı hatası (${response.status}): ${response.statusText}. Lütfen yerel yapay zeka uygulamanızın (örn. Ollama) çalıştığından ve modelin yüklü olduğundan emin olun.`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Lokal modelden boş yanıt döndü.");
    return cleanAndParseJson(text);
  }

  throw new Error(`Bilinmeyen yapay zeka sağlayıcısı: ${provider}`);
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
    res.json(getAiStatus(getRequestAiConfig(req)));
  });

  // 1. AI Summarize Route
  app.post(['/api/ai/summarize', '/api/gemini/summarize'], async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Geçersiz metin verisi.' });
      return;
    }

    try {
      const config = getRequestAiConfig(req);
      const lang = req.headers['x-ai-lang'] || 'tr';
      console.log(`[AI] Summarize requested via ${config.provider}. Text length: ${text.length}. Lang: ${lang}`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          mainIdea: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Metnin ana fikri veya temel tezi (Tek cümle)' : 'Main idea or core thesis of the text (Single sentence)'
          },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: lang === 'tr' ? 'Metinden çıkarılan en önemli 3-5 nokta' : 'Top 3-5 key takeaways extracted from the text'
          },
          summary: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Metnin 2-3 cümlelik sade ve akıcı Türkçe özeti' : 'A simple and fluent summary of the text in 2-3 sentences'
          }
        },
        required: ['mainIdea', 'keyPoints', 'summary']
      };

      const prompt = lang === 'tr'
        ? `Aşağıdaki metni analiz et ve şu 3 alanı içeren Türkçe bir özet çıkar:
1. Ana Fikir (Kısa ve net bir cümle)
2. Önemli Noktalar (En fazla 5 adet can alıcı madde)
3. Özet (Metnin ana hatlarını açıklayan 2-3 cümlelik akıcı paragraf)

Metin:
${text.slice(0, 5000)}`
        : `Analyze the following text and extract a summary containing these 3 fields in English:
1. Main Idea (A short and clear sentence)
2. Key Points (Maximum of 5 crucial bullet points)
3. Summary (A fluent paragraph of 2-3 sentences explaining the main outlines of the text)

Text:
${text.slice(0, 5000)}`;

      const parsed = await generateStructuredJson(config, prompt, schema);
      res.json(parsed);
    } catch (error: any) {
      console.error('[AI Error] Summarize failed:', error);
      res.status(500).json({ error: error.message || 'Özet oluşturulurken hata meydana geldi.' });
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
      const config = getRequestAiConfig(req);
      const lang = req.headers['x-ai-lang'] || 'tr';
      console.log(`[AI] Difficulty Analysis requested via ${config.provider}. Text length: ${text.length}. Lang: ${lang}`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          score: {
            type: Type.INTEGER,
            description: lang === 'tr' ? '1 ile 100 arasında zorluk puanı (1=Çok Basit, 100=İleri Seviye İngilizce/Akademik Türkçe)' : 'Difficulty score between 1 and 100 (1=Very Simple, 100=Advanced/Academic)'
          },
          level: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Okuma kolaylığı düzeyi. Sadece şu üçünden biri olmalı: "Kolay", "Orta", "Zor"' : 'Reading level. Must be exactly one of: "Easy", "Medium", "Hard"'
          },
          complexWords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: lang === 'tr' ? 'Metinde geçen zor, az bilinen veya teknik kelimeler/kavramlar listesi' : 'List of difficult, rare or technical words/concepts found in the text'
          },
          description: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Metnin neden bu seviyede olduğuna dair Türkçe açıklamalı 1-2 cümlelik değerlendirme' : 'A 1-2 sentence evaluation in English explaining why the text is at this level'
          }
        },
        required: ['score', 'level', 'complexWords', 'description']
      };

      const prompt = lang === 'tr'
        ? `Aşağıdaki Türkçe veya yabancı dildeki metnin okuma zorluğunu analiz et.
Zorluk seviyesini (Kolay, Orta, Zor şeklinde), zorluk puanını (1-100 ölçeğinde), metinde geçen zor/tıbbi/sektörel/akademik 3-7 kelimeyi ayırt et ve neden bu düzeyde olduğunu açıklayan kısa bir değerlendirme metni yaz.

Metin:
${text.slice(0, 3000)}`
        : `Analyze the reading difficulty of the following text in English or other languages.
Determine the difficulty level (must be exactly one of: Easy, Medium, Hard), difficulty score (on a 1-100 scale), identify 3-7 difficult/medical/industry/academic words, and write a short evaluation text in English explaining why it is at this level.

Metin:
${text.slice(0, 3000)}`;

      const parsed = await generateStructuredJson(config, prompt, schema);
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
      const config = getRequestAiConfig(req);
      const lang = req.headers['x-ai-lang'] || 'tr';
      console.log(`[AI] Define requested via ${config.provider} for: "${word}" in Context: "${context || 'No context'}". Lang: ${lang}`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          definition: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Kelimenin net, sade ve anlaşılır Türkçe sözlük anlamı' : 'Clear, simple and understandable dictionary definition of the word in English'
          },
          synonyms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: lang === 'tr' ? 'Eş anlamlı olan veya benzer anlama gelen 2-4 kelime' : '2-4 synonyms or closely related words in English'
          },
          examples: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: lang === 'tr' ? 'Kelimenin kullanımını gösteren 2 adet örnek Türkçe cümle' : '2 sample sentences showing the usage of the word in English'
          }
        },
        required: ['word', 'definition', 'synonyms', 'examples']
      };

      const prompt = lang === 'tr'
        ? `Aşağıdaki kelimenin anlamını${context ? ` (verilen bağlam dikkate alınarak)` : ''} Türkçe olarak açıkla. Eş anlamlılarını ve kelimenin yer aldığı 2 tane örnek cümle yaz.

Aranan Kelime: "${word}"
${context ? `Bağlam / Cümle: "${context}"` : ''}`
        : `Explain the meaning of the following word${context ? ` (taking into account the given context)` : ''} in English. Write its synonyms and 2 sample sentences in English where the word is used.

Search Word: "${word}"
${context ? `Context / Sentence: "${context}"` : ''}`;

      const parsed = await generateStructuredJson(config, prompt, schema);
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
      const config = getRequestAiConfig(req);
      const lang = req.headers['x-ai-lang'] || 'tr';
      console.log(`[AI] Comprehension Quiz requested via ${config.provider} for: "${title || 'Untitled'}" (Questions: ${questionCount}, Difficulty: ${difficulty}). Lang: ${lang}`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: lang === 'tr' ? 'Sorunun metni' : 'The question text' },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: lang === 'tr' ? '4 adet cevap şıkkı (A, B, C, D)' : '4 choice options (A, B, C, D)'
                },
                correctOptionIndex: { type: Type.INTEGER, description: lang === 'tr' ? 'Doğru şıkkın sıfır tabanlı indeksi (0-3)' : 'Zero-based index of the correct option (0-3)' },
                explanation: { type: Type.STRING, description: lang === 'tr' ? 'Neden bu şıkkın doğru olduğuna dair kısa açıklama' : 'A brief explanation of why this option is correct' }
              },
              required: ['question', 'options', 'correctOptionIndex', 'explanation']
            }
          },
          difficultyRating: {
            type: Type.INTEGER,
            description: lang === 'tr' ? 'Metnin anlama ve kavrama zorluk derecesi (1-100)' : 'Reading comprehension difficulty rating of the text (1-100)'
          }
        },
        required: ['questions', 'difficultyRating']
      };

      const prompt = lang === 'tr'
        ? `Aşağıdaki metnden ${questionCount} adet çoktan seçmeli (A, B, C, D) Türkçe kavrama sorusu oluştur. Okuduğunu anlama seviyesini test etsin.
Sınavın zorluk derecesi "${difficulty}" olsun. Metnin tahmini kavrama zorluk derecesini (1-100 arasında) belirle.

Metin Başlığı: "${title || 'Metin'}"
Metin İçeriği:
${text.slice(0, 4000)}`
        : `Generate ${questionCount} multiple-choice (A, B, C, D) comprehension questions in English from the text below. It should test reading comprehension.
The difficulty of the quiz should be equivalent to "${difficulty === 'Orta' ? 'Medium' : difficulty}". Determine the estimated reading comprehension difficulty level of the text (on a scale from 1 to 100).

Text Title: "${title || 'Text'}"
Text Content:
${text.slice(0, 4000)}`;

      const parsed = await generateStructuredJson(config, prompt, schema);
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
      const config = getRequestAiConfig(req);
      const lang = req.headers['x-ai-lang'] || 'tr';
      console.log(`[AI] Knowledge Insights requested via ${config.provider} for: "${title || 'Untitled'}". Lang: ${lang}`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          keyInsights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: lang === 'tr' ? 'Metnden çıkarılan en önemli 3 adet kilit felsefi veya teknik bulgu (insight)' : 'Top 3 key philosophical or technical takeaways (insights) extracted from the text'
          },
          actionableIdea: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Kullanıcının bugün kendi hayatında veya işinde uygulayabileceği somut bir aksiyon/alışkanlık adımı' : 'A concrete actionable idea or habit step the user can apply today in their life or business'
          },
          mentalModel: {
            type: Type.STRING,
            description: lang === 'tr' ? 'Metindeki dinamikleri açıklayan bir zihinsel model (Örn. Pareto İlkesi, Ebbinghaus Unutma Eğrisi, Sunk Cost Fallacy vb.)' : 'A mental model explaining the dynamics in the text (e.g., Pareto Principle, Ebbinghaus Forgetting Curve, Sunk Cost Fallacy, etc.)'
          }
        },
        required: ['keyInsights', 'actionableIdea', 'mentalModel']
      };

      const prompt = lang === 'tr'
        ? `Aşağıdaki metinden 3 adet kilit öngörü (insight), 1 adet günlük hayatta doğrudan uygulanabilir eylemsel alışkanlık/fikir (Actionable Idea) ve metinle uyuşan 1 adet disiplinlerarası zihinsel model (Mental Model) çıkar. Çıktıyı tamamen Türkçe olarak ver.

Metin Başlığı: "${title || 'Metin'}"
Metin İçeriği:
${text.slice(0, 4000)}`
        : `Extract 3 key insights, 1 actionable idea that can be directly applied in daily life, and 1 interdisciplinary mental model matching the text below. Provide the output completely in English.

Text Title: "${title || 'Text'}"
Text Content:
${text.slice(0, 4000)}`;

      const parsed = await generateStructuredJson(config, prompt, schema);
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
      const config = getRequestAiConfig(req);
      const lang = req.headers['x-ai-lang'] || 'tr';
      console.log(`[AI] Flashcards requested via ${config.provider} for: "${title || 'Untitled'}" (Count: ${count}, Topic: ${topic}). Lang: ${lang}`);

      const schema = {
        type: Type.OBJECT,
        properties: {
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING, description: lang === 'tr' ? 'Bilgi kartının ön yüzü (Soru, kavram veya terim)' : 'Front side of the flashcard (Question, concept, or term)' },
                back: { type: Type.STRING, description: lang === 'tr' ? 'Bilgi kartının arka yüzü (Cevap, tanım veya detaylı açıklama)' : 'Back side of the flashcard (Answer, definition, or detailed explanation)' }
              },
              required: ['front', 'back']
            }
          }
        },
        required: ['flashcards']
      };

      const prompt = lang === 'tr'
        ? `Aşağıdaki metnden ${count} adet öğretici bilgi kartı (flashcard) oluştur. Kartlar "${topic}" konusuyla ilgili veya genel önemli bilgileri içersin. Çıktıyı tamamen Türkçe olarak ver.

Metin Başlığı: "${title || 'Metin'}"
Metin İçeriği:
${text.slice(0, 4000)}`
        : `Generate ${count} educational flashcards from the text below. The cards should be relevant to the topic "${topic}" or contain general important information. Provide the output completely in English.

Text Title: "${title || 'Text'}"
Text Content:
${text.slice(0, 4000)}`;

      const parsed = await generateStructuredJson(config, prompt, schema);
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
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.NODE_ENV === 'production'
      ? __dirname
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Velox] Server listening on http://0.0.0.0:${PORT}`);
    
    // Automatically open in app mode when starting
    if (!process.env.IS_ELECTRON) {
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
    }
  });
}

startServer();
