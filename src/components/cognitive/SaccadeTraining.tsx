import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, X, EyeOff } from 'lucide-react';

interface SaccadeTrainingProps {
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

export default function SaccadeTraining({
  activeModule,
  setActiveModule,
  lang,
  t,
  isLightTheme,
  titleClass,
  mutedClass,
  surfaceClass,
  onSaveSession
}: SaccadeTrainingProps) {
  const [saccadeType, setSaccadeType] = useState<'horizontal' | 'vertical' | 'diagonal' | 'random'>('horizontal');
  const [saccadeSpeed, setSaccadeSpeed] = useState<number>(600); // ms
  const [saccadeDuration, setSaccadeDuration] = useState<number>(30); // seconds
  const [saccadeTimeRemaining, setSaccadeTimeRemaining] = useState<number>(30);
  const [saccadeActiveState, setSaccadeActiveState] = useState<'idle' | 'playing'>('idle');
  const [saccadeDotPos, setSaccadeDotPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [saccadeStartTime, setSaccadeStartTime] = useState<number | null>(null);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  
  const saccadeTimerInterval = useRef<any>(null);
  const saccadeCountdownInterval = useRef<any>(null);
  const saccadeTypeRef = useRef(saccadeType);
  const saccadeSpeedRef = useRef(saccadeSpeed);

  useEffect(() => {
    saccadeTypeRef.current = saccadeType;
  }, [saccadeType]);

  useEffect(() => {
    saccadeSpeedRef.current = saccadeSpeed;
  }, [saccadeSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (saccadeTimerInterval.current) clearInterval(saccadeTimerInterval.current);
      if (saccadeCountdownInterval.current) clearInterval(saccadeCountdownInterval.current);
    };
  }, [isZenMode]);

  const changeSaccadeConfig = (newSpeed: number, newType: 'horizontal' | 'vertical' | 'diagonal' | 'random') => {
    if (saccadeTimerInterval.current) {
      clearInterval(saccadeTimerInterval.current);
      saccadeTimerInterval.current = null;
    }
    
    const interval = setInterval(() => {
      setSaccadeDotPos((prev) => {
        if (newType === 'horizontal') {
          const nextX = prev.x <= 20 ? 85 : 15;
          return { x: nextX, y: 50 };
        } else if (newType === 'vertical') {
          const nextY = prev.y <= 20 ? 85 : 15;
          return { x: 50, y: nextY };
        } else if (newType === 'diagonal') {
          const nextX = prev.x <= 20 ? 85 : 15;
          const nextY = prev.y <= 20 ? 85 : 15;
          return { x: nextX, y: nextY };
        } else {
          return { x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 };
        }
      });
    }, newSpeed);
    
    saccadeTimerInterval.current = interval;
  };

  const startSaccade = () => {
    setIsZenMode(false);
    setSaccadeStartTime(Date.now());
    setSaccadeActiveState('playing');
    setSaccadeTimeRemaining(saccadeDuration);
    setActiveModule('saccade');
    
    changeSaccadeConfig(saccadeSpeed, saccadeType);

    let secondsLeft = saccadeDuration;
    const countInterval = setInterval(() => {
      secondsLeft -= 1;
      setSaccadeTimeRemaining(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(countInterval);
        if (saccadeTimerInterval.current) {
          clearInterval(saccadeTimerInterval.current);
          saccadeTimerInterval.current = null;
        }
        saccadeCountdownInterval.current = null;
        onSaveSession({ type: 'Saccade Workout', duration: saccadeDuration, score: Math.min(100, saccadeDuration * 2), accuracy: 100 });
        setSaccadeStartTime(null);
        setSaccadeActiveState('idle');
        setIsZenMode(false);
      }
    }, 1000);
    saccadeCountdownInterval.current = countInterval;
  };

  const stopSaccade = () => {
    setIsZenMode(false);
    if (saccadeTimerInterval.current) {
      clearInterval(saccadeTimerInterval.current);
      saccadeTimerInterval.current = null;
    }
    if (saccadeCountdownInterval.current) {
      clearInterval(saccadeCountdownInterval.current);
      saccadeCountdownInterval.current = null;
    }

    if (saccadeStartTime) {
      const dur = Math.floor((Date.now() - saccadeStartTime) / 1000);
      onSaveSession({ type: 'Saccade Workout', duration: dur, score: Math.min(100, dur * 2), accuracy: 100 });
    }
    setSaccadeStartTime(null);
    setSaccadeActiveState('idle');
    setActiveModule(null);
  };

  if (activeModule !== 'saccade') return null;

  if (isZenMode && saccadeActiveState === 'playing') {
    return (
      <div className="fixed inset-0 z-50 bg-black text-zinc-100 flex flex-col justify-center items-center overflow-hidden">
        <button 
          onClick={() => setIsZenMode(false)} 
          title={lang === 'tr' ? 'Odak modundan çık (ESC)' : 'Exit focus mode (ESC)'} 
          className="absolute top-6 right-6 z-50 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-lg"
        >
          <X className="w-4 h-4" />
          <span>{lang === 'tr' ? 'Odak Modundan Çık' : 'Exit Focus Mode'}</span>
        </button>

        <div className="w-full h-full relative bg-black">
          <div 
            className="w-5 h-5 rounded-full bg-indigo-500 absolute transition-all duration-100 shadow-lg shadow-indigo-500/50"
            style={{
              left: `${saccadeDotPos.x}%`,
              top: `${saccadeDotPos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />

          <div className="absolute top-6 left-6 px-3.5 py-1.5 rounded-xl bg-zinc-900/60 text-xs font-bold text-white border border-zinc-800/40 backdrop-blur">
            {lang === 'tr' ? 'Kalan Süre' : 'Time Left'}: {saccadeTimeRemaining}s
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
      <div className="flex justify-between items-center border-b pb-3">
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>{t('tr_lab_saccade_title')}</h3>
          <p className={`text-xs mt-0.5 ${mutedClass}`}>{t('tr_lab_saccade_desc')}</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="flex gap-1.5 mr-2">
            {(['horizontal', 'vertical', 'diagonal', 'random'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSaccadeType(type);
                  if (saccadeActiveState === 'playing') {
                    changeSaccadeConfig(saccadeSpeed, type);
                  }
                }}
                className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all capitalize ${
                  saccadeType === type ? 'bg-indigo-650 text-white' : 'opacity-60'
                }`}
              >
                {type === 'horizontal' ? (lang === 'tr' ? 'Yatay' : 'Horizontal') :
                 type === 'vertical' ? (lang === 'tr' ? 'Dikey' : 'Vertical') :
                 type === 'diagonal' ? (lang === 'tr' ? 'Çapraz' : 'Diagonal') :
                 (lang === 'tr' ? 'Rastgele' : 'Random')}
              </button>
            ))}
          </div>

          {saccadeActiveState === 'playing' && (
            <button
              onClick={() => {
                if (saccadeTimerInterval.current) clearInterval(saccadeTimerInterval.current);
                if (saccadeCountdownInterval.current) clearInterval(saccadeCountdownInterval.current);
                saccadeTimerInterval.current = null;
                saccadeCountdownInterval.current = null;
                setSaccadeStartTime(null);
                setSaccadeActiveState('idle');
                setIsZenMode(false);
              }}
              title={lang === 'tr' ? 'Egzersizi İptal Et' : 'Cancel Exercise'}
              className="h-8 w-8 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-450 hover:bg-rose-500/20 cursor-pointer flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={stopSaccade}
            title={lang === 'tr' ? 'Eğitim Laboratuvarı\'na Dön' : 'Return to Lab'}
            className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-stone-50 dark:hover:bg-zinc-900 cursor-pointer ml-2 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saccadeActiveState === 'idle' ? (
        <div className="flex flex-col gap-6 max-w-md mx-auto w-full py-4 text-xs">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold">{lang === 'tr' ? 'Dot Hızı (milisaniye)' : 'Dot Speed (ms)'}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="50"
                  max="3000"
                  value={saccadeSpeed}
                  onChange={(e) => setSaccadeSpeed(Math.max(50, parseInt(e.target.value) || 600))}
                  className="w-16 px-1.5 py-0.5 border rounded text-center bg-black/10 dark:bg-white/10 font-bold font-mono text-indigo-400"
                />
                <span>ms</span>
              </div>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="1"
              value={saccadeSpeed}
              onChange={(e) => setSaccadeSpeed(parseInt(e.target.value))}
              className="w-full h-1 bg-stone-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className={`text-[10px] ${mutedClass}`}>
              {lang === 'tr' ? 'Düşük milisaniye değerleri hedefin daha hızlı sıçramasını sağlar.' : 'Lower values make the target jump faster.'}
            </span>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold">{lang === 'tr' ? 'Egzersiz Süresi (Saniye)' : 'Workout Duration (Seconds)'}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={saccadeDuration}
                  onChange={(e) => setSaccadeDuration(Math.max(5, parseInt(e.target.value) || 30))}
                  className="w-16 px-1.5 py-0.5 border rounded text-center bg-black/10 dark:bg-white/10 font-bold font-mono text-indigo-400"
                />
                <span>s</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 60, 120].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setSaccadeDuration(dur)}
                  className={`h-8 rounded-lg border text-xs font-bold transition-all ${
                    saccadeDuration === dur ? 'bg-indigo-650 text-white' : 'opacity-70'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSaccade}
            className="h-10 w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black"
          >
            {lang === 'tr' ? 'Egzersizi Başlat' : 'Start Workout'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full h-80 rounded-2xl border bg-black/5 dark:bg-white/5 relative overflow-hidden">
            <div 
              className="w-4 h-4 rounded-full bg-indigo-600 absolute transition-all duration-100 shadow-lg shadow-indigo-600/50"
              style={{
                left: `${saccadeDotPos.x}%`,
                top: `${saccadeDotPos.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />

            <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/40 text-[10px] font-bold text-white backdrop-blur">
              {lang === 'tr' ? 'Kalan Süre' : 'Time Left'}: {saccadeTimeRemaining}s
            </div>
          </div>

          <div className="w-full max-w-md flex flex-col gap-2 mt-2 px-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold opacity-80">{lang === 'tr' ? 'Canlı Hız Ayarı (ms):' : 'Live Speed Adjust (ms):'}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="50"
                  max="3000"
                  value={saccadeSpeed}
                  onChange={(e) => {
                    const val = Math.max(50, parseInt(e.target.value) || 600);
                    setSaccadeSpeed(val);
                    changeSaccadeConfig(val, saccadeType);
                  }}
                  className="w-16 px-1.5 py-0.5 border rounded text-center bg-black/10 dark:bg-white/10 font-bold font-mono text-indigo-400"
                />
                <span>ms</span>
              </div>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="1"
              value={saccadeSpeed}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSaccadeSpeed(val);
                changeSaccadeConfig(val, saccadeType);
              }}
              className="w-full h-1 bg-stone-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <p className="text-[10px] text-amber-500 max-w-lg leading-relaxed text-center font-bold">
            {t('tr_lab_saccade_safety_alert')}
          </p>

          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => setIsZenMode(true)}
              className="h-10 px-6 rounded-xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer text-stone-700 dark:text-zinc-300"
            >
              <EyeOff className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Odak Modu' : 'Focus Mode'}</span>
            </button>

            <button
              onClick={() => {
                  setSaccadeActiveState('idle');
                  if (saccadeTimerInterval.current) clearInterval(saccadeTimerInterval.current);
                  if (saccadeCountdownInterval.current) clearInterval(saccadeCountdownInterval.current);
                  saccadeTimerInterval.current = null;
                  saccadeCountdownInterval.current = null;
                  if (saccadeStartTime) {
                    const dur = Math.floor((Date.now() - saccadeStartTime) / 1000);
                    onSaveSession({ type: 'Saccade Workout', duration: dur, score: Math.min(100, dur * 2), accuracy: 100 });
                  }
                  setSaccadeStartTime(null);
                  setIsZenMode(false);
              }}
              className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold animate-pulse cursor-pointer"
            >
              {lang === 'tr' ? 'Durdur ve Tamamla' : 'Stop and Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
