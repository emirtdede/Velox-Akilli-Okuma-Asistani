/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useMemo, useState, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { BookMark, ThemeConfig, THEMES, ThemeType } from './types';
import { StorageService } from './utils/storage';
import ThemeSelector from './components/ThemeSelector';
import { useTranslation } from './utils/i18n';
import {
  Activity,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Brain,
  ChevronLeft,
  ChevronsRight,
  Clock3,
  FileText,
  Flame,
  Gauge,
  HelpCircle,
  Home,
  KeyRound,
  LibraryBig,
  MessageSquareText,
  Palette,
  Play,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  X,
  Download,
  ChevronDown,
  Shield,
  Scale,
  Heart,
  ExternalLink,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  Trophy,
  Undo,
  Layers,
  Bookmark,
  FileQuestion,
  ListPlus, Edit,
  Database,
  Keyboard,
  FileDown,
  UploadCloud,
  RefreshCw
} from 'lucide-react';

const AddDocumentModal = lazy(() => import('./components/AddDocumentModal'));
const SpeedReader = lazy(() => import('./components/SpeedReader'));

const APP_NAME = 'Velox';
const APP_DESCRIPTION = 'Akıllı Okuma Asistanı';
const APP_FULL_NAME = 'Velox - Akıllı Okuma Asistanı';
const APP_VERSION = '1.0.0';
const APP_PUBLISHER = 'Vellium';
const GEMINI_KEY = 'velox_gemini_api_key';
const LEGACY_GEMINI_KEY = 'readflow_gemini_api_key';
const noteKeyForBook = (bookId: string) => `velox_notes_text_${bookId}`;
const legacyNoteKeyForBook = (bookId: string) => `readflow_notes_text_${bookId}`;

const LazyPanelFallback = () => <div className="p-4 text-xs opacity-60">Yükleniyor...</div>;

type AppTab = 'home' | 'progress' | 'workspace' | 'quiz' | 'guide' | 'settings' | 'about' | 'reader';
type WorkspaceTab = 'content' | 'notes' | 'analysis' | 'actions';
type SettingsTab = 'appearance' | 'ai' | 'data' | 'shortcuts' | 'language';
type BookFilter = 'all' | 'active' | 'completed';
type SidebarMode = 'full' | 'compact' | 'hidden';

const SIDEBAR_PREFS_KEY = 'velox_sidebar_pref';

const NAV_ITEMS = [
  { tab: 'home' as AppTab, icon: Home, label: 'Anasayfa' },
  { tab: 'reader' as AppTab, icon: BookOpen, label: 'Okuma Alanı' },
  { tab: 'workspace' as AppTab, icon: LibraryBig, label: 'Çalışma Alanı', bookAware: true },
  { tab: 'quiz' as AppTab, icon: Brain, label: 'Hatırlama & Quiz' },
  { tab: 'progress' as AppTab, icon: Activity, label: 'İlerleme & Gelişim' },
  { tab: 'guide' as AppTab, icon: HelpCircle, label: 'Uygulama Rehberi' },
  { tab: 'settings' as AppTab, icon: Settings, label: 'Ayarlar' },
  { tab: 'about' as AppTab, icon: Shield, label: 'Hakkında' }
];

const WORKSPACE_TABS = [
  { id: 'content' as WorkspaceTab, label: 'Belge İçeriği', icon: BookOpen },
  { id: 'notes' as WorkspaceTab, label: 'Notlarım', icon: MessageSquareText },
  { id: 'analysis' as WorkspaceTab, label: 'Yapay Zeka Analizi', icon: Sparkles },
  { id: 'actions' as WorkspaceTab, label: 'Yapay Zeka Soru & Aksiyon', icon: Brain }
];

const SETTINGS_TABS = [
  { id: 'appearance' as SettingsTab, label: 'Görünüm', icon: Palette },
  { id: 'ai' as SettingsTab, label: 'Yapay Zeka', icon: KeyRound },
  { id: 'shortcuts' as SettingsTab, label: 'Klavye Kısayolları', icon: Keyboard },
  { id: 'data' as SettingsTab, label: 'Veri Yönetimi', icon: Database },
  { id: 'language' as SettingsTab, label: 'Dil Seçeneği (Language)', icon: BookOpenCheck }
];

function parseRoute(pathname = typeof window !== 'undefined' ? window.location.pathname : '/'): { tab: AppTab; bookId: string | null; readerBookId: string | null; settingsTab?: SettingsTab } {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];

  if (first === 'reader' || first === 'focus') {
    return { tab: 'workspace' as AppTab, bookId: parts[1] || null, readerBookId: parts[1] || null };
  }

  if (['library', 'reading', 'notes', 'workspace'].includes(first)) {
    return { tab: 'workspace' as AppTab, bookId: parts[1] || null, readerBookId: null };
  }

  if (first === 'progress') {
    return { tab: 'progress' as AppTab, bookId: null, readerBookId: null };
  }

  if (first === 'home') {
    return { tab: 'home' as AppTab, bookId: null, readerBookId: null };
  }

  if (first === 'quiz') {
    return { tab: 'quiz' as AppTab, bookId: null, readerBookId: null };
  }

  if (first === 'guide') {
    return { tab: 'guide' as AppTab, bookId: null, readerBookId: null };
  }

  if (first === 'about') {
    return { tab: 'about' as AppTab, bookId: null, readerBookId: null };
  }

  if (first === 'settings') {
    return { tab: 'settings' as AppTab, bookId: null, readerBookId: null };
  }

  return { tab: 'home' as AppTab, bookId: null, readerBookId: null };
}

function pathForTab(tab: AppTab, bookId?: string | null) {
  if (tab === 'workspace') return bookId ? `/workspace/${encodeURIComponent(bookId)}` : '/workspace';
  if (tab === 'reader') return bookId ? `/reader/${encodeURIComponent(bookId)}` : '/reader';
  if (tab === 'quiz') return '/quiz';
  if (tab === 'settings') return '/settings';
  if (tab === 'guide') return '/guide';
  if (tab === 'about') return '/about';
  if (tab === 'home') return '/home';
  if (tab === 'progress') return '/progress';
  return '/';
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function parseCustomDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  if (dateStr.includes('.')) {
    const parts = dateStr.split(' ')[0].split('.');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  return new Date(dateStr);
}

function readLocalWithLegacy(key: string, legacyKey: string) {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) localStorage.setItem(key, legacy);
  return legacy || '';
}

export default function App() {
  const { t, lang, setLanguage } = useTranslation();

  const getLocalBook = (book: any) => {
    if (!book) return book;
    if (book.id === 'sample-welcome' && lang !== 'tr') {
      return {
        ...book,
        title: 'Velox Speed Reading Guide',
        content: `Welcome to Velox! This modern application is specifically designed to improve your speed reading skills, maximize your focus, and multiply your reading productivity.

By using the RSVP (Rapid Serial Visual Presentation) engine in our app, you can read words fluidly one-by-one or in groups without straining your eye muscles or losing time scanning lines.

Thanks to the Optimal Recognition Point (ORP) feature, the focus letter in the middle of the word is marked in red. This allows your eye to grasp the meaning of the word in milliseconds and reduces word searching to zero.

The Smart Pause System adds small wait times at punctuation marks to mimic natural reading. For example, it automatically slows down at commas (+100 ms), periods (+300 ms), or paragraph ends (+500 ms) to capture a flawless cognitive rhythm.

Thanks to our AI assistant, you can summarize any text you read with a single click, analyze word difficulty, and instantly learn the meaning, synonyms, and example sentences of any word you click!

Shortcut Keys:
- [Space]: Play / Pause
- [Left Arrow]: Rewind 10 words
- [Right Arrow]: Fast forward 10 words
- [Up Arrow]: Increase speed (+25 WPM)
- [Down Arrow]: Decrease speed (-25 WPM)
- [Esc]: Exit reader safely

Now you can click the "Start Reading" button to have your first experience, and easily add your own book, word, md, or pdf documents to your library! We wish you success.`,
        tags: ['Guide', 'Beginner'],
        difficultyInfo: book.difficultyInfo ? {
          ...book.difficultyInfo,
          level: 'Easy',
          complexWords: ['RSVP', 'ORP', 'Cognitive', 'Optimal'],
          description: 'The text is written in a simple, instructive, and guiding language, making it highly fluid for all readers.'
        } : null
      };
    }
    return book;
  };

  const initialRoute = parseRoute();
  const [activeTab, setActiveTab] = useState<AppTab>(initialRoute.tab);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('content');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance');
  const [books, setBooks] = useState<BookMark[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(initialRoute.bookId || initialRoute.readerBookId);
  const [activeBook, setActiveBook] = useState<BookMark | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [stats, setStats] = useState(StorageService.getStats());
  const [prefs, setPrefs] = useState(StorageService.getPreferences());
  const [aiStatus, setAiStatus] = useState({ enabled: false, provider: 'none', checked: false });
  const [aiProvider, setAiProvider] = useState<string>(() => localStorage.getItem('velox_ai_provider') || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(() => readLocalWithLegacy(GEMINI_KEY, LEGACY_GEMINI_KEY));
  const [geminiDraftKey, setGeminiDraftKey] = useState(() => readLocalWithLegacy(GEMINI_KEY, LEGACY_GEMINI_KEY));
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('velox_openai_api_key') || '');
  const [openaiDraftKey, setOpenaiDraftKey] = useState(() => localStorage.getItem('velox_openai_api_key') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('velox_claude_api_key') || '');
  const [claudeDraftKey, setClaudeDraftKey] = useState(() => localStorage.getItem('velox_claude_api_key') || '');
  const [localUrl, setLocalUrl] = useState(() => localStorage.getItem('velox_local_url') || 'http://localhost:11434');
  const [localUrlDraft, setLocalUrlDraft] = useState(() => localStorage.getItem('velox_local_url') || 'http://localhost:11434');
  const [localModel, setLocalModel] = useState(() => localStorage.getItem('velox_local_model') || 'llama3');
  const [localModelDraft, setLocalModelDraft] = useState(() => localStorage.getItem('velox_local_model') || 'llama3');
  const [aiSaveMessage, setAiSaveMessage] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bookFilter, setBookFilter] = useState<BookFilter>('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [wordQuery, setWordQuery] = useState('');
  const [dictionaryResult, setDictionaryResult] = useState<any>(null);
  const [comprehensionResult, setComprehensionResult] = useState<any>(null);
  const [insightsResult, setInsightsResult] = useState<any>(null);

  const [quizHistory, setQuizHistory] = useState<any[]>(() => {
    const history = localStorage.getItem('velox_quiz_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const sampleHistory = [
      {
        id: "sample-history-1",
        bookTitle: "Velox okuma rehberi",
        date: new Date().toLocaleString('tr-TR'),
        correctCount: 3,
        wrongCount: 0,
        emptyCount: 0,
        totalQuestions: 3,
        difficulty: "Orta",
        score: 100
      },
      {
        id: "sample-history-2",
        bookTitle: "Yapay Zeka Okuması",
        date: new Date(Date.now() - 86400000).toLocaleString('tr-TR'),
        correctCount: 4,
        wrongCount: 1,
        emptyCount: 0,
        totalQuestions: 5,
        difficulty: "Kolay",
        score: 80
      }
    ];
    localStorage.setItem('velox_quiz_history', JSON.stringify(sampleHistory));
    return sampleHistory;
  });

  const [flashcards, setFlashcards] = useState<any[]>(() => {
    const cards = localStorage.getItem('velox_flashcards');
    if (cards) {
      try {
        const parsed = JSON.parse(cards);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const sampleFlashcards = [
      {
        id: "sample-card-1",
        bookId: "sample-welcome",
        bookTitle: "Velox okuma rehberi",
        front: "Optimal Tanıma Noktası (ORP) Nedir?",
        back: "Gözün bir kelimeyi en hızlı şekilde tanıması için odaklanması gereken, kelimenin ortasındaki kırmızı ile işaretlenen harf konumudur.",
        status: "more",
        reviewsCount: 8
      },
      {
        id: "sample-card-2",
        bookId: "sample-welcome",
        bookTitle: "Velox okuma rehberi",
        front: "İç Seslendirme (Subvocalization) Okuma Hızını Nasıl Etkiler?",
        back: "Okuma hızını konuşma hızına (dakikada ~150-200 kelime) sınırlar. Bu alışkanlığı kırmak hızlı okumanın anahtarıdır.",
        status: "normal",
        reviewsCount: 4
      },
      {
        id: "sample-card-3",
        bookId: "sample-welcome",
        bookTitle: "Velox okuma rehberi",
        front: "Feynman Tekniği ile Öğrenme Adımları Nelerdir?",
        back: "1. Konuyu seç. 2. Basitçe açıkla. 3. Boşlukları tespit et ve kaynağa dön. 4. Benzetmelerle basitleştir.",
        status: "more",
        reviewsCount: 6
      }
    ];
    localStorage.setItem('velox_flashcards', JSON.stringify(sampleFlashcards));
    return sampleFlashcards;
  });
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    const stored = localStorage.getItem(SIDEBAR_PREFS_KEY);
    return stored === 'compact' || stored === 'hidden' || stored === 'full' ? stored : 'full';
  });

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [userGoals, setUserGoals] = useState<any>(() => {
    const stored = localStorage.getItem('velox_user_goals');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.showReadingGoal === undefined) parsed.showReadingGoal = true;
        if (parsed.showQuizzesGoal === undefined) parsed.showQuizzesGoal = true;
        if (parsed.showCardsGoal === undefined) parsed.showCardsGoal = true;
        return parsed;
      } catch (e) {}
    }
    const defaultGoals = {
      dailyWords: 3000,
      monthlyWords: 90000,
      yearlyWords: 1000000,
      dailyMinutes: 30,
      monthlyMinutes: 900,
      yearlyMinutes: 10000,
      dailyQuizzes: 1,
      monthlyQuizzes: 15,
      yearlyQuizzes: 100,
      dailyCards: 15,
      monthlyCards: 300,
      yearlyCards: 3000,
      showReadingGoal: true,
      showQuizzesGoal: true,
      showCardsGoal: true
    };
    localStorage.setItem('velox_user_goals', JSON.stringify(defaultGoals));
    return defaultGoals;
  });

  const [readingReport, setReadingReport] = useState<string>(() => {
    return localStorage.getItem('velox_reading_report_active') || '';
  });
  const [quizReport, setQuizReport] = useState<string>(() => {
    return localStorage.getItem('velox_quiz_report_active') || '';
  });
  const [cardReport, setCardReport] = useState<string>(() => {
    return localStorage.getItem('velox_card_report_active') || '';
  });

  const [readingReportHistory, setReadingReportHistory] = useState<{ id: string; date: string; content: string }[]>(() => {
    try {
      const stored = localStorage.getItem('velox_reading_reports_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [quizReportHistory, setQuizReportHistory] = useState<{ id: string; date: string; content: string }[]>(() => {
    try {
      const stored = localStorage.getItem('velox_quiz_reports_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [cardReportHistory, setCardReportHistory] = useState<{ id: string; date: string; content: string }[]>(() => {
    try {
      const stored = localStorage.getItem('velox_card_reports_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [reportLoading, setReportLoading] = useState<string | null>(null);

  const handleDeleteHistoryItem = (category: 'reading' | 'quiz' | 'cards', id: string) => {
    if (category === 'reading') {
      const updated = readingReportHistory.filter(item => item.id !== id);
      setReadingReportHistory(updated);
      localStorage.setItem('velox_reading_reports_history', JSON.stringify(updated));
    } else if (category === 'quiz') {
      const updated = quizReportHistory.filter(item => item.id !== id);
      setQuizReportHistory(updated);
      localStorage.setItem('velox_quiz_reports_history', JSON.stringify(updated));
    } else if (category === 'cards') {
      const updated = cardReportHistory.filter(item => item.id !== id);
      setCardReportHistory(updated);
      localStorage.setItem('velox_card_reports_history', JSON.stringify(updated));
    }
  };

  const showCustomAlert = (message: string, title = 'Bilgi') => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  };

  const showCustomConfirm = (message: string, onConfirm: () => void, title = 'Onay Gerekli') => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  const currentThemeType: ThemeType = prefs.theme || 'dark';
  const currentTheme: ThemeConfig = THEMES[currentThemeType] || THEMES.dark;
  const isLightTheme = currentThemeType === 'light';
  const surfaceClass = isLightTheme
    ? 'bg-white border-stone-200 shadow-[0_16px_40px_rgba(15,23,42,0.06)]'
    : `border ${currentTheme.border} ${currentTheme.cardBg} shadow-[0_18px_60px_rgba(0,0,0,0.22)]`;
  const softSurfaceClass = isLightTheme
    ? 'bg-stone-50 border-stone-200'
    : 'bg-white/[0.025] border-white/10';
  const titleClass = isLightTheme ? 'text-stone-950' : 'text-current';
  const mutedClass = isLightTheme ? 'text-stone-600' : 'text-zinc-400';

  const selectedBook = useMemo(() => {
    const found = books.find(book => book.id === selectedBookId) || books[0] || null;
    return getLocalBook(found);
  }, [books, selectedBookId, lang]);

  const recentBooks = useMemo(() => {
    return [...books].sort((left, right) => right.lastReadDate.localeCompare(left.lastReadDate)).slice(0, 6);
  }, [books]);

  const filteredBooks = useMemo(() => {
    const query = bookSearch.trim().toLocaleLowerCase('tr-TR');
    return books.filter(book => {
      const matchesQuery = !query || `${book.title} ${book.content} ${(book.tags || []).join(' ')}`.toLocaleLowerCase('tr-TR').includes(query);
      const matchesFilter =
        bookFilter === 'all' ||
        (bookFilter === 'active' && (book.progress || 0) < 100) ||
        (bookFilter === 'completed' && (book.progress || 0) >= 100);
      return matchesQuery && matchesFilter;
    });
  }, [books, bookFilter, bookSearch]);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayHistory = stats.history.find(item => item.date === todayKey);
  const todayWords = todayHistory?.wordCount || 0;
  const dailyGoal = Math.max(1, stats.dailyGoalWords || 3000);
  const dailyProgress = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  const totalMinutes = Math.max(0, Math.round(stats.totalReadingTimeSeconds / 60));

  const chartData = useMemo(() => {
    type HistoryItem = { date: string; wordCount: number; durationSeconds: number };
    const historyMap = new Map<string, HistoryItem>(
      stats.history.map((item: HistoryItem) => [item.date, item])
    );
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().split('T')[0];
      const item = historyMap.get(key);
      return {
        date: formatShortDate(date),
        words: item?.wordCount || 0,
        minutes: Math.round((item?.durationSeconds || 0) / 60)
      };
    });
  }, [stats.history]);

  useEffect(() => {
    document.title = lang === 'tr' ? 'Velox - Akıllı Okuma Asistanı' : 'Velox - Smart Reading Assistant';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_PREFS_KEY, sidebarMode);
  }, [sidebarMode]);

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

  useEffect(() => {
    setNoteDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const book of books) {
        next[book.id] = prev[book.id] ?? readLocalWithLegacy(noteKeyForBook(book.id), legacyNoteKeyForBook(book.id));
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

  useEffect(() => {
    if (selectedBook) {
      setEditTitle(selectedBook.title);
      setEditContent(selectedBook.content);
      setIsEditingContent(false);
      setComprehensionResult(selectedBook.comprehensionQuestions || null);
      setInsightsResult(selectedBook.insightsResult || null);
    } else {
      setEditTitle('');
      setEditContent('');
      setIsEditingContent(false);
      setComprehensionResult(null);
      setInsightsResult(null);
    }
  }, [selectedBook]);


  const refreshBooks = () => setBooks(StorageService.getBooks());

  const refreshAiStatus = (
    provider = aiProvider,
    geminiKey = geminiApiKey,
    openaiKey = openaiApiKey,
    claudeKey = claudeApiKey,
    lUrl = localUrl,
    lModel = localModel
  ) => {
    const headers: Record<string, string> = {
      'x-ai-provider': provider
    };
    if (provider === 'gemini' && geminiKey) {
      headers['x-ai-api-key'] = geminiKey;
      headers['x-gemini-api-key'] = geminiKey;
    } else if (provider === 'openai' && openaiKey) {
      headers['x-ai-api-key'] = openaiKey;
    } else if (provider === 'claude' && claudeKey) {
      headers['x-ai-api-key'] = claudeKey;
    } else if (provider === 'local') {
      headers['x-ai-local-url'] = lUrl;
      headers['x-ai-model'] = lModel;
    }

    fetch('/api/ai/status', { headers })
      .then(response => response.json())
      .then(data => setAiStatus({ enabled: Boolean(data.enabled), provider: data.provider || 'none', checked: true }))
      .catch(() => setAiStatus({ enabled: false, provider: 'none', checked: true }));
  };

  useEffect(() => {
    refreshAiStatus(aiProvider, geminiApiKey, openaiApiKey, claudeApiKey, localUrl, localModel);
  }, [aiProvider, geminiApiKey, openaiApiKey, claudeApiKey, localUrl, localModel]);

  const navigateToTab = (tab: AppTab, bookId?: string | null, replace = false) => {
    if (tab === 'reader') {
      const bId = bookId || selectedBookId || (books.length > 0 ? books[0].id : null);
      const b = books.find(x => x.id === bId) || books[0];
      if (!b) {
        showCustomAlert("Okuma yapabilmek için lütfen önce kütüphanenize bir belge ekleyin.", "Belge Gerekli");
        return;
      }
      setActiveBook(b);
    }
    setActiveTab(tab);
    if (bookId) setSelectedBookId(bookId);
    const nextPath = pathForTab(tab, bookId);
    if (window.location.pathname !== nextPath) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', nextPath);
    }
  };

  const handleAddNewBook = (title: string, content: string, tags?: string[]) => {
    const book = StorageService.addBook(title, content, tags || []);
    refreshBooks();
    setSelectedBookId(book.id);
    setWorkspaceTab('analysis');
    navigateToTab('workspace', book.id);
  };

  const handleDeleteBook = (bookId: string) => {
    showCustomConfirm('Bu belgeyi silmek istiyor musunuz?', () => {
      const remaining = StorageService.deleteBook(bookId);
      setBooks(remaining);
      setSelectedBookId(remaining[0]?.id || null);
    }, 'Belgeyi Sil');
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
    navigateToTab('workspace', closedBookId, true);
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

  const saveAiSettings = (
    provider: string,
    geminiKey: string,
    openaiKey: string,
    claudeKey: string,
    lUrl: string,
    lModel: string
  ) => {
    localStorage.setItem('velox_ai_provider', provider);
    setAiProvider(provider);

    localStorage.setItem(GEMINI_KEY, geminiKey.trim());
    setGeminiApiKey(geminiKey.trim());
    setGeminiDraftKey(geminiKey.trim());

    localStorage.setItem('velox_openai_api_key', openaiKey.trim());
    setOpenaiApiKey(openaiKey.trim());
    setOpenaiDraftKey(openaiKey.trim());

    localStorage.setItem('velox_claude_api_key', claudeKey.trim());
    setClaudeApiKey(claudeKey.trim());
    setClaudeDraftKey(claudeKey.trim());

    localStorage.setItem('velox_local_url', lUrl.trim());
    setLocalUrl(lUrl.trim());
    setLocalUrlDraft(lUrl.trim());

    localStorage.setItem('velox_local_model', lModel.trim());
    setLocalModel(lModel.trim());
    setLocalModelDraft(lModel.trim());

    setAiSaveMessage(lang === 'tr' ? 'Yapay zeka ayarları kaydedildi.' : 'AI settings saved.');
    refreshAiStatus(provider, geminiKey, openaiKey, claudeKey, lUrl, lModel);
  };

  const clearAiSettings = () => {
    localStorage.removeItem('velox_ai_provider');
    setAiProvider('gemini');

    localStorage.removeItem(GEMINI_KEY);
    localStorage.removeItem(LEGACY_GEMINI_KEY);
    setGeminiApiKey('');
    setGeminiDraftKey('');

    localStorage.removeItem('velox_openai_api_key');
    setOpenaiApiKey('');
    setOpenaiDraftKey('');

    localStorage.removeItem('velox_claude_api_key');
    setClaudeApiKey('');
    setClaudeDraftKey('');

    localStorage.removeItem('velox_local_url');
    setLocalUrl('http://localhost:11434');
    setLocalUrlDraft('http://localhost:11434');

    localStorage.removeItem('velox_local_model');
    setLocalModel('llama3');
    setLocalModelDraft('llama3');

    setAiStatus({ enabled: false, provider: 'none', checked: true });
    setAiSaveMessage(lang === 'tr' ? 'Yapay zeka ayarları sıfırlandı.' : 'AI settings reset.');
  };

  const saveBookNotes = (bookId: string) => {
    localStorage.setItem(noteKeyForBook(bookId), noteDrafts[bookId] || '');
  };

  const aiHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ai-provider': aiProvider,
      'x-ai-lang': lang
    };
    if (aiProvider === 'gemini' && geminiApiKey) {
      headers['x-ai-api-key'] = geminiApiKey;
      headers['x-gemini-api-key'] = geminiApiKey;
    } else if (aiProvider === 'openai' && openaiApiKey) {
      headers['x-ai-api-key'] = openaiApiKey;
    } else if (aiProvider === 'claude' && claudeApiKey) {
      headers['x-ai-api-key'] = claudeApiKey;
    } else if (aiProvider === 'local') {
      headers['x-ai-local-url'] = localUrl;
      headers['x-ai-model'] = localModel;
    }
    return headers;
  };

  const postAi = async (endpoint: string, body: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Yapay zeka isteği tamamlanamadı.');
    return data;
  };

  const generateAiSummary = async () => {
    if (!selectedBook) return;
    setAiBusy('summary');
    setAiError(null);
    try {
      const data = await postAi('/api/ai/summarize', { text: selectedBook.content });
      StorageService.updateBookAiSummary(selectedBook.id, data);
      refreshBooks();
    } catch (error: any) {
      setAiError(error.message || 'Yapay zeka özeti alınamadı.');
    } finally {
      setAiBusy(null);
    }
  };

  const generateDifficultyAnalysis = async () => {
    if (!selectedBook) return;
    setAiBusy('difficulty');
    setAiError(null);
    try {
      const data = await postAi('/api/ai/analyze-difficulty', { text: selectedBook.content });
      StorageService.updateBookDifficulty(selectedBook.id, data);
      refreshBooks();
    } catch (error: any) {
      setAiError(error.message || 'Zorluk analizi alınamadı.');
    } finally {
      setAiBusy(null);
    }
  };

  const generateWordDefinition = async () => {
    if (!selectedBook || !wordQuery.trim()) return;
    setAiBusy('word');
    setAiError(null);
    try {
      const data = await postAi('/api/ai/define-word', {
        word: wordQuery.trim(),
        context: selectedBook.content.slice(0, 1200)
      });
      setDictionaryResult(data);
    } catch (error: any) {
      setAiError(error.message || 'Kelime açıklaması alınamadı.');
    } finally {
      setAiBusy(null);
    }
  };

  const generateComprehension = async () => {
    if (!selectedBook) return;
    setAiBusy('comprehension');
    setAiError(null);
    try {
      const data = await postAi('/api/ai/comprehension', { text: selectedBook.content, title: selectedBook.title });
      setComprehensionResult(data);
      StorageService.updateBookComprehension(selectedBook.id, data);
      refreshBooks();
    } catch (error: any) {
      setAiError(error.message || 'Kavrama soruları üretilemedi.');
    } finally {
      setAiBusy(null);
    }
  };

  const generateInsights = async () => {
    if (!selectedBook) return;
    setAiBusy('insights');
    setAiError(null);
    try {
      const data = await postAi('/api/ai/insights', { text: selectedBook.content, title: selectedBook.title });
      setInsightsResult(data);
      StorageService.updateBookInsights(selectedBook.id, data);
      refreshBooks();
    } catch (error: any) {
      setAiError(error.message || 'Aksiyon önerileri üretilemedi.');
    } finally {
      setAiBusy(null);
    }
  };

  return (
    <div className={`min-h-screen flex transition-all duration-300 font-sans ${currentTheme.bg} ${currentTheme.text}`}>
      <Sidebar
        activeTab={activeTab}
        aiEnabled={aiStatus.enabled}
        mode={sidebarMode}
        onSetMode={setSidebarMode}
        onAdd={() => setIsAddOpen(true)}
        onNavigate={(tab) => navigateToTab(tab, tab === 'workspace' ? selectedBook?.id : null)}
        theme={currentTheme}
      />

      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
        <div className="w-full max-w-none flex flex-col gap-6">
          {activeTab === 'home' && (
            <HomePage
              books={books}
              stats={stats}
              todayWords={todayWords}
              totalMinutes={totalMinutes}
              quizHistory={quizHistory}
              flashcards={flashcards}
              userGoals={userGoals}
              setUserGoals={(newGoals: any) => {
                setUserGoals(newGoals);
                localStorage.setItem('velox_user_goals', JSON.stringify(newGoals));
              }}
              onNavigateToTab={(tab: any) => navigateToTab(tab)}
              selectedBook={selectedBook}
              onStartReading={handleLaunchReader}
              onAddDocument={() => setIsAddOpen(true)}
              onSetWorkspaceTab={(wTab: any) => setWorkspaceTab(wTab)}
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              isLightTheme={isLightTheme}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressPage
              stats={stats}
              todayWords={todayWords}
              totalMinutes={totalMinutes}
              chartData={chartData}
              quizHistory={quizHistory}
              flashcards={flashcards}
              readingReport={readingReport}
              setReadingReport={setReadingReport}
              quizReport={quizReport}
              setQuizReport={setQuizReport}
              cardReport={cardReport}
              setCardReport={setCardReport}
              readingReportHistory={readingReportHistory}
              setReadingReportHistory={setReadingReportHistory}
              quizReportHistory={quizReportHistory}
              setQuizReportHistory={setQuizReportHistory}
              cardReportHistory={cardReportHistory}
              setCardReportHistory={setCardReportHistory}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              reportLoading={reportLoading}
              setReportLoading={setReportLoading}
              postAi={postAi}
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              isLightTheme={isLightTheme}
            />
          )}

          {activeTab === 'workspace' && (
            <WorkspacePage
              books={books}
              filteredBooks={filteredBooks}
              selectedBook={selectedBook}
              selectedBookId={selectedBookId}
              workspaceTab={workspaceTab}
              setWorkspaceTab={setWorkspaceTab}
              bookSearch={bookSearch}
              setBookSearch={setBookSearch}
              bookFilter={bookFilter}
              setBookFilter={setBookFilter}
              noteDrafts={noteDrafts}
              setNoteDrafts={setNoteDrafts}
              dictionaryResult={dictionaryResult}
              comprehensionResult={comprehensionResult}
              insightsResult={insightsResult}
              wordQuery={wordQuery}
              setWordQuery={setWordQuery}
              aiStatus={aiStatus}
              aiBusy={aiBusy}
              aiError={aiError}
              isEditingContent={isEditingContent}
              setIsEditingContent={setIsEditingContent}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editContent={editContent}
              setEditContent={setEditContent}
              refreshBooks={refreshBooks}
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              isLightTheme={isLightTheme}
              onSelectBook={(bookId) => {
                setSelectedBookId(bookId);
                navigateToTab('workspace', bookId);
              }}
              onDeleteBook={handleDeleteBook}
              onStartReading={handleLaunchReader}
              onGenerateSummary={generateAiSummary}
              onGenerateDifficulty={generateDifficultyAnalysis}
              onGenerateWord={generateWordDefinition}
              onGenerateComprehension={generateComprehension}
              onGenerateInsights={generateInsights}
              onSaveNotes={saveBookNotes}
              onOpenSettings={() => {
                setSettingsTab('ai');
                navigateToTab('settings');
              }}
              onAddDocument={() => setIsAddOpen(true)}
              showAlert={showCustomAlert}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settingsTab={settingsTab}
              setSettingsTab={setSettingsTab}
              currentThemeType={currentThemeType}
              currentTheme={currentTheme}
              aiStatus={aiStatus}
              aiProvider={aiProvider}
              setAiProvider={setAiProvider}
              geminiDraftKey={geminiDraftKey}
              setGeminiDraftKey={setGeminiDraftKey}
              openaiDraftKey={openaiDraftKey}
              setOpenaiDraftKey={setOpenaiDraftKey}
              claudeDraftKey={claudeDraftKey}
              setClaudeDraftKey={setClaudeDraftKey}
              localUrlDraft={localUrlDraft}
              setLocalUrlDraft={setLocalUrlDraft}
              localModelDraft={localModelDraft}
              setLocalModelDraft={setLocalModelDraft}
              aiSaveMessage={aiSaveMessage}
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              onThemeChange={handleThemeChange}
              onSaveAiSettings={saveAiSettings}
              onClearAiSettings={clearAiSettings}
              t={t}
              lang={lang}
              setLanguage={setLanguage}
            />
          )}

          {activeTab === 'guide' && (
            <section className="flex flex-col gap-5">
              <PageHeader title="Uygulama Rehberi" description="Velox kullanım kılavuzu ve teknik rehberi." titleClass={titleClass} mutedClass={mutedClass} />
              <GuideContent currentTheme={currentTheme} surfaceClass={surfaceClass} softSurfaceClass={softSurfaceClass} titleClass={titleClass} mutedClass={mutedClass} isLightTheme={isLightTheme} />
            </section>
          )}

          {activeTab === 'quiz' && (
            <RecallQuizPage
              books={books}
              aiStatus={aiStatus}
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              isLightTheme={isLightTheme}
              onOpenSettings={() => {
                setSettingsTab('ai');
                navigateToTab('settings');
              }}
              postAi={postAi}
              showConfirm={showCustomConfirm}
              showAlert={showCustomAlert}
              quizHistory={quizHistory}
              setQuizHistory={setQuizHistory}
              flashcards={flashcards}
              setFlashcards={setFlashcards}
              setStats={setStats}
            />
          )}

          {activeTab === 'about' && (
            <AboutPage
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              isLightTheme={isLightTheme}
            />
          )}
        </div>
      </main>

      {isAddOpen && (
        <Suspense fallback={null}>
          <AddDocumentModal onClose={() => setIsAddOpen(false)} onAdd={handleAddNewBook} />
        </Suspense>
      )}

      {activeBook && (
        <Suspense fallback={<LazyPanelFallback />}>
          <SpeedReader
            book={activeBook}
            books={books}
            onSwitchBook={(newBook) => {
              setSelectedBookId(newBook.id);
              setActiveBook(newBook);
              window.history.replaceState(null, '', `/reader/${encodeURIComponent(newBook.id)}`);
            }}
            themeType={currentThemeType}
            onClose={handleCloseReader}
            onUpdateProgress={handleReaderProgressUpdate}
            onSaveSummary={() => {}}
            onSaveDifficulty={() => {}}
            aiEnabled={aiStatus.enabled}
          />
        </Suspense>
      )}
      {dialogConfig && (
        <CustomDialog
          config={dialogConfig}
          onClose={() => setDialogConfig(null)}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
          isLightTheme={isLightTheme}
        />
      )}
    </div>
  );
}

function Sidebar({
  activeTab,
  aiEnabled,
  mode,
  theme,
  onAdd,
  onNavigate,
  onSetMode
}: {
  activeTab: AppTab;
  aiEnabled: boolean;
  mode: SidebarMode;
  theme: ThemeConfig;
  onAdd: () => void;
  onNavigate: (tab: AppTab) => void;
  onSetMode: (mode: SidebarMode) => void;
}) {
  const { t } = useTranslation();

  if (mode === 'hidden') {
    return (
      <button
        onClick={() => onSetMode('full')}
        title={t('nav_settings')}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 h-14 w-7 rounded-r-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 grid place-items-center transition-all"
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    );
  }

  const isFull = mode === 'full';
  const isCompact = mode === 'compact';
  const labelClass = isFull ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none';

  return (
    <aside className={`group/sidebar w-full ${isFull ? 'md:w-[280px]' : 'md:w-[76px]'} shrink-0 border-b md:border-b-0 md:border-r ${theme.border} ${theme.cardBg} md:h-screen md:sticky md:top-0 z-30 overflow-hidden transition-[width] duration-300 ease-out`}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          <div className={`flex items-center ${isFull ? 'justify-between' : 'justify-center'} gap-3 min-w-0`}>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => isCompact && onSetMode('full')}
                title={isCompact ? 'Expand Menu' : APP_NAME}
                className={`${isCompact ? 'cursor-pointer group/brand' : 'cursor-default'} relative h-12 w-12 grid place-items-center bg-transparent shrink-0 overflow-hidden`}
              >
                <img src="/velox-icon.svg" alt="Velox" className={`${isCompact ? 'group-hover/brand:opacity-0' : ''} w-12 h-12 object-contain transition-opacity`} />
                {isCompact && <ChevronsRight className="absolute w-5 h-5 opacity-0 group-hover/brand:opacity-100 transition-opacity text-indigo-500" />}
              </button>
              <div className={`${labelClass} transition-all duration-200 min-w-0 overflow-hidden`}>
              <h1 className="text-lg font-black tracking-tight text-indigo-500 leading-tight">Velox</h1>
              <p className="text-[10px] opacity-65 whitespace-nowrap">{t('home_subtitle')}</p>
              </div>
            </div>
            {isFull && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onSetMode('compact')} title="Minimize" className={`h-8 w-8 rounded-lg border ${theme.border} grid place-items-center text-stone-500 dark:text-zinc-400 hover:text-current`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => onSetMode('hidden')} title="Hide" className={`h-8 w-8 rounded-lg border ${theme.border} grid place-items-center text-stone-500 dark:text-zinc-400 hover:text-current`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onAdd}
            title={isCompact ? t('home_action_add') : undefined}
            className={`${isCompact ? 'justify-center px-0 gap-0' : 'px-3 gap-3'} h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center shadow-lg shadow-indigo-600/15`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className={`${labelClass} whitespace-nowrap transition-all overflow-hidden`}>{t('home_action_add')}</span>
          </button>

          <div title={isCompact ? (aiEnabled ? t('st_ai_status_active') : t('st_ai_status_passive')) : undefined} className={`${isCompact ? 'justify-center px-0 gap-0' : 'px-3 gap-3'} h-10 rounded-xl border ${theme.border} bg-white/[0.025] flex items-center`}>
            <span className={`w-2 h-2 rounded-full ${aiEnabled ? 'bg-emerald-400' : 'bg-stone-500'}`} />
            <span className={`${labelClass} text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all overflow-hidden`}>
              {aiEnabled ? t('st_ai_status_active') : t('st_ai_status_passive')}
            </span>
          </div>

          <nav className="flex flex-col gap-2 pt-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.tab}
                onClick={() => onNavigate(item.tab)}
                title={t(`nav_${item.tab}` as any)}
                className={`${isCompact ? 'justify-center px-0 gap-0' : 'px-3 gap-3'} h-11 rounded-xl flex items-center text-xs font-bold transition-all ${
                  activeTab === item.tab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/70'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className={`${labelClass} whitespace-nowrap transition-all overflow-hidden`}>
                  {t(`nav_${item.tab}` as any)}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div />
      </div>
    </aside>
  );
}

function HomePage({
  books,
  stats,
  todayWords,
  totalMinutes,
  quizHistory,
  flashcards,
  userGoals,
  setUserGoals,
  onNavigateToTab,
  selectedBook,
  onStartReading,
  onAddDocument,
  onSetWorkspaceTab,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  const { t, lang } = useTranslation();
  // Goal Period Tab State
  const [goalPeriod, setGoalPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [editGoals, setEditGoals] = useState({ ...userGoals });

  useEffect(() => {
    setEditGoals({ ...userGoals });
  }, [userGoals]);

  const handleSaveGoals = () => {
    localStorage.setItem('velox_user_goals', JSON.stringify(editGoals));
    setUserGoals(editGoals);
    setIsEditingGoals(false);
  };

  const todayQuizzesCount = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('tr-TR');
    return quizHistory.filter((h: any) => h.date && h.date.includes(todayStr)).length;
  }, [quizHistory]);

  const todayCardsCount = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('tr-TR');
    return flashcards.filter((c: any) => c.lastReviewed && c.lastReviewed.includes(todayStr)).length;
  }, [flashcards]);

  // Circular progress for Daily Goal
  const wordPercentage = Math.min(100, Math.round((todayWords / Math.max(1, userGoals.dailyWords)) * 100));
  const quizPercentage = Math.min(100, Math.round((todayQuizzesCount / Math.max(1, userGoals.dailyQuizzes)) * 100));
  const cardPercentage = Math.min(100, Math.round((todayCardsCount / Math.max(1, userGoals.dailyCards)) * 100));

  const visibleGoalsCount = [
    userGoals.showReadingGoal !== false,
    userGoals.showQuizzesGoal !== false,
    userGoals.showCardsGoal !== false
  ].filter(Boolean).length;

  // Core Metrics derived from stats
  const totalWords = stats.totalWordsRead || 0;
  const maxWpm = stats.maxSpeedWpm || 0;
  const totalReviews = flashcards.reduce((acc: number, curr: any) => acc + (curr.reviewsCount || 0), 0);

  // Recent Books sorted by last read date
  const recentBooks = useMemo(() => {
    return [...books].sort((left, right) => right.lastReadDate.localeCompare(left.lastReadDate)).slice(0, 4);
  }, [books]);

  // General interaction scatter chart data (Quizzes, AI content, Cards, Readings, Clicks)
  const interactionData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'short' });
      
      const isToday = index === 6;
      const wordsCount = isToday ? Math.max(1, Math.round(todayWords / 150)) : Math.round(Math.random() * 8 + 4);
      const quizzesCount = isToday ? quizHistory.filter((h: any) => h.date.startsWith(new Date().toLocaleDateString('tr-TR'))).length : Math.round(Math.random() * 2);
      const cardsCount = isToday ? Math.round(totalReviews / 5) : Math.round(Math.random() * 6 + 1);
      const aiUsageCount = isToday ? 4 : Math.round(Math.random() * 3 + 1);
      const clicksCount = isToday ? 15 : Math.round(Math.random() * 15 + 5);

      return [
        { day: dateStr, category: 'Okuma', count: wordsCount },
        { day: dateStr, category: 'Quizler', count: quizzesCount },
        { day: dateStr, category: 'Kartlar', count: cardsCount },
        { day: dateStr, category: 'Yapay Zeka', count: aiUsageCount },
        { day: dateStr, category: 'Tıklamalar', count: clicksCount }
      ];
    }).flat();
  }, [todayWords, quizHistory, totalReviews]);

  const okumaPoints = useMemo(() => interactionData.filter(d => d.category === 'Okuma'), [interactionData]);
  const quizPoints = useMemo(() => interactionData.filter(d => d.category === 'Quizler'), [interactionData]);
  const cardPoints = useMemo(() => interactionData.filter(d => d.category === 'Kartlar'), [interactionData]);
  const aiPoints = useMemo(() => interactionData.filter(d => d.category === 'Yapay Zeka'), [interactionData]);
  const clickPoints = useMemo(() => interactionData.filter(d => d.category === 'Tıklamalar'), [interactionData]);

  // Calculate general interaction scores for the last 7 days (including readings, quizzes, card reviews, AI use, clicks)
  const scatterData = useMemo(() => {
    type HistoryItem = { date: string; wordCount: number; durationSeconds: number };
    const historyMap = new Map<string, HistoryItem>(
      stats.history.map((item: HistoryItem) => [item.date, item])
    );
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dateString = date.toISOString().split('T')[0];
      const match = historyMap.get(dateString);

      // reading interactions (1 action per 100 words read)
      const readVal = match ? Math.round(match.wordCount / 100) : 0;
      // quiz completions (5 actions per quiz solved on this date)
      const quizVal = quizHistory.filter((q: any) => q.date && q.date.includes(date.toLocaleDateString('tr-TR'))).length * 5;
      // card reviews (2 actions per card repeated on this date)
      const cardVal = flashcards.filter((c: any) => c.reviewsCount > 0 && c.lastReviewed && c.lastReviewed.includes(dateString)).length * 2;
      // general clicks and interactions (simulated base active)
      const clickVal = match ? 8 : 1;

      const totalScore = readVal + quizVal + cardVal + clickVal;
      return {
        day: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'short' }),
        score: totalScore || 1
      };
    });
  }, [stats.history, quizHistory, flashcards, lang]);

  return (
    <section className="flex flex-col gap-6">
      {/* 1. Header with navigation action */}
      <div className="flex justify-between items-center gap-4">
        <PageHeader
          title={lang === 'tr' ? 'Anasayfa' : 'Dashboard'}
          description={lang === 'tr' ? 'Kişiselleştirilmiş hızlı kısayollarınız, hedefleriniz, belgeleriniz ve okuma ritminiz.' : 'Your personalized shortcuts, goals, documents, and reading rhythm.'}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
        <button
          onClick={() => onNavigateToTab('progress')}
          className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-4 h-4" /> {lang === 'tr' ? 'AI Gelişim Raporu Al' : 'Get AI Progress Report'}
        </button>
      </div>

      {/* 2. Top Banner Row: Active Book + Circular Target */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,60fr)_minmax(320px,40fr)] gap-6">
        
        {/* Active Document Card */}
        <div className={`p-6 rounded-3xl border relative flex flex-col justify-between overflow-hidden min-h-[200px] ${surfaceClass}`}>
          <img src="/velox-icon.svg" alt="Watermark" className="absolute right-6 top-1/2 -translate-y-1/2 w-44 h-44 opacity-[0.03] dark:opacity-[0.05] pointer-events-none object-contain" />

          <div className="flex flex-col gap-2 relative z-10">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full w-max">
              {lang === 'tr' ? 'OKUMAYA KALDIĞINIZ YER' : 'CONTINUE READING'}
            </span>
            {selectedBook ? (
              <>
                <h2 className={`text-xl font-black mt-2 truncate ${titleClass} flex items-center gap-2`}>
                  {selectedBook.title} 🚀
                </h2>
                <div className={`flex items-center gap-4 text-xs font-bold mt-1 ${mutedClass}`}>
                  <span>{lang === 'tr' ? 'Kalan: ~1 dk' : 'Remaining: ~1 min'}</span>
                  <span>•</span>
                  <span>{lang === 'tr' ? `%${selectedBook.progress || 0} tamamlandı` : `%${selectedBook.progress || 0} completed`}</span>
                </div>
              </>
            ) : (
              <>
                <h2 className={`text-lg font-black mt-2 ${titleClass}`}>
                  {lang === 'tr' ? 'Henüz belge seçilmedi' : 'No document selected yet'}
                </h2>
                <p className={`text-xs font-bold ${mutedClass}`}>
                  {lang === 'tr' ? 'Çalışma Alanı üzerinden yeni belge ekleyebilirsin.' : 'You can add new documents via the Workspace.'}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-5 mt-6 border-t border-stone-100 dark:border-zinc-900/60 pt-4 relative z-10">
            <div className="flex-1 max-w-[60%]">
              <div className="h-1.5 rounded-full bg-stone-250 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${selectedBook?.progress || 0}%` }} />
              </div>
            </div>
            {selectedBook && (
              <button
                onClick={() => onStartReading(selectedBook)}
                className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> {lang === 'tr' ? 'Okumayı Sürdür' : 'Continue Reading'}
              </button>
            )}
          </div>
        </div>

        {/* Circular Progress Target Ring Card */}
        <div className={`p-6 rounded-3xl border flex flex-col gap-4 ${surfaceClass}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'BUGÜNKÜ HEDEFLER' : "TODAY'S GOALS"}</span>
            {!isEditingGoals && (
              <button onClick={() => { setEditGoals({ ...userGoals }); setIsEditingGoals(true); }} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline">{lang === 'tr' ? 'Hedefleri Düzenle' : 'Edit Goals'}</button>
            )}
          </div>

          {isEditingGoals ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 p-2.5 bg-stone-50 dark:bg-zinc-900/40 rounded-2xl border border-stone-200 dark:border-zinc-800">
                <span className="text-[9px] font-black uppercase text-stone-500 tracking-wider">{lang === 'tr' ? 'Hedef Seçimi ve Görünürlük' : 'Goal Selection & Visibility'}</span>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editGoals.showReadingGoal !== false}
                      onChange={(e) => setEditGoals({ ...editGoals, showReadingGoal: e.target.checked })}
                      className="rounded border-stone-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">{lang === 'tr' ? 'Okuma Hedefi' : 'Reading Goal'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editGoals.showQuizzesGoal !== false}
                      onChange={(e) => setEditGoals({ ...editGoals, showQuizzesGoal: e.target.checked })}
                      className="rounded border-stone-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">{lang === 'tr' ? 'Quiz Hedefi' : 'Quiz Goal'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editGoals.showCardsGoal !== false}
                      onChange={(e) => setEditGoals({ ...editGoals, showCardsGoal: e.target.checked })}
                      className="rounded border-stone-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold">{lang === 'tr' ? 'Bilgi Kartı Hedefi' : 'Flashcard Goal'}</span>
                  </label>
                </div>
              </div>

              {editGoals.showReadingGoal !== false && (
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-stone-505">{lang === 'tr' ? 'Okuma Hedefi (Kelime)' : 'Reading Goal (Words)'}</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={editGoals.dailyWords}
                    onChange={(e) => setEditGoals({ ...editGoals, dailyWords: Math.max(1, Number(e.target.value)) })}
                    className={`w-full h-8 px-2 rounded-xl text-xs outline-none border ${
                      isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-stone-250 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  />
                </label>
              )}
              {editGoals.showQuizzesGoal !== false && (
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-stone-505">{lang === 'tr' ? 'Quiz Hedefi (Adet)' : 'Quiz Goal (Count)'}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editGoals.dailyQuizzes}
                    onChange={(e) => setEditGoals({ ...editGoals, dailyQuizzes: Math.max(1, Number(e.target.value)) })}
                    className={`w-full h-8 px-2 rounded-xl text-xs outline-none border ${
                      isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-stone-250 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  />
                </label>
              )}
              {editGoals.showCardsGoal !== false && (
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-stone-505">{lang === 'tr' ? 'Bilgi Kartı Hedefi (Tekrar)' : 'Flashcard Goal (Reviews)'}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editGoals.dailyCards}
                    onChange={(e) => setEditGoals({ ...editGoals, dailyCards: Math.max(1, Number(e.target.value)) })}
                    className={`w-full h-8 px-2 rounded-xl text-xs outline-none border ${
                      isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-stone-250 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  />
                </label>
              )}
              <div className="flex gap-2 mt-1">
                <button onClick={handleSaveGoals} className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black">{lang === 'tr' ? 'Kaydet' : 'Save'}</button>
                <button onClick={() => setIsEditingGoals(false)} className={`h-8 px-3 rounded-xl border text-[10px] font-black ${isLightTheme ? 'border-stone-300 hover:bg-stone-50' : 'border-stone-250 dark:border-zinc-800'}`}>{lang === 'tr' ? 'İptal' : 'Cancel'}</button>
              </div>
            </div>
          ) : (
            <div>
              {userGoals.showReadingGoal === false && userGoals.showQuizzesGoal === false && userGoals.showCardsGoal === false ? (
                <p className={`text-xs text-center py-6 ${mutedClass}`}>{lang === 'tr' ? 'Tüm hedefler gizlendi. Düzenlemek için sağ üstten "Hedefleri Düzenle" butonuna tıklayabilirsiniz.' : 'All goals hidden. Click "Edit Goals" at top right to edit.'}</p>
              ) : (
                <div className={`grid grid-cols-1 ${
                  visibleGoalsCount === 2
                    ? 'sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2'
                    : visibleGoalsCount === 3
                    ? 'sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3'
                    : ''
                } gap-4`}>
                  {/* Kelime Hedefi */}
                  {userGoals.showReadingGoal !== false && (
                    <div className={`p-4 rounded-2xl border ${softSurfaceClass} flex flex-col justify-between gap-3 transition-all hover:scale-[1.01]`}>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 font-black text-xs text-current">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          {lang === 'tr' ? 'Okuma' : 'Reading'}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black shrink-0">
                          <Flame className="w-3 h-3 fill-amber-500" />
                          <span>{stats.dailyStreak || 0} {lang === 'tr' ? 'Gün' : 'Days'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-2 rounded-full bg-stone-250 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${wordPercentage}%` }} />
                        </div>
                        <div className={`flex justify-between text-[10px] font-bold ${mutedClass}`}>
                          <span>{todayWords} / {userGoals.dailyWords.toLocaleString()} {lang === 'tr' ? 'Kelime' : 'Words'}</span>
                          <span>%{wordPercentage}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quiz Hedefi */}
                  {userGoals.showQuizzesGoal !== false && (
                    <div className={`p-4 rounded-2xl border ${softSurfaceClass} flex flex-col justify-between gap-3 transition-all hover:scale-[1.01]`}>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 font-black text-xs text-current">
                          <HelpCircle className="w-4 h-4 text-pink-500" />
                          {lang === 'tr' ? 'Quizler' : 'Quizzes'}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-500/10 text-pink-500 text-[10px] font-black shrink-0">
                          <Flame className="w-3 h-3 fill-pink-500" />
                          <span>{stats.quizStreak || 0} {lang === 'tr' ? 'Gün' : 'Days'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-2 rounded-full bg-stone-250 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-pink-500 transition-all duration-300" style={{ width: `${quizPercentage}%` }} />
                        </div>
                        <div className={`flex justify-between text-[10px] font-bold ${mutedClass}`}>
                          <span>{todayQuizzesCount} / {userGoals.dailyQuizzes.toLocaleString()} {lang === 'tr' ? 'Quiz' : 'Quizzes'}</span>
                          <span>%{quizPercentage}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bilgi Kartı Hedefi */}
                  {userGoals.showCardsGoal !== false && (
                    <div className={`p-4 rounded-2xl border ${softSurfaceClass} flex flex-col justify-between gap-3 transition-all hover:scale-[1.01]`}>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 font-black text-xs text-current">
                          <Layers className="w-4 h-4 text-emerald-500" />
                          {lang === 'tr' ? 'Bilgi Kartı' : 'Flashcards'}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black shrink-0">
                          <Flame className="w-3 h-3 fill-emerald-500" />
                          <span>{stats.cardStreak || 0} {lang === 'tr' ? 'Gün' : 'Days'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-2 rounded-full bg-stone-250 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${cardPercentage}%` }} />
                        </div>
                        <div className={`flex justify-between text-[10px] font-bold ${mutedClass}`}>
                          <span>{todayCardsCount} / {userGoals.dailyCards.toLocaleString()} {lang === 'tr' ? 'Kart' : 'Cards'}</span>
                          <span>%{cardPercentage}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 3. Core Metrics Grid Row (Old homepage metrics + Spaced repetition overview) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'Toplam Okunan' : 'Total Words Read'}</span>
          <span className={`text-lg font-black mt-1 ${titleClass}`}>{totalWords.toLocaleString()} {lang === 'tr' ? 'kelime' : 'words'}</span>
        </div>
        <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'Okuma Süresi' : 'Reading Time'}</span>
          <span className={`text-lg font-black mt-1 ${titleClass}`}>{totalMinutes} {lang === 'tr' ? 'dakika' : 'minutes'}</span>
        </div>
        <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'Okuma Hızı' : 'Reading Speed'}</span>
          <span className={`text-lg font-black mt-1 ${titleClass}`}>{maxWpm} WPM</span>
        </div>
        <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'Kart Tekrarı' : 'Card Reviews'}</span>
          <span className={`text-lg font-black mt-1 ${titleClass}`}>{totalReviews} {lang === 'tr' ? 'tekrar' : 'reviews'}</span>
        </div>
      </div>

      {/* 4. Left Column: Reading Chart & Action Cards | Right Column: Spaced Repetition & Recent Books */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,60fr)_minmax(320px,40fr)] gap-6">
        
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Genel Etkileşim Nokta Grafiği (ScatterChart) */}
          <div className={`rounded-3xl border p-5 ${surfaceClass} flex flex-col gap-4`}>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className={`uppercase tracking-wider ${titleClass}`}>{lang === 'tr' ? 'GENEL ETKİLEŞİM VE AKTİVİTE' : 'GENERAL INTERACTION & ACTIVITY'}</span>
              <span className={mutedClass}>{lang === 'tr' ? 'Son 7 Gün' : 'Last 7 Days'}</span>
            </div>

            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
                  <XAxis dataKey="day" type="category" allowDuplicatedCategory={false} tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="count" type="number" tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 8 }} />
                  <Scatter name={lang === 'tr' ? 'Okuma (Kelime x150)' : 'Reading (Words x150)'} data={okumaPoints} fill="#4f46e5" />
                  <Scatter name={lang === 'tr' ? 'Sınavlar' : 'Quizzes'} data={quizPoints} fill="#ec4899" />
                  <Scatter name={lang === 'tr' ? 'Kart Çalışması' : 'Card Practice'} data={cardPoints} fill="#10b981" />
                  <Scatter name={lang === 'tr' ? 'Yapay Zeka' : 'Artificial Intelligence'} data={aiPoints} fill="#8b5cf6" />
                  <Scatter name={lang === 'tr' ? 'Tıklamalar' : 'Clicks'} data={clickPoints} fill="#f59e0b" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Renk Göstergesi */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center items-center border-t border-stone-100 dark:border-zinc-900/60 pt-3 text-[9px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
                <span className={mutedClass}>{lang === 'tr' ? 'Okuma' : 'Reading'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
                <span className={mutedClass}>{lang === 'tr' ? 'Sınavlar' : 'Quizzes'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className={mutedClass}>{lang === 'tr' ? 'Kart Çalışması' : 'Card Practice'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <span className={mutedClass}>{lang === 'tr' ? 'Yapay Zeka' : 'Artificial Intelligence'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span className={mutedClass}>{lang === 'tr' ? 'Tıklamalar' : 'Clicks'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="flex flex-col gap-4">
            <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'HIZLI AKSİYONLAR' : 'QUICK ACTIONS'}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <button
                onClick={() => selectedBook ? onStartReading(selectedBook) : onNavigateToTab('workspace')}
                className={`p-4 rounded-2xl border text-left transition-all hover:bg-stone-50/50 dark:hover:bg-zinc-900/10 flex items-center gap-3.5 group ${surfaceClass}`}
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-indigo-500 shrink-0">
                  <Play className="w-4 h-4 fill-indigo-500" />
                </div>
                <div>
                  <h4 className={`text-xs font-black group-hover:text-indigo-500 transition-colors ${titleClass}`}>{lang === 'tr' ? 'Hızlı Okuma Başlat' : 'Start Speed Reading'}</h4>
                  <p className={`text-[10px] mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'RSVP motorunu hemen çalıştırın' : 'Launch the RSVP engine immediately'}</p>
                </div>
              </button>

              <button
                onClick={() => onNavigateToTab('quiz')}
                className={`p-4 rounded-2xl border text-left transition-all hover:bg-stone-50/50 dark:hover:bg-zinc-900/10 flex items-center gap-3.5 group ${surfaceClass}`}
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-500 shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-black group-hover:text-amber-500 transition-colors ${titleClass}`}>{lang === 'tr' ? 'Hafıza Alıştırması' : 'Memory Practice'}</h4>
                  <p className={`text-[10px] mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Kavrama sınavları ve Feynman' : 'Comprehension quizzes and Feynman'}</p>
                </div>
              </button>

              <button
                onClick={() => { onNavigateToTab('workspace'); onSetWorkspaceTab('notes'); }}
                className={`p-4 rounded-2xl border text-left transition-all hover:bg-stone-50/50 dark:hover:bg-zinc-900/10 flex items-center gap-3.5 group ${surfaceClass}`}
              >
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 grid place-items-center text-teal-500 shrink-0">
                  <MessageSquareText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-black group-hover:text-teal-500 transition-colors ${titleClass}`}>{lang === 'tr' ? 'Notları & Özetleri Aç' : 'Open Notes & Summaries'}</h4>
                  <p className={`text-[10px] mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Zihin haritaları ve not defteri' : 'Mind maps and notebooks'}</p>
                </div>
              </button>

              <button
                onClick={onAddDocument}
                className={`p-4 rounded-2xl border text-left transition-all hover:bg-stone-50/50 dark:hover:bg-zinc-900/10 flex items-center gap-3.5 group ${surfaceClass}`}
              >
                <div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 grid place-items-center text-fuchsia-500 shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-xs font-black group-hover:text-fuchsia-500 transition-colors ${titleClass}`}>{lang === 'tr' ? 'Yeni Kitap Yükle' : 'Upload New Book'}</h4>
                  <p className={`text-[10px] mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'TXT, PDF, EPUB ve DOCX' : 'TXT, PDF, EPUB, and DOCX'}</p>
                </div>
              </button>

            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* Spaced Repetition divider card */}
          <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
            <span className={`text-[9px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'HAFIZA & SPACED REPETITION' : 'MEMORY & SPACED REPETITION'}</span>
            
            <div className="grid grid-cols-3 divide-x divide-stone-200 dark:divide-zinc-800 text-center py-1">
              <div>
                <h4 className="text-xl font-black text-amber-500">{books.length}</h4>
                <p className={`text-[10px] font-bold mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Aktif Okuma' : 'Active Readings'}</p>
              </div>
              <div>
                <h4 className="text-xl font-black text-indigo-500">{quizHistory.length}</h4>
                <p className={`text-[10px] font-bold mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Sınav Hazır' : 'Quizzes Ready'}</p>
              </div>
              <div>
                <h4 className="text-xl font-black text-emerald-500">%100</h4>
                <p className={`text-[10px] font-bold mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Hafıza Skoru' : 'Memory Score'}</p>
              </div>
            </div>
          </div>

          {/* Recent Books List (Old homepage) */}
          <div className={`rounded-3xl border p-5 ${surfaceClass} flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'SON OKUNAN DOKÜMANLAR' : 'RECENTLY READ DOCUMENTS'}</span>
              <button
                onClick={() => onNavigateToTab('workspace')}
                className="text-[10px] font-bold text-indigo-500 hover:underline"
              >
                {lang === 'tr' ? 'Tümünü Gör' : 'View All'}
              </button>
            </div>

            <div className="flex flex-col divide-y divide-stone-100 dark:divide-zinc-900/60 mt-1">
              {recentBooks.length === 0 ? (
                <p className="text-xs opacity-60 text-center py-6">{lang === 'tr' ? 'Henüz belge eklenmemiş.' : 'No documents added yet.'}</p>
              ) : (
                recentBooks.map((book: any) => (
                  <button
                    key={book.id}
                    onClick={() => { onNavigateToTab('workspace'); }}
                    className="py-3 flex items-center justify-between text-left hover:opacity-85 transition-opacity"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className={`text-xs font-black truncate ${titleClass}`}>{book.title}</h4>
                      <p className={`text-[10px] mt-0.5 ${mutedClass}`}>{lang === 'tr' ? `% ${book.progress || 0} okundu` : `% ${book.progress || 0} read`}</p>
                    </div>
                    <span className="text-[10px] text-indigo-500 font-extrabold shrink-0">{lang === 'tr' ? 'Aç' : 'Open'}</span>
                  </button>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
function ProgressPage({
  stats,
  todayWords,
  totalMinutes,
  chartData,
  quizHistory,
  flashcards,
  readingReport,
  setReadingReport,
  quizReport,
  setQuizReport,
  cardReport,
  setCardReport,
  readingReportHistory = [],
  setReadingReportHistory,
  quizReportHistory = [],
  setQuizReportHistory,
  cardReportHistory = [],
  setCardReportHistory,
  onDeleteHistoryItem,
  reportLoading,
  setReportLoading,
  postAi,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  const { t, lang } = useTranslation();
  // Subtab: 'reading' | 'quiz' | 'cards'
  const [progSubTab, setProgSubTab] = useState<'reading' | 'quiz' | 'cards'>('reading');
  const [progressRange, setProgressRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [quizProgressRange, setQuizProgressRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [cardProgressRange, setCardProgressRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [readingReportTab, setReadingReportTab] = useState<'active' | 'history'>('active');
  const [quizReportTab, setQuizReportTab] = useState<'active' | 'history'>('active');
  const [cardReportTab, setCardReportTab] = useState<'active' | 'history'>('active');

  const [selectedPastReadingReport, setSelectedPastReadingReport] = useState<any>(null);
  const [selectedPastQuizReport, setSelectedPastQuizReport] = useState<any>(null);
  const [selectedPastCardReport, setSelectedPastCardReport] = useState<any>(null);

  const computedChartData = useMemo(() => {
    type HistoryItem = { date: string; wordCount: number; durationSeconds: number };
    const history = stats.history || [];

    const getWeekNumber = (date: Date) => {
      const onejan = new Date(date.getFullYear(), 0, 1);
      return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    };

    if (progressRange === 'daily') {
      const historyMap = new Map<string, HistoryItem>(history.map(item => [item.date, item]));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().split('T')[0];
        const item = historyMap.get(key);
        return {
          date: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          words: item?.wordCount || 0,
          minutes: Math.round((item?.durationSeconds || 0) / 60)
        };
      });
    }

    if (progressRange === 'weekly') {
      const weeksMap = new Map<string, { words: number; seconds: number }>();
      history.forEach(item => {
        const date = new Date(item.date);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const key = `${year}-W${week}`;
        const existing = weeksMap.get(key) || { words: 0, seconds: 0 };
        weeksMap.set(key, {
          words: existing.words + item.wordCount,
          seconds: existing.seconds + item.durationSeconds
        });
      });

      return Array.from({ length: 4 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (3 - index) * 7);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const key = `${year}-W${week}`;
        const val = weeksMap.get(key) || { words: 0, seconds: 0 };
        return {
          date: lang === 'tr' ? `${index + 1}. Hafta` : `Week ${index + 1}`,
          words: val.words,
          minutes: Math.round(val.seconds / 60)
        };
      });
    }

    if (progressRange === 'monthly') {
      const monthsMap = new Map<string, { words: number; seconds: number }>();
      history.forEach(item => {
        const date = new Date(item.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const existing = monthsMap.get(key) || { words: 0, seconds: 0 };
        monthsMap.set(key, {
          words: existing.words + item.wordCount,
          seconds: existing.seconds + item.durationSeconds
        });
      });

      return Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index));
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const val = monthsMap.get(key) || { words: 0, seconds: 0 };
        return {
          date: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'long' }),
          words: val.words,
          minutes: Math.round(val.seconds / 60)
        };
      });
    }

    if (progressRange === 'yearly') {
      const yearsMap = new Map<number, { words: number; seconds: number }>();
      history.forEach(item => {
        const date = new Date(item.date);
        const year = date.getFullYear();
        const existing = yearsMap.get(year) || { words: 0, seconds: 0 };
        yearsMap.set(year, {
          words: existing.words + item.wordCount,
          seconds: existing.seconds + item.durationSeconds
        });
      });

      return Array.from({ length: 3 }, (_, index) => {
        const date = new Date();
        const year = date.getFullYear() - (2 - index);
        const val = yearsMap.get(year) || { words: 0, seconds: 0 };
        return {
          date: String(year),
          words: val.words,
          minutes: Math.round(val.seconds / 60)
        };
      });
    }

    if (progressRange === 'custom') {
      if (!customStartDate || !customEndDate) return [];
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const daysCount = Math.min(60, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      const historyMap = new Map<string, HistoryItem>(history.map(item => [item.date, item]));
      
      return Array.from({ length: daysCount }, (_, index) => {
        const date = new Date(start);
        date.setDate(date.getDate() + index);
        const key = date.toISOString().split('T')[0];
        const item = historyMap.get(key);
        return {
          date: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          words: item?.wordCount || 0,
          minutes: Math.round((item?.durationSeconds || 0) / 60)
        };
      });
    }

    return [];
  }, [stats.history, progressRange, customStartDate, customEndDate, lang]);

  const filteredQuizHistory = useMemo(() => {
    if (quizProgressRange === 'custom' && (!customStartDate || !customEndDate)) return quizHistory;
    const cutoff = new Date();
    if (quizProgressRange === 'daily') cutoff.setDate(cutoff.getDate() - 7);
    else if (quizProgressRange === 'weekly') cutoff.setDate(cutoff.getDate() - 28);
    else if (quizProgressRange === 'monthly') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (quizProgressRange === 'yearly') cutoff.setFullYear(cutoff.getFullYear() - 3);
    cutoff.setHours(0, 0, 0, 0);

    return quizHistory.filter((q: any) => {
      const qDate = parseCustomDate(q.date);
      if (quizProgressRange === 'custom') {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return qDate >= start && qDate <= end;
      }
      return qDate >= cutoff;
    });
  }, [quizHistory, quizProgressRange, customStartDate, customEndDate]);

  const filteredFlashcards = useMemo(() => {
    if (cardProgressRange === 'custom' && (!customStartDate || !customEndDate)) return flashcards;
    const cutoff = new Date();
    if (cardProgressRange === 'daily') cutoff.setDate(cutoff.getDate() - 7);
    else if (cardProgressRange === 'weekly') cutoff.setDate(cutoff.getDate() - 28);
    else if (cardProgressRange === 'monthly') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (cardProgressRange === 'yearly') cutoff.setFullYear(cutoff.getFullYear() - 3);
    cutoff.setHours(0, 0, 0, 0);

    return flashcards.filter((c: any) => {
      if (!c.lastReviewed) return true;
      const rDate = parseCustomDate(c.lastReviewed);
      if (cardProgressRange === 'custom') {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return rDate >= start && rDate <= end;
      }
      return rDate >= cutoff;
    });
  }, [flashcards, cardProgressRange, customStartDate, customEndDate]);

  const handleExportData = (type: 'reading' | 'quiz' | 'cards', format: 'json' | 'csv' | 'txt') => {
    let content = '';
    let mimeType = 'text/plain';
    let filename = `velox_${type}_raporu.${format}`;

    if (type === 'reading') {
      if (format === 'json') {
        content = JSON.stringify(computedChartData, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = 'Tarih,Okunan Kelime,Süre (Dakika)\n';
        computedChartData.forEach(item => {
          content += `"${item.date}",${item.words},${item.minutes}\n`;
        });
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = `VELOX AKILLI OKUMA ASİSTANI - OKUMA ANALİZİ VE İLERLEME RAPORU\n`;
        content += `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `Filtreleme Aralığı: ${progressRange.toUpperCase()}\n`;
        content += `--------------------------------------------------\n\n`;
        computedChartData.forEach(item => {
          content += `- Dönem/Tarih: ${item.date}\n  Okunan Kelime: ${item.words.toLocaleString()} kelime\n  Okuma Süresi: ${item.minutes} dakika\n\n`;
        });
      }
    } else if (type === 'quiz') {
      if (format === 'json') {
        content = JSON.stringify(filteredQuizHistory, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = 'Tarih,Sınav Başlığı,Skor\n';
        filteredQuizHistory.forEach((item: any) => {
          content += `"${item.date}","${item.title || ''}",${item.score}\n`;
        });
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = `VELOX AKILLI OKUMA ASİSTANI - QUİZ BAŞARI ANALİZ RAPORU\n`;
        content += `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `Filtreleme Aralığı: ${quizProgressRange.toUpperCase()}\n`;
        content += `Toplam Çözülen Sınav: ${filteredQuizHistory.length}\n`;
        content += `Ortalama Başarı Skoru: %${avgScore}\n`;
        content += `--------------------------------------------------\n\n`;
        filteredQuizHistory.forEach((item: any) => {
          content += `- Tarih: ${item.date}\n  Sınav: ${item.title || 'Genel Test'}\n  Başarı Skoru: %${item.score}\n\n`;
        });
      }
    } else if (type === 'cards') {
      if (format === 'json') {
        content = JSON.stringify(filteredFlashcards, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = 'Soru/Kavram,Cevap,Kutu,Tekrar Sayısı,Son İnceleme\n';
        filteredFlashcards.forEach((item: any) => {
          content += `"${item.front}","${item.back}",${item.box || 1},${item.reviewsCount || 0},"${item.lastReviewed || ''}"\n`;
        });
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = `VELOX AKILLI OKUMA ASİSTANI - BİLGİ KARTLARI BELLEK ANALİZ RAPORU\n`;
        content += `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `Filtreleme Aralığı: ${cardProgressRange.toUpperCase()}\n`;
        content += `Toplam Aktif Kart: ${filteredFlashcards.length}\n`;
        content += `Toplam Tekrar Seansı: ${totalReviews}\n`;
        content += `--------------------------------------------------\n\n`;
        filteredFlashcards.forEach((item: any) => {
          content += `- Kavram/Soru: ${item.front}\n  Açıklama/Cevap: ${item.back}\n  Leitner Kutusu: Kutu ${item.box || 1}\n  Yapılan Tekrar: ${item.reviewsCount || 0} kez\n  Son İnceleme: ${item.lastReviewed || 'Hiç yapılmadı'}\n\n`;
        });
      }
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const avgScore = filteredQuizHistory.length > 0
    ? Math.round(filteredQuizHistory.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / filteredQuizHistory.length)
    : 0;

  const totalReviews = filteredFlashcards.reduce((acc: number, curr: any) => acc + (curr.reviewsCount || 0), 0);

  const scoreDistribution = useMemo(() => {
    let low = 0;
    let mid = 0;
    let high = 0;
    filteredQuizHistory.forEach((h: any) => {
      if (h.score < 60) low++;
      else if (h.score < 80) mid++;
      else high++;
    });
    return [
      { range: lang === 'tr' ? 'Geliştirilmeli (0-59)' : 'Needs Improvement (0-59)', count: low },
      { range: lang === 'tr' ? 'Başarılı (60-79)' : 'Successful (60-79)', count: mid },
      { range: lang === 'tr' ? 'Mükemmel (80-100)' : 'Excellent (80-100)', count: high }
    ];
  }, [filteredQuizHistory, lang]);

  const cardReviewDistribution = useMemo(() => {
    let unreviewed = 0;
    let low = 0;
    let mid = 0;
    let high = 0;
    filteredFlashcards.forEach((c: any) => {
      const count = c.reviewsCount || 0;
      if (count === 0) unreviewed++;
      else if (count <= 3) low++;
      else if (count <= 7) mid++;
      else high++;
    });
    return [
      { status: lang === 'tr' ? 'Çalışılmadı (0)' : 'Unreviewed (0)', count: unreviewed },
      { status: lang === 'tr' ? 'Tanışma (1-3)' : 'Learning (1-3)', count: low },
      { status: lang === 'tr' ? 'Pekiştirme (4-7)' : 'Reviewing (4-7)', count: mid },
      { status: lang === 'tr' ? 'Uzman (8+)' : 'Mastered (8+)', count: high }
    ];
  }, [filteredFlashcards, lang]);

  const handleGenerateReport = async (type: 'reading' | 'quiz' | 'cards') => {
    setReportLoading(type);
    try {
      let prompt = '';
      if (type === 'reading') {
        prompt = lang === 'tr'
          ? `Aşağıdaki hızlı okuma verilerimi analiz et ve Türkçe olarak kısa, öz, geliştirici bir gelişim raporu hazırla:\nToplam okunan kelime: ${stats.totalWordsRead}\nOkuma süresi: ${totalMinutes} dakika\nEn yüksek okuma hızı: ${stats.maxSpeedWpm} WPM\nGünlük seri: ${stats.dailyStreak} gün.\nRaporda Markdown kullan.`
          : `Analyze the following speed reading data and prepare a short, concise, and constructive progress report in English:\nTotal words read: ${stats.totalWordsRead}\nReading duration: ${totalMinutes} minutes\nMax reading speed: ${stats.maxSpeedWpm} WPM\nDaily streak: ${stats.dailyStreak} days.\nUse Markdown for formatting.`;
      } else if (type === 'quiz') {
        prompt = lang === 'tr'
          ? `Aşağıdaki yapay zeka sınav sonuç geçmişimi analiz et ve Türkçe olarak hangi konularda daha iyi olduğumu, neleri geliştirmem gerektiğini özetleyen kısa bir öğrenim gelişim raporu hazırla:\nToplam çözülen sınav sayısı: ${quizHistory.length}\nOrtalama sınav başarısı: %${avgScore}\nSon sınav skorları: ${JSON.stringify(quizHistory.slice(0, 3).map(h => h.score))}.\nRaporda Markdown kullan.`
          : `Analyze the following AI quiz history and prepare a short learning progress report in English summarizing what topics I excel in and what I need to improve:\nTotal quizzes taken: ${quizHistory.length}\nAverage score: %${avgScore}\nRecent quiz scores: ${JSON.stringify(quizHistory.slice(0, 3).map(h => h.score))}.\nUse Markdown for formatting.`;
      } else if (type === 'cards') {
        prompt = lang === 'tr'
          ? `Aşağıdaki akıllı bilgi kartı hafıza laboratuvarı verilerimi analiz et ve Türkçe olarak hatırlama gücümü artıracak pratik taktikler içeren kısa bir hafıza raporu hazırla:\nToplam bilgi kartı sayısı: ${flashcards.length}\nKart tekrarı sayısı: ${totalReviews}\nEn çok çalışılan kartların tekrar adetleri: ${JSON.stringify(flashcards.slice(0, 3).map(c => c.reviewsCount))}.\nRaporda Markdown kullan.`
          : `Analyze the following smart flashcard memory lab data and prepare a short memory report in English containing practical tactics to increase my recall power:\nTotal flashcards: ${flashcards.length}\nTotal card reviews: ${totalReviews}\nReview counts of most studied cards: ${JSON.stringify(flashcards.slice(0, 3).map(c => c.reviewsCount))}.\nUse Markdown for formatting.`;
      }

      const res = await postAi('/api/ai/insights', { text: prompt, title: 'Gelişim Analizi Raporu' });
      
      let reportText = '';
      if (res.keyInsights?.length || res.actionableIdea || res.mentalModel) {
        const insightsHeader = lang === 'tr' ? '### 💡 Önemli İçgörüler' : '### 💡 Key Insights';
        const actionLabel = lang === 'tr' ? '**Aksiyon:**' : '**Action:**';
        const modelLabel = lang === 'tr' ? '**Zihinsel Model:**' : '**Mental Model:**';
        
        const insightsList = res.keyInsights?.map((item: string) => `- ${item}`).join('\n') || '';
        reportText = `${insightsHeader}\n${insightsList}\n\n${actionLabel} ${res.actionableIdea || ''}\n\n${modelLabel} ${res.mentalModel || ''}`;
      } else {
        reportText = res.insights || res.content || (lang === 'tr' ? 'Okuma gelişim raporu hazırlandı.' : 'Reading progress report prepared.');
      }

      const newReportItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
        content: reportText
      };

      if (type === 'reading') {
        setReadingReport(reportText);
        localStorage.setItem('velox_reading_report_active', reportText);
        const updated = [newReportItem, ...readingReportHistory];
        setReadingReportHistory(updated);
        localStorage.setItem('velox_reading_reports_history', JSON.stringify(updated));
      }
      if (type === 'quiz') {
        setQuizReport(reportText);
        localStorage.setItem('velox_quiz_report_active', reportText);
        const updated = [newReportItem, ...quizReportHistory];
        setQuizReportHistory(updated);
        localStorage.setItem('velox_quiz_reports_history', JSON.stringify(updated));
      }
      if (type === 'cards') {
        setCardReport(reportText);
        localStorage.setItem('velox_card_report_active', reportText);
        const updated = [newReportItem, ...cardReportHistory];
        setCardReportHistory(updated);
        localStorage.setItem('velox_card_reports_history', JSON.stringify(updated));
      }
    } catch (e) {
      // Offline fallback
      let reportFallback = '';
      if (type === 'reading') {
        reportFallback = lang === 'tr'
          ? `### 📈 Okuma İlerleme Raporu

**Genel Değerlendirme:**
Toplamda ${stats.totalWordsRead.toLocaleString()} kelime okuyarak harika bir tempolu okuma disiplini edindiniz. Maksimum okuma hızınız olan ${stats.maxSpeedWpm} WPM, gözünüzün ORP (Optimal Tanıma Noktası) yeteneğini oldukça iyi geliştirdiğini gösteriyor.

**Gelişim Önerileri:**
- Subvocalization (iç seslendirme) alışkanlığını azaltmak için okuma hızınızı kademeli olarak 400 WPM üzerine sabitlemeye çalışın.
- Günlük ${stats.dailyStreak} günlük istikrarınızı koruyun.`
          : `### 📈 Reading Progress Report

**General Assessment:**
You have built a great speed reading discipline by reading a total of ${stats.totalWordsRead.toLocaleString()} words. Your maximum reading speed of ${stats.maxSpeedWpm} WPM shows that you have improved your eye's OVP (Optimal Visual Point) ability quite well.

**Development Suggestions:**
- Try to gradually stabilize your reading speed above 400 WPM to reduce the habit of subvocalization.
- Maintain your daily consistency of ${stats.dailyStreak} days.`;
        setReadingReport(reportFallback);
        localStorage.setItem('velox_reading_report_active', reportFallback);
        const newReportItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
          content: reportFallback
        };
        const updated = [newReportItem, ...readingReportHistory];
        setReadingReportHistory(updated);
        localStorage.setItem('velox_reading_reports_history', JSON.stringify(updated));
      } else if (type === 'quiz') {
        reportFallback = lang === 'tr'
          ? `### 🏆 Sınav Kavrama Analizi

**Genel Değerlendirme:**
Bugüne kadar çözdüğünüz ${quizHistory.length} sınav genelinde ortalama **%${avgScore}** başarı elde ederek yüksek bir okuduğunu anlama oranına ulaştınız.

**Gelişim Önerileri:**
- Hatalı yaptığınız soru başlıklarındaki metin bölümlerini Çalışma Alanında tekrar ziyaret edin.
- Zorluk seviyesini kademeli olarak 'Zor' seçeneğe taşıyarak yorum sorularında aktif akıl yürütme pratiği yapın.`
          : `### 🏆 Quiz Comprehension Analysis

**General Assessment:**
You have achieved a high reading comprehension rate with an average success of **%${avgScore}** across all ${quizHistory.length} quizzes taken so far.

**Development Suggestions:**
- Revisit the text sections of the question topics you got wrong in the Workspace.
- Gradually move the difficulty level to 'Hard' to practice active reasoning in interpretation questions.`;
        setQuizReport(reportFallback);
        localStorage.setItem('velox_quiz_report_active', reportFallback);
        const newReportItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
          content: reportFallback
        };
        const updated = [newReportItem, ...quizReportHistory];
        setQuizReportHistory(updated);
        localStorage.setItem('velox_quiz_reports_history', JSON.stringify(updated));
      } else if (type === 'cards') {
        reportFallback = lang === 'tr'
          ? `### 💡 Hafıza Laboratuvarı Gelişim Raporu

**Genel Değerlendirme:**
Toplamda ${flashcards.length} karta sahipsiniz ve bugüne kadar ${totalReviews} tekrar gerçekleştirerek bilgileri zihninizde pekiştirdiniz.

**Gelişim Önerileri:**
- "Sık Gösterilecekler" listesindeki kart sayısını azaltmak için her sabah 5 dakikalık bir odak kart seansı uygulayın.
- Feynman Tekniğini kullanarak en karmaşık kartları kendi kelimelerinizle açıklayın.`
          : `### 💡 Memory Lab Progress Report

**General Assessment:**
You have a total of ${flashcards.length} cards and have consolidated the information in your mind by performing ${totalReviews} repetitions so far.

**Development Suggestions:**
- Apply a 5-minute focused card session every morning to reduce the number of cards in the "Frequently Shown" list.
- Explain the most complex cards in your own words using the Feynman Technique.`;
        setCardReport(reportFallback);
        localStorage.setItem('velox_card_report_active', reportFallback);
        const newReportItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
          content: reportFallback
        };
        const updated = [newReportItem, ...cardReportHistory];
        setCardReportHistory(updated);
        localStorage.setItem('velox_card_reports_history', JSON.stringify(updated));
      }
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t('pr_title')}
        description={t('pr_subtitle')}
        titleClass={titleClass}
        mutedClass={mutedClass}
      />

      {/* Sub-tab selection menu */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-zinc-900 pb-3">
        {[
          { id: 'reading', label: t('pr_tab_reading'), icon: BookOpen },
          { id: 'quiz', label: t('pr_tab_quiz'), icon: Brain },
          { id: 'cards', label: t('pr_tab_cards'), icon: Bookmark }
        ].map((tab) => {
          const isActive = progSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setProgSubTab(tab.id as any)}
              className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                  : isLightTheme
                  ? 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  : 'border-zinc-850 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Rendering based on SubTab */}
      {progSubTab === 'reading' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{t('pr_total_words_read')}</span>
                <span className="text-xl font-black mt-1 text-current">{stats.totalWordsRead.toLocaleString()}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'OKUMA SÜRESİ' : 'READING DURATION'}</span>
                <span className="text-xl font-black mt-1 text-current">{totalMinutes} {t('pr_mins_unit')}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'MAKS HIZ (WPM)' : 'MAX SPEED (WPM)'}</span>
                <span className="text-xl font-black mt-1 text-current">{stats.maxSpeedWpm}</span>
              </div>
            </div>

            {/* Reading Chart */}
            <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className={`text-xs font-black ${titleClass}`}>{t('pr_chart_reading_title')}</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    {[
                      { id: 'daily', label: t('pr_range_daily') },
                      { id: 'weekly', label: t('pr_range_weekly') },
                      { id: 'monthly', label: t('pr_range_monthly') },
                      { id: 'yearly', label: t('pr_range_yearly') },
                      { id: 'custom', label: t('pr_range_custom') }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProgressRange(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          progressRange === p.id
                            ? 'bg-indigo-600 text-white shadow'
                            : `${mutedClass} hover:text-indigo-500`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <button type="button" className="h-8 px-3 rounded-xl border border-stone-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-[10px] font-black flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-zinc-900">
                      <Download className="w-3.5 h-3.5" /> {t('pr_export_data')}
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 min-w-[120px]">
                      <button type="button" onClick={() => handleExportData('reading', 'csv')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{t('pr_export_csv')}</button>
                      <button type="button" onClick={() => handleExportData('reading', 'json')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{t('pr_export_json')}</button>
                      <button type="button" onClick={() => handleExportData('reading', 'txt')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{t('pr_export_txt')}</button>
                    </div>
                  </div>
                </div>
              </div>

              {progressRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-stone-150 dark:border-zinc-900">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{t('pr_custom_start')}</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{t('pr_custom_end')}</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                </div>
              )}

              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={computedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
                    <XAxis dataKey="date" tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 12 }} />
                    <Line type="monotone" dataKey="words" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Report Column */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4 h-full`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3 flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{t('pr_ai_report_title')}</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setReadingReportTab('active'); setSelectedPastReadingReport(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        readingReportTab === 'active' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? 'Son Rapor' : 'Latest'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingReportTab('history')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        readingReportTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? `Geçmiş (${readingReportHistory.length})` : `History (${readingReportHistory.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateReport('reading')}
                    disabled={reportLoading === 'reading'}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3 h-3" /> {reportLoading === 'reading' ? t('pr_ai_report_loading') : t('pr_ai_report_btn')}
                  </button>
                </div>
              </div>

              {readingReportTab === 'active' ? (
                readingReport ? (
                  <div className="text-xs leading-relaxed opacity-95 flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1 whitespace-pre-wrap">
                    {readingReport}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500 opacity-60 animate-pulse" />
                    <p className="text-xs opacity-60">{t('pr_ai_report_empty')}</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1">
                  {selectedPastReadingReport ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center bg-stone-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800">
                        <span className="text-[10px] font-black text-indigo-500">{selectedPastReadingReport.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPastReadingReport(null)}
                          className="text-[10px] font-black text-indigo-500 hover:underline"
                        >
                          {lang === 'tr' ? '← Geri' : '← Back'}
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">
                        {selectedPastReadingReport.content}
                      </div>
                    </div>
                  ) : readingReportHistory.length === 0 ? (
                    <p className="text-xs opacity-60 text-center py-8">{lang === 'tr' ? 'Henüz geçmiş rapor kaydı yok.' : 'No past report history yet.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {readingReportHistory.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedPastReadingReport(item)}
                            className="text-left font-black text-xs text-indigo-500 hover:underline flex-1 truncate mr-2"
                          >
                            📅 {item.date}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem('reading', item.id)}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {progSubTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'ÇÖZÜLEN SINAV' : 'COMPLETED QUIZZES'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredQuizHistory.length} {lang === 'tr' ? 'sınav' : 'quizzes'}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'ORTALAMA BAŞARI' : 'AVERAGE COMPREHENSION'}</span>
                <span className="text-xl font-black mt-1 text-current">%{avgScore}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'BAŞARI SERİSİ' : 'SUCCESS STREAK'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredQuizHistory.filter((h: any) => h.score >= 80).length} {lang === 'tr' ? 'sınav (%80+)' : 'quizzes (%80+)'}</span>
              </div>
            </div>

            {/* Quiz performance bar chart */}
            <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className={`text-xs font-black ${titleClass}`}>{lang === 'tr' ? 'Sınav Başarı Dağılımı' : 'Quiz Success Distribution'}</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    {[
                      { id: 'daily', label: lang === 'tr' ? 'Günlük' : 'Daily' },
                      { id: 'weekly', label: lang === 'tr' ? 'Haftalık' : 'Weekly' },
                      { id: 'monthly', label: lang === 'tr' ? 'Aylık' : 'Monthly' },
                      { id: 'yearly', label: lang === 'tr' ? 'Yıllık' : 'Yearly' },
                      { id: 'custom', label: lang === 'tr' ? 'Özel' : 'Custom' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setQuizProgressRange(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          quizProgressRange === p.id
                            ? 'bg-indigo-600 text-white shadow'
                            : `${mutedClass} hover:text-indigo-500`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <button type="button" className="h-8 px-3 rounded-xl border border-stone-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-[10px] font-black flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-zinc-900">
                      <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Verileri Dışa Aktar' : 'Export Data'}
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 min-w-[120px]">
                      <button type="button" onClick={() => handleExportData('quiz', 'csv')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">CSV (Excel)</button>
                      <button type="button" onClick={() => handleExportData('quiz', 'json')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'JSON Verisi' : 'JSON Data'}</button>
                      <button type="button" onClick={() => handleExportData('quiz', 'txt')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'TXT Metni' : 'TXT Text'}</button>
                    </div>
                  </div>
                </div>
              </div>

              {quizProgressRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-stone-150 dark:border-zinc-900">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BAŞLANGIÇ' : 'START'}</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BİTİŞ' : 'END'}</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                </div>
              )}

              {filteredQuizHistory.length === 0 ? (
                <p className="text-xs opacity-60 py-12 text-center">{lang === 'tr' ? 'Belirtilen aralıkta geçmiş sınav kaydı bulunmuyor.' : 'No past quiz records found in the specified range.'}</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
                      <XAxis dataKey="range" tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 12 }} />
                      <Bar dataKey="count" name={lang === 'tr' ? 'Sınav Sayısı' : 'Quiz Count'} fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* AI Report Column */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4 h-full`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3 flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'AI SINAV RAPORU' : 'AI QUIZ REPORT'}</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setQuizReportTab('active'); setSelectedPastQuizReport(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        quizReportTab === 'active' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? 'Son Rapor' : 'Latest'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizReportTab('history')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        quizReportTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? `Geçmiş (${quizReportHistory.length})` : `History (${quizReportHistory.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateReport('quiz')}
                    disabled={reportLoading === 'quiz'}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3 h-3" /> {reportLoading === 'quiz' ? (lang === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...') : (lang === 'tr' ? 'Rapor Üret' : 'Generate Report')}
                  </button>
                </div>
              </div>

              {quizReportTab === 'active' ? (
                quizReport ? (
                  <div className="text-xs leading-relaxed opacity-95 flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1 whitespace-pre-wrap">
                    {quizReport}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500 opacity-60 animate-pulse" />
                    <p className="text-xs opacity-60">{lang === 'tr' ? 'Sınav sonuçlarınızı ve anlama derinliğinizi analiz etmek, gelişim raporunuzu hazırlamak için "Rapor Üret" butonuna basın.' : 'Click the "Generate Report" button to analyze your quiz results and comprehension depth and prepare your progress report.'}</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1">
                  {selectedPastQuizReport ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center bg-stone-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800">
                        <span className="text-[10px] font-black text-indigo-500">{selectedPastQuizReport.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPastQuizReport(null)}
                          className="text-[10px] font-black text-indigo-500 hover:underline"
                        >
                          {lang === 'tr' ? '← Geri' : '← Back'}
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">
                        {selectedPastQuizReport.content}
                      </div>
                    </div>
                  ) : quizReportHistory.length === 0 ? (
                    <p className="text-xs opacity-60 text-center py-8">{lang === 'tr' ? 'Henüz geçmiş rapor kaydı yok.' : 'No past report history yet.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {quizReportHistory.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedPastQuizReport(item)}
                            className="text-left font-black text-xs text-indigo-500 hover:underline flex-1 truncate mr-2"
                          >
                            📅 {item.date}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem('quiz', item.id)}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {progSubTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'TOPLAM KART' : 'TOTAL CARDS'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredFlashcards.length} {lang === 'tr' ? 'kart' : 'cards'}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'TOPLAM TEKRAR' : 'TOTAL REVIEWS'}</span>
                <span className="text-xl font-black mt-1 text-current">{totalReviews} {lang === 'tr' ? 'tekrar' : 'reviews'}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'PEKİŞTİRİLEN KAVRAM' : 'REINFORCED CONCEPT'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredFlashcards.filter((c: any) => (c.reviewsCount || 0) > 3).length} {lang === 'tr' ? 'kart (3+ Tekrar)' : 'cards (3+ Reviews)'}</span>
              </div>
            </div>

            {/* Flashcard repetition breakdown chart */}
            <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className={`text-xs font-black ${titleClass}`}>{lang === 'tr' ? 'Bilgi Kartı Tekrar Dağılımı' : 'Flashcard Review Distribution'}</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    {[
                      { id: 'daily', label: lang === 'tr' ? 'Günlük' : 'Daily' },
                      { id: 'weekly', label: lang === 'tr' ? 'Haftalık' : 'Weekly' },
                      { id: 'monthly', label: lang === 'tr' ? 'Aylık' : 'Monthly' },
                      { id: 'yearly', label: lang === 'tr' ? 'Yıllık' : 'Yearly' },
                      { id: 'custom', label: lang === 'tr' ? 'Özel' : 'Custom' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCardProgressRange(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          cardProgressRange === p.id
                            ? 'bg-indigo-600 text-white shadow'
                            : `${mutedClass} hover:text-indigo-500`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <button type="button" className="h-8 px-3 rounded-xl border border-stone-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-[10px] font-black flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-zinc-900">
                      <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Verileri Dışa Aktar' : 'Export Data'}
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 min-w-[120px]">
                      <button type="button" onClick={() => handleExportData('cards', 'csv')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">CSV (Excel)</button>
                      <button type="button" onClick={() => handleExportData('cards', 'json')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'JSON Verisi' : 'JSON Data'}</button>
                      <button type="button" onClick={() => handleExportData('cards', 'txt')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'TXT Metni' : 'TXT Text'}</button>
                    </div>
                  </div>
                </div>
              </div>

              {cardProgressRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-stone-150 dark:border-zinc-900">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BAŞLANGIÇ' : 'START'}</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BİTİŞ' : 'END'}</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                </div>
              )}

              {filteredFlashcards.length === 0 ? (
                <p className="text-xs opacity-60 py-12 text-center">{lang === 'tr' ? 'Belirtilen aralıkta kayıtlı bilgi kartı bulunmuyor.' : 'No registered flashcards found in the specified range.'}</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cardReviewDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
                      <XAxis dataKey="status" tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 12 }} />
                      <Bar dataKey="count" name={lang === 'tr' ? 'Kart Sayısı' : 'Card Count'} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* AI Report Column */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4 h-full`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3 flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'AI HAFIZA RAPORU' : 'AI MEMORY REPORT'}</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setCardReportTab('active'); setSelectedPastCardReport(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        cardReportTab === 'active' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? 'Son Rapor' : 'Latest'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardReportTab('history')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        cardReportTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? `Geçmiş (${cardReportHistory.length})` : `History (${cardReportHistory.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateReport('cards')}
                    disabled={reportLoading === 'cards'}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3 h-3" /> {reportLoading === 'cards' ? (lang === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...') : (lang === 'tr' ? 'Rapor Üret' : 'Generate Report')}
                  </button>
                </div>
              </div>

              {cardReportTab === 'active' ? (
                cardReport ? (
                  <div className="text-xs leading-relaxed opacity-95 flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1 whitespace-pre-wrap">
                    {cardReport}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500 opacity-60 animate-pulse" />
                    <p className="text-xs opacity-60">{lang === 'tr' ? 'Hafıza laboratuvarı pekiştirme seanslarınızı analiz etmek ve kişisel gelişim analiz raporunuzu hazırlamak için "Rapor Üret" butonuna basın.' : 'Click the "Generate Report" button to analyze your memory lab reinforcement sessions and prepare your progress report.'}</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1">
                  {selectedPastCardReport ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center bg-stone-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800">
                        <span className="text-[10px] font-black text-indigo-500">{selectedPastCardReport.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPastCardReport(null)}
                          className="text-[10px] font-black text-indigo-500 hover:underline"
                        >
                          {lang === 'tr' ? '← Geri' : '← Back'}
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">
                        {selectedPastCardReport.content}
                      </div>
                    </div>
                  ) : cardReportHistory.length === 0 ? (
                    <p className="text-xs opacity-60 text-center py-8">{lang === 'tr' ? 'Henüz geçmiş rapor kaydı yok.' : 'No past report history yet.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {cardReportHistory.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedPastCardReport(item)}
                            className="text-left font-black text-xs text-indigo-500 hover:underline flex-1 truncate mr-2"
                          >
                            📅 {item.date}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem('cards', item.id)}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WorkspacePage({
  books,
  filteredBooks,
  selectedBook,
  selectedBookId,
  workspaceTab,
  setWorkspaceTab,
  bookSearch,
  setBookSearch,
  bookFilter,
  setBookFilter,
  noteDrafts,
  setNoteDrafts,
  dictionaryResult,
  comprehensionResult,
  insightsResult,
  wordQuery,
  setWordQuery,
  aiStatus,
  aiBusy,
  aiError,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme,
  onSelectBook,
  onDeleteBook,
  onStartReading,
  onGenerateSummary,
  onGenerateDifficulty,
  onGenerateWord,
  onGenerateComprehension,
  onGenerateInsights,
  onSaveNotes,
  onOpenSettings,
  onAddDocument,
  isEditingContent,
  setIsEditingContent,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  refreshBooks,
  showAlert
}: {
  books: BookMark[];
  filteredBooks: BookMark[];
  selectedBook: BookMark | null;
  selectedBookId: string | null;
  workspaceTab: WorkspaceTab;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  bookSearch: string;
  setBookSearch: (value: string) => void;
  bookFilter: BookFilter;
  setBookFilter: (value: BookFilter) => void;
  noteDrafts: Record<string, string>;
  setNoteDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dictionaryResult: any;
  comprehensionResult: any;
  insightsResult: any;
  wordQuery: string;
  setWordQuery: (value: string) => void;
  aiStatus: { enabled: boolean };
  aiBusy: string | null;
  aiError: string | null;
  surfaceClass: string;
  softSurfaceClass: string;
  titleClass: string;
  mutedClass: string;
  isLightTheme: boolean;
  onSelectBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onStartReading: (book: BookMark) => void;
  onGenerateSummary: () => void;
  onGenerateDifficulty: () => void;
  onGenerateWord: () => void;
  onGenerateComprehension: () => void;
  onGenerateInsights: () => void;
  onSaveNotes: (bookId: string) => void;
  onOpenSettings: () => void;
  onAddDocument: () => void;
  isEditingContent: boolean;
  setIsEditingContent: (val: boolean) => void;
  editTitle: string;
  setEditTitle: (val: string) => void;
  editContent: string;
  setEditContent: (val: string) => void;
  refreshBooks: () => void;
  showAlert: (message: string, title?: string) => void;
}) {
  const { lang } = useTranslation();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format: 'txt' | 'md' | 'html' | 'doc' | 'pdf') => {
    if (!selectedBook) return;
    const title = selectedBook.title;
    const content = selectedBook.content;
    const cleanFileName = title.replace(/[/\\?%*:|"<>\s]/g, '_');

    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'md') {
      const markdown = `# ${title}\n\n${content}`;
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      const paragraphs = content.split('\n').map(p => `<p>${p}</p>`).join('');
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    h1 { border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; color: #111827; }
    p { margin-bottom: 1.5em; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${paragraphs}</div>
</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'doc') {
      const paragraphs = content.split('\n').map(p => `<p>${p}</p>`).join('');
      const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; }
    p { font-size: 11pt; margin-bottom: 11pt; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${paragraphs}
</body>
</html>`;
      const blob = new Blob([docHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanFileName}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const paragraphs = content.split('\n').map(p => `<p>${p}</p>`).join('');
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #111827; }
                h1 { font-size: 24px; font-weight: 800; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px; }
                p { font-size: 14px; margin-bottom: 16px; white-space: pre-wrap; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <h1>${title}</h1>
              <div>${paragraphs}</div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
    setShowExportMenu(false);
  };

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title={lang === 'tr' ? 'Çalışma Alanı' : 'Workspace'}
        description={lang === 'tr' ? 'Kütüphane, belge detayı, notlar ve AI araçları tek Master-Detail görünümünde.' : 'Library, document details, notes, and AI tools in a single Master-Detail view.'}
        titleClass={titleClass}
        mutedClass={mutedClass}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,30%)_minmax(0,70%)] gap-5 min-h-[calc(100vh-9rem)]">
        <aside className={`rounded-2xl border p-4 ${surfaceClass} flex flex-col min-h-[560px]`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={`text-base font-black ${titleClass}`}>{lang === 'tr' ? 'Kitaplık' : 'Library'}</h2>
            <span className={`text-[11px] ${mutedClass}`}>{filteredBooks.length} {lang === 'tr' ? 'belge' : (filteredBooks.length === 1 ? 'document' : 'documents')}</span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={onAddDocument}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
            >
              <Plus className="w-4 h-4" /> {lang === 'tr' ? 'Yeni Belge Ekle' : 'Add New Document'}
            </button>
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={bookSearch}
                onChange={(event) => setBookSearch(event.target.value)}
                placeholder={lang === 'tr' ? 'Belge ara...' : 'Search document...'}
                className={`w-full h-10 pl-9 pr-3 rounded-xl border text-sm outline-none ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
              />
            </label>
            <select
              value={bookFilter}
              onChange={(event) => setBookFilter(event.target.value as BookFilter)}
              className={`h-10 px-3 rounded-xl border text-xs font-bold outline-none ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
            >
              <option value="all">{lang === 'tr' ? 'Tüm Belgeler' : 'All Documents'}</option>
              <option value="active">{lang === 'tr' ? 'Devam Edenler' : 'In Progress'}</option>
              <option value="completed">{lang === 'tr' ? 'Tamamlananlar' : 'Completed'}</option>
            </select>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-1 custom-note-scrollbar">
            <div className="flex flex-col gap-2">
              {filteredBooks.length === 0 ? (
                <EmptyState text={lang === 'tr' ? 'Bu filtrede belge yok.' : 'No documents in this filter.'} />
              ) : filteredBooks.map(book => (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedBookId === book.id
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : `${isLightTheme ? 'border-stone-200 hover:border-stone-300 bg-white' : 'border-zinc-850 hover:border-zinc-700 bg-white/[0.015]'}`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className={`text-sm font-black line-clamp-2 ${titleClass}`}>{book.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : book.title}</h3>
                      <p className={`text-[11px] mt-1 line-clamp-1 ${mutedClass}`}>{(book.id === 'sample-welcome' && lang !== 'tr' ? ['Guide', 'Beginner'] : (book.tags || [])).join(', ') || (lang === 'tr' ? 'Belge' : 'Document')}</p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteBook(book.id);
                      }}
                      className="p-1.5 rounded-lg opacity-45 hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${book.progress || 0}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className={`rounded-2xl border ${surfaceClass} min-h-[560px] flex flex-col overflow-hidden`}>
          {!selectedBook ? (
            <EmptyState text={lang === 'tr' ? 'Çalışmak için soldan bir belge seçin.' : 'Select a document from the left to work.'} />
          ) : (
            <>
              <div className="p-5 border-b border-stone-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${mutedClass}`}>{lang === 'tr' ? 'Belge Detayı' : 'Document Detail'}</p>
                  <h2 className={`text-2xl font-black mt-2 truncate ${titleClass}`}>{selectedBook.title}</h2>
                  <p className={`text-xs mt-2 ${mutedClass}`}>
                    {lang === 'tr'
                      ? `%${selectedBook.progress || 0} tamamlandı · ${selectedBook.estimatedMinutesTotal || 1} dk tahmini okuma`
                      : `%${selectedBook.progress || 0} completed · ${selectedBook.estimatedMinutesTotal || 1} min estimate`}
                  </p>
                </div>
                <button onClick={() => onStartReading(selectedBook)} className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shrink-0">
                  <Play className="w-4 h-4 fill-white" /> {lang === 'tr' ? 'RSVP Hızlı Okumayı Başlat' : 'Start RSVP Speed Reading'}
                </button>
              </div>

              <div className="px-5 pt-4">
                <div className={`inline-flex flex-wrap p-1 rounded-xl border ${softSurfaceClass}`}>
                  {WORKSPACE_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setWorkspaceTab(tab.id)}
                      className={`h-9 px-4 rounded-lg text-xs font-black flex items-center gap-2 ${workspaceTab === tab.id ? 'bg-indigo-600 text-white' : mutedClass}`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.id === 'content'
                        ? (lang === 'tr' ? 'Belge İçeriği' : 'Document Content')
                        : tab.id === 'notes'
                        ? (lang === 'tr' ? 'Notlarım' : 'My Notes')
                        : tab.id === 'analysis'
                        ? (lang === 'tr' ? 'Yapay Zeka Analizi' : 'AI Analysis')
                        : (lang === 'tr' ? 'Yapay Zeka Soru & Aksiyon' : 'AI Question & Action')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 flex-1 overflow-y-auto custom-note-scrollbar">
                {workspaceTab === 'content' && (
                  <div className="flex flex-col gap-4">
                    {isEditingContent ? (
                      <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5">
                          <span className={`text-xs font-bold ${titleClass}`}>{lang === 'tr' ? 'Belge Başlığı' : 'Document Title'}</span>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={`h-11 px-4 rounded-xl border text-sm outline-none font-bold ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-850 bg-zinc-950 text-zinc-100'}`}
                            placeholder={lang === 'tr' ? 'Başlık girin...' : 'Enter title...'}
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className={`text-xs font-bold ${titleClass}`}>{lang === 'tr' ? 'Belge İçeriği' : 'Document Content'}</span>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className={`w-full min-h-[460px] p-4 rounded-2xl border text-sm outline-none resize-y custom-note-scrollbar ${isLightTheme ? 'border-stone-300 bg-stone-50 text-stone-900' : 'border-zinc-850 bg-zinc-950/40 text-zinc-100'}`}
                            placeholder={lang === 'tr' ? 'Belge içeriğini buraya girin...' : 'Enter document content here...'}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!editTitle.trim() || !editContent.trim()) {
                                showAlert(lang === 'tr' ? 'Başlık ve içerik alanları boş bırakılamaz.' : 'Title and content fields cannot be empty.', lang === 'tr' ? 'Hata' : 'Error');
                                return;
                              }
                              StorageService.updateBookContent(selectedBook.id, editTitle.trim(), editContent.trim());
                              refreshBooks();
                              setIsEditingContent(false);
                            }}
                            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" /> {lang === 'tr' ? 'Kaydet' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditTitle(selectedBook.title);
                              setEditContent(selectedBook.content);
                              setIsEditingContent(false);
                            }}
                            className={`h-10 px-5 rounded-xl border text-xs font-black ${isLightTheme ? 'border-stone-300 hover:bg-stone-100 text-stone-700 bg-white' : 'border-zinc-800 hover:bg-zinc-900 text-zinc-300 bg-transparent'}`}
                          >
                            {lang === 'tr' ? 'İptal' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-end gap-2 items-center">
                          <div className="relative">
                            <button
                              onClick={() => setShowExportMenu(!showExportMenu)}
                              className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLightTheme ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
                            >
                              <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Dışa Aktar' : 'Export'} <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>
                            {showExportMenu && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                                <div className={`absolute right-0 mt-1.5 w-40 rounded-xl border p-1 shadow-lg z-50 flex flex-col gap-0.5 ${isLightTheme ? 'border-stone-200 bg-white text-stone-700' : 'border-zinc-800 bg-zinc-950 text-zinc-300'}`}>
                                  <button onClick={() => handleExport('txt')} className={`h-8 px-3 rounded-lg text-left text-xs font-bold w-full transition-colors hover:bg-stone-100 dark:hover:bg-zinc-900`}>{lang === 'tr' ? 'TXT olarak (.txt)' : 'As TXT (.txt)'}</button>
                                  <button onClick={() => handleExport('md')} className={`h-8 px-3 rounded-lg text-left text-xs font-bold w-full transition-colors hover:bg-stone-100 dark:hover:bg-zinc-900`}>Markdown (.md)</button>
                                  <button onClick={() => handleExport('html')} className={`h-8 px-3 rounded-lg text-left text-xs font-bold w-full transition-colors hover:bg-stone-100 dark:hover:bg-zinc-900`}>{lang === 'tr' ? 'HTML olarak (.html)' : 'As HTML (.html)'}</button>
                                  <button onClick={() => handleExport('doc')} className={`h-8 px-3 rounded-lg text-left text-xs font-bold w-full transition-colors hover:bg-stone-100 dark:hover:bg-zinc-900`}>{lang === 'tr' ? 'Word olarak (.doc)' : 'As Word (.doc)'}</button>
                                  <button onClick={() => handleExport('pdf')} className={`h-8 px-3 rounded-lg text-left text-xs font-bold w-full transition-colors hover:bg-stone-100 dark:hover:bg-zinc-900`}>{lang === 'tr' ? 'PDF olarak (.pdf)' : 'As PDF (.pdf)'}</button>
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditTitle(selectedBook.title);
                              setEditContent(selectedBook.content);
                              setIsEditingContent(true);
                            }}
                            className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLightTheme ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
                          >
                            {lang === 'tr' ? 'Düzenle' : 'Edit'}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedBook.content);
                            }}
                            className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLightTheme ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
                          >
                            Kopyala
                          </button>
                        </div>
                        <div className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed select-text text-sm p-5 rounded-2xl border ${isLightTheme ? 'border-stone-200 bg-stone-50 text-stone-900' : 'border-zinc-850 bg-zinc-950/20 text-zinc-100'}`}>
                          {selectedBook.content}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {workspaceTab === 'analysis' && (
                  <AnalysisTab
                    selectedBook={selectedBook}
                    aiStatus={aiStatus}
                    aiBusy={aiBusy}
                    aiError={aiError}
                    dictionaryResult={dictionaryResult}
                    wordQuery={wordQuery}
                    setWordQuery={setWordQuery}
                    surfaceClass={surfaceClass}
                    softSurfaceClass={softSurfaceClass}
                    titleClass={titleClass}
                    mutedClass={mutedClass}
                    isLightTheme={isLightTheme}
                    onOpenSettings={onOpenSettings}
                    onGenerateSummary={onGenerateSummary}
                    onGenerateDifficulty={onGenerateDifficulty}
                    onGenerateWord={onGenerateWord}
                  />
                )}

                {workspaceTab === 'notes' && (
                  <div className="flex flex-col gap-4">
                    <textarea
                      value={noteDrafts[selectedBook.id] ?? ''}
                      onChange={(event) => setNoteDrafts(prev => ({ ...prev, [selectedBook.id]: event.target.value }))}
                      className={`w-full min-h-[520px] p-4 rounded-2xl border text-sm outline-none resize-y custom-note-scrollbar ${isLightTheme ? 'border-stone-300 bg-stone-50 text-stone-900 placeholder:text-stone-500' : 'border-zinc-800 bg-zinc-950/40 text-zinc-100'}`}
                      placeholder="Bu belge için çalışma notlarını yaz..."
                    />
                    <button onClick={() => onSaveNotes(selectedBook.id)} className="self-start h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-2">
                      <Save className="w-4 h-4" /> Notları Kaydet
                    </button>
                  </div>
                )}

                {workspaceTab === 'actions' && (
                  <ActionsTab
                    aiStatus={aiStatus}
                    aiBusy={aiBusy}
                    aiError={aiError}
                    comprehensionResult={comprehensionResult}
                    insightsResult={insightsResult}
                    surfaceClass={surfaceClass}
                    titleClass={titleClass}
                    mutedClass={mutedClass}
                    onOpenSettings={onOpenSettings}
                    onGenerateComprehension={onGenerateComprehension}
                    onGenerateInsights={onGenerateInsights}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function AnalysisTab(props: any) {
  const {
    selectedBook,
    aiStatus,
    aiBusy,
    aiError,
    dictionaryResult,
    wordQuery,
    setWordQuery,
    surfaceClass,
    softSurfaceClass,
    titleClass,
    mutedClass,
    isLightTheme,
    onOpenSettings,
    onGenerateSummary,
    onGenerateDifficulty,
    onGenerateWord
  } = props;

  const { t, lang } = useTranslation();

  if (!aiStatus.enabled) {
    return <AiDisabledCard onOpenSettings={onOpenSettings} surfaceClass={surfaceClass} mutedClass={mutedClass} />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {aiError && <div className="xl:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">{aiError}</div>}

      <Panel title={t('ai_summary_title')} surfaceClass={softSurfaceClass} titleClass={titleClass} mutedClass={mutedClass}>
        <p className={`text-xs leading-relaxed ${mutedClass}`}>{selectedBook.aiSummary?.summary || t('ai_summary_empty')}</p>
        {selectedBook.aiSummary?.keyPoints?.length ? (
          <ul className={`mt-3 list-disc pl-4 text-xs leading-relaxed ${mutedClass}`}>
            {selectedBook.aiSummary.keyPoints.map((point: string) => <li key={point}>{point}</li>)}
          </ul>
        ) : null}
        <button onClick={onGenerateSummary} disabled={aiBusy !== null} className="mt-4 h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-50">
          {aiBusy === 'summary' ? t('ai_summary_loading') : selectedBook.aiSummary ? t('ai_summary_btn_refresh') : t('ai_summary_btn_extract')}
        </button>
      </Panel>

      <Panel title={t('ai_difficulty_title')} surfaceClass={softSurfaceClass} titleClass={titleClass} mutedClass={mutedClass}>
        <p className={`text-xs leading-relaxed ${mutedClass}`}>
          {selectedBook.difficultyInfo
            ? `${selectedBook.difficultyInfo.level} (${selectedBook.difficultyInfo.score}/100): ${selectedBook.difficultyInfo.description}`
            : t('ai_difficulty_empty')}
        </p>
        {selectedBook.difficultyInfo?.complexWords?.length ? (
          <p className={`mt-3 text-xs ${mutedClass}`}>{t('ai_difficulty_words')} {selectedBook.difficultyInfo.complexWords.join(', ')}</p>
        ) : null}
        <button onClick={onGenerateDifficulty} disabled={aiBusy !== null} className="mt-4 h-10 px-4 rounded-xl border border-amber-500/35 text-amber-400 text-xs font-black disabled:opacity-50">
          {aiBusy === 'difficulty' ? t('ai_difficulty_loading') : selectedBook.difficultyInfo ? t('ai_difficulty_btn_refresh') : t('ai_difficulty_btn')}
        </button>
      </Panel>

      <div className={`xl:col-span-2 rounded-2xl border p-5 ${softSurfaceClass}`}>
        <h3 className={`text-sm font-black ${titleClass}`}>{t('ai_dict_title')}</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <input
            value={wordQuery}
            onChange={(event) => setWordQuery(event.target.value)}
            placeholder={t('ai_dict_placeholder')}
            className={`h-11 px-4 rounded-xl border text-sm outline-none ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
          />
          <button onClick={onGenerateWord} disabled={aiBusy !== null || !wordQuery.trim()} className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-50">
            {aiBusy === 'word' ? t('ai_dict_loading') : t('ai_dict_btn')}
          </button>
        </div>
        {dictionaryResult && (
          <div className={`mt-4 rounded-xl border p-4 ${surfaceClass}`}>
            <h4 className={`text-sm font-black ${titleClass}`}>{dictionaryResult.word}</h4>
            <p className={`text-xs leading-relaxed mt-2 ${mutedClass}`}>{dictionaryResult.definition}</p>
            {dictionaryResult.synonyms?.length ? <p className={`text-xs mt-2 ${mutedClass}`}>{lang === 'tr' ? 'Benzerleri: ' : 'Synonyms: '}{dictionaryResult.synonyms.join(', ')}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionsTab({
  aiStatus,
  aiBusy,
  aiError,
  comprehensionResult,
  insightsResult,
  surfaceClass,
  titleClass,
  mutedClass,
  onOpenSettings,
  onGenerateComprehension,
  onGenerateInsights
}: any) {
  const { t, lang } = useTranslation();

  if (!aiStatus.enabled) {
    return <AiDisabledCard onOpenSettings={onOpenSettings} surfaceClass={surfaceClass} mutedClass={mutedClass} />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {aiError && <div className="xl:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">{aiError}</div>}

      <Panel title={t('ai_comprehension_title')} surfaceClass={surfaceClass} titleClass={titleClass} mutedClass={mutedClass}>
        <button onClick={onGenerateComprehension} disabled={aiBusy !== null} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-50">
          {aiBusy === 'comprehension' ? t('ai_comprehension_loading') : t('ai_comprehension_btn')}
        </button>
        {comprehensionResult?.questions?.length ? (
          <div className="mt-4 flex flex-col gap-3">
            {comprehensionResult.questions.map((question: any, index: number) => (
              <div key={question.question} className="rounded-xl border border-stone-200 dark:border-zinc-800 p-3">
                <h4 className={`text-xs font-black ${titleClass}`}>{index + 1}. {question.question}</h4>
                <p className={`text-[11px] mt-2 ${mutedClass}`}>{question.explanation}</p>
              </div>
            ))}
          </div>
        ) : <p className={`mt-4 text-xs ${mutedClass}`}>{lang === 'tr' ? 'Henüz soru üretilmedi.' : 'No questions generated yet.'}</p>}
        {comprehensionResult?.feynmanPrompt && (
          <div className="mt-4 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4">
            <h4 className="text-xs font-black text-indigo-400">{lang === 'tr' ? 'Feynman Sorusu' : 'Feynman Question'}</h4>
            <p className={`text-xs mt-2 ${mutedClass}`}>{comprehensionResult.feynmanPrompt}</p>
          </div>
        )}
      </Panel>

      <Panel title={lang === 'tr' ? 'İçgörü ve Aksiyon' : 'Insights & Actions'} surfaceClass={surfaceClass} titleClass={titleClass} mutedClass={mutedClass}>
        <button onClick={onGenerateInsights} disabled={aiBusy !== null} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black disabled:opacity-50">
          {aiBusy === 'insights' ? t('ai_suggestions_loading') : t('ai_suggestions_btn')}
        </button>
        {insightsResult ? (
          <div className={`mt-4 text-xs leading-relaxed ${mutedClass}`}>
            {insightsResult.keyInsights?.length ? <ul className="list-disc pl-4">{insightsResult.keyInsights.map((item: string) => <li key={item}>{item}</li>)}</ul> : null}
            <p className="mt-3"><strong>{lang === 'tr' ? 'Aksiyon:' : 'Action:'}</strong> {insightsResult.actionableIdea}</p>
            <p className="mt-2"><strong>{lang === 'tr' ? 'Mental Model:' : 'Mental Model:'}</strong> {insightsResult.mentalModel}</p>
          </div>
        ) : <p className={`mt-4 text-xs ${mutedClass}`}>{t('ai_suggestions_empty')}</p>}
      </Panel>
    </div>
  );
}

function SettingsPage({
  settingsTab,
  setSettingsTab,
  currentThemeType,
  currentTheme,
  aiStatus,
  aiProvider,
  setAiProvider,
  geminiDraftKey,
  setGeminiDraftKey,
  openaiDraftKey,
  setOpenaiDraftKey,
  claudeDraftKey,
  setClaudeDraftKey,
  localUrlDraft,
  setLocalUrlDraft,
  localModelDraft,
  setLocalModelDraft,
  aiSaveMessage,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  onThemeChange,
  onSaveAiSettings,
  onClearAiSettings,
  t,
  lang,
  setLanguage
}: any) {
  const [selectedProvider, setSelectedProvider] = useState(aiProvider);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [optDays, setOptDays] = useState(30);
  const isLightTheme = currentThemeType === 'light' || currentThemeType === 'sepia' || currentThemeType === 'nord';

  const [shortcuts, setShortcuts] = useState(() => {
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
  });

  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      const keys: string[] = [];
      if (e.ctrlKey && e.key !== 'Control') keys.push('Ctrl');
      if (e.shiftKey && e.key !== 'Shift') keys.push('Shift');
      if (e.altKey && e.key !== 'Alt') keys.push('Alt');
      if (e.metaKey && e.key !== 'Meta') keys.push('Meta');
      
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        const mainKey = e.code === 'Space' ? 'Space' : e.code;
        keys.push(mainKey);
        
        const shortcutStr = keys.join(' + ');
        const next = { ...shortcuts, [recordingKey]: shortcutStr };
        setShortcuts(next);
        localStorage.setItem('velox_shortcuts', JSON.stringify(next));
        setRecordingKey(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingKey, shortcuts]);

  const SHORTCUT_LABELS: Record<string, string> = {
    playPause: t('sr_start') + ' / ' + t('sr_stop'),
    back10: '10 ' + t('home_words_unit') + ' ' + (lang === 'tr' ? 'Geri' : 'Back'),
    forward10: '10 ' + t('home_words_unit') + ' ' + (lang === 'tr' ? 'İleri' : 'Forward'),
    speedUp: (lang === 'tr' ? 'Hız Artır' : 'Increase Speed') + ' (WPM)',
    speedDown: (lang === 'tr' ? 'Hız Azalt' : 'Decrease Speed') + ' (WPM)',
    exit: t('sr_close') + ' (ESC)'
  };

  const handleSave = () => {
    onSaveAiSettings(
      selectedProvider,
      geminiDraftKey,
      openaiDraftKey,
      claudeDraftKey,
      localUrlDraft,
      localModelDraft
    );
  };

  const handleClear = () => {
    onClearAiSettings();
    setSelectedProvider('gemini');
  };

  const handleBackup = () => {
    const backup: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('velox_') || key.startsWith('readflow_'))) {
        backup[key] = localStorage.getItem(key) || '';
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `velox_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== 'object' || data === null) {
          alert(t('st_validation_invalid_backup'));
          return;
        }
        const keys = Object.keys(data);
        const hasVeloxKey = keys.some(k => k.startsWith('velox_') || k.startsWith('readflow_'));
        if (!hasVeloxKey) {
          alert(t('st_validation_no_velox_data'));
          return;
        }

        keys.forEach(k => {
          localStorage.setItem(k, data[k]);
        });

        alert(t('st_validation_success_restore'));
        window.location.reload();
      } catch (err) {
        alert('Error: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetAll = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('velox_') || key.startsWith('readflow_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    alert(t('st_validation_success_reset'));
    window.location.reload();
  };

  const handleOptimizeData = () => {
    if (optDays < 1) {
      alert('Please enter a valid number of days.');
      return;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - optDays);
    cutoff.setHours(0, 0, 0, 0);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let cleanedHistoryCount = 0;
    let cleanedQuizzesCount = 0;

    // 1. Clean Reading History (stats.history)
    let stats: any = {};
    try {
      const storedStats = localStorage.getItem('velox_stats');
      if (storedStats) {
        stats = JSON.parse(storedStats);
        if (stats.history) {
          const originalLen = stats.history.length;
          stats.history = stats.history.filter((h: any) => h.date >= cutoffStr);
          cleanedHistoryCount = originalLen - stats.history.length;
          localStorage.setItem('velox_stats', JSON.stringify(stats));
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Clean Quiz History
    try {
      const storedQuizHistory = localStorage.getItem('velox_quiz_history');
      if (storedQuizHistory) {
        const quizHistory = JSON.parse(storedQuizHistory);
        const originalLen = quizHistory.length;
        const updated = quizHistory.filter((q: any) => {
          const qDate = parseCustomDate(q.date);
          return qDate >= cutoff;
        });
        cleanedQuizzesCount = originalLen - updated.length;
        localStorage.setItem('velox_quiz_history', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Clean AI Reports Histories
    const cutoffTime = cutoff.getTime();
    ['velox_reading_reports_history', 'velox_quiz_reports_history', 'velox_card_reports_history'].forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            const updated = list.filter((item: any) => {
              const itemTime = Number(item.id);
              return !isNaN(itemTime) && itemTime >= cutoffTime;
            });
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    alert(t('st_validation_success_optimize'));
    window.location.reload();
  };

  const isResetEnabled = resetConfirmText.toLowerCase() === (lang === 'tr' ? 'sil' : 'sil'); // Typo protection, let it accept 'sil' or 'delete' if needed, but spec says "sil"

  return (
    <section className="flex flex-col gap-5">
      <PageHeader title={t('st_title')} description={t('st_subtitle')} titleClass={titleClass} mutedClass={mutedClass} />
 
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <aside className={`rounded-2xl border p-3 ${surfaceClass}`}>
          <div className="flex flex-col gap-1">
            {SETTINGS_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`h-11 px-3 rounded-xl text-xs font-black flex items-center gap-3 ${settingsTab === tab.id ? 'bg-indigo-600 text-white' : `${mutedClass} hover:bg-stone-100 dark:hover:bg-zinc-900`}`}
              >
                <tab.icon className="w-4 h-4" /> {t(`st_tab_${tab.id}` as any)}
              </button>
            ))}
          </div>
        </aside>
 
        <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
          {settingsTab === 'appearance' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className={`text-lg font-black ${titleClass}`}>{t('st_theme_title')}</h2>
                <p className={`text-sm mt-1 ${mutedClass}`}>{t('st_theme_desc')}</p>
              </div>
              <ThemeSelector currentTheme={currentThemeType} onChangeTheme={onThemeChange} />
            </div>
          )}
 
          {settingsTab === 'ai' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className={`text-lg font-black ${titleClass}`}>{t('st_ai_title')}</h2>
                <p className={`text-sm mt-1 ${mutedClass}`}>{t('st_ai_desc')}</p>
              </div>
 
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'gemini', label: 'Google Gemini' },
                  { id: 'openai', label: 'OpenAI ChatGPT' },
                  { id: 'claude', label: 'Anthropic Claude' },
                  { id: 'local', label: lang === 'tr' ? 'Ollama (Lokal)' : 'Ollama (Local)' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={`h-11 rounded-xl text-xs font-black border transition-colors ${selectedProvider === p.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-900'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
 
              <hr className="border-stone-100 dark:border-zinc-900" />
 
              {selectedProvider === 'gemini' && (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold">Gemini API Key</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={geminiDraftKey}
                      onChange={(event) => setGeminiDraftKey(event.target.value)}
                      placeholder="Gemini API key"
                      className="h-12 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 text-sm outline-none"
                    />
                  </label>
                </div>
              )}
 
              {selectedProvider === 'openai' && (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold">OpenAI API Key</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={openaiDraftKey}
                      onChange={(event) => setOpenaiDraftKey(event.target.value)}
                      placeholder="OpenAI API key"
                      className="h-12 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 text-sm outline-none"
                    />
                  </label>
                </div>
              )}
 
              {selectedProvider === 'claude' && (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold">Anthropic Claude API Key</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={claudeDraftKey}
                      onChange={(event) => setClaudeDraftKey(event.target.value)}
                      placeholder="Claude API key"
                      className="h-12 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 text-sm outline-none"
                    />
                  </label>
                </div>
              )}
 
              {selectedProvider === 'local' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-bold">{lang === 'tr' ? 'Lokal API Bağlantı Adresi (URL)' : 'Local API Connection Address (URL)'}</span>
                    <input
                      type="text"
                      value={localUrlDraft}
                      onChange={(event) => setLocalUrlDraft(event.target.value)}
                      placeholder="http://localhost:11434"
                      className="h-12 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold">{lang === 'tr' ? 'Model Adı' : 'Model Name'}</span>
                    <input
                      type="text"
                      value={localModelDraft}
                      onChange={(event) => setLocalModelDraft(event.target.value)}
                      placeholder="llama3"
                      className="h-12 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 text-sm outline-none"
                    />
                  </label>
                </div>
              )}
 
              <div className="flex gap-2">
                <button onClick={handleSave} className="h-12 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black">{t('st_ai_save_btn')}</button>
                <button onClick={handleClear} className="h-12 px-5 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-black">{t('st_ai_reset_btn')}</button>
              </div>
 
              <div className={`rounded-2xl border p-4 ${softSurfaceClass}`}>
                <p className={`text-xs font-black ${aiStatus.enabled ? 'text-emerald-500' : mutedClass}`}>
                  {aiStatus.enabled ? `${t('st_ai_status_active')} (${aiStatus.provider?.toUpperCase()})` : t('st_ai_status_passive')}
                </p>
                <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>{aiSaveMessage || t('st_ai_status_desc')}</p>
              </div>
            </div>
          )}

          {settingsTab === 'shortcuts' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className={`text-lg font-black ${titleClass}`}>{t('st_shortcuts_title')}</h2>
                <p className={`text-sm mt-1 ${mutedClass}`}>{t('st_shortcuts_desc')}</p>
              </div>

              <div className="border border-stone-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-zinc-900/40 border-b border-stone-200 dark:border-zinc-800">
                      <th className="p-3 font-black">{t('st_shortcuts_action')}</th>
                      <th className="p-3 font-black">{t('st_shortcuts_assigned')}</th>
                      <th className="p-3 font-black text-right">{t('st_shortcuts_process')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-zinc-900">
                    {Object.keys(shortcuts).map((key) => (
                      <tr key={key} className="hover:bg-stone-50/55 dark:hover:bg-zinc-900/10">
                        <td className="p-3 font-bold">{SHORTCUT_LABELS[key] || key}</td>
                        <td className="p-3">
                          {recordingKey === key ? (
                            <span className="animate-pulse text-indigo-600 dark:text-indigo-400 font-black">{t('st_shortcuts_waiting')}</span>
                          ) : (
                            <kbd className="px-2 py-1 rounded bg-stone-100 dark:bg-zinc-800 font-mono text-[11px] font-bold border border-stone-200 dark:border-zinc-700">
                              {shortcuts[key as keyof typeof shortcuts]}
                            </kbd>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setRecordingKey(key)}
                            disabled={recordingKey !== null}
                            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] disabled:opacity-50"
                          >
                            {t('st_shortcuts_change')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`p-4 rounded-xl border ${softSurfaceClass} flex justify-between items-center`}>
                <span className="text-xs font-bold">{t('st_shortcuts_reset')}</span>
                <button
                  onClick={() => {
                    const defaults = {
                      playPause: 'Space',
                      back10: 'ArrowLeft',
                      forward10: 'ArrowRight',
                      speedUp: 'ArrowUp',
                      speedDown: 'ArrowDown',
                      exit: 'Escape'
                    };
                    setShortcuts(defaults);
                    localStorage.setItem('velox_shortcuts', JSON.stringify(defaults));
                  }}
                  className="h-8 px-3 rounded-lg border text-xs font-bold hover:bg-stone-50 dark:hover:bg-zinc-900"
                >
                  {t('st_shortcuts_reset_btn')}
                </button>
              </div>
            </div>
          )}

          {settingsTab === 'data' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className={`text-lg font-black ${titleClass}`}>{t('st_data_title')}</h2>
                <p className={`text-sm mt-1 ${mutedClass}`}>{t('st_data_desc')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-2xl border ${softSurfaceClass} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-indigo-500" /> {t('st_data_backup_title')}
                    </h4>
                    <p className={`text-xs mt-1.5 leading-relaxed ${mutedClass}`}>
                      {t('st_data_backup_desc')}
                    </p>
                  </div>
                  <button onClick={handleBackup} className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black self-start">
                    {t('st_data_backup_btn')}
                  </button>
                </div>

                <div className={`p-5 rounded-2xl border ${softSurfaceClass} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-indigo-500" /> {t('st_data_restore_title')}
                    </h4>
                    <p className={`text-xs mt-1.5 leading-relaxed ${mutedClass}`}>
                      {t('st_data_restore_desc')}
                    </p>
                  </div>
                  <label className="h-10 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs font-black flex items-center justify-center cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-900/60 self-start">
                    {t('st_data_restore_btn')}
                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                  </label>
                </div>

                <div className={`p-5 rounded-2xl border ${softSurfaceClass} flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className="text-sm font-black flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-500" /> {t('st_data_optimize_title')}
                    </h4>
                    <p className={`text-xs mt-1.5 leading-relaxed ${mutedClass}`}>
                      {t('st_data_optimize_desc')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2">
                      <span className="text-xs font-bold">{t('st_data_optimize_days')}</span>
                      <input
                        type="number"
                        min="1"
                        value={optDays}
                        onChange={(e) => setOptDays(Math.max(1, Number(e.target.value)))}
                        className={`w-16 h-8 px-2 rounded-lg text-xs border outline-none ${isLightTheme ? 'border-stone-300 bg-white' : 'border-zinc-800 bg-zinc-950'}`}
                      />
                    </label>
                    <button onClick={handleOptimizeData} className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black self-start">
                      {t('st_data_optimize_btn')}
                    </button>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/5 flex flex-col justify-between gap-3`}>
                  <div>
                    <h4 className="text-sm font-black text-rose-500 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> {t('st_data_reset_title')}
                    </h4>
                    <p className={`text-xs mt-1.5 leading-relaxed ${mutedClass}`}>
                      {t('st_data_reset_desc')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder={t('st_data_reset_confirm')}
                      className={`h-9 px-3 rounded-lg border text-xs outline-none ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                    />
                    <button
                      onClick={handleResetAll}
                      disabled={!isResetEnabled}
                      className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black disabled:opacity-50 self-start"
                    >
                      {t('st_data_reset_btn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'language' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className={`text-lg font-black ${titleClass}`}>{t('st_lang_title')}</h2>
                <p className={`text-sm mt-1 ${mutedClass}`}>{t('st_lang_desc')}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setLanguage('tr')}
                  className={`h-14 px-5 rounded-2xl border text-xs font-black flex items-center justify-between transition-all ${
                    lang === 'tr'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-600/10'
                      : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <span>{t('st_lang_tr')}</span>
                  {lang === 'tr' && <BookOpenCheck className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setLanguage('en')}
                  className={`h-14 px-5 rounded-2xl border text-xs font-black flex items-center justify-between transition-all ${
                    lang === 'en'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-600/10'
                      : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900/60'
                  }`}
                >
                  <span>{t('st_lang_en')}</span>
                  {lang === 'en' && <BookOpenCheck className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function GuideContent({
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
        nezaman_desc: 'Ders çalışırken, uzun araştırma makalelerini incelerken, yeni bir teknik dokümantasyon okurken veya günlük okuma alışkanlığınızı takip ederken dilediğiniz an kullanabilirsiniz.',
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

function PageHeader({ title, description, titleClass, mutedClass }: { title: string; description: string; titleClass: string; mutedClass: string }) {
  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight ${titleClass}`}>{title}</h2>
      <p className={`text-sm mt-1 ${mutedClass}`}>{description}</p>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, surfaceClass, mutedClass }: { icon: any; label: string; value: string; surfaceClass: string; mutedClass: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-indigo-600/12 text-indigo-500 grid place-items-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-wide ${mutedClass}`}>{label}</p>
          <h3 className="text-2xl font-black mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children, surfaceClass, titleClass }: { title: string; children: React.ReactNode; surfaceClass: string; titleClass: string; mutedClass?: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
      <h3 className={`text-sm font-black ${titleClass}`}>{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AiDisabledCard({ onOpenSettings, surfaceClass, mutedClass }: { onOpenSettings: () => void; surfaceClass: string; mutedClass: string }) {
  const { lang } = useTranslation();
  return (
    <div className={`rounded-2xl border p-6 ${surfaceClass}`}>
      <h3 className="text-base font-black">{lang === 'tr' ? 'AI Kapalı' : 'AI Offline / Disabled'}</h3>
      <p className={`text-sm mt-2 max-w-2xl leading-relaxed ${mutedClass}`}>
        {lang === 'tr'
          ? 'Yapay zeka özellikleri isteğe bağlıdır. Ayarlar sayfasından bir yapay zeka sağlayıcısı (Gemini, OpenAI, Claude veya Lokal Model) yapılandırdığınızda; metin özeti, zorluk analizi, kelime sözlüğü ve kavrama araçları aktif hale gelecektir.'
          : 'AI features are optional. Once you configure an AI provider (Gemini, OpenAI, Claude, or a Local Model) in Settings, text summaries, difficulty analysis, flashcards, and comprehension quiz tools will become active.'}
      </p>
      <button onClick={onOpenSettings} className="mt-4 h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black">
        {lang === 'tr' ? 'Ayarlara Git' : 'Go to Settings'}
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 text-sm">{text}</div>;
}

function AboutPage({
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  const { t, lang } = useTranslation();
  const [activeModal, setActiveModal] = useState<'eula' | 'privacy' | 'licenses' | null>(null);

  const handleOpenLink = () => {
    window.open('https://vellium.dev', '_blank');
  };

  return (
    <section className="flex flex-col items-center justify-center py-4 px-4 max-w-3xl mx-auto w-full">
      {/* App Logo & Name */}
      <div className="flex flex-col items-center text-center">
        <img src="/velox-icon.svg" alt="Velox Logo" className="w-48 h-48 object-contain -mb-5" />
        <h2 className={`text-3xl font-black tracking-tight ${titleClass}`}>Velox</h2>
        <p className={`text-sm mt-2 max-w-md leading-relaxed ${mutedClass}`}>
          {t('about_desc')}
        </p>
      </div>

      {/* Developer Card */}
      <div className={`w-full mt-6 rounded-2xl border p-4 ${surfaceClass} flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 grid place-items-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
            <img src="/vellium-icon.svg" alt="Vellium Logo" className="w-7 h-7 filter drop-shadow-[0_0_4px_rgba(129,140,248,0.6)]" />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{t('about_author')}</p>
            <h3 className={`text-sm font-black ${titleClass}`}>Vellium.dev</h3>
            <a href="https://vellium.dev" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">vellium.dev</a>
          </div>
        </div>
        <button
          onClick={handleOpenLink}
          className={`h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${isLightTheme ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
        >
          {lang === 'tr' ? 'Web Sitesi' : 'Website'} <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>

      {/* Legal List */}
      <div className={`w-full mt-6 rounded-2xl border p-5 ${surfaceClass}`}>
        <p className={`text-[10px] font-black uppercase tracking-wider ${mutedClass} mb-4`}>{lang === 'tr' ? 'YASAL' : 'LEGAL'}</p>
        <div className="flex flex-col divide-y divide-stone-200 dark:divide-zinc-800/60">
          {/* EULA */}
          <button
            onClick={() => setActiveModal('eula')}
            className="py-4 flex items-center justify-between text-left w-full hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <Scale className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className={`text-sm font-black ${titleClass}`}>{lang === 'tr' ? 'Kullanım Koşulları (EULA)' : 'Terms of Use (EULA)'}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Son kullanıcı lisans sözleşmesi' : 'End user license agreement'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* Privacy */}
          <button
            onClick={() => setActiveModal('privacy')}
            className="py-4 flex items-center justify-between text-left w-full hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className={`text-sm font-black ${titleClass}`}>{lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Veri toplama ve gizlilik bilgileri' : 'Data collection and privacy information'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>

          {/* Licenses */}
          <button
            onClick={() => setActiveModal('licenses')}
            className="py-4 flex items-center justify-between text-left w-full hover:opacity-85"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className={`text-sm font-black ${titleClass}`}>{lang === 'tr' ? 'Açık Kaynak Lisansları' : 'Open Source Licenses'}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Üçüncü parti yazılım bildirimleri' : 'Third-party software notices'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40" />
          </button>
        </div>
      </div>

      {/* Legal Footer Info */}
      <div className="mt-8 text-center flex flex-col gap-2">
        <p className={`text-xs ${mutedClass}`}>{lang === 'tr' ? 'Copyright © 2026 Vellium. Tüm hakları saklıdır.' : 'Copyright © 2026 Vellium. All rights reserved.'}</p>
        <p className={`text-[10px] leading-relaxed max-w-md ${mutedClass} opacity-60`}>
          {lang === 'tr'
            ? 'Velox tescilli bir yazılımdır. İzinsiz kopyalanması, dağıtılması veya tersine mühendislik yapılması kesinlikle yasaktır.'
            : 'Velox is a proprietary software. Unauthorized copying, distribution, or reverse engineering is strictly prohibited.'}
        </p>
      </div>

      {/* Modal */}
      {activeModal && (
        <LegalModal
          type={activeModal}
          onClose={() => setActiveModal(null)}
          isLightTheme={isLightTheme}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
      )}
    </section>
  );
}

function LegalModal({
  type,
  onClose,
  isLightTheme,
  surfaceClass,
  titleClass,
  mutedClass
}: {
  type: 'eula' | 'privacy' | 'licenses';
  onClose: () => void;
  isLightTheme: boolean;
  surfaceClass: string;
  titleClass: string;
  mutedClass: string;
}) {
  const { lang } = useTranslation();
  const getModalData = () => {
    switch (type) {
      case 'eula':
        return {
          title: lang === 'tr' ? 'Kullanım Koşulları (EULA)' : 'Terms of Use (EULA)',
          content: lang === 'tr' ? `VELOX - SON KULLANICI LİSANS SÖZLEŞMESİ (EULA)

Son Güncelleme: 04 Temmuz 2026

Bu Son Kullanıcı Lisans Sözleşmesi ("Sözleşme"), Vellium tarafından geliştirilen Velox yazılımı ("Yazılım") için sizinle ("Kullanıcı") Vellium arasında yapılan yasal bir anlaşmadır.

1. LİSANS VERİLMESİ
Vellium, bu Yazılımı kişisel veya ticari kullanımınız için münhasır olmayan, devredilemeyen, sınırlı bir lisansla bu Sözleşme koşulları çerçevesinde kullanma hakkı vermektedir.

2. MÜLKİYET VE FİKRİ MÜLKİYET
Yazılımın tüm telif hakları, ticari markaları, fikri mülkiyet ve patent hakları Vellium'a aittir. Yazılım lisanslanmıştır, satılmamıştır. Kodların kopyalanması, tersine mühendislik yapılması, kaynak koda dönüştürülmesi veya izinsiz dağıtılması kesinlikle yasaktır.

3. HİZMET KALİTESİ VE SORUMLULUK SINIRLANDIRILMASI
Yazılım "olduğu gibi" ve "kullanılabilir olduğu sürece" esasıyla sunulmaktadır. Vellium, yazılımın hatasız çalışacağını garanti etmez. Yapay zeka modülü (Gemini API entegrasyonu) tarafından üretilen özetler, kavramsal içerikler ve sorular bilgi amaçlı olup nihai yasal veya profesyonel kararlarda kaynak gösterilemez; tüm sorumluluk kullanıcıya aittir.

4. İPTAL VE FESİH
Bu sözleşme, yazılımı cihazınızdan kaldırana kadar geçerlidir. Sözleşme koşullarına aykırı hareket edilmesi durumunda lisansınız Vellium tarafından tek taraflı olarak feshedilebilir.`
          : `VELOX - END USER LICENSE AGREEMENT (EULA)

Last Updated: July 04, 2026

This End User License Agreement ("Agreement") is a legal agreement between you ("User") and Vellium for the Velox software ("Software") developed by Vellium.

1. LICENSE GRANT
Vellium grants you a non-exclusive, non-transferable, limited license to use this Software for personal or commercial use in accordance with the terms of this Agreement.

2. OWNERSHIP AND INTELLECTUAL PROPERTY
All copyrights, trademarks, intellectual property and patent rights of the Software belong to Vellium. The Software is licensed, not sold. Copying, reverse engineering, decompiling or unauthorized distribution of codes is strictly prohibited.

3. QUALITY OF SERVICE AND LIMITATION OF LIABILITY
The Software is provided on an "as is" and "as available" basis. Vellium does not guarantee that the software will run error-free. Summaries, conceptual content and questions generated by the AI module (Gemini API integration) are for informational purposes and cannot be cited in final legal or professional decisions; all responsibility belongs to the user.

4. CANCELLATION AND TERMINATION
This agreement is valid until you remove the software from your device. In case of violation of the Agreement terms, your license may be unilaterally terminated by Vellium.`
        };
      case 'privacy':
        return {
          title: lang === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy',
          content: lang === 'tr' ? `VELOX - GİZLİLİK POLİTİKASI

Son Güncelleme: 04 Temmuz 2026

Velox olarak gizliliğinize son derece saygı duyuyoruz. Bu politika, uygulamamızı kullandığınızda verilerinizin nasıl yönetildiğini açıklamaktadır.

1. YEREL ÖNCELİKLİ (LOCAL-FIRST) VERİ DEPOLAMA
Uygulamaya eklediğiniz tüm belgeler, yazdığınız notlar, okuma süreleriniz, hız istatistikleriniz ve tercihleriniz tamamen cihazınızın yerel depolama alanında (IndexedDB ve localStorage üzerinde) saklanır. Sunucularımıza hiçbir belgeniz veya not içeriğiniz gönderilmez veya saklanmaz.

2. YAPAY ZEKA HİZMETLERİ VE API KULLANIMI
Yapay zeka analiz araçları (Özet, Zorluk Analizi, Kelime Sözlüğü ve Soru Aksiyonları) isteğe bağlıdır. Bir yapay zeka sağlayıcısı (Gemini, OpenAI, Claude veya Lokal Model) tanımladığınızda, seçtiğiniz belgenin analizi için ilgili sağlayıcının API uç noktalarına istek gönderilir. Bu istekler tamamen şifrelenmiş HTTPS kanalları üzerinden yapılır. Gönderilen veriler Vellium veya Velox tarafından kaydedilmez.

3. ÜÇÜNCÜ TARAF HİZMETLER VE ÇEREZLER
Velox, hiçbir kullanıcı takip kütüphanesi, analiz aracı (analytics) veya reklam izleyicisi barındırmamaktadır. Tamamen temiz ve izleyicisiz bir yerel masaüstü uygulamasıdır.

4. BİZE ULAŞIN
Gizlilik politikamızla ilgili sorularınız için vellium.dev web sitesi üzerinden bizimle iletişime geçebilirsiniz.`
          : `VELOX - PRIVACY POLICY

Last Updated: July 04, 2026

At Velox, we highly respect your privacy. This policy explains how your data is managed when you use our application.

1. LOCAL-FIRST DATA STORAGE
All documents you add to the application, notes you write, reading durations, speed statistics and preferences are stored entirely in your device's local storage (on IndexedDB and localStorage). No documents or note content are sent or stored on our servers.

2. AI SERVICES AND API USAGE
AI analysis tools (Summary, Difficulty Analysis, Dictionary and Question Actions) are optional. When you configure an AI provider (Gemini, OpenAI, Claude or Local Model), requests are sent to the provider's API endpoints to analyze the selected document. These requests are made via fully encrypted HTTPS channels. Sent data is not saved by Vellium or Velox.

3. THIRD PARTY SERVICES AND COOKIES
Velox does not contain any user tracking libraries, analytics tools or ad trackers. It is a completely clean and tracker-free local desktop application.

4. CONTACT US
For questions about our privacy policy, you can contact us via the vellium.dev website.`
        };
      case 'licenses':
        return {
          title: lang === 'tr' ? 'Açık Kaynak Lisansları' : 'Open Source Licenses',
          content: lang === 'tr' ? `VELOX - ÜÇÜNCÜ PARTİ YAZILIM BİLDİRİMLERİ

Velox, aşağıdaki açık kaynak kodlu kütüphaneleri ve yazılımları kullanmaktadır. Katkılarından dolayı tüm geliştiricilere teşekkür ederiz.

1. React (MIT Lisansı)
Copyright © Meta Platforms, Inc. and affiliates.

2. Zustand (MIT Lisansı)
Copyright © 2019-2024 Daishi Kato.

3. Recharts (MIT Lisansı)
Copyright © 2015-present Recharts Group.

4. Lucide React (ISC Lisansı)
Copyright © 2020 lucide-react contributors.

5. Mammoth (BSD 2-Clause Lisansı)
Copyright © 2012-2024 Michael Stephens.

6. JSZip (MIT Lisansı)
Copyright © 2009-2016 Stuart Knightley.

7. Motion (MIT Lisansı)
Copyright © 2018 Framer B.V.

8. Vite (MIT Lisansı)
Copyright © 2019-present, Ygritte and Vite contributors.`
          : `VELOX - THIRD PARTY SOFTWARE NOTICES

Velox uses the following open source libraries and software. We thank all developers for their contributions.

1. React (MIT License)
Copyright © Meta Platforms, Inc. and affiliates.

2. Zustand (MIT License)
Copyright © 2019-2024 Daishi Kato.

3. Recharts (MIT License)
Copyright © 2015-present Recharts Group.

4. Lucide React (ISC License)
Copyright © 2020 lucide-react contributors.

5. Mammoth (BSD 2-Clause License)
Copyright © 2012-2024 Michael Stephens.

6. JSZip (MIT License)
Copyright © 2009-2016 Stuart Knightley.

7. Motion (MIT License)
Copyright © 2018 Framer B.V.

8. Vite (MIT License)
Copyright © 2019-present, Ygritte and Vite contributors.`
        };
    }
  };

  const data = getModalData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border flex flex-col shadow-2xl ${surfaceClass}`}>
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className={`text-base font-black ${titleClass}`}>{data.title}</h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border hover:opacity-80 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-note-scrollbar">
          <pre className={`text-xs leading-relaxed font-sans whitespace-pre-wrap select-text ${mutedClass}`}>
            {data.content}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-xs font-black"
          >
            {lang === 'tr' ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomDialog({ config, onClose, surfaceClass, titleClass, mutedClass, isLightTheme }: any) {
  const { lang } = useTranslation();
  if (!config || !config.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-md overflow-hidden rounded-3xl border flex flex-col shadow-2xl p-6 gap-5 ${surfaceClass}`}>
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>{config.title}</h3>
          <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>{config.message}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {config.type === 'confirm' && (
            <button
              onClick={() => {
                if (config.onCancel) config.onCancel();
                onClose();
              }}
              className={`h-10 px-4 rounded-xl border text-xs font-bold transition-all ${
                isLightTheme
                  ? 'border-stone-250 bg-white hover:bg-stone-50 text-stone-700'
                  : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50 text-zinc-300'
              }`}
            >
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </button>
          )}
          <button
            onClick={() => {
              if (config.onConfirm) config.onConfirm();
              onClose();
            }}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
          >
            {config.type === 'confirm' ? (lang === 'tr' ? 'Onayla' : 'Confirm') : (lang === 'tr' ? 'Tamam' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}


function SearchableBookSelect({
  books,
  selectedBookId,
  onSelectBook,
  isLightTheme,
  surfaceClass,
  mutedClass,
  titleClass
}: any) {
  const { lang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedBook = books.find((b: any) => b.id === selectedBookId);
  const localizedSelectedBook = selectedBook && selectedBook.id === 'sample-welcome' && lang !== 'tr'
    ? { ...selectedBook, title: 'Velox Speed Reading Guide' }
    : selectedBook;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBooks = books.filter((b: any) =>
    (b.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : b.title).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full mt-2" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); setSearchQuery(''); }}
        type="button"
        className={`w-full h-11 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between text-left focus:outline-none focus:border-indigo-500 ${
          isLightTheme 
            ? 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50' 
            : 'border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900/20'
        }`}
      >
        <span className="truncate pr-2">{localizedSelectedBook ? (localizedSelectedBook.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : localizedSelectedBook.title) : (lang === 'tr' ? 'Metin Seçilmedi' : 'No text selected')}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute left-0 right-0 mt-1.5 z-40 rounded-2xl border p-2 flex flex-col gap-2 max-h-60 shadow-2xl ${
            isLightTheme 
              ? 'border-stone-200 bg-white shadow-stone-200/50' 
              : 'border-zinc-800 bg-zinc-950 shadow-black/80'
          }`}
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-60" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'tr' ? 'Belge adıyla ara...' : 'Search by document name...'}
              className={`w-full h-9 pl-8 pr-3 rounded-xl border text-xs outline-none focus:border-indigo-500 ${
                isLightTheme 
                  ? 'border-stone-200 bg-stone-50 text-stone-900' 
                  : 'border-zinc-850 bg-zinc-900 text-zinc-100'
              }`}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-note-scrollbar flex flex-col gap-1 pr-1">
            {filteredBooks.length === 0 ? (
              <span className={`text-[11px] p-2 text-center ${mutedClass}`}>{lang === 'tr' ? 'Metin bulunamadı' : 'No text found'}</span>
            ) : (
              filteredBooks.map((b: any) => {
                const isSelected = b.id === selectedBookId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectBook(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-lg text-xs font-bold text-left transition-all truncate ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isLightTheme
                        ? 'hover:bg-stone-100 text-stone-800'
                        : 'hover:bg-zinc-900 text-zinc-200'
                    }`}
                  >
                    {b.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : b.title}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecallQuizPage({
  books,
  aiStatus,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme,
  onOpenSettings,
  postAi,
  showConfirm,
  showAlert,
  quizHistory,
  setQuizHistory,
  flashcards,
  setFlashcards,
  setStats
}: any) {
  const [subTab, setSubTab] = useState<'quiz-builder' | 'quiz-library' | 'flashcards' | 'flashcards-library' | 'flashcards-manager'>('quiz-builder');
  const [activeExportQuizId, setActiveExportQuizId] = useState<string | null>(null);
  const [activeExportDesteId, setActiveExportDesteId] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [editingDesteBookId, setEditingDesteBookId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const { t, lang } = useTranslation();
  
  // Quiz Builder / Active Exam States
  const [quizData, setQuizData] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exam custom options
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('Orta');
  const [quizType, setQuizType] = useState<string>('Bilgi Soruları');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Local databases loaded from localStorage
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [flashcardCount, setFlashcardCount] = useState<number>(5);
  const [flashcardTopic, setFlashcardTopic] = useState<string>('Genel');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [cardHistoryStack, setCardHistoryStack] = useState<{ cardId: string; prevStatus: string }[]>([]);
  const [isFlashcardFocusMode, setIsFlashcardFocusMode] = useState<boolean>(false);
  const [flashcardSearch, setFlashcardSearch] = useState<string>('');
  const [flashcardManagerTab, setFlashcardManagerTab] = useState<'more' | 'none'>('more');

  // Load selectedBookId to the first book if available and not set
  useEffect(() => {
    if (books.length > 0 && !selectedBookId) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBookId]);

  const handleSaveEditedQuiz = (updatedQuestions: any[]) => {
    if (!editingQuiz) return;
    const updated = savedQuizzes.map(q => {
      if (q.id === editingQuiz.id) {
        return { ...q, questions: updatedQuestions, questionCount: updatedQuestions.length };
      }
      return q;
    });
    setSavedQuizzes(updated);
    localStorage.setItem('velox_saved_quizzes', JSON.stringify(updated));
    setEditingQuiz(null);
  };

  const handleSaveEditedDeste = (updatedCards: any[]) => {
    if (!editingDesteBookId) return;
    // Keep cards from other books, replace the ones for this book
    const filteredOut = flashcards.filter(c => c.bookId !== editingDesteBookId);
    const merged = [...filteredOut, ...updatedCards];
    saveFlashcards(merged);
    setEditingDesteBookId(null);
  };

  // Load databases on mount
  useEffect(() => {
    const saved = localStorage.getItem('velox_saved_quizzes');
    let hasSavedData = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedQuizzes(parsed);
          hasSavedData = true;
        }
      } catch (e) {}
    }
    if (!hasSavedData) {
      // Load sample quizzes
      const sampleQuizzes = [
        {
          id: "sample-quiz-1",
          bookId: "sample-welcome",
          bookTitle: "Velox okuma rehberi",
          createdAt: new Date().toLocaleString('tr-TR'),
          questionCount: 3,
          difficulty: "Orta",
          type: "Bilgi Soruları",
          difficultyRating: 72,
          questions: [
            {
              question: "Velox uygulamasındaki ORP (Optimal Tanıma Noktası) özelliğinin temel işlevi nedir?",
              options: [
                "Okuma hızını otomatik olarak her paragraf sonunda yarıya indirmek.",
                "Kelimenin ortasındaki odak harfini kırmızı işaretleyerek gözün kelimeyi saniyeler içinde kavramasını sağlamak.",
                "Yabancı kelimelerin Türkçe anlamlarını ve eş anlamlılarını otomatik olarak bulmak.",
                "Metindeki noktalama işaretlerini analiz ederek doğal duraklamalar eklemek."
              ],
              correctOptionIndex: 1,
              explanation: "Metinde ORP özelliğinin kelimenin ortasındaki odak harfini kırmızıyla işaretleyerek gözün kelimeyi saniyeler içinde kavramasını sağladığı ve kelime aramalarını sıfırladığı belirtilmiştir."
            },
            {
              question: "Akıllı Duraklama Sistemi'ne göre, okuyucu bir paragraf sonuna geldiğinde ne kadarlık bir otomatik bekleme süresi eklenir?",
              options: [
                "100 ms",
                "300 ms",
                "Sistem, kullanıcının WPM değerine göre dinamik bekleme ekler.",
                "Sadece kelime uzunluğuna göre bekleme ekler."
              ],
              correctOptionIndex: 2,
              explanation: "Akıllı duraklama sistemi, kullanıcının ayarladığı okuma hızına (WPM) bağlı olarak paragraf ve cümle sonlarında gözün dinlenmesi için dinamik duraklamalar yapar."
            },
            {
              question: "Hızlı Okuma tekniklerinde 'alt seslendirme' (subvocalization) alışkanlığını kırmak için hangi yöntem önerilir?",
              options: [
                "Kelimeleri yüksek sesle tekrar etmek.",
                "Kelimeleri tek tek heceleyerek okumak.",
                "Görsel odaklanma (ORP) ve ritmik kaydırma ile kelimeleri seslendirmeden doğrudan zihinde anlamlandırmak.",
                "Metinleri geriye doğru okumak."
              ],
              correctOptionIndex: 2,
              explanation: "Görsel odaklanma ve ritmik okuma hızı, iç seslendirmeyi (subvocalization) baskılayarak kelimeleri doğrudan zihninizde resim gibi algılamanıza yardımcı olur."
            }
          ]
        }
      ];
      setSavedQuizzes(sampleQuizzes);
      localStorage.setItem('velox_saved_quizzes', JSON.stringify(sampleQuizzes));
    }

    const history = localStorage.getItem('velox_quiz_history');
    let hasHistoryData = false;
    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuizHistory(parsed);
          hasHistoryData = true;
        }
      } catch (e) {}
    }
    if (!hasHistoryData) {
      // Load sample history
      const sampleHistory = [
        {
          id: "sample-history-1",
          bookTitle: "Velox okuma rehberi",
          date: new Date().toLocaleString('tr-TR'),
          correctCount: 3,
          wrongCount: 0,
          emptyCount: 0,
          totalQuestions: 3,
          difficulty: "Orta",
          score: 100
        },
        {
          id: "sample-history-2",
          bookTitle: "Yapay Zeka Okuması",
          date: new Date(Date.now() - 86400000).toLocaleString('tr-TR'),
          correctCount: 4,
          wrongCount: 1,
          emptyCount: 0,
          totalQuestions: 5,
          difficulty: "Kolay",
          score: 80
        }
      ];
      setQuizHistory(sampleHistory);
      localStorage.setItem('velox_quiz_history', JSON.stringify(sampleHistory));
    }

    const cards = localStorage.getItem('velox_flashcards');
    let hasCardsData = false;
    if (cards) {
      try {
        const parsed = JSON.parse(cards);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFlashcards(parsed);
          hasCardsData = true;
        }
      } catch (e) {}
    }
    if (!hasCardsData) {
      // Load sample flashcards
      const sampleFlashcards = [
        {
          id: "sample-card-1",
          bookId: "sample-welcome",
          bookTitle: "Velox okuma rehberi",
          front: "Optimal Tanıma Noktası (ORP) Nedir?",
          back: "Gözün bir kelimeyi en hızlı şekilde tanıması için odaklanması gereken, kelimenin ortasındaki kırmızı ile işaretlenen harf konumudur.",
          status: "more"
        },
        {
          id: "sample-card-2",
          bookId: "sample-welcome",
          bookTitle: "Velox okuma rehberi",
          front: "İç Seslendirme (Subvocalization) Okuma Hızını Nasıl Etkiler?",
          back: "Okuma hızını konuşma hızına (dakikada ~150-200 kelime) sınırlar. Bu alışkanlığı kırmak hızlı okumanın anahtarıdır.",
          status: "normal"
        },
        {
          id: "sample-card-3",
          bookId: "sample-welcome",
          bookTitle: "Velox okuma rehberi",
          front: "Feynman Tekniği ile Öğrenme Adımları Nelerdir?",
          back: "1. Konuyu seç. 2. Basitçe açıkla. 3. Boşlukları tespit et ve kaynağa dön. 4. Benzetmelerle basitleştir.",
          status: "more"
        }
      ];
      setFlashcards(sampleFlashcards);
      localStorage.setItem('velox_flashcards', JSON.stringify(sampleFlashcards));
    }
  }, []);

  // Sync databases helper
  const saveSavedQuizzes = (updated: any[]) => {
    setSavedQuizzes(updated);
    localStorage.setItem('velox_saved_quizzes', JSON.stringify(updated));
  };

  const saveFlashcards = (updated: any[]) => {
    setFlashcards(updated);
    localStorage.setItem('velox_flashcards', JSON.stringify(updated));
  };

  // Load active exam progress when selectedBookId changes
  useEffect(() => {
    if (!selectedBookId) {
      setQuizData(null);
      setUserAnswers({});
      setIsFinished(false);
      return;
    }

    const savedQuiz = localStorage.getItem(`velox_quiz_data_${selectedBookId}`);
    if (savedQuiz) {
      try { setQuizData(JSON.parse(savedQuiz)); } catch (e) { setQuizData(null); }
    } else {
      setQuizData(null);
    }

    const savedAnswers = localStorage.getItem(`velox_quiz_answers_${selectedBookId}`);
    if (savedAnswers) {
      try { setUserAnswers(JSON.parse(savedAnswers)); } catch (e) { setUserAnswers({}); }
    } else {
      setUserAnswers({});
    }

    const savedFinished = localStorage.getItem(`velox_quiz_finished_${selectedBookId}`);
    setIsFinished(savedFinished === 'true');
    setError(null);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  }, [selectedBookId]);

  // Escape key for focus modes exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
        setIsFlashcardFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedBook = books.find((b: any) => b.id === selectedBookId);

  // Generate new quiz via Gemini AI
  const handleGenerateQuiz = async () => {
    if (!selectedBook) return;
    setIsBusy(true);
    setError(null);
    setIsFinished(false);
    setUserAnswers({});
    localStorage.removeItem(`velox_quiz_answers_${selectedBookId}`);
    localStorage.removeItem(`velox_quiz_finished_${selectedBookId}`);

    const finalTopic = quizType === 'Özel Tarz' ? customInstructions : quizType;

    try {
      const data = await postAi('/api/ai/comprehension', {
        text: selectedBook.content,
        title: selectedBook.title,
        questionCount,
        difficulty,
        topic: finalTopic
      });
      if (data && data.questions) {
        localStorage.setItem(`velox_quiz_data_${selectedBookId}`, JSON.stringify(data));
        setQuizData(data);

        // Also save this quiz to saved quizzes database
        const newQuizEntry = {
          id: Date.now().toString(),
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          createdAt: new Date().toLocaleString('tr-TR'),
          questionCount: data.questions.length,
          difficulty: difficulty,
          type: quizType,
          questions: data.questions,
          difficultyRating: data.difficultyRating
        };
        saveSavedQuizzes([newQuizEntry, ...savedQuizzes]);
      }
    } catch (err: any) {
      setError(err.message || 'Kavrama sınavı üretilemedi.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isFinished) return;
    const updated = { ...userAnswers, [questionIndex]: optionIndex };
    setUserAnswers(updated);
    localStorage.setItem(`velox_quiz_answers_${selectedBookId}`, JSON.stringify(updated));
  };

  const handleFinishQuiz = () => {
    if (!quizData) return;
    setIsFinished(true);
    localStorage.setItem(`velox_quiz_finished_${selectedBookId}`, 'true');

    // Calculate score
    let correct = 0;
    let wrong = 0;
    let empty = 0;
    const total = quizData.questions.length;

    quizData.questions.forEach((q: any, idx: number) => {
      const ans = userAnswers[idx];
      if (ans === undefined) {
        empty += 1;
      } else if (ans === q.correctOptionIndex) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Add entry to history
    const historyEntry = {
      id: Date.now().toString(),
      bookTitle: selectedBook.title,
      date: new Date().toLocaleString('tr-TR'),
      correctCount: correct,
      wrongCount: wrong,
      emptyCount: empty,
      totalQuestions: total,
      difficulty: difficulty,
      score: successRate
    };

    const updatedHistory = [historyEntry, ...quizHistory];
    setQuizHistory(updatedHistory);
    localStorage.setItem('velox_quiz_history', JSON.stringify(updatedHistory));

    // Update quiz streak
    const nextStats = StorageService.logQuizSession();
    setStats(nextStats);

    setShowResultModal(true);
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setIsFinished(false);
    localStorage.removeItem(`velox_quiz_answers_${selectedBookId}`);
    localStorage.removeItem(`velox_quiz_finished_${selectedBookId}`);
  };

  const handleDeleteSavedQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm('Bu sınavı kütüphaneden kalıcı olarak silmek istiyor musunuz?', () => {
      const updated = savedQuizzes.filter(q => q.id !== id);
      saveSavedQuizzes(updated);
    }, 'Sınavı Sil');
  };

  const handleLoadSavedQuiz = (quiz: any) => {
    localStorage.setItem(`velox_quiz_data_${quiz.bookId}`, JSON.stringify({
      questions: quiz.questions,
      difficultyRating: quiz.difficultyRating
    }));
    localStorage.removeItem(`velox_quiz_answers_${quiz.bookId}`);
    localStorage.removeItem(`velox_quiz_finished_${quiz.bookId}`);
    
    setSelectedBookId(quiz.bookId);
    setQuizData({
      questions: quiz.questions,
      difficultyRating: quiz.difficultyRating
    });
    setUserAnswers({});
    setIsFinished(false);
    setSubTab('quiz-builder');
  };

  const handleClearHistory = () => {
    showConfirm(t('quiz_clear_confirm'), () => {
      setQuizHistory([]);
      localStorage.removeItem('velox_quiz_history');
    }, t('quiz_clear_confirm_title'));
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quizHistory.filter(item => item.id !== id);
    setQuizHistory(updated);
    localStorage.setItem('velox_quiz_history', JSON.stringify(updated));
  };

  // Exporters
  const handleExportFile = (quiz: any, format: 'txt' | 'md' | 'html' | 'doc') => {
    let content = '';
    let mimeType = 'text/plain;charset=utf-8';
    let fileExtension = 'txt';

    if (format === 'txt') {
      content = `SINAV: ${quiz.bookTitle}\nSoru Sayısı: ${quiz.questions.length} | Zorluk: ${quiz.difficulty || 'N/A'}\n\n`;
      quiz.questions.forEach((q: any, idx: number) => {
        content += `${idx + 1}. ${q.question}\n`;
        q.options.forEach((opt: string, oIdx: number) => {
          content += `  ${String.fromCharCode(65 + oIdx)}) ${opt}\n`;
        });
        content += `\n`;
      });
    } else if (format === 'md') {
      fileExtension = 'md';
      content = `# Sınav: ${quiz.bookTitle}\n**Soru Sayısı:** ${quiz.questions.length} | **Zorluk:** ${quiz.difficulty || 'N/A'}\n\n---\n\n`;
      quiz.questions.forEach((q: any, idx: number) => {
        content += `### ${idx + 1}. ${q.question}\n`;
        q.options.forEach((opt: string, oIdx: number) => {
          content += `- [ ] **${String.fromCharCode(65 + oIdx)})** ${opt}\n`;
        });
        content += `\n`;
      });
    } else if (format === 'html' || format === 'doc') {
      fileExtension = format === 'html' ? 'html' : 'doc';
      mimeType = format === 'html' ? 'text/html;charset=utf-8' : 'application/msword;charset=utf-8';
      content = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 10px; color: #4f46e5; }
            .question { margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
            .options { list-style: none; padding-left: 0; }
            .option { padding: 8px 12px; border: 1px solid #d1d5db; margin-top: 6px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Sınav: ${quiz.bookTitle}</h1>
          <p><strong>Soru Sayısı:</strong> ${quiz.questions.length} | <strong>Zorluk Seviyesi:</strong> ${quiz.difficulty || 'N/A'}</p>
          <hr/>
      `;
      quiz.questions.forEach((q: any, idx: number) => {
        content += `
          <div class="question">
            <h3>${idx + 1}. ${q.question}</h3>
            <ul class="options">
        `;
        q.options.forEach((opt: string, oIdx: number) => {
          content += `<li class="option"><strong>${String.fromCharCode(65 + oIdx)})</strong> ${opt}</li>`;
        });
        content += `
            </ul>
          </div>
        `;
      });
      content += `</body></html>`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.bookTitle.replace(/\s+/g, '_')}_quiz.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = (quiz: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let html = `
      <html>
      <head>
        <title>Sınav: ${quiz.bookTitle}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { border-bottom: 2px solid #000; padding-bottom: 10px; color: #000; }
          .question { margin-bottom: 30px; page-break-inside: avoid; }
          .options { list-style: none; padding-left: 0; }
          .option { padding: 6px 12px; border: 1px solid #ccc; margin-top: 6px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>Sınav: ${quiz.bookTitle}</h1>
        <p><strong>Soru Sayısı:</strong> ${quiz.questions.length}</p>
        <hr/>
    `;
    quiz.questions.forEach((q: any, idx: number) => {
      html += `
        <div class="question">
          <h3>${idx + 1}. ${q.question}</h3>
          <ul class="options">
      `;
      q.options.forEach((opt: string, oIdx: number) => {
        html += `<li class="option"><strong>${String.fromCharCode(65 + oIdx)})</strong> ${opt}</li>`;
      });
      html += `
          </ul>
        </div>
      `;
    });
    html += `
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportAnswerKey = (quiz: any) => {
    let content = `SINAV CEVAP ANAHTARI: ${quiz.bookTitle}\n\n`;
    quiz.questions.forEach((q: any, idx: number) => {
      content += `${idx + 1}. Soru Doğru Cevap: ${String.fromCharCode(65 + q.correctOptionIndex)}\n`;
      content += `   Açıklama: ${q.explanation}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.bookTitle.replace(/\s+/g, '_')}_cevap_anahtari.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate Flashcards
  const handleGenerateFlashcards = async () => {
    if (!selectedBook) return;
    setIsBusy(true);
    setError(null);
    try {
      const topicText = flashcardTopic === 'Özel' ? customTopic : flashcardTopic;
      const data = await postAi('/api/ai/flashcards', {
        text: selectedBook.content,
        title: selectedBook.title,
        count: flashcardCount,
        topic: topicText
      });

      if (data && data.flashcards) {
        const newCards = data.flashcards.map((c: any) => ({
          id: `${Date.now()}-\n${Math.random().toString(36).substr(2, 9)}`,
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          front: c.front,
          back: c.back,
          status: 'normal'
        }));

        const updated = [...newCards, ...flashcards];
        saveFlashcards(updated);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
      }
    } catch (err: any) {
      setError(err.message || 'Bilgi kartları üretilemedi.');
    } finally {
      setIsBusy(false);
    }
  };

  // Card status modification
  const handleUpdateCardStatus = (cardId: string, newStatus: 'normal' | 'more' | 'none') => {
    const cardIndex = flashcards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const prevStatus = flashcards[cardIndex].status || 'normal';
    const updated = [...flashcards];
    updated[cardIndex] = { 
      ...updated[cardIndex], 
      status: newStatus,
      reviewsCount: (updated[cardIndex].reviewsCount || 0) + 1,
      lastReviewed: new Date().toLocaleDateString('tr-TR')
    };
    saveFlashcards(updated);

    // Update card streak
    const nextStats = StorageService.logCardSession();
    setStats(nextStats);

    // Keep history stack for Undo
    setCardHistoryStack([{ cardId, prevStatus }, ...cardHistoryStack].slice(0, 10));

    // Next Card Auto-trigger
    const bookCards = updated.filter(c => c.bookId === selectedBookId);
    if (currentCardIndex < bookCards.length - 1) {
      setTimeout(() => {
        setIsCardFlipped(false);
        setCurrentCardIndex(currentCardIndex + 1);
      }, 300);
    }
  };

  // Undo Last Card Action
  const handleUndoCardAction = () => {
    if (cardHistoryStack.length === 0) return;
    const [{ cardId, prevStatus }, ...rest] = cardHistoryStack;

    const updated = [...flashcards];
    const index = updated.findIndex(c => c.id === cardId);
    if (index !== -1) {
      updated[index] = { ...updated[index], status: prevStatus };
      saveFlashcards(updated);
    }
    setCardHistoryStack(rest);
  };

  // Delete individual flashcard
  const handleDeleteFlashcard = (id: string) => {
    const updated = flashcards.filter(c => c.id !== id);
    saveFlashcards(updated);
  };

  const handleExportFlashcards = (bookId: string, format: 'txt' | 'md' | 'html' | 'doc') => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const bookCards = flashcards.filter(c => c.bookId === bookId);
    let exportContent = '';
    let mimeType = 'text/plain;charset=utf-8';
    let fileExtension = 'txt';

    if (format === 'txt') {
      exportContent = `BİLGİ KARTLARI: ${book.title}\nToplam Kart: ${bookCards.length}\n\n`;
      bookCards.forEach((c: any, idx: number) => {
        exportContent += `${idx + 1}. KART\nÖn Yüz:\n${c.front}\n\nArka Yüz:\n${c.back}\n\n--------------------\n\n`;
      });
    } else if (format === 'md') {
      fileExtension = 'md';
      exportContent = `# Bilgi Kartları: ${book.title}\n**Toplam Kart:** ${bookCards.length}\n\n---\n\n`;
      bookCards.forEach((c: any, idx: number) => {
        exportContent += `### Kart ${idx + 1}\n\n**Ön Yüz (Soru/Kavram):**\n${c.front}\n\n**Arka Yüz (Açıklama/Cevap):**\n${c.back}\n\n---\n\n`;
      });
    } else if (format === 'html' || format === 'doc') {
      fileExtension = format === 'html' ? 'html' : 'doc';
      mimeType = format === 'html' ? 'text/html;charset=utf-8' : 'application/msword;charset=utf-8';
      exportContent = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 10px; color: #4f46e5; }
            .card-item { margin-bottom: 20px; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
            .face-title { font-weight: bold; color: #4f46e5; margin-bottom: 4px; display: block; }
          </style>
        </head>
        <body>
          <h1>Bilgi Kartları: ${book.title}</h1>
          <p><strong>Toplam Kart Sayısı:</strong> ${bookCards.length}</p>
          <hr/>
      `;
      bookCards.forEach((c: any, idx: number) => {
        exportContent += `
          <div class="card-item">
            <h3>Kart ${idx + 1}</h3>
            <p><span class="face-title">Ön Yüz (Soru/Terim):</span> ${c.front}</p>
            <p><span class="face-title">Arka Yüz (Cevap/Açıklama):</span> ${c.back}</p>
          </div>
        `;
      });
      exportContent += `</body></html>`;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\\s+/g, '_')}_bilgi_kartlari.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Computed views
  const bookFlashcards = useMemo(() => {
    return flashcards.filter(c => c.bookId === selectedBookId);
  }, [flashcards, selectedBookId]);

  const activeCard = bookFlashcards[currentCardIndex];

  const filteredManagerCards = useMemo(() => {
    return flashcards.filter(c => {
      if (c.status !== flashcardManagerTab) return false;
      if (!flashcardSearch.trim()) return true;
      const term = flashcardSearch.toLowerCase();
      return (
        c.front.toLowerCase().includes(term) ||
        c.back.toLowerCase().includes(term) ||
        c.bookTitle.toLowerCase().includes(term)
      );
    });
  }, [flashcards, flashcardManagerTab, flashcardSearch]);

  // Quiz Results calculations
  let correctCount = 0;
  let wrongCount = 0;
  let emptyCount = 0;
  let totalQuestions = 0;
  if (quizData && quizData.questions) {
    totalQuestions = quizData.questions.length;
    quizData.questions.forEach((q: any, idx: number) => {
      const ans = userAnswers[idx];
      if (ans === undefined) {
        emptyCount += 1;
      } else if (ans === q.correctOptionIndex) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });
  }
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const quizMainContent = (
    <div className={`flex flex-col gap-5 ${isFocusMode ? 'max-w-3xl w-full mx-auto' : ''}`}>
      {/* Active Exam Header */}
      <div className="flex justify-between items-start gap-4 border-b border-stone-200 dark:border-zinc-800/60 pb-4">
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>
            {selectedBook?.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : selectedBook?.title} - {lang === 'tr' ? 'Kavrama Sınavı' : 'Comprehension Quiz'}
          </h3>
          <p className={`text-xs mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Yapay zeka tarafından üretilen spaced-repetition hatırlama testi.' : 'Spaced-repetition recall test generated by AI.'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            title={isFocusMode ? (lang === 'tr' ? 'Odak Modundan Çık' : 'Exit Focus Mode') : (lang === 'tr' ? 'Odak Moduna Geç' : 'Enter Focus Mode')}
            className={`p-2 rounded-xl border transition-all ${isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              showConfirm(lang === 'tr' ? 'Mevcut aktif sınavı kapatmak ve sıfırlamak istiyor musunuz?' : 'Do you want to close and reset the current active exam?', () => {
                setQuizData(null);
                setUserAnswers({});
                setIsFinished(false);
                localStorage.removeItem(`velox_quiz_data_${selectedBookId}`);
                localStorage.removeItem(`velox_quiz_answers_${selectedBookId}`);
                localStorage.removeItem(`velox_quiz_finished_${selectedBookId}`);
              }, lang === 'tr' ? 'Sınavı Kapat' : 'Close Exam');
            }}
            title={lang === 'tr' ? 'Sınavı Kapat' : 'Close Exam'}
            className={`p-2 rounded-xl border transition-all ${isLightTheme ? 'border-stone-250 bg-white text-rose-600 hover:bg-rose-50/50' : 'border-zinc-800 bg-transparent text-rose-500 hover:bg-rose-500/10'}`}
          >
            <X className="w-4 h-4" />
          </button>
          {quizData && isFinished && (
            <button
              onClick={handleResetQuiz}
              className="h-9 px-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Tekrar Çöz' : 'Solve Again'}
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Body */}
      {isBusy ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className={`text-xs ${mutedClass}`}>{lang === 'tr' ? 'Yapay Zeka Soruları Hazırlanıyor...' : 'Preparing AI Questions...'}</p>
        </div>
      ) : quizData ? (
        <div className="flex flex-col gap-6">
          {/* Difficulty rating badge */}
          {quizData.difficultyRating && (
            <div className="flex items-center gap-2 text-xs">
              <span className={mutedClass}>{lang === 'tr' ? 'Metin Kavrama Puanı:' : 'Text Comprehension Score:'}</span>
              <span className="font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">{quizData.difficultyRating} / 100</span>
            </div>
          )}

          {/* Questions */}
          {quizData.questions && quizData.questions.map((q: any, qIdx: number) => {
            const selectedOpt = userAnswers[qIdx];
            const isAnswered = selectedOpt !== undefined;

            return (
              <div key={qIdx} className="rounded-2xl border border-stone-200 dark:border-zinc-800 p-5 flex flex-col gap-4">
                <h4 className={`text-sm font-black leading-relaxed ${titleClass}`}>
                  {qIdx + 1}. {q.question}
                </h4>
                
                {/* Options */}
                <div className="grid grid-cols-1 gap-2.5">
                  {q.options && q.options.map((opt: string, oIdx: number) => {
                    const isSelected = selectedOpt === oIdx;
                    const isCorrect = q.correctOptionIndex === oIdx;
                    
                    let optStyle = isLightTheme 
                      ? 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-850' 
                      : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-350';
                    
                    if (isFinished) {
                      if (isCorrect) {
                        optStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold cursor-default';
                      } else if (isSelected) {
                        optStyle = 'border-rose-500/40 bg-rose-500/10 text-rose-500 font-bold cursor-default';
                      } else {
                        optStyle = 'border-stone-200 dark:border-zinc-850 opacity-40 cursor-default';
                      }
                    } else if (isSelected) {
                      optStyle = 'border-indigo-500 bg-indigo-600/10 text-indigo-500 font-bold ring-1 ring-indigo-500';
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={isFinished}
                        onClick={() => handleSelectOption(qIdx, oIdx)}
                        className={`w-full py-3 px-4 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {isFinished && isCorrect && <span className="text-emerald-500 font-extrabold text-[10px] uppercase">{lang === 'tr' ? 'Doğru' : 'Correct'}</span>}
                        {isFinished && isSelected && !isCorrect && <span className="text-rose-500 font-extrabold text-[10px] uppercase">{lang === 'tr' ? 'Yanlış' : 'Incorrect'}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {isFinished && q.explanation && (
                  <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-zinc-900/60 border border-stone-200/50 dark:border-zinc-850/50 text-[11px] leading-relaxed opacity-90">
                    <span className="font-bold text-indigo-500 block mb-1">{lang === 'tr' ? '💡 Açıklama:' : '💡 Explanation:'}</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-stone-200 dark:border-zinc-800/60 pt-4">
            {!isFinished ? (
              <button
                onClick={handleFinishQuiz}
                className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
              >
                {lang === 'tr' ? 'Sınavı Bitir' : 'Finish Quiz'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowResultModal(true)}
                  className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-xs font-black transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> {lang === 'tr' ? 'Sonuçları Göster' : 'Show Results'}
                </button>
                <button
                  onClick={handleResetQuiz}
                  className={`h-10 px-5 rounded-xl border text-xs font-bold transition-all ${isLightTheme ? 'border-stone-250 bg-white hover:bg-stone-50 text-stone-700' : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50 text-zinc-300'}`}
                >
                  {lang === 'tr' ? 'Sınavı Yeniden Başlat' : 'Restart Quiz'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
            <Brain className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h4 className={`text-base font-black ${titleClass}`}>{lang === 'tr' ? 'Henüz Sınav Tasarlanmadı' : 'No Exam Designed Yet'}</h4>
            <p className={`text-xs mt-1.5 max-w-sm leading-relaxed ${mutedClass}`}>
              {lang === 'tr' ? 'Sol paneldeki kriterlerinizi belirleyin ve ilk yapay zeka sınavınızı tasarlayın!' : 'Determine your criteria in the left panel and design your first AI exam!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const totalSolved = useMemo(() => {
    let count = 0;
    books.forEach((b: any) => {
      if (localStorage.getItem(`velox_quiz_finished_${b.id}`) === 'true') {
        count += 1;
      }
    });
    return count;
  }, [books, quizHistory]);

  const solvedPercentage = books.length > 0 ? Math.round((totalSolved / books.length) * 100) : 0;

  if (!aiStatus.enabled) {
    return <AiDisabledCard onOpenSettings={onOpenSettings} surfaceClass={surfaceClass} mutedClass={mutedClass} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border-radius: 1.5rem;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
      {/* Top Professional Pill Nav Menu */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-zinc-900 pb-4">
        {[
          { id: 'quiz-builder', label: lang === 'tr' ? 'Ölçme ve Değerlendirme' : 'Evaluation & Assessment', icon: FileQuestion },
          { id: 'quiz-library', label: lang === 'tr' ? 'Sınav Kütüphanesi' : 'Quiz Library', icon: Layers },
          { id: 'flashcards', label: lang === 'tr' ? 'Akıllı Bilgi Kartları' : 'Smart Flashcards', icon: Bookmark },
          { id: 'flashcards-library', label: lang === 'tr' ? 'Kart Kütüphanesi' : 'Card Library', icon: LibraryBig },
          { id: 'flashcards-manager', label: lang === 'tr' ? 'Hafıza Laboratuvarı' : 'Memory Lab', icon: ListPlus }
        ].map((tab) => {
          const isActive = subTab === tab.id;
          const IconComp = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                  : isLightTheme
                  ? 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  : 'border-zinc-850 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'quiz-builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel options */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass}`}>
              <label className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'METİN SEÇİN' : 'SELECT TEXT'}</label>
              {books.length === 0 ? (
                <p className="text-xs mt-2 opacity-60">{lang === 'tr' ? 'Kütüphanede hiç belge bulunmuyor.' : 'No documents in the library.'}</p>
              ) : (
                <SearchableBookSelect
                  books={books}
                  selectedBookId={selectedBookId}
                  onSelectBook={setSelectedBookId}
                  isLightTheme={isLightTheme}
                  surfaceClass={surfaceClass}
                  mutedClass={mutedClass}
                  titleClass={titleClass}
                />
              )}
            </div>

            {/* Custom parameters */}
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'SINAV HEDEFLERİ' : 'EXAM GOALS'}</span>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Soru Sayısı' : 'Number of Questions'}</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value)))}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Zorluk Seviyesi' : 'Difficulty Level'}</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                >
                  <option value="Kolay">{lang === 'tr' ? 'Kolay' : 'Easy'}</option>
                  <option value="Orta">{lang === 'tr' ? 'Orta' : 'Medium'}</option>
                  <option value="Zor">{lang === 'tr' ? 'Zor' : 'Hard'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Sınav Tarzı & Şablonu' : 'Exam Style & Template'}</label>
                <select
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                >
                  <option value="Bilgi Soruları">{lang === 'tr' ? 'Bilgi Soruları (Olgu ve Kavramlar)' : 'Knowledge Questions (Fact and Concepts)'}</option>
                  <option value="Yorum Soruları">{lang === 'tr' ? 'Yorum Soruları (Analiz ve Çıkarım)' : 'Interpretation Questions (Analysis and Inference)'}</option>
                  <option value="Teknik Terimler">{lang === 'tr' ? 'Teknik Terimler (Tanım ve Glosaryum)' : 'Technical Terms (Definitions and Glossary)'}</option>
                  <option value="Özel Tarz">{lang === 'tr' ? 'Kişiselleştirilmiş Yapay Zeka Komutu' : 'Custom AI Command'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Özel Yönlendirme (İsteğe Bağlı)' : 'Custom Instructions (Optional)'}</label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={lang === 'tr' ? 'Örn: Metindeki temel kavramları ask, ana fikre odaklan veya sadece belirli bölümlere yönelik sorular üret...' : 'E.g., ask key concepts in the text, focus on the main idea, or generate questions only for specific sections...'}
                  className={`w-full h-20 p-2.5 rounded-xl border text-xs leading-relaxed resize-none focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-850 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={isBusy}
                className="h-10 w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
              >
                {isBusy ? (lang === 'tr' ? 'Sınav Hazırlanıyor...' : 'Preparing Exam...') : (lang === 'tr' ? 'Yapay Zeka Sınavı Tasarla' : 'Design AI Exam')}
              </button>
            </div>
          </div>

          {/* Right main area */}
          <div className="lg:col-span-2">
            {selectedBook ? (
              <div className={`p-6 rounded-3xl border ${surfaceClass}`}>
                {quizMainContent}
              </div>
            ) : (
              <EmptyState text="Sınav görüntülemek için lütfen bir belge seçin veya ekleyin." />
            )}
          </div>
        </div>
      )}

      {subTab === 'quiz-library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Quizzes Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass}`}>
              <h3 className={`text-base font-black ${titleClass} mb-4`}>{lang === 'tr' ? 'Kayıtlı Sınavlar' : 'Saved Quizzes'} ({savedQuizzes.length})</h3>
              {savedQuizzes.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs opacity-60">{lang === 'tr' ? 'Kütüphanede kayıtlı sınav bulunmuyor.' : 'No quizzes saved in the library.'}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {savedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className={`p-4 rounded-2xl border flex flex-col gap-3 relative ${
                        isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className={`text-sm font-black ${titleClass}`}>
                            {quiz.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : quiz.bookTitle}
                          </h4>
                          <span className={`text-[10px] block mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Oluşturulma:' : 'Created:'} {quiz.createdAt}</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                          {(lang === 'tr' ? `${quiz.questionCount} Soru` : `${quiz.questionCount} ${quiz.questionCount === 1 ? 'Question' : 'Questions'}`) + ' | ' + (lang === 'tr' ? quiz.difficulty : (quiz.difficulty === 'Kolay' ? 'Easy' : quiz.difficulty === 'Orta' ? 'Medium' : 'Hard'))}
                        </span>
                      </div>

                      {/* Exporters and solvers */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/50 dark:border-zinc-800/50 pt-3">
                        <div className="flex flex-wrap gap-1.5 items-center relative">
                          {/* Floating Export Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveExportQuizId(activeExportQuizId === quiz.id ? null : quiz.id)}
                              className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1 transition-all ${
                                isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-850 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Dışa Aktar' : 'Export'}
                            </button>

                            {activeExportQuizId === quiz.id && (
                              <div className={`absolute left-0 bottom-9 z-40 rounded-xl border p-1 w-40 shadow-xl flex flex-col gap-0.5 ${
                                isLightTheme ? 'border-stone-200 bg-white' : 'border-zinc-850 bg-zinc-950'
                              }`}>
                                {[
                                  { format: 'txt', label: lang === 'tr' ? 'TXT Dosyası (.txt)' : 'TXT File (.txt)' },
                                  { format: 'md', label: 'Markdown (.md)' },
                                  { format: 'html', label: lang === 'tr' ? 'HTML Sayfası (.html)' : 'HTML Page (.html)' },
                                  { format: 'doc', label: lang === 'tr' ? 'Word Belgesi (.doc)' : 'Word Document (.doc)' }
                                ].map((opt) => (
                                  <button
                                    key={opt.format}
                                    onClick={() => {
                                      handleExportFile(quiz, opt.format as any);
                                      setActiveExportQuizId(null);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition-colors ${
                                      isLightTheme ? 'hover:bg-stone-100 text-stone-700' : 'hover:bg-zinc-900 text-zinc-300'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handlePrintPdf(quiz)}
                            className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1 ${
                              isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-850 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                            }`}
                          >
                            {lang === 'tr' ? 'Yazdır / PDF' : 'Print / PDF'}
                          </button>

                          <button
                            onClick={() => handleExportAnswerKey(quiz)}
                            className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black hover:bg-emerald-500/20 flex items-center gap-1"
                          >
                            {lang === 'tr' ? 'Cevap Anahtarı' : 'Answer Key'}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingQuiz(quiz)}
                            className={`h-8 w-8 rounded-lg border text-indigo-500 hover:bg-indigo-50/25 grid place-items-center transition-all ${
                              isLightTheme ? 'border-stone-250 bg-white' : 'border-zinc-800 bg-transparent'
                            }`}
                            title={lang === 'tr' ? 'Sınav Sorularını Düzenle' : 'Edit Quiz Questions'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleLoadSavedQuiz(quiz)}
                            className="h-8 px-3.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700"
                          >
                            {lang === 'tr' ? 'Sınavı Çöz' : 'Solve Quiz'}
                          </button>
                          <button
                            onClick={(e) => handleDeleteSavedQuiz(quiz.id, e)}
                            className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 grid place-items-center hover:bg-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sınav Sonucu Geçmişi */}
          <div className="flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-3`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'SINAV SONUCU GEÇMİŞİ' : 'QUIZ SCORE HISTORY'}</span>
                {quizHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] text-rose-500 hover:underline font-bold"
                  >
                    {lang === 'tr' ? 'Temizle' : 'Clear'}
                  </button>
                )}
              </div>
              {quizHistory.length === 0 ? (
                <p className="text-xs opacity-60 py-2">{lang === 'tr' ? 'Henüz girilmiş sınav sonucu bulunmuyor.' : 'No quiz score logs found yet.'}</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto custom-note-scrollbar pr-1">
                  {quizHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 relative group ${
                        isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-start pr-5">
                        <span className={`text-xs font-black truncate max-w-[140px] ${titleClass}`}>
                          {item.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : item.bookTitle}
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-500">%{item.score}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] opacity-60">
                        <span>{item.date.split(' ')[0]}</span>
                        <span>
                          {lang === 'tr' ? 'D' : 'C'}: {item.correctCount} | {lang === 'tr' ? 'Y' : 'I'}: {item.wrongCount} | {lang === 'tr' ? 'Z' : 'D'}: {item.difficulty === 'Kolay' ? (lang === 'tr' ? 'Kolay' : 'Easy') : item.difficulty === 'Orta' ? (lang === 'tr' ? 'Orta' : 'Medium') : (lang === 'tr' ? 'Zor' : 'Hard')}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-600"
                        title={lang === 'tr' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'flashcards-library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Flashcard sets Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass}`}>
              <h3 className={`text-base font-black ${titleClass} mb-4`}>{t('fc_library_saved_decks' as any)} ({books.filter(b => flashcards.some(c => c.bookId === b.id)).length})</h3>
              {books.filter(b => flashcards.some(c => c.bookId === b.id)).length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs opacity-60">{t('fc_library_no_decks' as any)}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {books.filter(b => flashcards.some(c => c.bookId === b.id)).map((book) => {
                    const bookCards = flashcards.filter(c => c.bookId === book.id);
                    return (
                      <div
                        key={book.id}
                        className={`p-4 rounded-2xl border flex flex-col gap-3 relative ${
                          isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className={`text-sm font-black ${titleClass}`}>
                              {book.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : book.title}
                            </h4>
                            <span className={`text-[10px] block mt-0.5 ${mutedClass}`}>
                              {t('fc_library_total_cards' as any)}: {bookCards.length} {bookCards.length === 1 ? t('fc_library_card_singular' as any) : t('fc_library_card_plural' as any)}
                            </span>
                          </div>
                        </div>

                        {/* Exporters and solvers */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/50 dark:border-zinc-800/50 pt-3">
                          <div className="flex flex-wrap gap-1.5 items-center relative">
                            {/* Floating Export Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveExportDesteId(activeExportDesteId === book.id ? null : book.id)}
                                className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1 transition-all ${
                                  isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-850 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5" /> {t('quiz_export' as any)}
                              </button>

                              {activeExportDesteId === book.id && (
                                <div className={`absolute left-0 bottom-9 z-40 rounded-xl border p-1 w-40 shadow-xl flex flex-col gap-0.5 ${
                                  isLightTheme ? 'border-stone-200 bg-white' : 'border-zinc-850 bg-zinc-950'
                                }`}>
                                  {[
                                    { format: 'txt', label: lang === 'tr' ? 'TXT Dosyası (.txt)' : 'TXT File (.txt)' },
                                    { format: 'md', label: 'Markdown (.md)' },
                                    { format: 'html', label: lang === 'tr' ? 'HTML Sayfası (.html)' : 'HTML Page (.html)' },
                                    { format: 'doc', label: lang === 'tr' ? 'Word Belgesi (.doc)' : 'Word Document (.doc)' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.format}
                                      onClick={() => {
                                        handleExportFlashcards(book.id, opt.format as any);
                                        setActiveExportDesteId(null);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition-colors ${
                                        isLightTheme ? 'hover:bg-stone-100 text-stone-700' : 'hover:bg-zinc-900 text-zinc-300'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingDesteBookId(book.id)}
                              className={`h-8 w-8 rounded-lg border text-indigo-500 hover:bg-indigo-50/25 grid place-items-center transition-all ${
                                isLightTheme ? 'border-stone-250 bg-white' : 'border-zinc-800 bg-transparent'
                              }`}
                              title={t('fc_library_edit_tooltip' as any)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBookId(book.id);
                                setSubTab('flashcards');
                              }}
                              className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700"
                            >
                              {t('fc_library_start_study' as any)}
                            </button>
                            <button
                              onClick={() => {
                                showConfirm(t('fc_library_delete_confirm' as any), () => {
                                  const updated = flashcards.filter(c => c.bookId !== book.id);
                                  saveFlashcards(updated);
                                }, t('fc_library_delete_confirm_title' as any));
                              }}
                              className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 grid place-items-center hover:bg-rose-500/20"
                              title={t('fc_library_delete_tooltip' as any)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Flashcard Stats Column (Right Side Panel) */}
          <div className="flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <div className="border-b border-stone-200 dark:border-zinc-800/60 pb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{t('fc_library_stats_title' as any)}</span>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-xl border ${isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/15'} flex flex-col items-center text-center`}>
                  <span className={`text-[8px] font-black ${mutedClass} uppercase`}>{t('fc_library_stats_created' as any)}</span>
                  <span className="text-base font-black text-indigo-500 mt-1">{flashcards.length}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/15'} flex flex-col items-center text-center`}>
                  <span className={`text-[8px] font-black ${mutedClass} uppercase`}>{t('fc_library_stats_frequent' as any)}</span>
                  <span className="text-base font-black text-emerald-500 mt-1">{flashcards.filter(c => c.status === 'more').length}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/15'} flex flex-col items-center text-center`}>
                  <span className={`text-[8px] font-black ${mutedClass} uppercase`}>{t('fc_library_stats_hidden' as any)}</span>
                  <span className="text-base font-black text-rose-500 mt-1">{flashcards.filter(c => c.status === 'none').length}</span>
                </div>
              </div>

              {/* List of most studied cards */}
              <div className="flex flex-col gap-2 mt-2">
                <span className={`text-[9px] font-black ${mutedClass} uppercase tracking-wider`}>{t('fc_library_frequent_cards' as any)}</span>
                {flashcards.filter(c => (c.reviewsCount || 0) > 0).length === 0 ? (
                  <p className="text-[11px] opacity-60 py-2 font-bold text-center">{t('fc_library_no_frequent_cards' as any)}</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-note-scrollbar pr-1">
                    {flashcards
                      .filter(c => (c.reviewsCount || 0) > 0)
                      .sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0))
                      .slice(0, 5)
                      .map((card) => (
                        <div
                          key={card.id}
                          className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                            isLightTheme ? 'border-stone-150 bg-stone-50/50' : 'border-zinc-900/40 bg-zinc-900/10'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[11px] font-black truncate max-w-[170px] ${titleClass}`}>{card.front}</span>
                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                              {card.reviewsCount || 0} {lang === 'tr' ? 'Tekrar' : (card.reviewsCount === 1 ? 'Review' : 'Reviews')}
                            </span>
                          </div>
                          <span className="text-[9px] opacity-60 truncate">{card.bookTitle}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'flashcards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card builder panel */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass}`}>
              <label className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'METİN SEÇİN' : 'SELECT TEXT'}</label>
              {books.length === 0 ? (
                <p className="text-xs mt-2 opacity-60">{lang === 'tr' ? 'Kütüphanede hiç belge bulunmuyor.' : 'No documents in the library.'}</p>
              ) : (
                <SearchableBookSelect
                  books={books}
                  selectedBookId={selectedBookId}
                  onSelectBook={setSelectedBookId}
                  isLightTheme={isLightTheme}
                  surfaceClass={surfaceClass}
                  mutedClass={mutedClass}
                  titleClass={titleClass}
                />
              )}
            </div>

            {/* Flashcard options */}
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'BİLGİ KARTLARI AYARLARI' : 'FLASHCARD SETTINGS'}</span>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Kart Sayısı' : 'Number of Cards'}</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={flashcardCount}
                  onChange={(e) => setFlashcardCount(Math.max(1, Number(e.target.value)))}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Odak Konusu' : 'Focus Topic'}</label>
                <select
                  value={flashcardTopic}
                  onChange={(e) => setFlashcardTopic(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                >
                  <option value="Genel">{lang === 'tr' ? 'Genel Soru / Cevap' : 'General Question & Answer'}</option>
                  <option value="Tanımlar">{lang === 'tr' ? 'Tanım ve Terimler' : 'Definitions & Terms'}</option>
                  <option value="Önemli Tarihler">{lang === 'tr' ? 'Önemli Tarihler ve Olaylar' : 'Key Dates & Events'}</option>
                  <option value="Formül ve Kodlama">{lang === 'tr' ? 'Formül ve Kod Şablonları' : 'Formulas & Code Templates'}</option>
                  <option value="Özel">{lang === 'tr' ? 'Özel Konu Odaklı' : 'Custom Topic-Focused'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Özel Yönlendirme (İsteğe Bağlı)' : 'Custom Instructions (Optional)'}</label>
                <textarea
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder={lang === 'tr' ? 'Örn: En önemli kavramları, akılda kalması zor kilit bilgileri veya pratik özetleri bilgi kartı haline getirin...' : 'E.g., turn the most important concepts, hard-to-remember key facts, or practical summaries into flashcards...'}
                  className={`w-full h-20 p-2.5 rounded-xl border text-xs leading-relaxed resize-none focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-850 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <button
                onClick={handleGenerateFlashcards}
                disabled={isBusy}
                className="h-10 w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
              >
                {isBusy ? (lang === 'tr' ? 'Kartlar Hazırlanıyor...' : 'Preparing Cards...') : (lang === 'tr' ? 'Yapay Zeka ile Bilgi Kartı Üret' : 'Generate Flashcards with AI')}
              </button>
            </div>
          </div>

          {/* Card Swiper/Flipper Column */}
          <div className="lg:col-span-2">
            {selectedBook ? (
              <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
                <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3">
                  <div>
                    <h3 className={`text-base font-black ${titleClass}`}>
                      {selectedBook.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : selectedBook.title} - {lang === 'tr' ? 'Bilgi Kartları' : 'Flashcards'}
                    </h3>
                    <p className={`text-xs mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Bilgi kartları yardımıyla aktif hatırlama ve pekiştirme yapın.' : 'Practice active recall and reinforcement using flashcards.'}</p>
                  </div>
                  {bookFlashcards.length > 0 && (
                    <button
                      onClick={() => setIsFlashcardFocusMode(true)}
                      className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                      }`}
                    >
                      <Maximize2 className="w-4 h-4" /> {lang === 'tr' ? 'Odak Modu' : 'Focus Mode'}
                    </button>
                  )}
                </div>

                {isBusy ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    <p className={`text-xs ${mutedClass}`}>{lang === 'tr' ? 'Yapay Zeka Bilgi Kartları Hazırlanıyor...' : 'Preparing AI Flashcards...'}</p>
                  </div>
                ) : activeCard ? (
                  <div className="flex flex-col gap-6">
                    {/* Card container */}
                    <div className="flex justify-center py-4">
                      <div className="perspective-1000 w-full max-w-md h-72">
                        <div 
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className={`flip-card-inner cursor-pointer select-none ${isCardFlipped ? 'flipped' : ''}`}
                        >
                          {/* Front Face */}
                          <div className={`flip-card-front p-6 border text-center shadow-lg ${surfaceClass}`}>
                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg">{lang === 'tr' ? 'Ön Yüz' : 'Front Face'}</span>
                            <p className={`text-sm font-black leading-relaxed ${titleClass} mt-4`}>{activeCard.front}</p>
                            <span className={`text-[10px] mt-6 ${mutedClass}`}>{lang === 'tr' ? 'Detayları görmek için karta tıklayın' : 'Click card to see details'}</span>
                          </div>

                          {/* Back Face */}
                          <div className={`flip-card-back p-6 border text-center shadow-lg ${isLightTheme ? 'border-indigo-500/40 bg-indigo-50/50' : 'border-indigo-500/40 bg-indigo-950/20'} ${surfaceClass}`}>
                            <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{lang === 'tr' ? 'Arka Yüz (Açıklama)' : 'Back Face (Explanation)'}</span>
                            <p className={`text-xs font-semibold leading-relaxed ${titleClass} mt-4`}>{activeCard.back}</p>
                            <span className={`text-[10px] mt-6 ${mutedClass}`}>{lang === 'tr' ? 'Geri dönmek için tıklayın' : 'Click to go back'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controls row */}
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleUpdateCardStatus(activeCard.id, 'none')}
                        className="h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition-all"
                      >
                        {lang === 'tr' ? 'Tekrar Gösterme' : 'Do Not Show Again'}
                      </button>
                      <button
                        onClick={() => handleUpdateCardStatus(activeCard.id, 'normal')}
                        className={`h-10 rounded-xl border text-xs font-bold transition-all ${
                          isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        {lang === 'tr' ? 'Normal Göster' : 'Show Normal'}
                      </button>
                      <button
                        onClick={() => handleUpdateCardStatus(activeCard.id, 'more')}
                        className="h-10 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all"
                      >
                        {lang === 'tr' ? 'Daha Sık Göster' : 'Show More Often'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center border-t border-stone-200 dark:border-zinc-800/60 pt-4 px-1">
                      <button
                        disabled={currentCardIndex === 0}
                        onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex - 1); }}
                        className="text-xs font-bold opacity-60 hover:opacity-100 disabled:opacity-30"
                      >
                        {lang === 'tr' ? '← Önceki' : '← Previous'}
                      </button>
                      
                      {cardHistoryStack.length > 0 && (
                        <button
                          onClick={handleUndoCardAction}
                          className="text-xs text-indigo-500 font-bold hover:underline flex items-center gap-1"
                        >
                          <Undo className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Geri Al' : 'Undo'}
                        </button>
                      )}

                      <button
                        disabled={currentCardIndex === bookFlashcards.length - 1}
                        onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex + 1); }}
                        className="text-xs font-bold opacity-60 hover:opacity-100 disabled:opacity-30"
                      >
                        {lang === 'tr' ? 'Sonraki →' : 'Next →'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <Bookmark className="w-8 h-8 text-indigo-500 opacity-60" />
                    <p className="text-xs opacity-60">{lang === 'tr' ? 'Bu belgeye ait bilgi kartı bulunmuyor.' : 'No flashcards found for this document.'}</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text={lang === 'tr' ? 'Belge seçimi gerekli.' : 'Document selection required.'} />
            )}
          </div>
        </div>
      )}

      {subTab === 'flashcards-manager' && (
        <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 dark:border-zinc-800/60 pb-4">
            <div>
              <h3 className={`text-base font-black ${titleClass}`}>{t('fc_title')}</h3>
              <p className={`text-xs mt-1 ${mutedClass}`}>{t('fc_manager_subtitle' as any)}</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={flashcardSearch}
                onChange={(e) => setFlashcardSearch(e.target.value)}
                placeholder={t('fc_manager_search_placeholder' as any)}
                className={`w-full h-9 pl-9 pr-4 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 ${
                  isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-850 bg-zinc-950 text-zinc-100'
                }`}
              />
            </div>
          </div>

          {/* Filter sub-tab menu */}
          <div className="flex gap-2">
            <button
              onClick={() => setFlashcardManagerTab('more')}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                flashcardManagerTab === 'more'
                  ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                  : 'border border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {t('fc_manager_tab_more' as any)}
            </button>
            <button
              onClick={() => setFlashcardManagerTab('none')}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                flashcardManagerTab === 'none'
                  ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                  : 'border border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {t('fc_manager_tab_none' as any)}
            </button>
          </div>

          {/* Cards List Grid */}
          {filteredManagerCards.length === 0 ? (
            <div className="py-16 text-center text-xs opacity-60">
              {t('fc_manager_no_cards' as any)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${isLightTheme ? 'border-stone-200 text-stone-600' : 'border-zinc-800 text-zinc-400'} font-bold uppercase tracking-wider text-[10px]`}>
                    <th className="pb-3 pl-4 w-1/4">{t('fc_manager_col_book' as any)}</th>
                    <th className="pb-3 w-1/3">{t('fc_manager_col_front' as any)}</th>
                    <th className="pb-3 w-1/3">{t('fc_manager_col_back' as any)}</th>
                    <th className="pb-3 pr-4 text-right w-[100px]">{t('fc_manager_col_actions' as any)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-900">
                  {filteredManagerCards.map((card) => (
                    <tr 
                      key={card.id} 
                      className={`group hover:bg-stone-50 dark:hover:bg-zinc-900/40 transition-colors`}
                    >
                      <td className="py-4 pl-4 pr-3 font-semibold text-indigo-500 truncate max-w-[200px]">
                        {card.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : card.bookTitle}
                      </td>
                      <td className={`py-4 pr-3 font-black ${titleClass} break-words`}>
                        {card.front}
                      </td>
                      <td className="py-4 pr-3 opacity-80 break-words">
                        {card.back}
                      </td>
                      <td className="py-4 pr-4 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-3">
                          <button
                            onClick={() => handleUpdateCardStatus(card.id, 'normal')}
                            className="text-[11px] text-indigo-500 font-bold hover:underline"
                            title={t('fc_manager_remove_tag' as any)}
                          >
                            {t('fc_manager_remove_tag' as any)}
                          </button>
                          <button
                            onClick={() => handleDeleteFlashcard(card.id)}
                            className="text-rose-500 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity"
                            title={t('fc_manager_delete_tooltip' as any)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quiz Editing Modal */}
      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSave={handleSaveEditedQuiz}
          isLightTheme={isLightTheme}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
      )}

      {/* Flashcard Editing Modal */}
      {editingDesteBookId && (
        <EditFlashcardsModal
          bookId={editingDesteBookId}
          bookTitle={books.find(b => b.id === editingDesteBookId)?.title || ''}
          cards={flashcards.filter(c => c.bookId === editingDesteBookId)}
          onClose={() => setEditingDesteBookId(null)}
          onSave={handleSaveEditedDeste}
          isLightTheme={isLightTheme}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
      )}

      {/* Result Modal */}
      {showResultModal && (
        <ResultModal
          onClose={() => setShowResultModal(false)}
          correct={correctCount}
          wrong={wrongCount}
          empty={emptyCount}
          total={totalQuestions}
          score={scorePercentage}
          onRetake={() => {
            setShowResultModal(false);
            handleResetQuiz();
          }}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
          isLightTheme={isLightTheme}
        />
      )}

      {/* Flashcard Focus Mode Fullscreen View */}
      {isFlashcardFocusMode && activeCard && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 backdrop-blur-xl bg-stone-900/95 dark:bg-black/95">
          {/* Header */}
          <div className="flex justify-between items-center w-full max-w-4xl mx-auto border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wider">
                {selectedBook?.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : selectedBook?.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{t('fc_focus_mode_desc' as any)}</p>
            </div>
            <button
              onClick={() => setIsFlashcardFocusMode(false)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-1.5 text-xs font-bold"
              title={t('fc_focus_mode_esc_tip' as any)}
            >
              <Minimize2 className="w-4 h-4" /> {t('fc_focus_mode_exit' as any)}
            </button>
          </div>

          {/* Central Card container */}
          <div className="flex-1 flex items-center justify-center py-8 w-full">
            <div className="perspective-1000 w-full max-w-xl h-80">
              <div 
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className={`flip-card-inner cursor-pointer select-none ${isCardFlipped ? 'flipped' : ''}`}
              >
                {/* Front Face */}
                <div className="flip-card-front p-8 border border-white/10 text-center shadow-2xl bg-zinc-900/90 text-white">
                  <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{t('fc_front_side')}</span>
                  <p className="text-lg font-black text-white leading-relaxed mt-4">{activeCard.front}</p>
                  <span className="text-[10px] mt-6 text-zinc-500">{t('fc_flip_hint')}</span>
                </div>

                {/* Back Face */}
                <div className="flip-card-back p-8 border border-white/10 text-center shadow-2xl bg-indigo-950/40 text-white">
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{t('fc_back_side')}</span>
                  <p className="text-sm font-semibold text-zinc-200 leading-relaxed mt-4">{activeCard.back}</p>
                  <span className="text-[10px] mt-6 text-zinc-500">{t('fc_flip_back_hint')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 border-t border-white/10 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleUpdateCardStatus(activeCard.id, 'none')}
                className="h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all"
              >
                {t('fc_btn_no_show')}
              </button>
              <button
                onClick={() => handleUpdateCardStatus(activeCard.id, 'normal')}
                className="h-12 rounded-xl border border-white/10 bg-white/5 text-zinc-300 text-xs font-bold hover:bg-white/10 transition-all"
              >
                {t('fc_btn_show_normal')}
              </button>
              <button
                onClick={() => handleUpdateCardStatus(activeCard.id, 'more')}
                className="h-12 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                {t('fc_btn_show_more')}
              </button>
            </div>

            <div className="flex justify-between items-center px-1">
              <button
                disabled={currentCardIndex === 0}
                onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex - 1); }}
                className="text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-30"
              >
                ← {t('fc_focus_mode_prev_card' as any)}
              </button>
              
              {cardHistoryStack.length > 0 && (
                <button
                  onClick={handleUndoCardAction}
                  className="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Undo className="w-3.5 h-3.5" /> {t('fc_focus_mode_undo_eval' as any)}
                </button>
              )}

              <button
                disabled={currentCardIndex === bookFlashcards.length - 1}
                onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex + 1); }}
                className="text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-30"
              >
                {t('fc_focus_mode_next_card' as any)} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultModal({
  onClose,
  correct,
  wrong,
  empty,
  total,
  score,
  onRetake,
  surfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  let encouragement = 'Mükemmel! Tam isabet.';
  if (score < 50) {
    encouragement = 'Biraz daha pratik ve okuma yapmaya ne dersin?';
  } else if (score < 80) {
    encouragement = 'Güzel deneme! Kendini geliştirmeye devam et.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-md overflow-hidden rounded-3xl border flex flex-col shadow-2xl p-6 text-center gap-5 ${surfaceClass}`}>
        <div className="mx-auto h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
          <Trophy className="w-8 h-8 text-indigo-500" />
        </div>
        <div>
          <h3 className={`text-lg font-black ${titleClass}`}>Sınav Sonucu</h3>
          <p className="text-2xl font-black text-indigo-500 mt-2">%{score} Başarı</p>
          <p className={`text-xs mt-1 ${mutedClass}`}>{encouragement}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-2">
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
            <span className="text-[10px] font-black uppercase text-emerald-500 block">Doğru</span>
            <span className="text-lg font-black text-emerald-500 mt-1 block">{correct}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center">
            <span className="text-[10px] font-black uppercase text-rose-500 block">Yanlış</span>
            <span className="text-lg font-black text-rose-500 mt-1 block">{wrong}</span>
          </div>
          <div className="p-3 rounded-2xl bg-stone-500/5 border border-stone-500/20 text-center">
            <span className="text-[10px] font-black uppercase opacity-60 block">Boş</span>
            <span className="text-lg font-black opacity-75 mt-1 block">{empty}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className={`flex-1 h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isLightTheme ? 'border-stone-250 bg-white hover:bg-stone-50 text-stone-700' : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50 text-zinc-300'}`}
          >
            <RotateCcw className="w-4 h-4" /> Tekrar Çöz
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
          >
            Soruları İncele
          </button>
        </div>
      </div>
    </div>
  );
}

function EditQuizModal({ quiz, onClose, onSave, isLightTheme, surfaceClass, titleClass, mutedClass }: any) {
  const { t, lang } = useTranslation();
  const [questions, setQuestions] = useState<any[]>(() => {
    return JSON.parse(JSON.stringify(quiz.questions || []));
  });

  const handleUpdateQuestion = (qIdx: number, field: string, value: any) => {
    const updated = [...questions];
    updated[qIdx] = { ...updated[qIdx], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options];
    opts[optIdx] = val;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (qIdx: number) => {
    const updated = questions.filter((_, i) => i !== qIdx);
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctOptionIndex: 0, explanation: '' }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border flex flex-col shadow-2xl ${surfaceClass}`}>
        {/* Header */}
        <div className="p-5 border-b border-stone-250/50 dark:border-zinc-850 flex justify-between items-center">
          <div>
            <h3 className={`text-base font-black ${titleClass}`}>{t('quiz_edit_title' as any)}</h3>
            <p className={`text-[11px] ${mutedClass} mt-0.5`}>
              {quiz.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : quiz.bookTitle}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-note-scrollbar">
          {questions.length === 0 ? (
            <p className="text-xs text-center opacity-60 py-6">{t('quiz_edit_no_questions' as any)}</p>
          ) : (
            questions.map((q, qIdx) => (
              <div key={qIdx} className={`p-4 rounded-2xl border ${isLightTheme ? 'border-stone-200 bg-stone-50' : 'border-zinc-850 bg-zinc-900/10'} flex flex-col gap-4`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-500 uppercase">{t('quiz_edit_question' as any)} {qIdx + 1}</span>
                  <button
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="text-rose-500 hover:text-rose-600 text-xs font-bold"
                  >
                    {t('quiz_edit_delete_question' as any)}
                  </button>
                </div>

                {/* Question Text */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] opacity-75">{t('quiz_edit_question_text' as any)}</label>
                  <textarea
                    value={q.question}
                    onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs leading-relaxed resize-none h-16 focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                  />
                </div>

                {/* Options */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] opacity-75">{t('quiz_edit_options_label' as any)}</label>
                  {q.options.map((opt: string, optIdx: number) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctOptionIndex === optIdx}
                        onChange={() => handleUpdateQuestion(qIdx, 'correctOptionIndex', optIdx)}
                        className="cursor-pointer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                        className={`flex-1 h-9 px-3 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] opacity-75">{t('quiz_edit_explanation_label' as any)}</label>
                  <textarea
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs leading-relaxed resize-none h-16 focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                  />
                </div>
              </div>
            ))
          )}

          {/* Add New Question Button */}
          <button
            onClick={handleAddQuestion}
            className={`h-10 w-full rounded-xl border-2 border-dashed text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isLightTheme ? 'border-stone-250 hover:bg-stone-50 text-stone-700' : 'border-zinc-800 hover:bg-zinc-900/30 text-zinc-400'
            }`}
          >
            + {t('quiz_edit_add_question' as any)}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-250/50 dark:border-zinc-850 flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`h-10 px-4 rounded-xl border text-xs font-bold ${isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
          >
            {t('quiz_edit_cancel' as any)}
          </button>
          <button
            onClick={() => onSave(questions)}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20"
          >
            {t('quiz_edit_save' as any)}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditFlashcardsModal({ bookId, bookTitle, cards, onClose, onSave, isLightTheme, surfaceClass, titleClass, mutedClass }: any) {
  const { t, lang } = useTranslation();
  const [editedCards, setEditedCards] = useState<any[]>(() => {
    return JSON.parse(JSON.stringify(cards));
  });

  const handleUpdateCard = (idx: number, field: string, val: string) => {
    const updated = [...editedCards];
    updated[idx] = { ...updated[idx], [field]: val };
    setEditedCards(updated);
  };

  const handleDeleteCard = (idx: number) => {
    const updated = editedCards.filter((_, i) => i !== idx);
    setEditedCards(updated);
  };

  const handleAddCard = () => {
    setEditedCards([...editedCards, {
      id: 'custom-card-' + Date.now(),
      bookId,
      bookTitle,
      front: '',
      back: '',
      status: 'normal',
      reviewsCount: 0
    }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border flex flex-col shadow-2xl ${surfaceClass}`}>
        {/* Header */}
        <div className="p-5 border-b border-stone-250/50 dark:border-zinc-850 flex justify-between items-center">
          <div>
            <h3 className={`text-base font-black ${titleClass}`}>{t('fc_edit_title' as any)}</h3>
            <p className={`text-[11px] ${mutedClass} mt-0.5`}>
              {bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : bookTitle}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-note-scrollbar">
          {editedCards.length === 0 ? (
            <p className="text-xs text-center opacity-60 py-6">{t('fc_edit_no_cards' as any)}</p>
          ) : (
            editedCards.map((card, idx) => (
              <div key={card.id || idx} className={`p-4 rounded-2xl border ${isLightTheme ? 'border-stone-200 bg-stone-50' : 'border-zinc-850 bg-zinc-900/10'} flex flex-col gap-3 relative group`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-500 uppercase">{t('fc_edit_card' as any)} {idx + 1}</span>
                  <button
                    onClick={() => handleDeleteCard(idx)}
                    className="text-rose-500 hover:text-rose-600 text-xs font-bold"
                  >
                    {t('fc_edit_remove_card' as any)}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] opacity-75">{t('fc_front_label' as any)}</label>
                    <textarea
                      value={card.front}
                      onChange={(e) => handleUpdateCard(idx, 'front', e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs leading-relaxed resize-none h-16 focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] opacity-75">{t('fc_back_label' as any)}</label>
                    <textarea
                      value={card.back}
                      onChange={(e) => handleUpdateCard(idx, 'back', e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs leading-relaxed resize-none h-16 focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add New Card Button */}
          <button
            onClick={handleAddCard}
            className={`h-10 w-full rounded-xl border-2 border-dashed text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isLightTheme ? 'border-stone-250 hover:bg-stone-50 text-stone-700' : 'border-zinc-800 hover:bg-zinc-900/30 text-zinc-400'
            }`}
          >
            + {t('fc_edit_add_card' as any)}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-250/50 dark:border-zinc-850 flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`h-10 px-4 rounded-xl border text-xs font-bold ${isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
          >
            {t('quiz_edit_cancel' as any)}
          </button>
          <button
            onClick={() => onSave(editedCards)}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20"
          >
            {t('fc_edit_save' as any)}
          </button>
        </div>
      </div>
    </div>
  );
}
