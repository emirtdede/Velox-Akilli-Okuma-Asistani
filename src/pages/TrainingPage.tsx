/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Minimize2, Maximize2, Search } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { BookMark } from '../types';
import SchulteTraining from '../components/cognitive/SchulteTraining';
import SaccadeTraining from '../components/cognitive/SaccadeTraining';
import WordExpansionTraining from '../components/cognitive/WordExpansionTraining';

interface TrainingPageProps {
  trainingLevel: string;
  setTrainingLevel: (level: string) => void;
  trainingStats: any;
  trainingHistory: any[];
  onSaveSession: (session: any) => void;
  surfaceClass: string;
  softSurfaceClass: string;
  titleClass: string;
  mutedClass: string;
  isLightTheme: boolean;
  currentTheme: any;
  books: BookMark[];
}

export function TrainingPage({
  trainingLevel,
  setTrainingLevel,
  trainingStats,
  trainingHistory,
  onSaveSession,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme,
  currentTheme,
  books
}: TrainingPageProps) {
  const { t, lang } = useTranslation();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  // Eye Rest manual state
  const [manualRestActive, setManualRestActive] = useState(false);
  const [manualRestTime, setManualRestTime] = useState(20);

  // Schulte Grid states
  const [schulteSize, setSchulteSize] = useState<number>(3);
  const [schulteNumbers, setSchulteNumbers] = useState<number[]>([]);
  const [schulteExpected, setSchulteExpected] = useState<number>(1);
  const [schulteMisses, setSchulteMisses] = useState<number>(0);
  const [schulteStartTime, setSchulteStartTime] = useState<number | null>(null);
  const [schulteDone, setSchulteDone] = useState(false);
  const [schulteWrongIdx, setSchulteWrongIdx] = useState<number | null>(null);

  // Word Group Expansion states (for diagnostic only)
  const [expansionLevel, setExpansionLevel] = useState<number>(1);
  const [expansionRound, setExpansionRound] = useState<number>(0);
  const [expansionState, setExpansionState] = useState<'idle' | 'flashing' | 'question' | 'feedback' | 'summary'>('idle');
  const [expansionWord, setExpansionWord] = useState<string>('');
  const [expansionOptions, setExpansionOptions] = useState<string[]>([]);
  const [expansionScore, setExpansionScore] = useState<number>(0);
  const [expansionSpeed, setExpansionSpeed] = useState<number>(450); // ms

  // Diagnostic Test states
  const [diagStep, setDiagStep] = useState<number>(0); // 0: intro, 1: reading test, 2: comprehension q1, 3: comprehension q2, 4: schulte, 5: word expansion, 6: result
  const [diagReadStart, setDiagReadStart] = useState<number | null>(null);
  const [diagReadWpm, setDiagReadWpm] = useState<number>(0);
  const [diagCompCorrect, setDiagCompCorrect] = useState<number>(0);
  const [diagSchulteTime, setDiagSchulteTime] = useState<number>(0);
  const [diagWordScore, setDiagWordScore] = useState<number>(0);

  // Quick settings
  const [flEnabled, setFlEnabled] = useState(() => localStorage.getItem('velox_focus_line') === 'true');
  const [arEnabled, setArEnabled] = useState(() => localStorage.getItem('velox_anti_regression') === 'true');
  const [arIntensity, setArIntensity] = useState(() => {
    const val = localStorage.getItem('velox_regression_intensity');
    return val ? parseFloat(val) : 0.15;
  });

  const toggleFl = () => {
    const newVal = !flEnabled;
    setFlEnabled(newVal);
    localStorage.setItem('velox_focus_line', String(newVal));
  };

  const toggleAr = () => {
    const newVal = !arEnabled;
    setArEnabled(newVal);
    localStorage.setItem('velox_anti_regression', String(newVal));
  };

  const handleIntensityChange = (val: number) => {
    setArIntensity(val);
    localStorage.setItem('velox_regression_intensity', String(val));
  };

  // Helper lists for word group expansion
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

  // Eye rest timer effect
  useEffect(() => {
    if (!manualRestActive) return;
    const interval = setInterval(() => {
      setManualRestTime(prev => {
        if (prev <= 1) {
          setManualRestActive(false);
          onSaveSession({ type: 'Eye Rest', duration: 20, score: 100, accuracy: 100 });
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [manualRestActive]);

  // Schulte Grid init
  const startSchulte = (size: number) => {
    setSchulteSize(size);
    const count = size * size;
    const nums = Array.from({ length: count }, (_, i) => i + 1);
    // Shuffle
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setSchulteNumbers(nums);
    setSchulteExpected(1);
    setSchulteMisses(0);
    setSchulteDone(false);
    setSchulteStartTime(Date.now());
  };

  const handleSchulteClick = (num: number, idx: number) => {
    if (schulteDone) return;
    if (num === schulteExpected) {
      if (num === schulteSize * schulteSize) {
        setSchulteDone(true);
        const durationSec = Math.floor((Date.now() - (schulteStartTime || 0)) / 1000);
        const score = Math.max(10, 1000 - durationSec * 10 - schulteMisses * 50);
        const acc = Math.max(0, Math.round(((schulteSize * schulteSize) / (schulteSize * schulteSize + schulteMisses)) * 100));
        onSaveSession({ type: `Schulte ${schulteSize}x${schulteSize}`, duration: durationSec, score, accuracy: acc });
      } else {
        setSchulteExpected(prev => prev + 1);
      }
    } else {
      setSchulteMisses(prev => prev + 1);
      setSchulteWrongIdx(idx);
      setTimeout(() => setSchulteWrongIdx(null), 300);
    }
  };

  const startWordExpansionRound = () => {
    const list = lang === 'tr' ? trWordsList : enWordsList;
    const levelIdx = Math.min(expansionLevel - 1, list.length - 1);
    const wordsPool = list[levelIdx] || list[0];
    
    // Choose correct
    const correctVal = wordsPool[Math.floor(Math.random() * wordsPool.length)];
    setExpansionWord(correctVal);

    // Distractors (select up to 7 random distractors)
    const distractors = wordsPool.filter(w => w !== correctVal);
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 7);
    const allOptions = [correctVal, ...shuffledDistractors];
    setExpansionOptions(allOptions.sort(() => Math.random() - 0.5));

    setExpansionState('flashing');

    setTimeout(() => {
      setExpansionState('question');
    }, expansionSpeed);
  };

  const completeDiagnostic = (finalCompCorrect: number, finalSchulteTime: number, finalWordScore: number) => {
    const elapsedRead = Math.floor((Date.now() - (diagReadStart || 0)) / 1000);
    const wordCount = lang === 'tr' ? 40 : 39;
    const computedWpm = Math.round((wordCount / Math.max(1, elapsedRead)) * 60);
    
    setDiagReadWpm(computedWpm);
    setDiagCompCorrect(finalCompCorrect);
    
    // Determine level
    let assigned: string = 'beginner';
    if (computedWpm < 160 || finalSchulteTime > 30) {
      assigned = 'beginner';
    } else if (computedWpm >= 160 && computedWpm < 260 && finalSchulteTime <= 30) {
      assigned = 'developing';
    } else if (computedWpm >= 260 && computedWpm < 380 && finalSchulteTime <= 22) {
      assigned = 'fluent';
    } else if (computedWpm >= 380 && computedWpm < 500 && finalSchulteTime <= 16) {
      assigned = 'speedy';
    } else if (computedWpm >= 500 && finalSchulteTime < 12) {
      assigned = 'advanced';
    }

    setTrainingLevel(assigned);
    localStorage.setItem('velox_training_level', assigned);
    
    // Log diagnostic training session
    onSaveSession({ 
      type: 'Diagnostic Test', 
      duration: elapsedRead + finalSchulteTime + 10, 
      score: Math.round((computedWpm / 5) + (finalCompCorrect * 150) + (Math.max(0, 100 - finalSchulteTime) * 3)), 
      accuracy: Math.round(((finalCompCorrect + (finalWordScore / 20)) / 4) * 100)
    });
    setDiagStep(6);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Profile Dashboard */}
      <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col md:flex-row md:items-center md:justify-between gap-6`}>
        <div>
          <h2 className={`text-xl font-black ${titleClass}`}>{t('nav_training' as any)}</h2>
          <p className={`text-xs mt-1 ${mutedClass}`}>{t('tr_lab_desc' as any)}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              {t('tr_lab_test_level_assigned' as any)} {t(`tr_lab_level_${trainingLevel}` as any)}
            </span>
            <button
              onClick={() => {
                setDiagStep(0);
                setActiveModule('diagnostic');
              }}
              className="text-[10px] font-black text-indigo-500 hover:underline pl-2 cursor-pointer"
            >
              {t('tr_lab_start_test' as any)} →
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:shrink-0">
          <div className={`p-3 rounded-2xl border ${isLightTheme ? 'bg-stone-50 border-stone-200' : 'bg-zinc-900/15 border-zinc-850'}`}>
            <span className={`text-[8px] font-black uppercase block ${mutedClass}`}>{t('tr_lab_stats_total_duration' as any)}</span>
            <span className={`text-sm font-black mt-1 block ${titleClass}`}>{Math.round((trainingStats?.totalDuration || 0) / 60)} dk</span>
          </div>
          <div className={`p-3 rounded-2xl border ${isLightTheme ? 'bg-stone-50 border-stone-200' : 'bg-zinc-900/15 border-zinc-850'}`}>
            <span className={`text-[8px] font-black uppercase block ${mutedClass}`}>{t('tr_lab_stats_total_sessions' as any)}</span>
            <span className={`text-sm font-black mt-1 block ${titleClass}`}>{trainingStats?.totalSessions || 0}</span>
          </div>
          <div className={`p-3 rounded-2xl border ${isLightTheme ? 'bg-stone-50 border-stone-200' : 'bg-zinc-900/15 border-zinc-850'}`}>
            <span className={`text-[8px] font-black uppercase block ${mutedClass}`}>{t('tr_lab_stats_best_score' as any)}</span>
            <span className={`text-sm font-black mt-1 block ${titleClass}`}>{trainingStats?.bestScore || 0}</span>
          </div>
          <div className={`p-3 rounded-2xl border ${isLightTheme ? 'bg-stone-50 border-stone-200' : 'bg-zinc-900/15 border-zinc-850'}`}>
            <span className={`text-[8px] font-black uppercase block ${mutedClass}`}>{t('tr_lab_stats_last_date' as any)}</span>
            <span className={`text-[10px] font-black mt-1.5 block ${titleClass} truncate max-w-[100px]`}>{trainingStats?.lastDate || '-'}</span>
          </div>
        </div>
      </div>

      {/* Main workout modules or active activeModule view */}
      {activeModule === null && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workout Cards */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <h3 className={`text-sm font-black uppercase tracking-wider ${titleClass} border-b pb-2`}>
                {lang === 'tr' ? 'Egzersiz Modülleri' : 'Workout Modules'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Eye Rest Card */}
                <div className={`p-4 rounded-2xl border ${isLightTheme ? 'bg-stone-50/50' : 'bg-zinc-900/10'} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className={`text-sm font-black ${titleClass}`}>{t('tr_lab_eye_rest_title' as any)}</h4>
                    <p className={`text-[11px] mt-1.5 leading-relaxed ${mutedClass}`}>{t('tr_lab_eye_rest_desc' as any)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setManualRestTime(20);
                      setManualRestActive(true);
                      setActiveModule('eyerest');
                    }}
                    className="h-8 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wide cursor-pointer"
                  >
                    {t('tr_lab_btn_start' as any)}
                  </button>
                </div>

                {/* 2. Schulte Grid Card */}
                <div className={`p-4 rounded-2xl border ${isLightTheme ? 'bg-stone-50/50' : 'bg-zinc-900/10'} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className={`text-sm font-black ${titleClass}`}>{t('tr_lab_schulte_title' as any)}</h4>
                    <p className={`text-[11px] mt-1.5 leading-relaxed ${mutedClass}`}>{t('tr_lab_schulte_desc' as any)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModule('schulte');
                      setSchulteNumbers([]);
                      setSchulteStartTime(null);
                      setSchulteDone(false);
                    }}
                    className="h-8 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wide cursor-pointer"
                  >
                    {t('tr_lab_btn_start' as any)}
                  </button>
                </div>

                {/* 3. Word Group Expansion Card */}
                <div className={`p-4 rounded-2xl border ${isLightTheme ? 'bg-stone-50/50' : 'bg-zinc-900/10'} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className={`text-sm font-black ${titleClass}`}>{t('tr_lab_word_expansion_title' as any)}</h4>
                    <p className={`text-[11px] mt-1.5 leading-relaxed ${mutedClass}`}>{t('tr_lab_word_expansion_desc' as any)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModule('expansion');
                      setExpansionLevel(1);
                      setExpansionRound(0);
                      setExpansionScore(0);
                      setExpansionState('idle');
                    }}
                    className="h-8 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wide cursor-pointer"
                  >
                    {t('tr_lab_btn_start' as any)}
                  </button>
                </div>

                {/* 4. Saccade Dot Jump Card */}
                <div className={`p-4 rounded-2xl border ${isLightTheme ? 'bg-stone-50/50' : 'bg-zinc-900/10'} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className={`text-sm font-black ${titleClass}`}>{t('tr_lab_saccade_title' as any)}</h4>
                    <p className={`text-[11px] mt-1.5 leading-relaxed ${mutedClass}`}>{t('tr_lab_saccade_desc' as any)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModule('saccade');
                    }}
                    className="h-8 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wide cursor-pointer"
                  >
                    {t('tr_lab_btn_start' as any)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Settings & History */}
          <div className="flex flex-col gap-6">
            {/* Quick reading toggles */}
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <h3 className={`text-sm font-black uppercase tracking-wider ${titleClass} border-b pb-2`}>
                {lang === 'tr' ? 'Okuma Entegrasyonu' : 'Reading Engine Settings'}
              </h3>
              
              <div className="flex flex-col gap-4 text-xs">
                {/* FL Toggle */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="block">{t('tr_lab_focus_line_title' as any)}</strong>
                    <span className={`text-[10px] leading-relaxed block mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Okunan satırı belirginleştirir.' : 'Highlights active reading line.'}</span>
                  </div>
                  <button 
                    onClick={toggleFl}
                    className={`h-7 px-3 rounded-lg border text-[10px] font-bold cursor-pointer ${flEnabled ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'opacity-65'}`}
                  >
                    {flEnabled ? (lang === 'tr' ? 'Açık' : 'ON') : (lang === 'tr' ? 'Kapalı' : 'OFF')}
                  </button>
                </div>

                {/* AR Toggle */}
                <div className="flex items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <strong className="block">{t('tr_lab_anti_regression_title' as any)}</strong>
                    <span className={`text-[10px] leading-relaxed block mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Eski kelimeleri soluklaştırır.' : 'Dims out previously read words.'}</span>
                  </div>
                  <button 
                    onClick={toggleAr}
                    className={`h-7 px-3 rounded-lg border text-[10px] font-bold cursor-pointer ${arEnabled ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'opacity-65'}`}
                  >
                    {arEnabled ? (lang === 'tr' ? 'Açık' : 'ON') : (lang === 'tr' ? 'Kapalı' : 'OFF')}
                  </button>
                </div>

                {/* AR Intensity Slider */}
                {arEnabled && (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span>{lang === 'tr' ? 'Soluklaştırma Yoğunluğu' : 'Fade Intensity'}</span>
                      <span className="font-mono font-bold">{(1 - arIntensity).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.45"
                      step="0.05"
                      value={arIntensity}
                      onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-stone-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* History Panel */}
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <h3 className={`text-sm font-black uppercase tracking-wider ${titleClass} border-b pb-2`}>
                {lang === 'tr' ? 'Son Antrenmanlar' : 'Workout History'}
              </h3>

              {trainingHistory.length === 0 ? (
                <p className="text-xs opacity-65 text-center py-4 font-bold">
                  {lang === 'tr' ? 'Henüz antrenman seansı bulunmuyor.' : 'No workout sessions completed yet.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto custom-note-scrollbar pr-1">
                  {trainingHistory.slice(0, 5).map((item: any) => (
                    <div key={item.id} className={`p-2.5 rounded-xl border text-[11px] flex flex-col gap-1 ${isLightTheme ? 'bg-stone-50 border-stone-150' : 'bg-zinc-900/10 border-zinc-900'}`}>
                      <div className="flex justify-between items-center">
                        <strong className={titleClass}>{item.type}</strong>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{item.score} Pts</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] opacity-60">
                        <span>Süre: {item.duration}s | Doğruluk: %{item.accuracy}</span>
                        <span>{item.completedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual rest overlay active view */}
      {activeModule === 'eyerest' && (
        <div className={`p-8 rounded-3xl border ${surfaceClass} flex flex-col items-center justify-center min-h-[300px] text-center gap-6`}>
          <div className="h-20 w-20 rounded-full bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 text-3xl font-black">
            {manualRestTime}s
          </div>
          <h3 className={`text-lg font-black ${titleClass}`}>{t('tr_lab_eye_rest_title' as any)}</h3>
          <p className={`text-xs max-w-md leading-relaxed ${mutedClass}`}>
            {lang === 'tr' 
              ? '20-20-20 kuralı gereğince 20 saniye boyunca uzağa bakarak gözlerinizi dinlendirin. Bu mola, uzun okumalarda odağınızı taze tutmanızı sağlar.' 
              : 'Rest your eyes by looking at an object 20 feet away for 20 seconds. This break helps maintain cognitive attention during reading.'}
          </p>
          <div className="flex gap-3 max-w-xs w-full">
            <button
              onClick={() => {
                setManualRestActive(false);
                setActiveModule(null);
              }}
              className="flex-1 h-9 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 cursor-pointer"
            >
              {lang === 'tr' ? 'Atla' : 'Skip'}
            </button>
          </div>
        </div>
      )}

      {/* Schulte Grid active view */}
      <SchulteTraining
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        lang={lang}
        t={t as any}
        isLightTheme={isLightTheme}
        titleClass={titleClass}
        mutedClass={mutedClass}
        surfaceClass={surfaceClass}
        onSaveSession={onSaveSession}
      />

      {/* Saccade Dot Jump active view */}
      <SaccadeTraining
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        lang={lang}
        t={t as any}
        isLightTheme={isLightTheme}
        titleClass={titleClass}
        mutedClass={mutedClass}
        surfaceClass={surfaceClass}
        onSaveSession={onSaveSession}
      />

      {/* Word Expansion active view */}
      <WordExpansionTraining
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        lang={lang}
        t={t as any}
        isLightTheme={isLightTheme}
        titleClass={titleClass}
        mutedClass={mutedClass}
        surfaceClass={surfaceClass}
        onSaveSession={onSaveSession}
        books={books}
      />

      {/* Diagnostic Assessment Test active view */}
      {activeModule === 'diagnostic' && (
        <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className={`text-base font-black ${titleClass}`}>
              {t('tr_lab_start_test' as any)}
            </h3>
            <button
              onClick={() => {
                setActiveModule(null);
                setDiagStep(0);
              }}
              className="h-8 px-3 rounded-lg border text-xs font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 cursor-pointer"
            >
              {lang === 'tr' ? 'Testi Kapat' : 'Cancel Test'}
            </button>
          </div>

          {/* Diagnostic Step 0: Intro */}
          {diagStep === 0 && (
            <div className="flex flex-col gap-4 py-4">
              <p className="text-xs leading-relaxed">
                {lang === 'tr' 
                  ? 'Bu test, güncel okuma hızınızı (WPM), kavrama doğruluğunuzu ve Schulte grid sayı tarama hızınızı ölçerek başlangıç seviyenizi belirler. Test yaklaşık 2 dakika sürer.'
                  : 'This assessment evaluates your current reading speed (WPM), comprehension accuracy, and Schulte grid scan time to establish your baseline level. Takes about 2 minutes.'}
              </p>
              <button
                onClick={() => {
                  setDiagStep(1);
                  setDiagReadStart(Date.now());
                }}
                className="h-10 w-fit px-6 rounded-xl bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-bold cursor-pointer"
              >
                {t('tr_lab_test_start_btn' as any)}
              </button>
            </div>
          )}

          {/* Diagnostic Step 1: Reading Speed Test */}
          {diagStep === 1 && (
            <div className="flex flex-col gap-4 py-4">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 w-fit px-2 py-0.5 rounded">Adım 1: Okuma Hızı</span>
              <p className="text-sm font-semibold leading-loose p-4 rounded-xl border bg-black/5 dark:bg-white/5 select-none">
                {lang === 'tr' 
                  ? 'Hızlı okuma, göz kaslarının eğitilmesi ve kelimelerin tek tek seslendirilmesi yerine bütünsel olarak algılanması sürecidir. Gözümüz satır üzerinde akarken duraksamalar yaşar. RSVP ve ORP gibi teknikler bu duraksama sürelerini en aza indirerek beynin anlama kapasitesini artırır.'
                  : 'Speed reading is a method of educating your eye muscles to perceive word groups instantly, rather than subvocalizing each word individually. RSVP and ORP visual techniques minimize eye regressions and maximize the cognitive comprehension capacity of the human brain.'}
              </p>
              <button
                onClick={() => {
                  setDiagStep(2);
                }}
                className="h-10 w-fit px-6 rounded-xl bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'tr' ? 'Okumayı Bitirdim' : 'Completed Reading'}
              </button>
            </div>
          )}

          {/* Diagnostic Step 2: Q1 */}
          {diagStep === 2 && (
            <div className="flex flex-col gap-4 py-4">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 w-fit px-2 py-0.5 rounded">Adım 2: Kavrama Testi - Soru 1</span>
              <p className="text-xs font-bold">{lang === 'tr' ? 'Hızlı okuma sürecinde beynin anlama kapasitesini artıran görsel yöntemler hangileridir?' : 'Which visual techniques maximize cognitive comprehension capacity in speed reading?'}</p>
              <div className="grid grid-cols-1 gap-2.5 max-w-md">
                {[
                  lang === 'tr' ? 'RSVP ve ORP vizör teknikleri' : 'RSVP and ORP visual techniques',
                  lang === 'tr' ? 'Sesli okuma yöntemleri' : 'Auditory vocalization methods',
                  lang === 'tr' ? 'Sadece göz egzersizleri' : 'Basic eye workouts only'
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (idx === 0) setDiagCompCorrect(prev => prev + 1);
                      setDiagStep(3);
                    }}
                    className="p-3 rounded-xl border text-xs font-semibold text-left hover:bg-indigo-50/15 cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Step 3: Q2 */}
          {diagStep === 3 && (
            <div className="flex flex-col gap-4 py-4">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 w-fit px-2 py-0.5 rounded">Adım 2: Kavrama Testi - Soru 2</span>
              <p className="text-xs font-bold">{lang === 'tr' ? 'Hızlı okuma için göz kaslarının nasıl eğitilmesi önerilir?' : 'How is reading speed improved according to the passage?'}</p>
              <div className="grid grid-cols-1 gap-2.5 max-w-md">
                {[
                  lang === 'tr' ? 'Kelimeleri tek tek içimizden seslendirerek' : 'By vocalizing each word individually inside',
                  lang === 'tr' ? 'Kelimeleri bütünsel olarak algılayıp duraksamaları azaltarak' : 'By perceiving word blocks and minimizing fixation pauses',
                  lang === 'tr' ? 'Uzun süre ara vermeden okuyarak' : 'By reading without taking rest breaks'
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (idx === 1) setDiagCompCorrect(prev => prev + 1);
                      setDiagStep(4);
                      startSchulte(3); // start schulte inside diagnostic
                    }}
                    className="p-3 rounded-xl border text-xs font-semibold text-left hover:bg-indigo-50/15 cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Step 4: Schulte Grid */}
          {diagStep === 4 && (
            <div className="flex flex-col gap-4 py-4">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 w-fit px-2 py-0.5 rounded">Adım 3: Sayı Taraması (Schulte 3x3)</span>
              
              <div className="flex flex-col items-center gap-4">
                {!schulteDone ? (
                  <div 
                    className="grid gap-2 p-2 rounded-2xl border"
                    style={{
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      width: '260px',
                      height: '260px'
                    }}
                  >
                    {schulteNumbers.map((num, idx) => {
                      const isWrong = schulteWrongIdx === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (num === schulteExpected) {
                              if (num === 9) {
                                setSchulteDone(true);
                                const dur = Math.floor((Date.now() - (schulteStartTime || 0)) / 1000);
                                setDiagSchulteTime(dur);
                                setTimeout(() => {
                                  setDiagStep(5);
                                  setExpansionLevel(2);
                                  setExpansionRound(0);
                                  setExpansionScore(0);
                                  setExpansionState('flashing');
                                  startWordExpansionRound();
                                }, 1500);
                              } else {
                                setSchulteExpected(prev => prev + 1);
                              }
                            } else {
                              setSchulteWrongIdx(idx);
                              setTimeout(() => setSchulteWrongIdx(null), 300);
                            }
                          }}
                          className={`rounded-xl border font-bold text-sm grid place-items-center transition-all cursor-pointer ${
                            isWrong 
                              ? 'bg-rose-500/20 border-rose-500 text-rose-400 scale-95' 
                              : 'bg-zinc-900/10 hover:bg-zinc-900/30'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-xs font-bold text-emerald-500">
                    {lang === 'tr' ? 'Tamamlandı! Sonraki adıma geçiliyor...' : 'Completed! Proceeding to next step...'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Step 5: Word Expansion */}
          {diagStep === 5 && (
            <div className="flex flex-col gap-4 py-4">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 w-fit px-2 py-0.5 rounded">Adım 4: Kelime Algılama Genişliği</span>
              
              <div className="flex flex-col items-center gap-4">
                {expansionState === 'flashing' && (
                  <div className="h-28 w-full max-w-sm border rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5">
                    <span className="text-xl font-black text-indigo-500">{expansionWord}</span>
                  </div>
                )}

                {expansionState === 'question' && (
                  <div className="w-full max-w-sm flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {expansionOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            const isCorrect = opt === expansionWord;
                            const newScore = expansionScore + (isCorrect ? 20 : 0);
                            const nextRound = expansionRound + 1;
                            
                            setExpansionScore(newScore);
                            
                            if (nextRound >= 3) {
                              setDiagWordScore(newScore);
                              completeDiagnostic(diagCompCorrect, diagSchulteTime, newScore);
                            } else {
                              setExpansionRound(nextRound);
                              startWordExpansionRound();
                            }
                          }}
                          className="p-2.5 rounded-xl border text-[11px] font-bold text-center hover:bg-indigo-50/15 cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnostic Step 6: Result */}
          {diagStep === 6 && (
            <div className="flex flex-col gap-4 py-4 items-center text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xl font-black grid place-items-center">
                ✓
              </div>
              <h4 className="text-lg font-black text-emerald-500">{t('tr_lab_test_completed' as any)}</h4>
              
              <div className="p-4 border rounded-2xl w-full max-w-sm text-xs flex flex-col gap-2.5">
                <div className="flex justify-between border-b pb-1.5">
                  <span>Okuma Hızı (WPM):</span>
                  <strong>{diagReadWpm} WPM</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span>Anlama Testi:</span>
                  <strong>{diagCompCorrect} / 2</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span>Schulte Arama Hızı:</span>
                  <strong>{diagSchulteTime}s</strong>
                </div>
                <div className="flex justify-between text-indigo-400 font-bold pt-1">
                  <span>Seviye Seviyeniz:</span>
                  <span className="uppercase">{t(`tr_lab_level_${trainingLevel}` as any)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveModule(null);
                }}
                className="h-10 px-6 rounded-xl bg-indigo-650 text-white text-xs font-bold mt-2 cursor-pointer"
              >
                {lang === 'tr' ? 'Panele Dön' : 'Return to Panel'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
