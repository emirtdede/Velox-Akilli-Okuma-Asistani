/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookMark, UserStats, ThemeType, ReadingMode } from '../types';
import { LocalDatabase } from './localDatabase';

const BOOKS_KEY = 'velox_books';
const STATS_KEY = 'velox_stats';
const PREFS_KEY = 'velox_prefs';
const STORAGE_KEYS = [BOOKS_KEY, STATS_KEY, PREFS_KEY] as const;

type StorageKey = typeof STORAGE_KEYS[number];

const LEGACY_KEYS: Record<StorageKey, string> = {
  [BOOKS_KEY]: 'readflow_books',
  [STATS_KEY]: 'readflow_stats',
  [PREFS_KEY]: 'readflow_prefs'
};

function getTimestampKey(key: string) {
  return `${key}_updated_at`;
}

function saveLocalCache<T>(key: StorageKey, value: T, updatedAt = Date.now()) {
  localStorage.setItem(key, JSON.stringify(value));
  localStorage.setItem(getTimestampKey(key), String(updatedAt));
}

function migrateLegacyCache(key: StorageKey) {
  const legacyKey = LEGACY_KEYS[key];
  if (localStorage.getItem(key) || !localStorage.getItem(legacyKey)) return;
  localStorage.setItem(key, localStorage.getItem(legacyKey) || '');
  const legacyUpdatedAt = localStorage.getItem(getTimestampKey(legacyKey));
  if (legacyUpdatedAt) localStorage.setItem(getTimestampKey(key), legacyUpdatedAt);
}

function savePersistent<T>(key: StorageKey, value: T) {
  const updatedAt = Date.now();
  saveLocalCache(key, value, updatedAt);
  LocalDatabase.set(key, value, updatedAt).catch(error => {
    console.warn('[StorageService] IndexedDB mirror write skipped:', error);
  });
}

function readJson<T>(key: StorageKey, fallback: T): T {
  migrateLegacyCache(key);
  const data = localStorage.getItem(key);
  if (!data) return fallback;
  return JSON.parse(data) as T;
}

export interface UserPreferences {
  theme: ThemeType;
  mode: ReadingMode;
  speedWpm: number;
  groupSize: number;
  isOrp: boolean;
  smartPauses: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'dark',
  mode: 'center',
  speedWpm: 250,
  groupSize: 1,
  isOrp: true,
  smartPauses: true,
  fontSize: 'lg'
};

const DEFAULT_STATS: UserStats = {
  totalWordsRead: 14200,
  totalReadingTimeSeconds: 3450,
  dailyStreak: 3,
  lastReadDate: new Date().toISOString().split('T')[0],
  quizStreak: 1,
  lastQuizDate: new Date().toISOString().split('T')[0],
  cardStreak: 2,
  lastCardDate: new Date().toISOString().split('T')[0],
  maxSpeedWpm: 450,
  longestSessionSeconds: 980,
  dailyGoalWords: 3000,
  history: [
    { date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], wordCount: 2800, durationSeconds: 680 },
    { date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], wordCount: 3100, durationSeconds: 720 },
    { date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], wordCount: 1500, durationSeconds: 340 },
    { date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], wordCount: 3400, durationSeconds: 810 },
    { date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], wordCount: 3000, durationSeconds: 700 },
    { date: new Date().toISOString().split('T')[0], wordCount: 400, durationSeconds: 200 }
  ]
};

// Initial welcome sample content
const SAMPLE_DOCS: BookMark[] = [
  {
    id: 'sample-welcome',
    title: 'Velox okuma rehberi',
    content: `Velox platformuna hoş geldiniz! Bu modern uygulama hızlı okuma becerilerinizi geliştirmek, odağınızı zirveye çıkarmak ve kitap okuma verimliliğinizi katlamak için özel olarak tasarlandı. 

Uygulamamızdaki RSVP (Hızlı Sıralı Görsel Sunum) motorunu kullanarak göz kaslarınızı yormadan, satırlarda zaman kaybetmeden kelimeleri tek tek veya gruplar halinde akıcı olarak okuyabilirsiniz. 

Optimal Tanıma Noktası (ORP) özelliği sayesinde kelimenin ortasındaki odak harfi kırmızı renkle işaretlenir. Bu durum, gözünüzün kelimenin anlamını saniyeler içinde kavramasını sağlar ve kelime aramalarını sıfıra indirir.

Akıllı Duraklama Sistemi, noktalama işaretlerinde doğal okumanızı taklit edecek şekilde küçük bekleme süreleri ekler. Örneğin virgül (+100 ms), nokta (+300 ms) veya pragraf sonunda (+500 ms) otomatik olarak yavaşlayarak kusursuz bir kognitif ritim yakalar.

Yapay zeka asistanımız sayesinde okuduğunuz her metnin tek tıklamayla Türkçe özetini çıkarabilir, kelime zorluğunu analiz edebilir ve merak ettiğiniz bir kelimeye tıklayarak anlamını, eş anlamlılarını ve örnek cümlelerini anında öğrenebilirsiniz! 

Kısayol Tuşları:
- [Space]: Oynat / Duraklat
- [Sol Ok]: 10 kelime geriye sar
- [Sağ Ok]: 10 kelime ileriye sar
- [Yukarı Ok]: Hızı artır (+25 WPM)
- [Aşağı Ok]: Hızı azalt (-25 WPM)
- [Esc]: Okuyucudan güvenle çıkış yap

Şimdi "Okumaya Başla" butonuna tıklayarak ilk deneyiminizi yaşayabilir, kendi kitap, word, md veya pdf belgelerinizi kütüphanenize kolayca ekleyebilirsiniz! Başarılar dileriz.`,
    currentWordIndex: 0,
    progress: 0,
    lastReadDate: new Date().toISOString().split('T')[0],
    speedWpm: 250,
    groupSize: 1,
    estimatedMinutesTotal: 1,
    tags: ['Rehber', 'Başlangıç'],
    difficultyInfo: {
      score: 30,
      level: 'Kolay',
      complexWords: ['RSVP', 'ORP', 'Kognitif', 'Optimal'],
      description: 'Metin sade, öğretici ve yönlendirici bir dille yazılmış olup her okuyucu kitlesi için son derece akıcıdır.'
    }
  }
];

export const StorageService = {
  async hydrateFromIndexedDb(): Promise<boolean> {
    if (!LocalDatabase.isAvailable()) return false;

    const defaults: Record<StorageKey, unknown> = {
      [BOOKS_KEY]: SAMPLE_DOCS,
      [STATS_KEY]: DEFAULT_STATS,
      [PREFS_KEY]: DEFAULT_PREFS
    };

    let cacheChanged = false;

    for (const key of STORAGE_KEYS) {
      try {
        migrateLegacyCache(key);
        if (!localStorage.getItem(key)) {
          saveLocalCache(key, defaults[key], 0);
        }

        const localUpdatedAt = Number(localStorage.getItem(getTimestampKey(key)) || '0');
        const indexedRecord = await LocalDatabase.get<unknown>(key);

        if (indexedRecord && indexedRecord.updatedAt >= localUpdatedAt) {
          saveLocalCache(key, indexedRecord.value, indexedRecord.updatedAt);
          cacheChanged = true;
          continue;
        }

        const localValue = readJson(key, defaults[key]);
        await LocalDatabase.set(key, localValue, localUpdatedAt);
      } catch (error) {
        console.warn(`[StorageService] IndexedDB hydration skipped for ${key}:`, error);
      }
    }

    return cacheChanged;
  },

  // Books and items persistence
  getBooks(): BookMark[] {
    try {
      if (!localStorage.getItem(BOOKS_KEY)) {
        saveLocalCache(BOOKS_KEY, SAMPLE_DOCS, 0);
        return SAMPLE_DOCS;
      }
      return readJson(BOOKS_KEY, SAMPLE_DOCS);
    } catch (e) {
      console.error('Error reading books storage', e);
      return SAMPLE_DOCS;
    }
  },

  saveBooks(books: BookMark[]): void {
    try {
      savePersistent(BOOKS_KEY, books);
    } catch (e) {
      console.error('Error saving books storage', e);
    }
  },

  addBook(title: string, content: string, tags: string[]): BookMark {
    const books = this.getBooks();
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    // Estimated average reading speed: 250 WPM
    const estimatedMinutesTotal = Math.max(1, Math.round(wordCount / 250));
    
    const newBook: BookMark = {
      id: 'book-' + Date.now(),
      title: title.trim() || 'Yeni Belge ' + (books.length + 1),
      content,
      currentWordIndex: 0,
      progress: 0,
      lastReadDate: new Date().toISOString().split('T')[0],
      speedWpm: 250,
      groupSize: 1,
      estimatedMinutesTotal,
      tags: tags || ['Kişisel']
    };

    books.unshift(newBook);
    this.saveBooks(books);
    import('./storageAdapter').then(({ StorageAdapter }) => {
      StorageAdapter.saveBookToCloud(newBook);
    }).catch(() => {});
    return newBook;
  },

  updateBookProgress(bookId: string, index: number, progressPercent: number, speed: number, groupSize: number): void {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      books[idx].currentWordIndex = index;
      books[idx].progress = Math.min(100, Math.max(0, Math.round(progressPercent)));
      books[idx].speedWpm = speed;
      books[idx].groupSize = groupSize;
      books[idx].lastReadDate = new Date().toISOString().split('T')[0];
      this.saveBooks(books);
      const updatedBook = books[idx];
      import('./storageAdapter').then(({ StorageAdapter }) => {
        StorageAdapter.saveBookToCloud(updatedBook);
      }).catch(() => {});
    }
  },

  deleteBook(bookId: string): BookMark[] {
    const books = this.getBooks().filter(b => b.id !== bookId);
    this.saveBooks(books);
    import('./storageAdapter').then(({ StorageAdapter }) => {
      StorageAdapter.deleteBookFromCloud(bookId);
    }).catch(() => {});
    return books;
  },

  updateBookContent(bookId: string, title: string, content: string): void {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      books[idx].title = title;
      books[idx].content = content;
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      books[idx].estimatedMinutesTotal = Math.ceil(wordCount / 225) || 1;
      this.saveBooks(books);
      const updatedBook = books[idx];
      import('./storageAdapter').then(({ StorageAdapter }) => {
        StorageAdapter.saveBookToCloud(updatedBook);
      }).catch(() => {});
    }
  },

  updateBookAiSummary(bookId: string, summary: any): void {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      books[idx].aiSummary = summary;
      this.saveBooks(books);
    }
  },

  updateBookDifficulty(bookId: string, difficulty: any): void {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      books[idx].difficultyInfo = difficulty;
      this.saveBooks(books);
    }
  },

  updateBookComprehension(bookId: string, comprehension: any): void {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      books[idx].comprehensionQuestions = comprehension;
      this.saveBooks(books);
    }
  },

  updateBookInsights(bookId: string, insights: any): void {
    const books = this.getBooks();
    const idx = books.findIndex(b => b.id === bookId);
    if (idx !== -1) {
      books[idx].insightsResult = insights;
      this.saveBooks(books);
    }
  },

  // Stats Analytics persistence
  getStats(): UserStats {
    try {
      if (!localStorage.getItem(STATS_KEY)) {
        saveLocalCache(STATS_KEY, DEFAULT_STATS, 0);
        return DEFAULT_STATS;
      }
      return readJson(STATS_KEY, DEFAULT_STATS);
    } catch (e) {
      return DEFAULT_STATS;
    }
  },

  saveStats(stats: UserStats): void {
    try {
      savePersistent(STATS_KEY, stats);
    } catch (e) {
      console.error('Error saving stats', e);
    }
  },

  // Log words read and durations
  logReadingSession(wordCount: number, durationSeconds: number, currentSpeedWpm: number): UserStats {
    if (wordCount <= 0 || durationSeconds <= 0) return this.getStats();

    const stats = this.getStats();
    const todayStr = new Date().toISOString().split('T')[0];

    // Update totals
    stats.totalWordsRead += wordCount;
    stats.totalReadingTimeSeconds += durationSeconds;
    
    if (currentSpeedWpm > stats.maxSpeedWpm) {
      stats.maxSpeedWpm = currentSpeedWpm;
    }
    if (durationSeconds > stats.longestSessionSeconds) {
      stats.longestSessionSeconds = durationSeconds;
    }

    // Daily streak logic
    if (stats.lastReadDate) {
      const lastDate = new Date(stats.lastReadDate);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        stats.dailyStreak += 1;
      } else if (diffDays > 1) {
        stats.dailyStreak = 1;
      }
    } else {
      stats.dailyStreak = 1;
    }
    stats.lastReadDate = todayStr;

    // Logging daily history list
    const historyItemIndex = stats.history.findIndex(h => h.date === todayStr);
    if (historyItemIndex !== -1) {
      stats.history[historyItemIndex].wordCount += wordCount;
      stats.history[historyItemIndex].durationSeconds += durationSeconds;
    } else {
      stats.history.push({
        date: todayStr,
        wordCount,
        durationSeconds
      });
    }

    // Keep history clean (e.g. last 30 days)
    if (stats.history.length > 30) {
      stats.history.shift();
    }

    this.saveStats(stats);
    import('./storageAdapter').then(({ StorageAdapter }) => {
      StorageAdapter.logSessionToCloud(wordCount, durationSeconds);
    }).catch(() => {});
    return stats;
  },

  logQuizSession(): UserStats {
    const stats = this.getStats();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentStreak = stats.quizStreak || 0;
    const lastQuizStr = stats.lastQuizDate || null;

    if (lastQuizStr) {
      const lastDate = new Date(lastQuizStr);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        stats.quizStreak = currentStreak + 1;
      } else if (diffDays > 1) {
        stats.quizStreak = 1;
      }
    } else {
      stats.quizStreak = 1;
    }
    stats.lastQuizDate = todayStr;
    this.saveStats(stats);
    return stats;
  },

  logCardSession(): UserStats {
    const stats = this.getStats();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentStreak = stats.cardStreak || 0;
    const lastCardStr = stats.lastCardDate || null;

    if (lastCardStr) {
      const lastDate = new Date(lastCardStr);
      const today = new Date(todayStr);
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        stats.cardStreak = currentStreak + 1;
      } else if (diffDays > 1) {
        stats.cardStreak = 1;
      }
    } else {
      stats.cardStreak = 1;
    }
    stats.lastCardDate = todayStr;
    this.saveStats(stats);
    return stats;
  },

  updateDailyGoal(words: number): UserStats {
    const stats = this.getStats();
    stats.dailyGoalWords = words;
    this.saveStats(stats);
    return stats;
  },

  resetStats(): UserStats {
    savePersistent(STATS_KEY, DEFAULT_STATS);
    return DEFAULT_STATS;
  },

  // Preferences Storage
  getPreferences(): UserPreferences {
    try {
      if (!localStorage.getItem(PREFS_KEY)) {
        return DEFAULT_PREFS;
      }
      return { ...DEFAULT_PREFS, ...readJson(PREFS_KEY, DEFAULT_PREFS) };
    } catch (e) {
      return DEFAULT_PREFS;
    }
  },

  savePreferences(prefs: UserPreferences): void {
    try {
      savePersistent(PREFS_KEY, prefs);
    } catch (e) {
      console.error('Error saving preferences', e);
    }
  }
};
