/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, Sparkles, Brain, BookOpen, FileQuestion, Shield } from 'lucide-react';
import { useTranslation } from '../utils/i18n';

export function GuidePage({
  currentTheme,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  const { lang } = useTranslation();
  const [guideTab, setGuideTab] = useState<'intro' | 'features' | 'ai' | 'glossary' | 'faqs' | 'limits'>('intro');

  const dict = {
    tr: {
      tabs: {
        intro: '5N1K ile Velox',
        features: 'Özellikler & Kullanım',
        ai: 'Yapay Zeka Kurulumu',
        glossary: 'Terimler Sözlüğü',
        faqs: 'Teknik Sorunlar & SSS',
        limits: 'Uygulamanın Sınırları'
      },
      intro: {
        title: '5N1K ile Velox Okuma Asistanı',
        desc: 'Velox\'un vizyonunu, amacını ve temel felsefesini sorgulayan soruların yanıtları.',
        ne_title: 'NE',
        ne_desc: 'Velox; odaklanmış RSVP hızlı okuma, dinamik kütüphane/not yönetimi, Leitner hafıza kartı pekiştirmesi ve otomatik kavrama testleri sunan bütünsel bir akıllı okuma asistanıdır.',
        neden_title: 'NEDEN',
        neden_desc: 'Bilgi çağında uzun dokümanları hızla taramak, gözün satır başı-sonu git-gellerini azaltarak odak kaybını engellemek ve okunan bilgiyi kalıcı hafızaya aktarmak için tasarlanmıştır.',
        nasıl_title: 'NASIL',
        nasıl_desc: 'Kütüphaneye yüklenen metinleri RSVP vizörüyle kelime kelime oynatır. Yapay zeka ile otomatik özet, zorluk analizi ve kavrama testleri oluşturup, Leitner kutu algoritmasıyla kavramları test edersiniz.',
        nezaman_title: 'NE ZAMAN',
        nezaman_desc: 'Ders çalışırken, uzun araştırma makalelerini incelerken, yeni bir teknik dokümantasyon okurken veya günlük okuma alışkanlığını takip ederken dilediğiniz an kullanabilirsiniz.',
        nerede_title: 'NEREDE',
        nerede_desc: 'Velox tamamen masaüstünüzde çalışır. Çevrimdışı öncelikli (offline-first) mimarisi sayesinde tüm kütüphaneniz, notlarınız ve test başarı geçmişiniz yerel bilgisayarınızda depolanır.',
        kim_title: 'KİM',
        kim_desc: 'Öğrenciler, yazılımcılar, araştırmacılar, akademisyenler ve okuma odağını en üst düzeye çıkararak zamandan tasarruf etmek isteyen tüm okurlar için uygundur.'
      },
      features: {
        title: 'Özellikler & Pratik Kullanım Rehberi',
        desc: 'Uygulamanın arayüzlerini ve yeni eklenen gelişmiş dinamik modülleri nasıl kullanacağınızı öğrenin.',
        f1_title: '1. RSVP Okuma Alanı ve Odak Modları',
        f1_desc: 'Navigasyondaki "Okuma Alanı" sekmesine tıklayarak RSVP okuyucusunu başlatabilirsiniz. Sol üstteki başlığa tıklayarak son okuduğunuz 10 doküman arasında canlı arama yapıp hızlıca geçiş yapabilirsiniz. Okuyucu ayarlarından Bionic Reading, Teleprompter veya Satır Modu gibi farklı odak modlarını seçebilirsiniz.',
        f2_title: '2. Bugünün Hedefleri ve Bağımsız Seriler (Streak)',
        f2_desc: 'Ana sayfadaki Hedefler kartında "Okuma", "Quiz" ve "Bilgi Kartı" hedefleri için bağımsız takip checkbox\'ları bulunur. Gösterilmesini istediğiniz hedefleri dinamik olarak gizleyip açabilirsiniz. Her hedefin serisi (streak) birbirinden bağımsız olarak gün gün hesaplanır.',
        f3_title: '3. Kişiselleştirilebilir Klavye Kısayolları',
        f3_desc: 'Ayarlar altındaki "Klavye Kısayolları" sekmesinden eylemlerin tuşlarını değiştirebilirsiniz. Çoklu tuş kombinasyonları (örneğin Ctrl + Space veya Shift + ArrowRight) tamamen desteklenir.',
        f4_title: '4. Veri Yönetimi',
        f4_desc: 'Kütüphane ve istatistiklerinizi JSON olarak yedekleyebilir, yedeği yükleyebilir, son N günden eski logları temizleyerek veritabanını optimize edebilir veya korumalı doğrulamayla tüm verileri sıfırlayabilirsiniz.'
      },
      ai: {
        title: 'Yapay Zeka (AI) Entegrasyon Kılavuzu',
        desc: 'Velox; Google Gemini, OpenAI, Anthropic Claude ve Lokal Ollama API\'lerini tam olarak destekler.',
        gemini_title: 'Google Gemini Entegrasyonu',
        gemini_desc: '1. Google AI Studio web sitesine gidin ve ücretsiz bir API Key oluşturun. \n2. Ayarlar → Yapay Zeka panelinde "Google Gemini" seçeneğini işaretleyip API anahtarını yapıştırın. \n3. Kaydettiğinizde belge analizi, zorluk tespiti ve otomatik test özellikleri hemen açılır.',
        openai_title: 'OpenAI & Claude Entegrasyonu',
        openai_desc: 'API anahtarınızı kendi servis sağlayıcı panellerinizden (platform.openai.com veya console.anthropic.com) edinin ve ilgili alanlara girerek aktif hale getirin.',
        local_title: 'Lokal Modeller (Ollama)',
        local_desc: '1. Bilgisayarınızda Ollama\'nın çalıştığından emin olun (genellikle http://localhost:11434 adresinde çalışır). \n2. Kullandığınız modeli (örneğin gemma2 veya llama3) Ollama üzerinden bilgisayarınıza indirin. \n3. Ayarlar sayfasında model adını ve lokal URL\'i yazarak lokal yapay zekayı kullanmaya başlayın.'
      },
      glossary: {
        title: 'Teknik Terimler Sözlüğü',
        desc: 'Velox içerisinde karşılaşabileceğiniz bilimsel ve teknik kavramların tanımları.',
        headers: ['Terim', 'Açıklama'],
        rows: [
          ['WPM (Words Per Minute)', 'Dakika başına okunan kelime sayısıdır. RSVP vizörünün kelime akış hızını tanımlar.'],
          ['RSVP (Rapid Serial Visual Presentation)', 'Kelimeleri veya kelime gruplarını ekranın tam merkezinde sırayla göstererek göz taramasını azaltan görsel sunum tekniğidir.'],
          ['ORP (Optimal Recognition Point)', 'Gözün kelimeyi en kısa sürede tanıması için kelimenin merkezine yakın harfin kırmızı/renkli olarak vurgulanması tekniğidir.'],
          ['Leitner Sistemi', 'Bilgi kartlarının 5 kutuda tutulduğu, her doğru tahminde kartın bir üst kutuya çıkarak tekrar sıklığının azaltıldığı sistematik hafıza algoritmasıdır.'],
          ['Bionic Reading (Biyonik Okuma)', 'Kelimenin ilk birkaç harfinin kalınlaştırılarak gözün kelimeyi daha hızlı yakalamasını sağlayan okuma tipografisidir.'],
          ['Akıllı Es (Smart Pauses)', 'Nokta, virgül, ünlem gibi işaretlerde ve çok uzun kelimelerde RSVP akışının kısa milisaniyeler boyunca duraklamasını sağlayan yapay ritim asistanıdır.']
        ]
      },
      faqs: {
        title: 'Teknik Sorunlar & Sıkça Sorulan Sorular',
        desc: 'Karşılaşabileceğiniz sorunlar ve hızlı pratik çözüm önerileri.',
        q1: 'S: Yapay zeka butonlarına bastığımda hata alıyorum, neden?',
        a1: 'C: API anahtarınızın doğruluğunu, kotasının tükenip tükenmediğini veya internet bağlantınızı kontrol edin. Lokal Ollama kullanıyorsanız Ollama uygulamasının arka planda açık ve modelin yüklenmiş olduğundan emin olun.',
        q2: 'S: Kısayol tuşları çalışmıyor ne yapmalıyım?',
        a2: 'C: Ayarlar → Klavye Kısayolları sekmesine girip çakışan veya çalışmayan kısayolu yeniden atayın. Ayrıca yazı alanlarında (input/textarea) odağınız varken kısayolların devre dışı kaldığını unutmayın.',
        q3: 'S: İlerleme veya Kart grafiği boş görünüyor?',
        a3: 'C: Grafik üstündeki filtre butonlarından (Günlük, Haftalık, Aylık vb.) doğru zaman aralığının seçili olduğundan emin olun. Kartların grafikte görünmesi için sisteme kart eklenmiş ve en az bir kere çalışılmış veya kütüphanede bulunuyor olması gerekir.',
        q4: 'S: Verilerimi başka bir bilgisayara nasıl taşırım?',
        a4: 'C: Ayarlar → Veri Yönetimi sekmesinden "Yedek Dosyası İndir" butonuna tıklayarak verilerinizi alın, ardından yeni bilgisayardaki Velox uygulamasında aynı panelden "Yedek Yükle" diyerek yükleyin.'
      },
      limits: {
        title: 'Uygulamanın Teknik Sınırları',
        desc: 'Uygulamanın kararlı çalışabilmesi için belirlenmiş teknik sınırlar ve kısıtlamalar.',
        l1_title: 'Lokal Depolama (Local Storage) Limiti',
        l1_desc: 'Velox verileri bilgisayarınızın yerel depolama alanında saklar. Bu sınır genellikle 5MB ile 10MB arasındadır. Çok fazla uzun doküman yükleyip notlar aldığınızda bu sınır aşılabilir. Performans kaybı yaşamamak için Ayarlar → Veri Yönetimi kısmından eski loglarınızı optimize edip temizlemeniz önerilir.',
        l2_title: 'AI API Kota Sınırları',
        l2_desc: 'Ücretsiz Gemini API anahtarları genellikle dakikada 15 istek sınırı barındırır. "Rapor Üret" veya "Özet Çıkar" butonlarına çok hızlı arka arkaya basıldığında 429 (Too Many Requests) hatası alabilirsiniz. Bu durumda birkaç saniye bekleyip tekrar deneyin.',
        l3_title: 'Desteklenen Belge Biçimleri',
        l3_desc: 'Velox şu an için kararlı bir şekilde düz metin (.txt) yüklemeyi ve doğrudan kopyala-yapıştır ile metin eklemeyi destekler. Çok sütunlu veya karmaşık PDF dosyalarının içindeki metin kaymaları okuma hızınızı etkileyebileceğinden, metinleri kütüphaneye eklemeden önce temizlemeniz önerilir.'
      }
    },
    en: {
      tabs: {
        intro: '5W1H with Velox',
        features: 'Features & Usage',
        ai: 'AI Engine Setup',
        glossary: 'Glossary of Terms',
        faqs: 'Troubleshooting & FAQ',
        limits: 'Technical Limits'
      },
      intro: {
        title: '5W1H with Velox Reading Assistant',
        desc: 'Answers to key questions regarding the vision, purpose, and philosophy of Velox.',
        ne_title: 'WHAT',
        ne_desc: 'Velox is an integrated smart reading assistant offering focused RSVP speed reading, library/study notes management, Leitner memory flashcards, and automated comprehension quizzes.',
        neden_title: 'WHY',
        neden_desc: 'Designed in the information age to rapidly digest documents, eliminate eye fatigue by stabilizing reading coordinates, and transfer read contents into long-term memory.',
        nasıl_title: 'HOW',
        nasıl_desc: 'Upload files to the library, display them word-by-word with the RSVP reader, compile notes, generate AI summaries/quizzes, and reinforce concepts using the Leitner box schedule.',
        nezaman_title: 'WHEN',
        nezaman_desc: 'Use it whenever studying for classes, analyzing academic papers, parsing technical API documents, or tracking daily reading habit stats.',
        nerede_title: 'WHERE',
        nerede_desc: 'Velox runs locally on your desktop. Its offline-first architecture ensures that your books, notes, and quiz histories remain privately stored on your computer.',
        kim_title: 'WHO',
        kim_desc: 'Suitable for students, developers, researchers, academics, or anyone looking to maximize reading focus and save time.'
      },
      features: {
        title: 'Features & Practical Guide',
        desc: 'Learn how to utilize library document workspaces and new dynamic components.',
        f1_title: '1. RSVP Reader & Focus Modes',
        f1_desc: 'Click the "Reading Room" tab to launch the RSVP viewer. Select a document using the dynamic top-left dropdown with live search filters. Switch between Bionic Reading, Teleprompter, or line tracking settings.',
        f2_title: '2. Today\'s Goals & Independent Streaks',
        f2_desc: 'Configure independent tracker boxes for Reading, Quizzes, or Flashcard goals on the dashboard. Hide or display goals dynamically. Streaks are computed independently per activity.',
        f3_title: '3. Customized Keyboard Shortcuts',
        f3_desc: 'Assign customized keys under the Keyboard Shortcuts settings. Multi-key combinations (e.g., Ctrl + Space or Shift + ArrowRight) are fully supported.',
        f4_title: '4. Data Management',
        f4_desc: 'Export database files, restore backups, optimize logs to save local storage, or permanently wipe database tables using type confirmations.'
      },
      ai: {
        title: 'AI Engine Entegrasyon Guide',
        desc: 'Velox supports API integrations with Google Gemini, OpenAI, Anthropic Claude, and local Ollama models.',
        gemini_title: 'Google Gemini Integration',
        gemini_desc: '1. Visit Google AI Studio to acquire a free API Key. \n2. Go to Settings → AI Engine, choose Google Gemini, and paste the API key. \n3. Summaries, difficulty metrics, and quiz modules are immediately unlocked.',
        openai_title: 'OpenAI & Claude Integration',
        openai_desc: 'Generate API credentials inside your service provider dashboards (platform.openai.com or console.anthropic.com) and save them in Velox Settings.',
        local_title: 'Local Models (Ollama)',
        local_desc: '1. Ensure Ollama runs locally on your device (usually at http://localhost:11434). \n2. Pull a model (e.g., llama3 or gemma2) using terminal commands. \n3. Enter the local URL and model name in Settings to run AI fully offline.'
      },
      glossary: {
        title: 'Glossary of Terms',
        desc: 'Definitions of speed reading and cognitive science terms used across Velox.',
        headers: ['Term', 'Description'],
        rows: [
          ['WPM (Words Per Minute)', 'The metric defining visual word streaming speeds in the RSVP reader.'],
          ['RSVP (Rapid Serial Visual Presentation)', 'The presentation method that streams words sequentially in a fixed visual coordinates to eliminate saccadic eye movements.'],
          ['ORP (Optimal Recognition Point)', 'The color-highlighted center letter helping eye lenses recognize a word instantly.'],
          ['Leitner System', 'A flashcard schedule using 5 boxes where cards move to higher intervals on correct recalls, minimizing study time.'],
          ['Bionic Reading', 'Highlighting the first syllables of words to help brains recognize and read sentences faster.'],
          ['Smart Pauses', 'Adding minor visual delays at punctuation marks or long words to improve natural text comprehension.']
        ]
      },
      faqs: {
        title: 'Troubleshooting & FAQ',
        desc: 'Quick resolutions to common technical inquiries.',
        q1: 'Q: Why do I receive errors when pressing AI buttons?',
        a1: 'A: Check your internet connection, API keys credentials validity, or key quotas. For Ollama, verify that Ollama desktop app runs in the background and the model is downloaded.',
        q2: 'Q: Why are keyboard shortcuts unresponsive?',
        a2: 'A: Go to Settings → Keyboard Shortcuts to remap key combinations. Remember that shortcuts are bypassed when focusing on text input fields.',
        q3: 'Q: Why is my progress or flashcards chart empty?',
        a3: 'A: Check the date range selectors (Daily, Weekly, Monthly) on top of charts. Flashcards need to exist and have been studied at least once to render repetition graphs.',
        q4: 'Q: How do I transfer database logs to a new computer?',
        a4: 'A: Download a database backup file under Settings → Data Management, and upload it using the Restore option on the new device.'
      },
      limits: {
        title: 'Technical Limitations',
        desc: 'Technical capacities and constraints defined for stable application runs.',
        l1_title: 'Local Storage Limits',
        l1_desc: 'Velox stores data inside browser/Electron sandbox files. This space is capped at 5MB to 10MB. To avoid degradation, run database optimizations to clear historical logs.',
        l2_title: 'AI API Rate Limits',
        l2_desc: 'Free tier API keys limit requests (e.g., 15 RPM). Rapid button clicks might throw 429 errors. Wait a few seconds before trying again.',
        l3_title: 'Supported Document Formats',
        l3_desc: 'Velox currently supports plain text (.txt) and paste inputs. Complex PDF layouts should be cleaned before import to ensure text runs smoothly in RSVP.'
      }
    }
  };

  const tLocal = (tabKey: string, key: string) => {
    const l = lang === 'tr' ? 'tr' : 'en';
    return (dict[l] as any)[tabKey]?.[key] || (dict['en'] as any)[tabKey]?.[key] || key;
  };

  const GUIDE_TABS = [
    { id: 'intro', label: dict[lang === 'tr' ? 'tr' : 'en'].tabs.intro, icon: HelpCircle },
    { id: 'features', label: dict[lang === 'tr' ? 'tr' : 'en'].tabs.features, icon: Sparkles },
    { id: 'ai', label: dict[lang === 'tr' ? 'tr' : 'en'].tabs.ai, icon: Brain },
    { id: 'glossary', label: dict[lang === 'tr' ? 'tr' : 'en'].tabs.glossary, icon: BookOpen },
    { id: 'faqs', label: dict[lang === 'tr' ? 'tr' : 'en'].tabs.faqs, icon: FileQuestion },
    { id: 'limits', label: dict[lang === 'tr' ? 'tr' : 'en'].tabs.limits, icon: Shield }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
      <aside className={`rounded-2xl border p-3 ${surfaceClass} h-fit`}>
        <div className="flex flex-col gap-1">
          {GUIDE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setGuideTab(tab.id as any)}
              className={`h-11 px-3 rounded-xl text-xs font-black flex items-center gap-3 transition-colors ${
                guideTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                  : `${mutedClass} hover:bg-stone-100 dark:hover:bg-zinc-900`
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </aside>

      <div className={`rounded-2xl border p-6 ${surfaceClass} min-h-[500px]`}>
        {guideTab === 'intro' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={`text-lg font-black ${titleClass}`}>{tLocal('intro', 'title')}</h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${mutedClass}`}>
                {tLocal('intro', 'desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className={`p-4 rounded-xl border ${softSurfaceClass}`}>
                <h4 className={`text-xs font-black uppercase text-indigo-500`}>{tLocal('intro', 'ne_title')}</h4>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>
                  {tLocal('intro', 'ne_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass}`}>
                <h4 className={`text-xs font-black uppercase text-indigo-500`}>{tLocal('intro', 'neden_title')}</h4>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>
                  {tLocal('intro', 'neden_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass}`}>
                <h4 className={`text-xs font-black uppercase text-indigo-500`}>{tLocal('intro', 'nasıl_title')}</h4>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>
                  {tLocal('intro', 'nasıl_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass}`}>
                <h4 className={`text-xs font-black uppercase text-indigo-500`}>{tLocal('intro', 'nezaman_title')}</h4>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>
                  {tLocal('intro', 'nezaman_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass}`}>
                <h4 className={`text-xs font-black uppercase text-indigo-500`}>{tLocal('intro', 'nerede_title')}</h4>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>
                  {tLocal('intro', 'nerede_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass}`}>
                <h4 className={`text-xs font-black uppercase text-indigo-500`}>{tLocal('intro', 'kim_title')}</h4>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>
                  {tLocal('intro', 'kim_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {guideTab === 'features' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={`text-lg font-black ${titleClass}`}>{tLocal('features', 'title')}</h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${mutedClass}`}>
                {tLocal('features', 'desc')}
              </p>
            </div>

            <div className="space-y-4 text-xs mt-2">
              <div className="flex flex-col gap-1.5">
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('features', 'f1_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('features', 'f1_desc')}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('features', 'f2_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('features', 'f2_desc')}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('features', 'f3_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('features', 'f3_desc')}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('features', 'f4_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('features', 'f4_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {guideTab === 'ai' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={`text-lg font-black ${titleClass}`}>{tLocal('ai', 'title')}</h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${mutedClass}`}>
                {tLocal('ai', 'desc')}
              </p>
            </div>

            <div className="space-y-4 text-xs mt-2">
              <div className={`p-4 rounded-xl border ${softSurfaceClass} flex flex-col gap-2`}>
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('ai', 'gemini_title')}</h3>
                <p className={`leading-relaxed ${mutedClass} whitespace-pre-wrap`}>
                  {tLocal('ai', 'gemini_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass} flex flex-col gap-2`}>
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('ai', 'openai_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('ai', 'openai_desc')}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass} flex flex-col gap-2`}>
                <h3 className={`text-sm font-black ${titleClass}`}>{tLocal('ai', 'local_title')}</h3>
                <p className={`leading-relaxed ${mutedClass} whitespace-pre-wrap`}>
                  {tLocal('ai', 'local_desc')}
                </p>
              </div>
            </div>
          </div>
        )}

        {guideTab === 'glossary' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={`text-lg font-black ${titleClass}`}>{tLocal('glossary', 'title')}</h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${mutedClass}`}>
                {tLocal('glossary', 'desc')}
              </p>
            </div>

            <div className="border border-stone-200 dark:border-zinc-800 rounded-xl overflow-hidden mt-2 text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 dark:bg-zinc-900/40 border-b border-stone-200 dark:border-zinc-800 font-black">
                    <th className="p-3">{dict[lang === 'tr' ? 'tr' : 'en'].glossary.headers[0]}</th>
                    <th className="p-3">{dict[lang === 'tr' ? 'tr' : 'en'].glossary.headers[1]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-900">
                  {dict[lang === 'tr' ? 'tr' : 'en'].glossary.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold">{row[0]}</td>
                      <td className="p-3 opacity-90">{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {guideTab === 'faqs' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={`text-lg font-black ${titleClass}`}>{tLocal('faqs', 'title')}</h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${mutedClass}`}>
                {tLocal('faqs', 'desc')}
              </p>
            </div>

            <div className="space-y-4 text-xs mt-2">
              <div className="flex flex-col gap-1">
                <h4 className={`font-bold ${titleClass}`}>{tLocal('faqs', 'q1')}</h4>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('faqs', 'a1')}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <h4 className={`font-bold ${titleClass}`}>{tLocal('faqs', 'q2')}</h4>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('faqs', 'a2')}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <h4 className={`font-bold ${titleClass}`}>{tLocal('faqs', 'q3')}</h4>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('faqs', 'a3')}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <h4 className={`font-bold ${titleClass}`}>{tLocal('faqs', 'q4')}</h4>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('faqs', 'a4')}
                </p>
              </div>
            </div>
          </div>
        )}

        {guideTab === 'limits' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className={`text-lg font-black ${titleClass}`}>{tLocal('limits', 'title')}</h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${mutedClass}`}>
                {tLocal('limits', 'desc')}
              </p>
            </div>

            <div className="space-y-4 text-xs mt-2">
              <div className="flex flex-col gap-1">
                <h3 className={`font-bold ${titleClass}`}>{tLocal('limits', 'l1_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('limits', 'l1_desc')}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className={`font-bold ${titleClass}`}>{tLocal('limits', 'l2_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('limits', 'l2_desc')}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className={`font-bold ${titleClass}`}>{tLocal('limits', 'l3_title')}</h3>
                <p className={`leading-relaxed ${mutedClass}`}>
                  {tLocal('limits', 'l3_desc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
