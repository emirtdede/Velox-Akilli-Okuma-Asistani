/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BookMark, ThemeType, THEMES, ThemeConfig } from './types';
import { StorageService } from './utils/storage';
import ThemeSelector from './components/ThemeSelector';
import {
  Activity,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Brain,
  ChevronsRight,
  ChevronLeft,
  X,
  HelpCircle,
  Home,
  PenTool,
  Play,
  Plus,
  Settings,
  Trash2
} from 'lucide-react';

const AddDocumentModal = lazy(() => import('./components/AddDocumentModal'));
const SpeedReader = lazy(() => import('./components/SpeedReader'));
const StatsDashboard = lazy(() => import('./components/StatsDashboard'));

const LazyPanelFallback = () => <div className="p-4 text-xs opacity-60">Yükleniyor...</div>;

type AppTab = 'home' | 'library' | 'reading' | 'notes' | 'progress' | 'guide' | 'settings';
type SidebarMode = 'full' | 'compact' | 'hidden';

const SIDEBAR_PREFS_KEY = 'readflow_sidebar_prefs';
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 420;
const COMPACT_SIDEBAR_WIDTH = 76;

const NAV_ITEMS = [
  { tab: 'home' as AppTab, icon: Home, label: 'Anasayfa' },
  { tab: 'library' as AppTab, icon: BookOpen, label: 'Kitaplığım' },
  { tab: 'reading' as AppTab, icon: BookMarked, label: 'Okuma Merkezi', bookAware: true },
  { tab: 'notes' as AppTab, icon: PenTool, label: 'Bilgi & Notlar', bookAware: true },
  { tab: 'progress' as AppTab, icon: Activity, label: 'İlerleme & Gelişim' },
  { tab: 'guide' as AppTab, icon: HelpCircle, label: 'Rehber' },
  { tab: 'settings' as AppTab, icon: Settings, label: 'Ayarlar' },
];

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

function getInitialSidebarPrefs() {
  try {
    const raw = localStorage.getItem(SIDEBAR_PREFS_KEY);
    if (!raw) return { mode: 'full' as SidebarMode, width: 256 };
    const parsed = JSON.parse(raw) as Partial<{ mode: SidebarMode; width: number }>;
    return {
      mode: parsed.mode && ['full', 'compact', 'hidden'].includes(parsed.mode) ? parsed.mode : 'full' as SidebarMode,
      width: clampSidebarWidth(Number(parsed.width) || 256),
    };
  } catch {
    return { mode: 'full' as SidebarMode, width: 256 };
  }
}

const TAB_PATHS: Record<AppTab, string> = {
  home: '/',
  library: '/library',
  reading: '/reading',
  notes: '/notes',
  progress: '/progress',
  guide: '/guide',
  settings: '/settings'
};

function parseRoute(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];
  if (first === 'reader') return { tab: 'reading' as AppTab, bookId: parts[1] || null, readerBookId: parts[1] || null };
  const map: Record<string, AppTab> = {
    library: 'library',
    reading: 'reading',
    notes: 'notes',
    progress: 'progress',
    guide: 'guide',
    settings: 'settings'
  };
  return { tab: first ? map[first] || 'home' : 'home', bookId: parts[1] || null, readerBookId: null };
}

function pathForTab(tab: AppTab, bookId?: string | null) {
  const base = TAB_PATHS[tab];
  if (bookId && ['reading', 'notes'].includes(tab)) return `${base}/${encodeURIComponent(bookId)}`;
  return base;
}

export default function App() {
  const initialRoute = parseRoute();
  const [activeTab, setActiveTab] = useState<AppTab>(initialRoute.tab);
  const [books, setBooks] = useState<BookMark[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(initialRoute.bookId || initialRoute.readerBookId);
  const [activeBook, setActiveBook] = useState<BookMark | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [stats, setStats] = useState(StorageService.getStats());
  const [prefs, setPrefs] = useState(StorageService.getPreferences());
  const [aiStatus, setAiStatus] = useState({ enabled: false, provider: 'none', checked: false });
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem('readflow_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [geminiDraftKey, setGeminiDraftKey] = useState(() => {
    try {
      return localStorage.getItem('readflow_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [personalNotes, setPersonalNotes] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedNoteBookId, setExpandedNoteBookId] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSaveMessage, setAiSaveMessage] = useState('');
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => getInitialSidebarPrefs().mode);
  const [sidebarWidth, setSidebarWidth] = useState(() => getInitialSidebarPrefs().width);

  const currentThemeType: ThemeType = prefs.theme || 'dark';
  const currentTheme: ThemeConfig = THEMES[currentThemeType] || THEMES.dark;

  const selectedBook = useMemo(() => {
    return books.find(book => book.id === selectedBookId) || books[0] || null;
  }, [books, selectedBookId]);
  const todayKey = new Date().toISOString().split('T')[0];
  const todayHistory = stats.history.find(item => item.date === todayKey);
  const todayWords = todayHistory?.wordCount || 0;
  const dailyGoal = Math.max(1, stats.dailyGoalWords || 3000);
  const dailyProgress = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  const remainingWords = Math.max(0, dailyGoal - todayWords);
  const totalMinutes = Math.max(0, Math.round(stats.totalReadingTimeSeconds / 60));
  const hasRecentBook = Boolean(selectedBook);
  const recentBooks = [...books]
    .sort((left, right) => right.lastReadDate.localeCompare(left.lastReadDate))
    .slice(0, 3);
  const isLightTheme = currentThemeType === 'light';
  const surfaceClass = isLightTheme
    ? 'bg-white border-stone-300 shadow-[0_1px_0_rgba(0,0,0,0.02)]'
    : `border ${currentTheme.border} ${currentTheme.cardBg}`;
  const titleClass = isLightTheme ? 'text-stone-950' : 'text-current';
  const mutedClass = isLightTheme ? 'text-stone-700' : 'opacity-65';
  const cardMutedClass = isLightTheme ? 'text-stone-600' : 'opacity-65';

  const isSidebarFull = sidebarMode === 'full';
  const isSidebarCompact = sidebarMode === 'compact';
  const isSidebarHidden = sidebarMode === 'hidden';
  const activeSidebarWidth = isSidebarCompact ? COMPACT_SIDEBAR_WIDTH : sidebarWidth;

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify({ mode: sidebarMode, width: sidebarWidth }));
    } catch {
      // Sidebar preference persistence is optional.
    }
  }, [sidebarMode, sidebarWidth]);

  useEffect(() => {
    const loadedBooks = StorageService.getBooks();
    setBooks(loadedBooks);
    if (!selectedBookId && loadedBooks.length > 0) setSelectedBookId(loadedBooks[0].id);

    StorageService.hydrateFromIndexedDb?.().then((changed) => {
      if (!changed) return;
      const hydratedBooks = StorageService.getBooks();
      setBooks(hydratedBooks);
      setStats(StorageService.getStats());
      setPrefs(StorageService.getPreferences());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handlePop = () => {
      const route = parseRoute();
      setActiveTab(route.tab);
      if (route.bookId || route.readerBookId) setSelectedBookId(route.bookId || route.readerBookId);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const refreshAiStatus = (apiKey = geminiApiKey) => {
    fetch('/api/ai/status', {
      headers: apiKey ? { 'x-gemini-api-key': apiKey } : {}
    })
      .then(response => response.json())
      .then(data => setAiStatus({ enabled: Boolean(data.enabled), provider: data.provider || 'none', checked: true }))
      .catch(() => setAiStatus({ enabled: false, provider: 'none', checked: true }));
  };

  useEffect(() => {
    refreshAiStatus(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    if (!selectedBook) return;
    setPersonalNotes(localStorage.getItem(`readflow_notes_text_${selectedBook.id}`) || '');
  }, [selectedBook?.id]);

  useEffect(() => {
    setNoteDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const book of books) {
        next[book.id] = prev[book.id] ?? (localStorage.getItem(`readflow_notes_text_${book.id}`) || '');
      }
      return next;
    });
  }, [books]);

  useEffect(() => {
    const route = parseRoute();
    if (!route.readerBookId || books.length === 0) return;
    const book = books.find(item => item.id === route.readerBookId);
    if (book) {
      setSelectedBookId(book.id);
      setActiveBook(book);
    }
  }, [books]);

  const navigateToTab = (tab: AppTab, bookId?: string | null, replace = false) => {
    setActiveTab(tab);
    if (bookId) setSelectedBookId(bookId);
    const nextPath = pathForTab(tab, bookId);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', nextPath);
    }
  };

  const refreshBooks = () => setBooks(StorageService.getBooks());

  const handleAddNewBook = (title: string, content: string, tags?: string[]) => {
    const book = StorageService.addBook(title, content, tags);
    refreshBooks();
    setSelectedBookId(book.id);
    navigateToTab('library', book.id);
  };

  const handleDeleteBook = (bookId: string) => {
    if (!confirm('Bu belgeyi kütüphanenizden silmek istiyor musunuz?')) return;
    const remaining = StorageService.deleteBook(bookId);
    setBooks(remaining);
    setSelectedBookId(remaining[0]?.id || null);
  };

  const handleLaunchReader = (book: BookMark) => {
    setSelectedBookId(book.id);
    setActiveBook(book);
    window.history.pushState(null, '', `/reader/${encodeURIComponent(book.id)}`);
  };

  const handleCloseReader = () => {
    const closedBookId = activeBook?.id || selectedBookId;
    setActiveBook(null);
    refreshBooks();
    setStats(StorageService.getStats());
    navigateToTab('reading', closedBookId, true);
  };

  const handleReaderProgressUpdate = (index: number, progressPercent: number, speed: number, groupSize: number) => {
    if (!activeBook) return;
    StorageService.updateBookProgress(activeBook.id, index, progressPercent, speed, groupSize);
  };

  const handleThemeChange = (theme: ThemeType) => {
    const nextPrefs = { ...prefs, theme };
    setPrefs(nextPrefs);
    StorageService.savePreferences(nextPrefs);
  };

  const saveGeminiApiKey = () => {
    const cleanKey = geminiDraftKey.trim();
    if (cleanKey) {
      localStorage.setItem('readflow_gemini_api_key', cleanKey);
      setGeminiApiKey(cleanKey);
      setAiStatus({ enabled: true, provider: 'gemini', checked: true });
      setAiSaveMessage('Gemini API key kaydedildi. AI araçları Okuma Merkezi ekranında aktif hale geldi.');
      refreshAiStatus(cleanKey);
    } else {
      localStorage.removeItem('readflow_gemini_api_key');
      setGeminiApiKey('');
      setAiStatus({ enabled: false, provider: 'none', checked: true });
      setAiSaveMessage('API key kaldırıldı. Uygulamayı AI olmadan kullanmaya devam edebilirsiniz.');
    }
  };

  const clearGeminiApiKey = () => {
    localStorage.removeItem('readflow_gemini_api_key');
    setGeminiDraftKey('');
    setGeminiApiKey('');
    setAiStatus({ enabled: false, provider: 'none', checked: true });
    setAiSaveMessage('API key kaldırıldı. Uygulamayı AI olmadan kullanmaya devam edebilirsiniz.');
  };

  const savePersonalNotes = () => {
    if (!selectedBook) return;
    localStorage.setItem(`readflow_notes_text_${selectedBook.id}`, personalNotes);
  };

  const saveBookNotes = (bookId: string) => {
    localStorage.setItem(`readflow_notes_text_${bookId}`, noteDrafts[bookId] || '');
  };

  const aiHeaders = () => ({
    'Content-Type': 'application/json',
    ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {})
  });

  const generateAiSummary = async () => {
    if (!selectedBook) return;
    setAiBusy('summary');
    setAiError(null);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({ text: selectedBook.content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Özet üretilemedi.');
      StorageService.updateBookAiSummary(selectedBook.id, data);
      refreshBooks();
    } catch (error: any) {
      setAiError(error.message || 'AI özeti alınamadı.');
    } finally {
      setAiBusy(null);
    }
  };

  const generateDifficultyAnalysis = async () => {
    if (!selectedBook) return;
    setAiBusy('difficulty');
    setAiError(null);
    try {
      const response = await fetch('/api/ai/analyze-difficulty', {
        method: 'POST',
        headers: aiHeaders(),
        body: JSON.stringify({ text: selectedBook.content })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Zorluk analizi üretilemedi.');
      StorageService.updateBookDifficulty(selectedBook.id, data);
      refreshBooks();
    } catch (error: any) {
      setAiError(error.message || 'Zorluk analizi alınamadı.');
    } finally {
      setAiBusy(null);
    }
  };

  const handleSidebarResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSidebarFull) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(startWidth + moveEvent.clientX - startX));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const BrandMark = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={() => compact && setSidebarMode('full')}
      title={compact ? 'Menüyü genişlet' : 'ReadFlow'}
      className={`${compact ? 'h-11 w-11 rounded-2xl cursor-pointer group' : 'h-10 w-10 rounded-2xl cursor-default'} relative grid place-items-center bg-indigo-600 text-white shadow-md shadow-indigo-600/10 overflow-hidden transition-all border border-indigo-500/30`}
    >
      <BookOpenCheck className={`${compact ? 'w-5 h-5 group-hover:opacity-0' : 'w-5 h-5'} relative z-10 transition-opacity`} />
      {compact && <ChevronsRight className="w-5 h-5 absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );

  const NavButton = ({ tab, icon: Icon, label, bookAware = false }: { tab: AppTab; icon: any; label: string; bookAware?: boolean }) => (
    <button
      title={isSidebarCompact ? label : undefined}
      onClick={() => navigateToTab(tab, bookAware ? selectedBookId : null)}
      className={`group relative w-full rounded-xl text-xs font-bold flex items-center cursor-pointer transition-all ${
        isSidebarCompact ? 'h-11 justify-center px-0' : 'h-10 px-3 gap-3'
      } ${
        activeTab === tab
          ? 'bg-indigo-600 text-white border border-indigo-500 shadow-sm'
          : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/60 border border-transparent'
      }`}
    >
      <Icon className={`${isSidebarCompact ? 'w-[18px] h-[18px]' : 'w-4 h-4'} shrink-0`} />
      {isSidebarFull && <span className="truncate transition-all duration-300 ease-out opacity-100 translate-x-0">{label}</span>}
    </button>
  );

  const renderBookPicker = () => (
    <select
      value={selectedBook?.id || ''}
      onChange={(event) => setSelectedBookId(event.target.value)}
      className="w-full p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-bold bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 outline-none"
      style={{
        backgroundColor: currentThemeType === 'dark' || currentThemeType === 'amoled' ? '#09090b' : '#ffffff',
        color: currentThemeType === 'dark' || currentThemeType === 'amoled' ? '#f4f4f5' : '#111827'
      }}
    >
      {books.map(book => (
        <option
          key={book.id}
          value={book.id}
          className="bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100"
          style={{
            backgroundColor: currentThemeType === 'dark' || currentThemeType === 'amoled' ? '#09090b' : '#ffffff',
            color: currentThemeType === 'dark' || currentThemeType === 'amoled' ? '#f4f4f5' : '#111827'
          }}
        >
          {book.title}
        </option>
      ))}
    </select>
  );

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-all duration-300 font-sans ${currentTheme.bg} ${currentTheme.text}`}>
      <aside
        className={`relative w-full md:w-[var(--sidebar-width)] flex flex-col justify-between shrink-0 border-b md:border-b-0 md:border-r ${currentTheme.border} ${currentTheme.cardBg} md:h-screen md:sticky md:top-0 z-40 overflow-hidden transition-[width,padding,opacity,transform,margin] duration-300 ease-out will-change-[width,transform,opacity] ${isSidebarHidden ? 'w-0 min-w-0 p-0 opacity-0 -translate-x-4 pointer-events-none border-r-0' : isSidebarCompact ? 'p-4' : 'p-5'}`}
        style={{ '--sidebar-width': `${activeSidebarWidth}px` } as React.CSSProperties}
        aria-hidden={isSidebarHidden}
      >
        <div className={`flex flex-col transition-all duration-300 ease-out ${isSidebarCompact ? 'items-center gap-5' : 'gap-6'}`}>
          <div className={`flex items-center transition-all duration-300 ease-out ${isSidebarCompact ? 'justify-center' : 'justify-between'} gap-3`}>
            <div className={`flex items-center transition-all duration-300 ease-out ${isSidebarCompact ? 'justify-center' : 'gap-3 min-w-0 flex-1'}`}>
              <BrandMark compact={isSidebarCompact} />
              {isSidebarFull && <div className="min-w-0 flex-1 overflow-hidden transition-all duration-300 ease-out">
                <h1 className="text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400">ReadFlow</h1>
                <p className="text-[10px] font-medium tracking-tight opacity-60 whitespace-nowrap overflow-hidden text-ellipsis">Kişisel Bilgi Sistemi</p>
              </div>}
            </div>
            {isSidebarFull && (
              <div className="flex items-center gap-2 shrink-0 transition-all duration-300 ease-out">
                <button
                  onClick={() => setSidebarMode('compact')}
                  title="Mini menü"
                  className="h-8 w-8 rounded-lg border border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-900 grid place-items-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSidebarMode('hidden')}
                  title="Menüyü gizle"
                  className="h-8 w-8 rounded-lg border border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-900 grid place-items-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className={`${isSidebarCompact ? `w-full border-t ${currentTheme.border}` : 'hidden'}`} />

          <div
            title={isSidebarCompact ? `AI ${aiStatus.enabled ? 'Aktif' : 'Kapalı'}` : undefined}
            className={`flex items-center gap-2 bg-stone-150/40 dark:bg-zinc-900/40 p-2 rounded-xl border border-stone-200/40 dark:border-zinc-800/40 transition-all duration-300 ease-out ${isSidebarCompact ? 'justify-center w-11 h-11' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.enabled ? 'bg-indigo-500' : 'bg-stone-400 dark:bg-zinc-600'}`} />
            {isSidebarFull && <span className="text-[10px] font-bold tracking-wide uppercase opacity-75">AI {aiStatus.enabled ? 'Aktif' : 'Kapalı'}</span>}
          </div>

          <nav className={`flex flex-col transition-all duration-300 ease-out ${isSidebarCompact ? 'items-center gap-4' : 'gap-1'}`}>
            {NAV_ITEMS.map(item => (
              <React.Fragment key={item.tab}>
                <NavButton tab={item.tab} icon={item.icon} label={item.label} bookAware={item.bookAware} />
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className={`mt-6 flex flex-col gap-2 transition-all duration-300 ease-out ${isSidebarCompact ? 'items-center' : ''}`}>
          <button
            onClick={() => setIsAddOpen(true)}
            title={isSidebarCompact ? 'Yeni Belge Ekle' : undefined}
            className={`${isSidebarCompact ? 'h-11 w-11 p-0' : 'w-full py-2.5 px-4'} bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer transition-all`}
          >
            <Plus className="w-4 h-4 shrink-0" /> {isSidebarFull && 'Yeni Belge Ekle'}
          </button>
          {isSidebarFull && <div className="text-[10px] opacity-40 text-center font-mono mt-1">ReadFlow v3.2</div>}
        </div>

        {isSidebarFull && !isSidebarHidden && (
          <div
            onPointerDown={handleSidebarResizeStart}
            title="Menüyü genişlet/daralt"
            className="hidden md:block absolute top-0 -right-1 h-full w-2 cursor-col-resize group"
          >
            <div className="h-full w-px mx-auto bg-transparent group-hover:bg-indigo-500/70 transition-colors" />
          </div>
        )}
      </aside>

      {isSidebarHidden && (
        <button
          onClick={() => setSidebarMode('full')}
          title="Menüyü aç"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 h-14 w-7 rounded-r-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center transition-all duration-300 ease-out"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}

      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {activeTab === 'home' && (
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h2 className={`text-2xl font-extrabold tracking-tight ${titleClass}`}>Anasayfa</h2>
                <p className={`text-sm max-w-3xl leading-relaxed ${mutedClass}`}>Bu ekran günlük ilerlemeyi sade bir dille özetler. Gelişmiş analizler için İlerleme & Gelişim sayfasına geçebilirsin.</p>
              </div>

              <div className={`p-6 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-5 ${surfaceClass}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] uppercase font-black tracking-[0.18em] ${isLightTheme ? 'text-stone-600' : 'opacity-50'}`}>Devam Et</p>
                  <h3 className={`text-lg font-black mt-1 truncate ${titleClass}`}>{selectedBook?.title || 'Henüz kitap yok'}</h3>
                  <p className={`text-sm mt-1 max-w-2xl leading-relaxed ${mutedClass}`}>
                    {hasRecentBook
                      ? `Son seçili kitabın ${selectedBook?.progress || 0}% tamamlandı. Okumaya kaldığın yerden devam edebilirsin.`
                      : 'Kütüphaneye ilk belgeni eklediğinde burası okuma özeti ve hızlı erişim alanına dönüşür.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {selectedBook && <button onClick={() => handleLaunchReader(selectedBook)} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-2"><Play className="w-4 h-4 fill-white" /> Okumaya Başla</button>}
                  <button onClick={() => navigateToTab('reading', selectedBook?.id || null)} className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-bold">Okuma Merkezi</button>
                  <button onClick={() => navigateToTab('library')} className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-bold">Kitaplığa Git</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Metric title="Bugün okunan kelime" value={todayWords.toLocaleString()} theme={currentTheme} />
                <Metric title="Günlük hedefe kalan" value={`${remainingWords.toLocaleString()} kelime`} theme={currentTheme} />
                <Metric title="Toplam okuma süresi" value={totalMinutes > 0 ? `${totalMinutes} dk` : 'Henüz yok'} theme={currentTheme} />
                <Metric title="En yüksek hız" value={`${stats.maxSpeedWpm || 0} WPM`} theme={currentTheme} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className={`p-5 rounded-3xl lg:col-span-5 flex flex-col gap-4 ${surfaceClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`text-sm font-black ${titleClass}`}>Bugünün ilerlemesi</h3>
                      <p className={`text-xs mt-1 ${mutedClass}`}>Sade gösterim. Teknik metriklere girmeden sadece durumunu gösterir.</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">{dailyProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${dailyProgress}%` }} />
                  </div>
                  <p className={`text-xs leading-relaxed ${cardMutedClass}`}>
                    {todayWords > 0
                      ? `Bugün ${todayWords.toLocaleString()} kelime okudun. Hedefin ${dailyGoal.toLocaleString()} kelime.`
                      : `Henüz bugün kayıtlı okuma yok. Başlamak için okuyucuyu açabilirsin.`}
                  </p>
                </div>

                <div className={`p-5 rounded-3xl lg:col-span-7 flex flex-col gap-4 ${surfaceClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className={`text-sm font-black ${titleClass}`}>Son kitaplar</h3>
                      <p className={`text-xs mt-1 ${mutedClass}`}>En son baktığın belgeler.</p>
                    </div>
                    <button onClick={() => navigateToTab('library')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Tümünü gör</button>
                  </div>
                  {recentBooks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recentBooks.map(book => (
                        <article key={book.id} className={`rounded-2xl p-4 flex flex-col gap-3 min-h-[150px] ${isLightTheme ? 'border border-stone-300 bg-white' : 'border border-stone-200 dark:border-zinc-800 bg-transparent'}`}>
                          <div className="min-w-0">
                            <h4 className={`text-sm font-black line-clamp-2 ${titleClass}`}>{book.title}</h4>
                            <p className={`text-[11px] mt-1 line-clamp-3 leading-relaxed ${cardMutedClass}`}>{book.content.slice(0, 120)}</p>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-bold uppercase ${isLightTheme ? 'text-stone-700' : 'opacity-60'}`}>{book.progress || 0}% tamam</span>
                            <button onClick={() => handleLaunchReader(book)} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-bold">Aç</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Henüz kitap yok. İlk belgeni eklediğinde bu alan son kitaplarını gösterecek." />
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'library' && (
            <section className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className={`text-2xl font-extrabold tracking-tight ${titleClass}`}>Kişisel Kitaplığım</h2>
                <button onClick={() => setIsAddOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Yeni Belge</button>
              </div>
              {books.length === 0 ? <EmptyState text="Kütüphaneniz boş." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch auto-rows-fr">
                  {books.map(book => (
                    <article key={book.id} className={`p-5 rounded-2xl flex flex-col gap-4 h-full min-h-[188px] ${surfaceClass}`}>
                      <div className="flex justify-between gap-3 flex-1 min-h-[82px]">
                        <div className="min-w-0">
                          <h3 className={`font-black text-sm line-clamp-2 min-h-[2.5rem] ${titleClass}`}>{book.title}</h3>
                          <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${cardMutedClass}`}>{book.content.slice(0, 160)}</p>
                        </div>
                        <button onClick={() => handleDeleteBook(book.id)} className="p-2 opacity-55 hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="h-1.5 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden shrink-0"><div className="h-full bg-indigo-600" style={{ width: `${book.progress || 0}%` }} /></div>
                      <button onClick={() => handleLaunchReader(book)} className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold w-full shrink-0">Okuyucuda Aç</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'reading' && (
            <section className="flex flex-col gap-5">
              <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className={`text-xl font-extrabold tracking-tight ${titleClass}`}>Okuma Merkezi</h2>
                    <p className={`text-sm mt-1 ${mutedClass}`}>Kitap seç, hızlı okumayı başlat ve gerekirse AI araçlarını kullan.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {books.length > 0 ? renderBookPicker() : <p className={`text-sm ${mutedClass}`}>Henüz kitap yok.</p>}
                    {selectedBook && <button onClick={() => handleLaunchReader(selectedBook)} className="py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2"><Play className="w-4 h-4 fill-white" /> RSVP Hızlı Okumayı Başlat</button>}
                  </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-3">
                  <div className={`p-4 rounded-2xl border ${isLightTheme ? 'border-stone-300 bg-stone-50' : 'border-zinc-800 bg-zinc-950/40'} flex-1 flex flex-col gap-3`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-xs font-black ${titleClass}`}>AI Araçları</h3>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${aiStatus.enabled ? 'bg-emerald-500/10 text-emerald-500' : isLightTheme ? 'bg-stone-200 text-stone-700' : 'bg-stone-500/10 text-stone-500'}`}>
                        {aiStatus.enabled ? 'Açık' : 'Kapalı'}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${cardMutedClass}`}>
                      {aiStatus.enabled
                        ? 'Gemini API key algılandı. Bu kitap için otomatik özet ve zorluk analizi oluşturabilirsiniz.'
                        : 'AI araçlarını kullanmak için Ayarlar bölümünden Gemini API key girin. Okuma özellikleri API key olmadan da çalışır.'}
                    </p>
                    {aiStatus.enabled && selectedBook ? (
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={generateAiSummary}
                          disabled={aiBusy !== null}
                          className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold"
                        >
                          {aiBusy === 'summary' ? 'Özet çıkarılıyor...' : selectedBook.aiSummary ? 'AI Özeti Yenile' : 'AI Özet Çıkar'}
                        </button>
                        <button
                          onClick={generateDifficultyAnalysis}
                          disabled={aiBusy !== null}
                          className={`py-2 rounded-xl border text-xs font-bold disabled:opacity-50 ${isLightTheme ? 'border-stone-300 text-stone-900 bg-white' : 'border-zinc-800 text-current bg-transparent'}`}
                        >
                          {aiBusy === 'difficulty' ? 'Analiz ediliyor...' : selectedBook.difficultyInfo ? 'Zorluk Analizini Yenile' : 'Zorluk Analizi Yap'}
                        </button>
                      </div>
                    ) : null}
                    {aiError && <p className="text-[11px] text-rose-500 leading-relaxed">{aiError}</p>}
                  </div>

                  <div className={`p-4 rounded-2xl border ${isLightTheme ? 'border-stone-300 bg-stone-50' : 'border-zinc-800 bg-zinc-950/40'} min-w-0 flex-[1.8] flex flex-col gap-3`}>
                    {selectedBook ? (
                      <>
                        {(selectedBook.aiSummary || selectedBook.difficultyInfo) && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {selectedBook.aiSummary && (
                              <div className={`rounded-2xl border p-4 ${isLightTheme ? 'border-indigo-200 bg-indigo-50' : 'border-indigo-500/20 bg-indigo-500/5'}`}>
                                <h3 className="text-xs font-black text-indigo-500">AI Özeti</h3>
                                <p className={`text-xs mt-2 leading-relaxed ${isLightTheme ? 'text-stone-800' : 'text-current opacity-80'}`}>{selectedBook.aiSummary.summary}</p>
                                {selectedBook.aiSummary.keyPoints?.length ? (
                                  <ul className={`text-[11px] leading-relaxed mt-2 list-disc pl-4 ${isLightTheme ? 'text-stone-700' : 'opacity-70'}`}>
                                    {selectedBook.aiSummary.keyPoints.slice(0, 4).map((point: string) => <li key={point}>{point}</li>)}
                                  </ul>
                                ) : null}
                              </div>
                            )}
                            {selectedBook.difficultyInfo && (
                              <div className={`rounded-2xl border p-4 ${isLightTheme ? 'border-amber-200 bg-amber-50' : 'border-amber-500/20 bg-amber-500/5'}`}>
                                <h3 className="text-xs font-black text-amber-500">Zorluk Analizi</h3>
                                <p className={`text-xs mt-2 leading-relaxed ${isLightTheme ? 'text-stone-800' : 'text-current opacity-80'}`}>
                                  {selectedBook.difficultyInfo.level} ({selectedBook.difficultyInfo.score}/100): {selectedBook.difficultyInfo.description}
                                </p>
                                {selectedBook.difficultyInfo.complexWords?.length ? (
                                  <p className={`text-[11px] mt-2 ${isLightTheme ? 'text-stone-700' : 'opacity-70'}`}>Zor kelimeler: {selectedBook.difficultyInfo.complexWords.join(', ')}</p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed ${isLightTheme ? 'text-stone-900 prose-p:text-stone-800' : ''}`}>{selectedBook.content.slice(0, 5000)}</div>
                      </>
                    ) : <EmptyState text="Okumak için bir kitap seçin." />}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section className={`p-5 rounded-3xl ${isLightTheme ? 'bg-white' : currentTheme.cardBg} flex flex-col gap-5`}>
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="min-w-0">
                  <h2 className={`text-xl font-extrabold tracking-tight ${titleClass}`}>Bilgi & Notlar</h2>
                  <p className={`text-sm mt-1 ${mutedClass}`}>Tüm belgelerin notlarını aynı ekranda gör ve düzenle.</p>
                </div>
                <div className="flex items-center gap-2">
                  {books.length > 0 ? <p className={`text-sm ${mutedClass}`}>{books.length} belge</p> : <p className={`text-sm ${mutedClass}`}>Henüz kitap yok.</p>}
                </div>
              </div>

              {books.length === 0 ? (
                <EmptyState text="Not eklemek için önce bir belge oluşturun." />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                  {books.map(book => (
                    <article
                      key={book.id}
                      className={`p-4 rounded-2xl border ${isLightTheme ? 'border-stone-300 bg-white' : 'border-zinc-800 bg-zinc-950/40'} flex flex-col gap-3 ${expandedNoteBookId === book.id ? 'lg:col-span-full' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className={`text-sm font-black line-clamp-2 ${titleClass}`}>{book.title}</h3>
                          <p className={`text-[11px] mt-1 ${mutedClass}`}>{book.progress || 0}% tamamlandı</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => navigateToTab('reading', book.id)} className="text-[11px] font-bold text-indigo-600 shrink-0">Aç</button>
                          <button
                            onClick={() => setExpandedNoteBookId(prev => prev === book.id ? null : book.id)}
                            className={`h-8 px-3 rounded-xl border text-[11px] font-bold transition-colors ${isLightTheme ? 'border-stone-300 bg-stone-50 text-stone-900 hover:bg-stone-100' : 'border-zinc-800 bg-zinc-950/30 text-current hover:bg-zinc-900'}`}
                          >
                            {expandedNoteBookId === book.id ? 'Daralt' : 'Genişlet'}
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={noteDrafts[book.id] ?? ''}
                        onChange={(event) => setNoteDrafts(prev => ({ ...prev, [book.id]: event.target.value }))}
                        className={`w-full ${expandedNoteBookId === book.id ? 'min-h-[420px]' : 'min-h-[220px]'} p-4 rounded-2xl border text-sm outline-none resize-y ${isLightTheme ? 'border-stone-300 bg-stone-50 text-stone-900 placeholder:text-stone-500' : 'border-stone-200 dark:border-zinc-800 bg-transparent'} custom-note-scrollbar`}
                        placeholder="Bu belge için notlarını yaz..."
                      />
                      <button onClick={() => saveBookNotes(book.id)} className="self-start px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Kaydet</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'progress' && (
            <Suspense fallback={<LazyPanelFallback />}>
              <StatsDashboard
                stats={stats}
                onStatsModified={(nextStats) => {
                  StorageService.saveStats(nextStats);
                  setStats(nextStats);
                }}
                themeType={currentThemeType}
              />
            </Suspense>
          )}

          {activeTab === 'guide' && <GuideScreen currentTheme={currentTheme} />}

          {activeTab === 'settings' && (
            <section className="flex flex-col gap-5">
              <h2 className="text-2xl font-extrabold tracking-tight">Ayarlar</h2>
              <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg} flex flex-col gap-4`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-base font-black">Yapay Zeka Tercihi</h3>
                    <p className="text-xs opacity-65 mt-1 max-w-2xl leading-relaxed">
                      ReadFlow temel okuma, not, kütüphane ve ilerleme özellikleri için API anahtarı istemez. Özet, kelime açıklama, zorluk analizi ve kavrama gibi AI özelliklerini kullanmak isterseniz kendi Gemini API anahtarınızı buraya ekleyebilirsiniz.
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${aiStatus.enabled ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-stone-500/10 text-stone-500 border border-stone-500/20'}`}>
                    AI {aiStatus.enabled ? 'Aktif' : 'Kapalı'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold">Gemini API Key</span>
                    <input
                      type="password"
                      value={geminiDraftKey}
                      onChange={(event) => {
                        setGeminiDraftKey(event.target.value);
                        setAiSaveMessage('');
                      }}
                      placeholder="Gemini API anahtarınızı girin"
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 text-xs outline-none"
                    />
                  </label>
                  <button onClick={saveGeminiApiKey} className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                    Kaydet
                  </button>
                  <button onClick={clearGeminiApiKey} className="px-4 py-3 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-bold opacity-80 hover:opacity-100">
                    Anahtarı Sil
                  </button>
                </div>

                {(aiSaveMessage || aiStatus.enabled) && (
                  <div className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${aiStatus.enabled ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-stone-500/20 bg-stone-500/10'}`}>
                    <div>
                      <p className={`text-xs font-black ${aiStatus.enabled ? 'text-emerald-500' : 'text-stone-500'}`}>
                        {aiStatus.enabled ? 'AI Aktif' : 'AI Kapalı'}
                      </p>
                      <p className="text-[11px] opacity-75 leading-relaxed mt-1">
                        {aiSaveMessage || 'Gemini API key kayıtlı. AI çıktısı üretmek için Okuma Merkezi ekranında ilgili kitabı seçip AI özet veya zorluk analizi butonlarını kullanın.'}
                      </p>
                    </div>
                    {aiStatus.enabled && (
                      <button
                        onClick={() => navigateToTab('reading', selectedBook?.id)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                      >
                        AI Araçlarına Git
                      </button>
                    )}
                  </div>
                )}

                <div className="text-[11px] opacity-70 leading-relaxed rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40 border border-stone-200/50 dark:border-zinc-850 p-4">
                  API anahtarı bu tarayıcıda yerel olarak saklanır ve AI isteklerinde sunucuya header olarak gönderilir. Paylaşımlı bilgisayarda kullanıyorsanız işiniz bitince "Anahtarı Sil" düğmesini kullanın. API anahtarını Google AI Studio üzerinden alabilirsiniz: https://aistudio.google.com/app/apikey
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    ['AI Özet', 'Uzun metinleri ana fikir, kilit noktalar ve kısa özet halinde çıkarır.'],
                    ['Kelime Açıklama', 'Okurken anlamını bilmediğiniz kelimeleri bağlama göre açıklar.'],
                    ['Zorluk Analizi', 'Metnin okuma zorluğunu, karmaşık kelimeleri ve seviye bilgisini verir.'],
                    ['Kavrama Testi', 'Okuma sonrası aktif hatırlama için çoktan seçmeli sorular üretir.'],
                    ['İçgörü & Aksiyon', 'Metinden uygulanabilir fikirler ve zihinsel model önerileri çıkarır.'],
                    ['AI Kapalıyken', 'Okuma, not alma, kütüphane, ilerleme ve tema özellikleri çalışmaya devam eder.']
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40 border border-stone-200/50 dark:border-zinc-850 p-4">
                      <h4 className="text-xs font-black">{title}</h4>
                      <p className="text-[11px] opacity-70 leading-relaxed mt-1">{body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
                <ThemeSelector currentTheme={currentThemeType} onChangeTheme={handleThemeChange} />
              </div>
            </section>
          )}
        </div>
      </main>

      {isAddOpen && <Suspense fallback={null}><AddDocumentModal onClose={() => setIsAddOpen(false)} onAdd={handleAddNewBook} /></Suspense>}
      {activeBook && <Suspense fallback={<LazyPanelFallback />}><SpeedReader book={activeBook} themeType={currentThemeType} onClose={handleCloseReader} onUpdateProgress={handleReaderProgressUpdate} onSaveSummary={() => {}} onSaveDifficulty={() => {}} aiEnabled={aiStatus.enabled} /></Suspense>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-12 text-center rounded-3xl border border-dashed border-stone-300 dark:border-zinc-800 text-stone-700 dark:text-zinc-400 text-sm">{text}</div>;
}

function Metric({ title, value, theme }: { title: string; value: string; theme: ThemeConfig }) {
  const isLight = theme.name === 'light' || theme.name === 'minimal-light';
  return <div className={`p-5 rounded-2xl border ${theme.border} ${theme.cardBg}`}><span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-stone-700' : 'opacity-60'}`}>{title}</span><h4 className="text-xl font-black mt-1">{value}</h4></div>;
}

function GuideScreen({ currentTheme }: { currentTheme: ThemeConfig }) {
  const cards = [
    ['RSVP Okuma', 'Kelimeleri veya kelime gruplarını ekranın merkezinde gösterir. Satır tarama yükünü azaltır ve ritmik okumayı kolaylaştırır.'],
    ['Hız (WPM)', 'Dakikada gösterilecek kelime sayısıdır. 200-300 başlangıç, 300-450 dengeli pratik aralığıdır.'],
    ['Kelime Grubu', 'Aynı anda gösterilen kelime sayısıdır. Üst sınır yoktur; çok yüksek değerlerde kavrama düşebilir.'],
    ['ORP', 'Optimal Tanıma Noktasıdır. Tek kelimede hızlı tanıma harfini vurgular.'],
    ['Odak Çizgisi', 'Kelimenin merkezini sabitlemeye yarayan görsel rehber çizgidir. Rahatsız ederse kapatılabilir.'],
    ['Akıllı Es', 'Nokta, virgül ve uzun kelimelerde kısa doğal duraklamalar ekler. Anlamayı destekler.'],
    ['Odak Modu', 'Merkez RSVP, satır modu, teleprompter, bionic reading ve paragraf vurgusu arasında geçiş yapar.'],
    ['Araçlar', 'Okuyucudaki ek açıklama ve gelişmiş seçenek panelini açıp kapatır.']
  ];

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">ReadFlow Rehberi</h2>
        <p className="text-sm opacity-65 mt-1">Uygulamanın amacı, butonları, teknik terimleri ve en iyi kullanım yöntemi.</p>
      </div>

      <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
        <h3 className="text-base font-black mb-2">ReadFlow kimler için?</h3>
        <p className="text-sm opacity-75 leading-relaxed">Uzun metinleri daha odaklı okumak, hızını takip etmek, not almak ve okuma sonrası kavramayı güçlendirmek isteyen öğrenciler, araştırmacılar, yazılımcılar, yöneticiler ve düzenli okuma alışkanlığı kurmak isteyen kullanıcılar için tasarlanmıştır.</p>
      </div>

      <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
        <h3 className="text-base font-black mb-2">Gemini API key girince ne açılır?</h3>
        <p className="text-sm opacity-75 leading-relaxed mb-4">
          Gemini API key tamamen isteğe bağlıdır. Key girmezseniz ReadFlow okuma, kütüphane, notlar, ilerleme takibi, tema ve okuyucu kontrolleriyle çalışmaya devam eder. Key girerseniz aşağıdaki AI destekli işlemler açılır.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            ['Metin Özeti', 'Metnin ana fikrini, önemli noktalarını ve kısa özetini üretir.'],
            ['Kelime Sözlüğü', 'Okuma sırasında seçilen kelimeyi bağlamıyla açıklar, eş anlamlılar ve örnekler verir.'],
            ['Zorluk Analizi', 'Metnin kolay/orta/zor seviyesini, puanını ve zor kelimelerini çıkarır.'],
            ['Kavrama Soruları', 'Okuma sonrası aktif hatırlama için çoktan seçmeli sorular üretir.'],
            ['Feynman Sorusu', 'Konuyu kendi cümlelerinizle anlatmanız için öğrenme sorgusu oluşturur.'],
            ['İçgörü ve Aksiyon', 'Metinden uygulanabilir fikirler, kilit içgörüler ve mental model önerileri çıkarır.']
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40 border border-stone-200/50 dark:border-zinc-850 p-4">
              <h4 className="text-xs font-black">{title}</h4>
              <p className="text-[11px] opacity-70 leading-relaxed mt-1">{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map(([title, body]) => <div key={title} className={`p-5 rounded-2xl border ${currentTheme.border} ${currentTheme.cardBg}`}><h4 className="text-sm font-black">{title}</h4><p className="text-xs opacity-70 leading-relaxed mt-2">{body}</p></div>)}
      </div>

      <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
        <h3 className="text-base font-black mb-3">En iyi verim için önerilen akış</h3>
        <ol className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <li className="p-4 rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40">1. Metni kütüphaneye ekleyin.</li>
          <li className="p-4 rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40">2. 250 WPM ve 1 kelime grubu ile başlayın.</li>
          <li className="p-4 rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40">3. Rahatladıkça hızı ve kelime grubunu artırın.</li>
          <li className="p-4 rounded-2xl bg-stone-100/50 dark:bg-zinc-950/40">4. Okuma sonrası not alın ve kavramayı kontrol edin.</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
          <h3 className="text-base font-black mb-3">Teknik terimler sözlüğü</h3>
          <dl className="text-xs flex flex-col gap-3"><div><dt className="font-bold">WPM</dt><dd className="opacity-70">Dakikada kelime sayısı.</dd></div><div><dt className="font-bold">RSVP</dt><dd className="opacity-70">Kelimeleri aynı odak noktasında sırayla gösterme tekniği.</dd></div><div><dt className="font-bold">ORP</dt><dd className="opacity-70">Kelimenin tanınmasını hızlandıran odak harfi.</dd></div><div><dt className="font-bold">Aktif Hatırlama</dt><dd className="opacity-70">Okunan bilgiyi tekrar okumadan zihinden geri çağırma çalışması.</dd></div></dl>
        </div>
        <div className={`p-6 rounded-3xl border ${currentTheme.border} ${currentTheme.cardBg}`}>
          <h3 className="text-base font-black mb-3">Dikkat edilmesi gerekenler</h3>
          <ul className="text-xs opacity-75 leading-relaxed flex flex-col gap-2 list-disc pl-4"><li>Hız arttıkça anlama düşüyorsa WPM değerini azaltın.</li><li>Akademik metinlerde Akıllı Es açık ve kelime grubu düşük kalabilir.</li><li>Roman ve akıcı metinlerde kelime grubu artırılabilir.</li><li>Odak çizgisi dikkatinizi dağıtıyorsa kapatın.</li></ul>
        </div>
      </div>
    </section>
  );
}
