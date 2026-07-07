import React, { useState } from 'react';
import { ChevronLeft, X, UploadCloud } from 'lucide-react';
import { extractTextFromPdf, extractTextFromDocx, extractTextFromEpub } from '../../utils/parsers';

const trWordsList = [
  ["odak", "bellek", "hız", "dikkat", "okuma", "göz", "zaman", "beyin", "algı", "zihin", "ışık", "akış", "bilgi", "beceri", "kod", "metin", "süre", "hedef", "vizyon", "görüş"],
  ["aktif bellek", "hızlı okuma", "odak noktası", "akıllı asistan", "biyonik harfler", "satır takibi", "zihinsel harita", "geniş açı", "görsel algı", "hızlı kavrama", "blok okuma", "göz kası", "kelime hazinesi", "etkin öğrenme", "seçici dikkat"],
  ["dijital göz sağlığı", "okuma hızı artırma", "geri dönerek okuma", "aktif bellek egzersizi", "odaklanma süresi uzatma", "fotoğrafik okuma tekniği", "zihinsel çeviri yapmama", "sayfa tarama yöntemi", "esnek okuma alışkanlığı", "dikkat dağınıklığı önleme"],
  ["kavrama performansı testi uygulaması", "hızlı okuma antrenman laboratuvarı", "leitner kutusu bellek algoritması", "dijital ekran göz yorgunluğu molası", "göz kaslarını geliştirme antrenmanı", "periferik görme alanını genişletme", "seslendirme yapmadan içten okuma", "okuma hızını iki katına çıkarma"]
];
const enWordsList = [
  ["focus", "memory", "speed", "attention", "reading", "eye", "time", "brain", "perception", "mind", "light", "flow", "info", "skill", "code", "text", "span", "goal", "vision", "scan"],
  ["active memory", "speed reading", "focus point", "smart assistant", "bionic reading", "line tracking", "mind map", "wide angle", "visual perception", "quick grasp", "block reading", "eye muscle", "vocabulary bank", "active learning", "selective focus"],
  ["digital eye health", "increase reading speed", "avoid backward reading", "active memory training", "extend focus span", "photographic reading technique", "stop subvocalization habit", "page scanning method", "flexible reading habit", "prevent attention drift"],
  ["comprehension performance test application", "speed reading training lab", "leitner box memory algorithm", "digital screen eye rest break", "eye muscle development workout", "expanding peripheral vision range", "reading silently without speaking", "double your reading speed rate"]
];

interface WordExpansionTrainingProps {
  activeModule: string | null;
  setActiveModule: (m: string | null) => void;
  lang: string;
  t: (key: string) => string;
  isLightTheme: boolean;
  titleClass: string;
  mutedClass: string;
  surfaceClass: string;
  onSaveSession: (session: any) => void;
  books: any[];
  showAlert?: (message: string, title?: string, onConfirm?: () => void) => void;
}

export default function WordExpansionTraining({
  activeModule,
  setActiveModule,
  lang,
  t,
  isLightTheme,
  titleClass,
  mutedClass,
  surfaceClass,
  onSaveSession,
  books,
  showAlert
}: WordExpansionTrainingProps) {
  const triggerAlert = (msg: string) => {
    if (showAlert) {
      showAlert(msg, lang === 'tr' ? 'Hata' : 'Hata');
    } else {
      alert(msg);
    }
  };

  const [expansionState, setExpansionState] = useState<'idle' | 'flashing' | 'question' | 'feedback' | 'summary'>('idle');
  const [expansionWord, setExpansionWord] = useState<string>('');
  const [expansionOptions, setExpansionOptions] = useState<string[]>([]);
  const [expansionLevel, setExpansionLevel] = useState<number>(1);
  const [expansionRound, setExpansionRound] = useState<number>(0);
  const [expansionCorrectCount, setExpansionCorrectCount] = useState<number>(0);
  const [expansionSelected, setExpansionSelected] = useState<string | null>(null);
  const [expansionScore, setExpansionScore] = useState<number>(0);
  const [expansionStartTime, setExpansionStartTime] = useState<number>(0);
  const [expansionSpeed, setExpansionSpeed] = useState<number>(450);
  const [expansionTotalRounds, setExpansionTotalRounds] = useState<number>(5);
  const [expansionFeedbackMode, setExpansionFeedbackMode] = useState<'instant' | 'end'>('instant');
  const [expansionHistory, setExpansionHistory] = useState<{ word: string; selected: string; correct: boolean }[]>([]);
  const [expansionCustomPools, setExpansionCustomPools] = useState<any>(null);
  const [expansionUploadedFileName, setExpansionUploadedFileName] = useState<string>('');
  const [expansionCustomText, setExpansionCustomText] = useState<string>('');

  const parseCustomTextIntoPools = (text: string) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const words = cleanText.split(' ').filter(w => w.length > 1);
    if (words.length < 5) return null;
    const level1: string[] = [];
    const level2: string[] = [];
    const level3: string[] = [];
    const level4: string[] = [];
    const seen1 = new Set<string>();
    words.forEach(w => {
      const cleanW = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      if (cleanW.length > 2 && !seen1.has(cleanW)) {
        seen1.add(cleanW);
        level1.push(cleanW);
      }
    });
    const seen2 = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const w2 = words[i+1].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      if (w1.length > 1 && w2.length > 1) {
        const phrase = `${w1} ${w2}`;
        if (!seen2.has(phrase)) {
          seen2.add(phrase);
          level2.push(phrase);
        }
      }
    }
    const seen3 = new Set<string>();
    for (let i = 0; i < words.length - 2; i++) {
      const w1 = words[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const w2 = words[i+1].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const w3 = words[i+2].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      if (w1.length > 1 && w2.length > 1 && w3.length > 1) {
        const phrase = `${w1} ${w2} ${w3}`;
        if (!seen3.has(phrase)) {
          seen3.add(phrase);
          level3.push(phrase);
        }
      }
    }
    const seen4 = new Set<string>();
    for (let i = 0; i < words.length - 3; i++) {
      const w1 = words[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const w2 = words[i+1].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const w3 = words[i+2].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      const w4 = words[i+3].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim().toLowerCase();
      if (w1.length > 1 && w2.length > 1 && w3.length > 1 && w4.length > 1) {
        const phrase = `${w1} ${w2} ${w3} ${w4}`;
        if (!seen4.has(phrase)) {
          seen4.add(phrase);
          level4.push(phrase);
        }
      }
    }
    return [
      level1.length > 2 ? level1 : null,
      level2.length > 2 ? level2 : null,
      level3.length > 2 ? level3 : null,
      level4.length > 2 ? level4 : null
    ];
  };

  const processUploadedText = (text: string) => {
    let cleanText = text;
    try {
      const parsedJson = JSON.parse(text);
      if (Array.isArray(parsedJson)) {
        cleanText = parsedJson.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(' ');
      } else if (typeof parsedJson === 'object' && parsedJson !== null) {
        cleanText = Object.values(parsedJson).map(val => typeof val === 'string' ? val : JSON.stringify(val)).join(' ');
      }
    } catch (e) {
      if (text.includes(',') || text.includes(';')) {
        cleanText = text.replace(/[,;]/g, ' ');
      }
    }
    setExpansionCustomText(cleanText);
    const parsed = parseCustomTextIntoPools(cleanText);
    if (parsed) {
      setExpansionCustomPools(parsed);
    }
  };

  const handleWordExpansionFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    setExpansionUploadedFileName(file.name);
    try {
      if (ext === 'pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = e.target?.result as ArrayBuffer;
            const text = await extractTextFromPdf(buffer);
            processUploadedText(text);
          } catch (err) {
            triggerAlert(lang === 'tr' ? 'PDF dosyası ayrıştırılamadı.' : 'Could not parse PDF file.');
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (ext === 'docx') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = e.target?.result as ArrayBuffer;
            const text = await extractTextFromDocx(buffer);
            processUploadedText(text);
          } catch (err) {
            triggerAlert(lang === 'tr' ? 'Word belgesi ayrıştırılamadı.' : 'Could not parse Word document.');
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (ext === 'epub') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const buffer = e.target?.result as ArrayBuffer;
            const text = await extractTextFromEpub(buffer);
            processUploadedText(text);
          } catch (err) {
            triggerAlert(lang === 'tr' ? 'EPUB dosyası ayrıştırılamadı.' : 'Could not parse EPUB file.');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          processUploadedText(text);
        };
        reader.readAsText(file, 'utf-8');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startWordExpansionRound = (currentRound = expansionRound, currentScore = expansionScore, currentCorrectCount = expansionCorrectCount) => {
    let wordsPool: string[] = [];
    if (expansionCustomPools && expansionCustomPools[expansionLevel - 1] && expansionCustomPools[expansionLevel - 1].length >= 2) {
      wordsPool = expansionCustomPools[expansionLevel - 1];
    } else {
      const list = lang === 'tr' ? trWordsList : enWordsList;
      const levelIdx = Math.min(expansionLevel - 1, list.length - 1);
      wordsPool = list[levelIdx] || list[0];
    }
    
    const correctVal = wordsPool[Math.floor(Math.random() * wordsPool.length)];
    setExpansionWord(correctVal);

    const distractors = wordsPool.filter(w => w !== correctVal);
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 7);
    const allOptions = [correctVal, ...shuffledDistractors];
    setExpansionOptions(allOptions.sort(() => Math.random() - 0.5));

    setExpansionState('flashing');
    setExpansionSelected(null);
    if (currentRound === 0) setExpansionStartTime(Date.now());

    setTimeout(() => {
      setExpansionState('question');
    }, expansionSpeed);
  };

  const handleExpansionAnswer = (ans: string) => {
    setExpansionSelected(ans);
    const isCorrect = ans === expansionWord;
    
    let newCorrectCount = expansionCorrectCount;
    let newScore = expansionScore;
    
    if (isCorrect) {
      newCorrectCount += 1;
      newScore += 20;
      setExpansionCorrectCount(newCorrectCount);
      setExpansionScore(newScore);
    }

    setExpansionHistory(prev => [...prev, { word: expansionWord, selected: ans, correct: isCorrect }]);

    const isLastRound = expansionRound >= expansionTotalRounds - 1;

    if (expansionFeedbackMode === 'instant') {
      setExpansionState('feedback');
      setTimeout(() => {
        if (isLastRound) {
          const duration = Math.floor((Date.now() - expansionStartTime) / 1000) + 5;
          const accuracy = Math.round((newCorrectCount / expansionTotalRounds) * 100);
          onSaveSession({ type: 'Word Expansion', duration, score: newScore, accuracy });
          setExpansionState('summary');
        } else {
          const nextRound = expansionRound + 1;
          setExpansionRound(nextRound);
          startWordExpansionRound(nextRound, newScore, newCorrectCount);
        }
      }, 1500);
    } else {
      if (isLastRound) {
        const duration = Math.floor((Date.now() - expansionStartTime) / 1000) + 5;
        const accuracy = Math.round((newCorrectCount / expansionTotalRounds) * 100);
        onSaveSession({ type: 'Word Expansion', duration, score: newScore, accuracy });
        setExpansionState('summary');
      } else {
        const nextRound = expansionRound + 1;
        setExpansionRound(nextRound);
        startWordExpansionRound(nextRound, newScore, newCorrectCount);
      }
    }
  };

  if (activeModule !== 'expansion') return null;

  return (
    <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>{t('tr_lab_word_expansion_title')}</h3>
          <p className={`text-xs mt-0.5 ${mutedClass}`}>
            {lang === 'tr' 
              ? 'Flaşörde çok kısa süre gösterilecek kelime grubunu yakalayıp seçeneklerden bulun.' 
              : 'Perceive the word group shown in the flasher and choose the correct option.'}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          {expansionState === 'idle' ? (
            <>
              {[1, 2, 3, 4].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setExpansionLevel(l);
                    setExpansionRound(0);
                    setExpansionCorrectCount(0);
                    setExpansionScore(0);
                    setExpansionState('idle');
                  }}
                  className={`h-8 px-3 rounded-lg border text-xs font-bold transition-all ${
                    expansionLevel === l ? 'bg-indigo-650 text-white' : 'opacity-60'
                  }`}
                >
                  L{l}
                </button>
              ))}
            </>
          ) : (
            <button
              onClick={() => {
                setExpansionState('idle');
                setExpansionRound(0);
                setExpansionCorrectCount(0);
                setExpansionScore(0);
              }}
              title={lang === 'tr' ? 'Egzersizi İptal Et' : 'Cancel Exercise'}
              className="h-8 w-8 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-450 hover:bg-rose-500/20 cursor-pointer flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setActiveModule(null);
              setExpansionState('idle');
              setExpansionRound(0);
              setExpansionCorrectCount(0);
              setExpansionScore(0);
            }}
            title={lang === 'tr' ? 'Eğitim Laboratuvarı\'na Dön' : 'Return to Lab'}
            className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-stone-50 dark:hover:bg-zinc-900 cursor-pointer ml-2 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] flex flex-col justify-center">
        {expansionState === 'idle' && (
          <div className="flex flex-col gap-8 py-4">
            <div className="text-center">
              <h2 className={`text-2xl font-black mb-2 ${titleClass}`}>{lang === 'tr' ? 'Seviye' : 'Level'} {expansionLevel}</h2>
              <p className="text-sm opacity-80 max-w-xl mx-auto leading-relaxed">
                {lang === 'tr' ? (
                  <>
                    {expansionLevel}. seviyede kelimeler <strong className="font-extrabold">{Math.max(1, 6 - expansionLevel)}</strong> kelimelik bloklar halinde flaş edilecektir.
                  </>
                ) : (
                  <>
                    In level {expansionLevel}, words will be flashed in blocks of <strong className="font-extrabold">{Math.max(1, 6 - expansionLevel)}</strong> words.
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Left Column: Document Upload & Paste Section */}
              <div className="flex flex-col gap-4 h-full">
                <span className="font-bold text-sm border-b pb-2 text-indigo-500">{lang === 'tr' ? '1. Kelime Kaynağı' : '1. Word Source'}</span>
                <div className="flex flex-col p-4 rounded-2xl border bg-black/5 dark:bg-white/5 flex-1 min-h-[380px] gap-3">
                  <div className="flex flex-col gap-3">
                    {/* Select from existing library documents */}
                    {books && books.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold opacity-80">{lang === 'tr' ? 'Mevcut Kütüphane Belgelerinden Seç:' : 'Select from Existing Library:'}</span>
                        <select
                          onChange={(e) => {
                            const selectedBook = books.find(b => b.id === e.target.value);
                            if (selectedBook) {
                              setExpansionUploadedFileName(selectedBook.title);
                              processUploadedText(selectedBook.content);
                            } else {
                              setExpansionUploadedFileName('');
                              setExpansionCustomText('');
                              setExpansionCustomPools(null);
                            }
                          }}
                          className="w-full p-2 rounded-lg text-[10px] border bg-stone-100 dark:bg-zinc-800 text-indigo-500 font-semibold cursor-pointer outline-none focus:border-indigo-500"
                        >
                          <option value="">-- {lang === 'tr' ? 'Bir belge seçin' : 'Select a document'} --</option>
                          {books.map(b => (
                            <option key={b.id} value={b.id}>{b.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="border-t my-0.5 opacity-20" />

                    {/* Premium Drag & Drop Upload Picker */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold opacity-80">
                        {lang === 'tr' ? 'Yeni Belge Yükle:' : 'Upload New Document:'}
                      </span>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/30 hover:border-indigo-500 rounded-xl p-3 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-all gap-1 group">
                        <UploadCloud className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black text-indigo-400 group-hover:text-indigo-500">
                          {lang === 'tr' ? 'Dosya Seçin veya Sürükleyin' : 'Select or Drag File'}
                        </span>
                        <span className="text-[8px] opacity-60">
                          .txt, .md, .pdf, .docx, .epub, .json, .csv
                        </span>
                        <input
                          type="file"
                          accept=".txt,.md,.pdf,.docx,.epub,.json,.csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleWordExpansionFileUpload(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {expansionUploadedFileName && (
                        <span className="text-[9px] font-bold text-emerald-500 truncate mt-1 text-center bg-emerald-500/10 py-1 px-2 rounded">
                          ✓ {lang === 'tr' ? `Aktif dosya: ${expansionUploadedFileName}` : `Active file: ${expansionUploadedFileName}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 gap-1">
                    <span className="text-[10px] font-bold opacity-80">{lang === 'tr' ? 'Veya Metin Yapıştırın:' : 'Or Paste Text:'}</span>
                    <textarea
                      value={expansionCustomText}
                      placeholder={lang === 'tr' ? "Buraya yapıştırın... (Eğer boş bırakırsanız standart Velox veritabanı kullanılır)" : "Paste here... (If left empty, standard Velox database is used)"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExpansionCustomText(val);
                        if (val.trim().length > 10) {
                          const parsed = parseCustomTextIntoPools(val);
                          if (parsed) {
                            setExpansionCustomPools(parsed);
                          } else {
                            setExpansionCustomPools(null);
                          }
                        } else {
                          setExpansionCustomPools(null);
                        }
                      }}
                      className="w-full flex-1 min-h-[80px] p-3 rounded-xl border text-[10px] bg-stone-50 dark:bg-zinc-900 resize-none outline-none focus:border-indigo-500 transition-colors"
                    />
                    {expansionCustomPools ? (
                      <span className="text-[9px] font-bold text-emerald-500 truncate block mt-1">
                        {lang === 'tr' 
                          ? `✓ Metin başarıyla işlendi! (L1: ${expansionCustomPools[0]?.length || 0} kelime, L2: ${expansionCustomPools[1]?.length || 0} öbek, L3: ${expansionCustomPools[2]?.length || 0} öbek, L4: ${expansionCustomPools[3]?.length || 0} öbek)`
                          : `✓ Text parsed successfully! (L1: ${expansionCustomPools[0]?.length || 0} words, L2: ${expansionCustomPools[1]?.length || 0} phrases, L3: ${expansionCustomPools[2]?.length || 0} phrases, L4: ${expansionCustomPools[3]?.length || 0} phrases)`}
                      </span>
                    ) : (
                      <span className="text-[9px] opacity-60 italic block mt-1">
                        {expansionCustomText.trim().length > 0 ? (lang === 'tr' ? 'Yetersiz metin uzunluğu.' : 'Insufficient text length.') : (lang === 'tr' ? 'Standart Veritabanı Aktif.' : 'Standard Database Active.')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Word Group Expansion settings */}
              <div className="flex flex-col gap-4 h-full">
                <span className="font-bold text-sm border-b pb-2 text-indigo-500">{lang === 'tr' ? '2. Egzersiz Ayarları' : '2. Exercise Settings'}</span>
                <div className="flex flex-col p-4 rounded-2xl border bg-black/5 dark:bg-white/5 flex-1 min-h-[380px] gap-6">
                  
                  {/* Speed Setting */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">{lang === 'tr' ? 'Flaşör Hızı' : 'Flasher Speed'}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="number"
                          min="50"
                          max="2000"
                          value={expansionSpeed}
                          onChange={(e) => setExpansionSpeed(Math.max(50, parseInt(e.target.value) || 450))}
                          className="w-14 px-1.5 py-0.5 border rounded text-center bg-black/10 dark:bg-white/10 font-bold font-mono text-indigo-400"
                        />
                        <span>ms</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1500"
                      step="10"
                      value={expansionSpeed}
                      onChange={(e) => setExpansionSpeed(parseInt(e.target.value))}
                      className="w-full h-1 bg-stone-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Round Count */}
                  <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 pt-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">{lang === 'tr' ? 'Soru Sayısı' : 'Question Count'}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="2"
                          max="100"
                          value={expansionTotalRounds}
                          onChange={(e) => setExpansionTotalRounds(Math.max(2, parseInt(e.target.value) || 5))}
                          className="w-14 px-1.5 py-0.5 border rounded text-center bg-black/10 dark:bg-white/10 font-bold font-mono text-indigo-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 20, 50].map((r) => (
                        <button
                          key={r}
                          onClick={() => setExpansionTotalRounds(r)}
                          className={`h-7 rounded-lg border text-xs font-bold transition-all ${
                            expansionTotalRounds === r ? 'bg-indigo-600 text-white' : 'opacity-70'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Mode */}
                  <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/10 pt-4">
                    <span className="font-bold text-xs">{lang === 'tr' ? 'Geri Bildirim Modu' : 'Feedback Mode'}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpansionFeedbackMode('instant')}
                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                          expansionFeedbackMode === 'instant' ? 'bg-indigo-600 text-white' : 'opacity-70'
                        }`}
                      >
                        {lang === 'tr' ? 'Her Soru Sonrası' : 'After Each'}
                      </button>
                      <button
                        onClick={() => setExpansionFeedbackMode('end')}
                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                          expansionFeedbackMode === 'end' ? 'bg-indigo-600 text-white' : 'opacity-70'
                        }`}
                      >
                        {lang === 'tr' ? 'Test Sonunda' : 'At The End'}
                      </button>
                    </div>
                    <p className="text-[9px] opacity-60 mt-1 leading-relaxed">
                      {expansionFeedbackMode === 'instant'
                        ? (lang === 'tr' ? 'Her seçimden sonra doğru/yanlış durumu gösterilir. Öğrenme için idealdir.' : 'Shows correct/incorrect after every choice. Ideal for learning.')
                        : (lang === 'tr' ? 'Test bitene kadar sonuç gösterilmez, kesintisiz pratik sağlar.' : 'Results are hidden until the test ends, providing uninterrupted practice.')}
                    </p>
                  </div>

                  <div className="mt-auto pt-4">
                    <button
                      onClick={() => {
                        setExpansionRound(0);
                        setExpansionCorrectCount(0);
                        setExpansionScore(0);
                        setExpansionHistory([]);
                        setExpansionState('flashing');
                        startWordExpansionRound(0, 0, 0);
                      }}
                      className="h-10 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black"
                    >
                      {lang === 'tr' ? 'Egzersizi Başlat' : 'Start Workout'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {expansionState === 'flashing' && (
          <div className="flex items-center justify-center h-64">
            <h4 className={`text-4xl md:text-5xl lg:text-6xl font-black ${titleClass}`}>
              {expansionWord}
            </h4>
          </div>
        )}

        {expansionState === 'question' && (
          <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto w-full">
            <h4 className="text-xl md:text-2xl font-black text-center">
              {lang === 'tr' ? 'Hangi seçeneği gördünüz?' : 'Which option did you see?'}
            </h4>
            
            {expansionFeedbackMode === 'end' && (
              <span className="text-[10px] font-bold px-3 py-1 rounded bg-indigo-500/10 text-indigo-500">
                {lang === 'tr' ? 'Soru' : 'Question'} {expansionRound + 1} / {expansionTotalRounds}
              </span>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {expansionOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleExpansionAnswer(opt)}
                  className={`p-4 rounded-2xl border text-sm md:text-base font-bold bg-zinc-900/5 hover:bg-zinc-900/10 active:scale-95 transition-all text-center break-words`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {expansionState === 'feedback' && (
          <div className="flex flex-col items-center gap-4 py-10 animate-fade-in text-center">
            <div className="flex flex-col gap-2 mb-4">
              <span className="text-xs font-bold uppercase opacity-60">{lang === 'tr' ? 'Doğru Cevap' : 'Correct Answer'}</span>
              <span className="text-sm font-black">{expansionWord}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase opacity-60">{lang === 'tr' ? 'Sizin Seçiminiz' : 'Your Choice'}</span>
              <span className={`text-2xl md:text-3xl font-black ${
                expansionSelected === expansionWord ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {expansionSelected === expansionWord 
                  ? (lang === 'tr' ? 'Doğru!' : 'Correct!') 
                  : expansionSelected}
              </span>
            </div>
            <div className="mt-8 text-xs font-bold px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5">
              Round: {expansionRound + 1} / {expansionTotalRounds} | {lang === 'tr' ? 'Doğru' : 'Correct'}: {expansionCorrectCount}
            </div>
          </div>
        )}

        {expansionState === 'summary' && (
          <div className="flex flex-col items-center max-w-2xl mx-auto w-full gap-8 py-4 animate-fade-in text-center">
            <h4 className="text-2xl font-black text-emerald-500">{lang === 'tr' ? 'Egzersiz Tamamlandı!' : 'Workout Complete!'}</h4>
            <div className="w-full flex flex-col gap-2 p-6 rounded-3xl border bg-black/5 dark:bg-white/5">
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold opacity-80">{lang === 'tr' ? 'Doğruluk Oranı' : 'Accuracy'}</span>
                <span className="text-2xl font-black">
                  {lang === 'tr' 
                    ? `${expansionHistory.filter(h => h.correct).length} / ${expansionHistory.length} doğru cevap`
                    : `${expansionHistory.filter(h => h.correct).length} / ${expansionHistory.length} correct answers`}
                </span>
              </div>
              <div className="w-full h-3 bg-stone-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${expansionHistory.length > 0 ? Math.round((expansionHistory.filter(h => h.correct).length / expansionHistory.length) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Test History List */}
            <div className="w-full max-h-[250px] overflow-y-auto pr-2 flex flex-col gap-2">
              <span className="text-xs font-bold text-left mb-1 opacity-80 border-b pb-2">{lang === 'tr' ? 'Soru Geçmişi' : 'Question History'}</span>
              {expansionHistory.map((h, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-xs gap-2 ${
                  h.correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="opacity-50 w-4">{i + 1}.</span>
                    <span className="font-bold break-all max-w-[200px]">{h.word}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold ${h.correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {h.correct ? '✓' : '✗'} 
                    <span className="truncate max-w-[150px]">{h.selected}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 w-full mt-4">
              <button
                onClick={() => {
                  setExpansionRound(0);
                  setExpansionCorrectCount(0);
                  setExpansionScore(0);
                  setExpansionHistory([]);
                  setExpansionState('flashing');
                  startWordExpansionRound(0, 0, 0);
                }}
                className="flex-1 h-12 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-sm font-black transition-colors"
              >
                {lang === 'tr' ? 'Tekrar Çöz' : 'Solve Again'}
              </button>
              <button
                onClick={() => {
                  setExpansionState('idle');
                  setExpansionRound(0);
                  setExpansionHistory([]);
                }}
                className="flex-1 h-12 rounded-xl border text-sm font-black hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors"
              >
                {lang === 'tr' ? 'Ayarlara Dön' : 'Back to Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
