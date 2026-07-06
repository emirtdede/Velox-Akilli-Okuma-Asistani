import React, { useState, useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';

interface SchulteTrainingProps {
  activeModule: string | null;
  setActiveModule: (m: string | null) => void;
  lang: string;
  t: (key: string) => string;
  isLightTheme: boolean;
  titleClass: string;
  mutedClass: string;
  surfaceClass: string;
  onSaveSession: (session: any) => void;
}

export default function SchulteTraining({
  activeModule,
  setActiveModule,
  lang,
  t,
  isLightTheme,
  titleClass,
  mutedClass,
  surfaceClass,
  onSaveSession
}: SchulteTrainingProps) {
  const [schulteSize, setSchulteSize] = useState<number>(3);
  const [schulteNumbers, setSchulteNumbers] = useState<number[]>([]);
  const [schulteExpected, setSchulteExpected] = useState<number>(1);
  const [schulteMisses, setSchulteMisses] = useState<number>(0);
  const [schulteStartTime, setSchulteStartTime] = useState<number | null>(null);
  const [schulteTimer, setSchulteTimer] = useState<number>(0);
  const [schulteDone, setSchulteDone] = useState(false);
  const [schulteWrongIdx, setSchulteWrongIdx] = useState<number | null>(null);

  useEffect(() => {
    if (schulteStartTime === null || schulteDone || activeModule !== 'schulte') return;
    const interval = setInterval(() => {
      setSchulteTimer(Math.floor((Date.now() - schulteStartTime) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [schulteStartTime, schulteDone, activeModule]);

  const startSchulte = (size: number) => {
    setSchulteSize(size);
    const count = size * size;
    const nums = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setSchulteNumbers(nums);
    setSchulteExpected(1);
    setSchulteMisses(0);
    setSchulteDone(false);
    setSchulteStartTime(Date.now());
    setSchulteTimer(0);
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

  if (activeModule !== 'schulte') return null;

  return (
    <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>{t('tr_lab_schulte_title')}</h3>
          <p className={`text-xs mt-0.5 ${mutedClass}`}>
            {lang === 'tr' 
              ? 'Sayıları 1\'den başlayarak sırayla en hızlı şekilde bulun.' 
              : 'Find the numbers in consecutive order starting from 1.'}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          {schulteNumbers.length === 0 ? (
            <>
              {[3, 4, 5, 6].map((s) => (
                <button
                  key={s}
                  onClick={() => setSchulteSize(s)}
                  className={`h-8 px-3 rounded-lg border text-xs font-bold transition-all ${
                    schulteSize === s ? 'bg-indigo-650 text-white' : 'opacity-60'
                  }`}
                >
                  {s}x{s}
                </button>
              ))}
            </>
          ) : (
            <button
              onClick={() => {
                setSchulteNumbers([]);
                setSchulteStartTime(null);
                setSchulteTimer(0);
                setSchulteDone(false);
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
              setSchulteNumbers([]);
              setSchulteStartTime(null);
              setSchulteTimer(0);
              setSchulteDone(false);
            }}
            title={lang === 'tr' ? 'Eğitim Laboratuvarı\'na Dön' : 'Return to Lab'}
            className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-stone-50 dark:hover:bg-zinc-900 cursor-pointer ml-2 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {schulteNumbers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
          <p className="text-xs max-w-md leading-relaxed">
            {lang === 'tr'
              ? 'Schulte Grid, periferik görme alanınızı genişletmek ve okuma esnasında kelime gruplarını daha hızlı taramak için mükemmel bir antrenmandır. Seçtiğiniz boyutta tabloyu başlatın.'
              : 'Schulte Grid is a perfect exercise to expand your peripheral vision and scan word groups faster during reading. Start the grid at your chosen size.'}
          </p>
          <button
            onClick={() => startSchulte(schulteSize)}
            className="h-10 w-full max-w-md mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black"
          >
            {lang === 'tr' ? 'Egzersizi Başlat' : 'Start Workout'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
          <div className="flex flex-col gap-3 min-w-[150px]">
            <div className="p-3 rounded-xl border text-center">
              <span className="text-[9px] uppercase opacity-60 block">Süre</span>
              <span className="text-xl font-mono font-black">{schulteTimer}s</span>
            </div>
            <div className="p-3 rounded-xl border text-center">
              <span className="text-[9px] uppercase opacity-60 block">Hedef Sayı</span>
              <span className="text-xl font-mono font-black text-indigo-500">{schulteExpected}</span>
            </div>
            <div className="p-3 rounded-xl border text-center">
              <span className="text-[9px] uppercase opacity-60 block">Hata Sayısı</span>
              <span className="text-xl font-mono font-black text-rose-500">{schulteMisses}</span>
            </div>
          </div>

          {!schulteDone ? (
            <div 
              className="grid gap-2 p-2 rounded-2xl border"
              style={{
                gridTemplateColumns: `repeat(${schulteSize}, minmax(0, 1fr))`,
                width: 'min(360px, 85vw)',
                height: 'min(360px, 85vw)'
              }}
            >
              {schulteNumbers.map((num, idx) => {
                const isWrong = schulteWrongIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSchulteClick(num, idx)}
                    className={`rounded-xl border font-bold text-sm md:text-base grid place-items-center transition-all ${
                      isWrong 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400 scale-95' 
                        : 'bg-zinc-900/10 hover:bg-zinc-900/30 active:scale-95'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border max-w-sm text-center flex flex-col gap-4">
              <h4 className="text-lg font-black text-emerald-500">{lang === 'tr' ? 'Tebrikler!' : 'Well Done!'}</h4>
              <p className="text-xs">
                {lang === 'tr' ? (
                  <>
                    {schulteSize}x{schulteSize} Schulte tablosunu <strong className="font-extrabold">{schulteTimer} saniyede</strong> ve <strong className="font-extrabold">{schulteMisses} hata</strong> ile tamamladınız.
                  </>
                ) : (
                  <>
                    You completed the {schulteSize}x{schulteSize} Schulte grid in <strong className="font-extrabold">{schulteTimer} seconds</strong> with <strong className="font-extrabold">{schulteMisses} errors</strong>.
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => startSchulte(schulteSize)}
                  className="flex-1 h-9 rounded-xl bg-indigo-650 text-white text-xs font-bold"
                >
                  {lang === 'tr' ? 'Tekrar Çöz' : 'Solve Again'}
                </button>
                <button
                  onClick={() => {
                    setSchulteNumbers([]);
                    setSchulteStartTime(null);
                    setSchulteTimer(0);
                    setSchulteDone(false);
                  }}
                  className="flex-1 h-9 rounded-xl border text-xs font-bold"
                >
                  {lang === 'tr' ? 'Egzersiz Seçimi' : 'Back to Selection'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
