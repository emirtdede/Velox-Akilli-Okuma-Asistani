/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookMark, ThemeType, THEMES, ReadingMode, ThemeConfig } from '../types';
import { calculateOrp } from '../utils/parsers';
import { useTranslation } from '../utils/i18n';
import {
  ChevronLeft,
  ChevronDown,
  Search,
  Keyboard,
  Pause,
  Play,
  RotateCw,
  Settings2,
  Volume2,
  Info,
  Maximize,
  Minimize,
  Eye,
  EyeOff
} from 'lucide-react';

interface SpeedReaderProps {
  book: BookMark;
  books?: BookMark[];
  onSwitchBook?: (book: BookMark) => void;
  themeType: ThemeType;
  onClose: () => void;
  onUpdateProgress: (index: number, progressPercent: number, speed: number, groupSize: number) => void;
  onSaveSummary: (summary: any) => void;
  onSaveDifficulty: (difficulty: any) => void;
  aiEnabled?: boolean;
}

export default function SpeedReader({
  book,
  books = [],
  onSwitchBook,
  themeType,
  onClose,
  onUpdateProgress
}: SpeedReaderProps) {
  const { t, lang } = useTranslation();
  const currentTheme: ThemeConfig = THEMES[themeType] || THEMES.dark;
  const words = useMemo(() => book.content.trim().split(/\s+/).filter(Boolean), [book.content]);
  const totalWords = words.length;

  const modeLabels: Record<ReadingMode, string> = {
    center: lang === 'tr' ? 'Merkez Modu (RSVP)' : 'Center Mode (RSVP)',
    line: lang === 'tr' ? 'Satır Modu (Linear)' : 'Line Mode (Linear)',
    teleprompter: 'Teleprompter',
    bionic: 'Bionic Reading',
    highlight: lang === 'tr' ? 'Paragraf Vurgu' : 'Paragraph Highlight'
  };

  const [showBookSelector, setShowBookSelector] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const bookSelectorRef = useRef<HTMLDivElement>(null);

  const displayedBooks = useMemo(() => {
    const sorted = [...books].sort((left, right) => {
      const leftDate = left.lastReadDate || '';
      const rightDate = right.lastReadDate || '';
      return rightDate.localeCompare(leftDate);
    });

    if (!bookSearchQuery.trim()) {
      return sorted.slice(0, 10);
    }

    const query = bookSearchQuery.toLowerCase();
    return sorted.filter(b => b.title.toLowerCase().includes(query));
  }, [books, bookSearchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bookSelectorRef.current && !bookSelectorRef.current.contains(event.target as Node)) {
        setShowBookSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(book.currentWordIndex || 0);
  const [speedWpm, setSpeedWpm] = useState(book.speedWpm || 250);
  const [groupSize, setGroupSize] = useState(book.groupSize || 1);

  useEffect(() => {
    setCurrentIndex(book.currentWordIndex || 0);
    setSpeedWpm(book.speedWpm || 250);
    setGroupSize(book.groupSize || 1);
    setIsPlaying(false);
  }, [book]);

  const [readingMode, setReadingMode] = useState<ReadingMode>('center');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOrp, setIsOrp] = useState(true);
  const [smartPauses, setSmartPauses] = useState(true);
  const [showFocusGuides, setShowFocusGuides] = useState(() => {
    try {
      const stored = localStorage.getItem('velox_focus_guides') ?? localStorage.getItem('readflow_focus_guides');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [showTools, setShowTools] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error("Fullscreen error:", err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isZenMode) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch((err) => {
          console.error("Fullscreen error on zen activation:", err);
        });
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch((err) => {
          console.error("Fullscreen error on zen deactivation:", err);
        });
      }
    }
  }, [isZenMode]);

  const audioContextRef = useRef<AudioContext | null>(null);

  const currentWordGroup = useMemo(() => {
    return words.slice(currentIndex, Math.min(totalWords, currentIndex + Math.max(1, groupSize)));
  }, [words, currentIndex, groupSize, totalWords]);

  const progressPercent = totalWords > 0 ? Math.round((currentIndex / totalWords) * 100) : 0;

  useEffect(() => {
    onUpdateProgress(currentIndex, progressPercent, speedWpm, groupSize);
  }, [currentIndex, progressPercent, speedWpm, groupSize, onUpdateProgress]);

  useEffect(() => {
    try {
      localStorage.setItem('velox_focus_guides', String(showFocusGuides));
    } catch {
      // Best effort preference persistence.
    }
  }, [showFocusGuides]);

  const playTick = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(760, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio is optional.
    }
  };

  const getDelayMs = () => {
    const baseDelay = Math.max(40, 60000 / Math.max(1, speedWpm));
    if (!smartPauses || currentWordGroup.length === 0) return baseDelay;

    const lastWord = currentWordGroup[currentWordGroup.length - 1] || '';
    if (/[.!?]$/.test(lastWord)) return baseDelay + 300;
    if (/[,;:]$/.test(lastWord)) return baseDelay + 140;
    if (lastWord.replace(/[^\wçğıöşüÇĞİÖŞÜ]/g, '').length > 12) return baseDelay + 90;
    return baseDelay;
  };

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      setCurrentIndex(prev => {
        const next = Math.min(totalWords, prev + Math.max(1, groupSize));
        if (next >= totalWords) setIsPlaying(false);
        return next;
      });
      playTick();
    }, getDelayMs());

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentIndex, speedWpm, groupSize, smartPauses, totalWords, currentWordGroup]);

  const shortcuts = useMemo(() => {
    try {
      const stored = localStorage.getItem('velox_shortcuts');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      playPause: 'Space',
      back10: 'ArrowLeft',
      forward10: 'ArrowRight',
      speedUp: 'ArrowUp',
      speedDown: 'ArrowDown',
      exit: 'Escape'
    };
  }, []);

  useEffect(() => {
    const matchShortcut = (e: KeyboardEvent, shortcutStr: string): boolean => {
      if (!shortcutStr) return false;
      const parts = shortcutStr.split(' + ').map(p => p.trim());
      const hasCtrl = parts.includes('Ctrl');
      const hasShift = parts.includes('Shift');
      const hasAlt = parts.includes('Alt');
      const hasMeta = parts.includes('Meta');
      
      const mainKey = parts.find(p => !['Ctrl', 'Shift', 'Alt', 'Meta'].includes(p)) || '';
      
      if (e.ctrlKey !== hasCtrl) return false;
      if (e.shiftKey !== hasShift) return false;
      if (e.altKey !== hasAlt) return false;
      if (e.metaKey !== hasMeta) return false;
      
      const eventMainKey = e.code === 'Space' ? 'Space' : e.code;
      return eventMainKey.toLowerCase() === mainKey.toLowerCase() || 
             e.key.toLowerCase() === mainKey.toLowerCase();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (matchShortcut(event, shortcuts.playPause)) {
        event.preventDefault();
        setIsPlaying(prev => !prev);
      }
      if (matchShortcut(event, shortcuts.back10)) {
        event.preventDefault();
        handleNavigate(-10);
      }
      if (matchShortcut(event, shortcuts.forward10)) {
        event.preventDefault();
        handleNavigate(10);
      }
      if (matchShortcut(event, shortcuts.speedUp)) {
        event.preventDefault();
        setSpeedWpm(prev => Math.min(1500, prev + 25));
      }
      if (matchShortcut(event, shortcuts.speedDown)) {
        event.preventDefault();
        setSpeedWpm(prev => Math.max(50, prev - 25));
      }
      if (matchShortcut(event, shortcuts.exit)) {
        event.preventDefault();
        if (isZenMode) {
          setIsZenMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isZenMode, shortcuts]);

  const handleNavigate = (delta: number) => {
    setCurrentIndex(prev => Math.min(totalWords, Math.max(0, prev + delta)));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const increaseGroupSize = () => {
    setGroupSize(prev => {
      const next = prev + 1;
      if (next > 1) setIsOrp(false);
      return next;
    });
  };

  const decreaseGroupSize = () => {
    setGroupSize(prev => {
      const next = Math.max(1, prev - 1);
      if (next === 1 && readingMode === 'center') setIsOrp(true);
      return next;
    });
  };

  const renderCenterWord = () => {
    if (currentWordGroup.length === 0) return <span className="opacity-40">Tamamlandı</span>;
    if (groupSize !== 1 || !isOrp) {
      return <span className="break-words px-4">{currentWordGroup.join(' ')}</span>;
    }

    const word = currentWordGroup[0] || '';
    const orp = calculateOrp(word);
    return (
      <span className="font-mono tracking-tight flex items-center justify-center z-10 min-w-0 max-w-full px-4">
        <span className="text-right flex-1 opacity-45 pr-0.5">{orp.prefix}</span>
        <span className="text-[#4A6CFF] font-extrabold shrink-0">{orp.focus}</span>
        <span className="text-left flex-1 opacity-90 pl-0.5">{orp.suffix}</span>
      </span>
    );
  };

  const renderReadingStage = () => {
    if (readingMode === 'line') {
      return (
        <div className="text-center px-6 flex flex-col gap-4">
          <div className="text-sm opacity-35 truncate">{words.slice(Math.max(0, currentIndex - 8), currentIndex).join(' ')}</div>
          <div className="text-3xl md:text-4xl font-extrabold text-[#4A6CFF]">{currentWordGroup.join(' ') || 'Tamamlandı'}</div>
          <div className="text-sm opacity-35 truncate">{words.slice(currentIndex + groupSize, currentIndex + groupSize + 8).join(' ')}</div>
        </div>
      );
    }

    if (readingMode === 'teleprompter') {
      const start = Math.max(0, currentIndex - 15);
      const end = Math.min(totalWords, currentIndex + groupSize + 30);
      return (
        <div className="max-w-2xl px-6 text-center leading-loose text-2xl md:text-3xl flex flex-wrap justify-center gap-x-2.5 gap-y-3 py-6 select-none font-sans">
          {words.slice(start, end).map((word, offset) => {
            const index = start + offset;
            const active = index >= currentIndex && index < currentIndex + groupSize;
            return (
              <span 
                key={`${word}-${index}`} 
                className={`transition-all duration-150 rounded px-2.5 py-0.5 ${
                  active 
                    ? 'bg-[#4A6CFF] text-white font-extrabold scale-110 shadow-lg shadow-[#4A6CFF]/20' 
                    : 'opacity-20 scale-95 blur-[0.5px]'
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>
      );
    }

    if (readingMode === 'highlight') {
      const start = Math.max(0, currentIndex - 25);
      const end = Math.min(totalWords, currentIndex + groupSize + 50);
      return (
        <div className="max-w-3xl px-8 py-4 text-left leading-relaxed text-base md:text-lg flex flex-wrap gap-x-1.5 gap-y-1.5 font-sans">
          {words.slice(start, end).map((word, offset) => {
            const index = start + offset;
            const active = index >= currentIndex && index < currentIndex + groupSize;
            return (
              <span 
                key={`${word}-${index}`} 
                className={`transition-all duration-200 px-1 rounded ${
                  active 
                    ? 'text-[#4A6CFF] bg-[#4A6CFF]/10 font-bold border border-[#4A6CFF]/20 scale-105' 
                    : 'opacity-35'
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>
      );
    }

    if (readingMode === 'bionic') {
      const start = Math.max(0, currentIndex - 20);
      const end = Math.min(totalWords, currentIndex + groupSize + 40);
      return (
        <div className="max-w-3xl px-6 text-left leading-relaxed text-base md:text-lg flex flex-wrap justify-center gap-x-1.5 gap-y-2 select-none font-sans">
          {words.slice(start, end).map((word, offset) => {
            const index = start + offset;
            const active = index >= currentIndex && index < currentIndex + groupSize;
            
            let renderedWord;
            if (word.length <= 1) {
              renderedWord = <strong className={active ? 'text-[#4A6CFF] font-extrabold' : 'font-extrabold'}>{word}</strong>;
            } else {
              const mid = Math.ceil(word.length / 2);
              const part1 = word.slice(0, mid);
              const part2 = word.slice(mid);
              renderedWord = (
                <span className={active ? 'text-[#4A6CFF] font-bold' : 'opacity-85 font-normal'}>
                  <strong className="font-extrabold text-current">{part1}</strong>
                  <span>{part2}</span>
                </span>
              );
            }

            return (
              <span key={`${word}-${index}`} className="transition-all duration-150">
                {renderedWord}
              </span>
            );
          })}
        </div>
      );
    }

    return (
      <div className="relative w-full flex items-center justify-center text-4xl md:text-5xl font-bold min-h-[180px]">
        {showFocusGuides && groupSize === 1 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(24rem,78vw)] h-28 flex flex-col justify-between pointer-events-none z-0">
            <div className="w-full h-px bg-zinc-800" />
            <div className="flex justify-center"><div className="w-0.5 h-4 bg-[#4A6CFF] opacity-60" /></div>
            <div className="w-full h-px bg-zinc-800" />
          </div>
        )}
        {renderCenterWord()}
      </div>
    );
  };

  return (
    <div id="speed-reader-view" className={`fixed inset-0 z-40 flex flex-col overflow-hidden transition-all ${isZenMode ? 'bg-black text-zinc-100' : `${currentTheme.bg} ${currentTheme.text}`} ${currentTheme.fontClass}`}>
      {isZenMode && (
        <button 
          onClick={() => setIsZenMode(false)} 
          title={lang === 'tr' ? 'Odak modundan çık (ESC)' : 'Exit focus mode (ESC)'} 
          className="absolute top-4 right-4 z-50 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shadow-lg"
        >
          <Eye className="w-4 h-4" />
          <span>{lang === 'tr' ? 'Odak Modundan Çık' : 'Exit Focus Mode'}</span>
        </button>
      )}

      {!isZenMode && (
        <header className={`flex items-center justify-between px-5 md:px-6 py-3 border-b ${currentTheme.border} shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onClose} className={`p-2 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg} hover:opacity-80 transition-all cursor-pointer`} title={lang === 'tr' ? 'Okuyucudan çık' : 'Exit reader'}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="relative min-w-0" ref={bookSelectorRef}>
              <button
                onClick={() => {
                  setShowBookSelector(prev => !prev);
                  setBookSearchQuery('');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-stone-100 dark:hover:bg-zinc-900 transition-all text-left min-w-0 cursor-pointer"
                title={lang === 'tr' ? 'Metin değiştir' : 'Change document'}
              >
                <span className="font-bold text-sm tracking-tight truncate max-w-xs md:max-w-md">{book.title}</span>
                <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
              </button>
              {showBookSelector && books.length > 0 && (
                <div className="absolute left-2 top-full mt-2 w-[280px] bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1.5 z-50 max-h-[300px] overflow-y-auto">
                  <div className="p-2 border-b border-stone-100 dark:border-zinc-900 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 opacity-55 shrink-0" />
                    <input
                      type="text"
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      placeholder={lang === 'tr' ? 'Belge ara...' : 'Search document...'}
                      className="w-full text-xs outline-none bg-transparent text-stone-900 dark:text-zinc-100 placeholder-stone-400"
                      autoFocus
                    />
                  </div>
                  <div className="px-3 py-1 text-[9px] font-black uppercase text-stone-400 dark:text-zinc-500 border-b border-stone-100 dark:border-zinc-900 mb-1.5">
                    {bookSearchQuery.trim() ? (lang === 'tr' ? 'Arama Sonuçları' : 'Search Results') : (lang === 'tr' ? 'Son Okunanlar (Maks 10)' : 'Recently Read (Max 10)')}
                  </div>
                  {displayedBooks.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-center text-stone-400 dark:text-zinc-500 font-bold">
                      {lang === 'tr' ? 'Metin bulunamadı.' : 'No documents found.'}
                    </div>
                  ) : (
                    displayedBooks.map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onSwitchBook?.(b);
                          setShowBookSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors truncate block ${
                          b.id === book.id
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-stone-50 dark:hover:bg-zinc-900/60 text-stone-700 dark:text-zinc-300'
                        }`}
                      >
                        {b.title}
                      </button>
                    ))
                  )}
                </div>
              )}
              <div className="pl-2.5">
                <span className="text-[10px] font-mono opacity-75">{lang === 'tr' ? 'İlerleme' : 'Progress'}: %{progressPercent} ({currentIndex}/{totalWords} {lang === 'tr' ? 'kelime' : 'words'})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setSoundEnabled(prev => !prev)} title={soundEnabled ? (lang === 'tr' ? 'Metronom sesini kapat' : 'Mute metronome') : (lang === 'tr' ? 'Metronom sesini aç' : 'Unmute metronome')} className={`p-2.5 rounded-xl border ${currentTheme.border} ${soundEnabled ? 'bg-[#3355FF] border-[#3355FF] text-white' : currentTheme.cardBg}`}>
              <Volume2 className="w-4.5 h-4.5" />
            </button>
            <button onClick={() => setShowShortcuts(prev => !prev)} title={lang === 'tr' ? 'Klavye kısayolları' : 'Keyboard shortcuts'} className={`p-2.5 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
              <Keyboard className="w-4.5 h-4.5" />
            </button>
            <button onClick={toggleFullscreen} title={isFullscreen ? (lang === 'tr' ? 'Tam ekrandan çık' : 'Exit fullscreen') : (lang === 'tr' ? 'Tam ekran yap' : 'Enter fullscreen')} className={`p-2.5 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
              {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
            </button>
            <button onClick={() => setIsZenMode(true)} title={lang === 'tr' ? 'Odak modu (Zen)' : 'Zen focus mode'} className={`p-2.5 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
              <EyeOff className="w-4.5 h-4.5" />
            </button>
            <button onClick={() => setShowTools(prev => !prev)} title={lang === 'tr' ? 'Bilgi Paneli' : 'Info Panel'} className={`p-2.5 rounded-xl border ${currentTheme.border} ${showTools ? 'bg-[#3355FF] border-[#3355FF] text-white' : currentTheme.cardBg}`}>
              <Info className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 md:px-6 py-4 relative">
        <div className={isZenMode 
          ? "w-full max-w-4xl flex flex-col items-center justify-center min-h-[260px] md:min-h-[320px] relative" 
          : `w-full max-w-4xl flex flex-col items-center justify-center min-h-[260px] md:min-h-[320px] relative rounded-2xl border ${currentTheme.border} bg-black/[0.015] dark:bg-white/[0.015]`
        }>
          {renderReadingStage()}
        </div>
      </main>

      {!isZenMode && (
        <footer className={`px-5 md:px-6 py-3 border-t ${currentTheme.border} ${currentTheme.cardBg} flex flex-col gap-3 shrink-0`}>
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={totalWords}
                value={currentIndex}
                onChange={(event) => setCurrentIndex(parseInt(event.target.value, 10))}
                className="flex-1 h-1.5 bg-stone-200/60 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#4A6CFF] outline-none"
              />
              <span className="text-[10px] font-mono opacity-80 whitespace-nowrap bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 px-2 py-1 rounded-lg shrink-0">
                {lang === 'tr' ? 'İlerleme' : 'Progress'}: %{progressPercent} ({currentIndex}/{totalWords} {lang === 'tr' ? 'kelime' : 'words'})
              </span>
            </div>

            {showTools && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-[11px] border-b border-zinc-850/60 pb-3">
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Akıllı Es' : 'Smart Pause'}:</strong> {lang === 'tr' ? 'Noktalama ve uzun kelimelerde doğal duraklama ekler.' : 'Adds natural pauses at punctuation and long words.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>ORP:</strong> {lang === 'tr' ? 'Tek kelimede hızlı tanıma harfini vurgular.' : 'Highlights the optimal recognition point letter in a word.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Odak Çizgisi' : 'Focus Line'}:</strong> {lang === 'tr' ? 'Kelimenin merkezini sabitleyen üst-alt rehber çizgilerini açıp kapatır.' : 'Toggles top-bottom guides that anchor the center of the word.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Kelime Grubu' : 'Word Chunking'}:</strong> {lang === 'tr' ? 'Aynı anda gösterilen kelime sayısıdır; üst sınır yoktur.' : 'The number of words shown simultaneously; no upper limit.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Odak Modu' : 'Focus Mode'}:</strong> {lang === 'tr' ? 'Merkez RSVP, satır, teleprompter, bionic ve paragraf vurgusu arasında geçiş yapar.' : 'Switches between center RSVP, single-line, teleprompter, bionic, and paragraph highlight.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Hız Kontrolü' : 'Speed Control'}:</strong> {lang === 'tr' ? 'WPM değerini 50-1500 aralığında artırıp azaltır.' : 'Increases or decreases WPM speed within a range of 50-1500.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Zaman Çizgisi' : 'Timeline'}:</strong> {lang === 'tr' ? 'Okuma konumunu hızlıca ileri veya geri taşır.' : 'Quickly moves the reading position forward or backward.'}
                </div>
                <div className="rounded-xl border border-zinc-850 p-3 bg-zinc-950/30">
                  <strong>{lang === 'tr' ? 'Metronom' : 'Metronome'}:</strong> {lang === 'tr' ? 'İsteğe bağlı sesli ritim geri bildirimi verir.' : 'Provides optional auditory metronome beats.'}
                </div>
              </div>
            )}

            {showShortcuts && (
              <div className="text-[11px] opacity-75 border-b border-zinc-850/60 pb-3 flex flex-wrap gap-3">
                <span>Space: {lang === 'tr' ? 'Oynat/Duraklat' : 'Play/Pause'}</span><span>←/→: {lang === 'tr' ? '10 kelime gezin' : 'Navigate 10 words'}</span><span>↑/↓: {lang === 'tr' ? 'Hız değiştir' : 'Change speed'}</span><span>Esc: {lang === 'tr' ? 'Çıkış' : 'Exit'}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-75 font-semibold">{lang === 'tr' ? 'Hız (WPM):' : 'Speed (WPM):'}</span>
                  <div className="flex items-center border rounded-xl overflow-hidden bg-stone-100/30 dark:bg-zinc-950/20">
                    <button onClick={() => setSpeedWpm(prev => Math.max(50, prev - 25))} className="px-2.5 py-1 text-xs hover:bg-zinc-800 font-bold cursor-pointer">-</button>
                    <span className="px-3 py-1 text-xs font-mono font-bold text-center w-16">{speedWpm}</span>
                    <button onClick={() => setSpeedWpm(prev => Math.min(1500, prev + 25))} className="px-2.5 py-1 text-xs hover:bg-zinc-800 font-bold cursor-pointer">+</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-75 font-semibold">{lang === 'tr' ? 'Kelime Grubu:' : 'Word Chunk:'}</span>
                  <div className="flex items-center border rounded-xl overflow-hidden bg-stone-100/30 dark:bg-zinc-950/20">
                    <button onClick={decreaseGroupSize} className="px-2.5 py-1 text-xs hover:bg-zinc-800 font-bold cursor-pointer" title={lang === 'tr' ? 'Kelime grubunu azalt' : 'Decrease chunk size'}>-</button>
                    <span className="px-3 py-1 text-xs font-mono font-bold text-center w-12">{groupSize}</span>
                    <button onClick={increaseGroupSize} className="px-2.5 py-1 text-xs hover:bg-zinc-800 font-bold cursor-pointer" title={lang === 'tr' ? 'Kelime grubunu artır' : 'Increase chunk size'}>+</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 order-first lg:order-none">
                <button onClick={handleReset} title="Başa dön" className={`p-2.5 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg}`}><RotateCw className="w-4 h-4" /></button>
                <button onClick={() => handleNavigate(-10)} title="10 kelime geri" className={`p-2.5 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg}`}><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setIsPlaying(prev => !prev)} className="p-3.5 rounded-full bg-[#3355FF] hover:bg-[#4D66FF] text-white hover:scale-105 transition-all shadow-md cursor-pointer flex items-center justify-center">
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
                <button onClick={() => handleNavigate(10)} title="10 kelime ileri" className={`p-2.5 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg} rotate-180`}><ChevronLeft className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center justify-start lg:justify-end gap-2 min-w-0 overflow-x-auto">
                <span className="text-xs opacity-75 font-semibold whitespace-nowrap">{lang === 'tr' ? 'Odak Modu:' : 'Focus Mode:'}</span>
                <select
                  value={readingMode}
                  onChange={(event) => setReadingMode(event.target.value as ReadingMode)}
                  className={`text-xs h-8 px-3 rounded-xl border ${currentTheme.border} bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 outline-none cursor-pointer max-w-[210px]`}
                  style={{
                    backgroundColor: themeType === 'dark' || themeType === 'amoled' ? '#09090b' : '#ffffff',
                    color: themeType === 'dark' || themeType === 'amoled' ? '#f4f4f5' : '#111827'
                  }}
                >
                  {Object.entries(modeLabels).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                      className="bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100"
                      style={{
                        backgroundColor: themeType === 'dark' || themeType === 'amoled' ? '#09090b' : '#ffffff',
                        color: themeType === 'dark' || themeType === 'amoled' ? '#f4f4f5' : '#111827'
                      }}
                    >
                      {label}
                    </option>
                  ))}
                </select>
                {readingMode === 'center' && groupSize === 1 && <button onClick={() => setIsOrp(prev => !prev)} className={`h-8 px-3 rounded-xl text-[10px] font-bold border whitespace-nowrap ${isOrp ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'opacity-50'}`} title={lang === 'tr' ? 'Optimal Tanıma Noktası: kelimenin gözün en hızlı yakaladığı harfini vurgular' : 'Optimal Recognition Point: highlights the easiest letter to recognize'}>ORP</button>}
                {readingMode === 'center' && groupSize === 1 && <button onClick={() => setShowFocusGuides(prev => !prev)} className={`h-8 px-3 rounded-xl text-[10px] font-bold border whitespace-nowrap ${showFocusGuides ? 'bg-[#4A6CFF]/10 border-[#4A6CFF]/35 text-[#4A6CFF]' : 'opacity-50'}`} title={lang === 'tr' ? 'Kelimenin merkezindeki odak çizgilerini göster veya gizle' : 'Show or hide center focus guides'} aria-pressed={showFocusGuides}>{lang === 'tr' ? 'Odak Çizgisi' : 'Focus Guide'}</button>}
                <button onClick={() => setSmartPauses(prev => !prev)} className={`h-8 px-3 rounded-xl text-[10px] font-bold border whitespace-nowrap ${smartPauses ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'opacity-50'}`} title={lang === 'tr' ? 'Nokta, virgül ve uzun kelimelerde kısa doğal duraklamalar ekler' : 'Adds natural pauses at punctuation or long words'}>{lang === 'tr' ? 'Akıllı Es' : 'Smart Pause'}</button>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
