/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { StorageService } from '../utils/storage';
import { BookMark } from '../types';

const noteKeyForBook = (bookId: string) => `velox_notes_text_${bookId}`;
const legacyNoteKeyForBook = (bookId: string) => `readflow_notes_text_${bookId}`;

function readLocalWithLegacy(key: string, legacyKey: string) {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) localStorage.setItem(key, legacy);
  return legacy || '';
}

function parseRoute(pathname = typeof window !== 'undefined' ? window.location.pathname : '/'): { tab: any; bookId: string | null; readerBookId: string | null; settingsTab?: any } {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];
  const second = parts[1] ? decodeURIComponent(parts[1]) : null;

  if (first === 'workspace') {
    return { tab: 'workspace', bookId: second, readerBookId: null };
  }
  if (first === 'reader') {
    return { tab: 'reader', bookId: second, readerBookId: second };
  }
  if (first === 'quiz') {
    return { tab: 'quiz', bookId: null, readerBookId: null };
  }
  if (first === 'guide') {
    return { tab: 'guide', bookId: null, readerBookId: null };
  }
  if (first === 'about') {
    return { tab: 'about', bookId: null, readerBookId: null };
  }
  if (first === 'progress') {
    return { tab: 'progress', bookId: null, readerBookId: null };
  }
  if (first === 'settings') {
    return { tab: 'settings', bookId: null, readerBookId: null };
  }
  return { tab: 'home', bookId: null, readerBookId: null };
}

function pathForTab(tab: string, bookId?: string | null) {
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

export function useLibraryAndNotes({
  initialBookId,
  flashcards,
  lang,
  showCustomAlert,
  showCustomConfirm,
  setStats,
  setPrefs,
  setActiveTab,
  setWorkspaceTab
}: {
  initialBookId: string | null;
  flashcards: any[];
  lang: string;
  showCustomAlert: (msg: string, title?: string) => void;
  showCustomConfirm: (msg: string, onConfirm: () => void, title?: string) => void;
  setStats: (stats: any) => void;
  setPrefs: (prefs: any) => void;
  setActiveTab: (tab: any) => void;
  setWorkspaceTab: (tab: any) => void;
}) {
  const [books, setBooks] = useState<BookMark[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(initialBookId);
  const [activeBook, setActiveBook] = useState<BookMark | null>(null);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [bookFilter, setBookFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const refreshBooks = useCallback(() => {
    setBooks(StorageService.getBooks());
  }, []);

  useEffect(() => {
    const loadedBooks = StorageService.getBooks();
    setBooks(loadedBooks);
    if (!selectedBookId && loadedBooks.length > 0) setSelectedBookId(loadedBooks[0].id);

    StorageService.hydrateFromIndexedDb?.().then((changed: boolean) => {
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
  }, [setActiveTab]);

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
    setNoteDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const book of books) {
        next[book.id] = prev[book.id] ?? readLocalWithLegacy(noteKeyForBook(book.id), legacyNoteKeyForBook(book.id));
      }
      return next;
    });
  }, [books]);

  const getLocalBook = useCallback((book: any) => {
    if (!book) return book;
    if (book.id === 'sample-welcome' && lang !== 'tr') {
      return {
        ...book,
        title: 'Velox Speed Reading Guide',
        content: `Welcome to Velox! This modern application is specifically designed to improve your speed reading skills, maximize your focus, and multiply your reading productivity.\n\nBy using the RSVP (Rapid Serial Visual Presentation) engine in our app, you can read words fluidly one-by-one or in groups without straining your eye muscles or losing time scanning lines.\n\nThanks to the Optimal Recognition Point (ORP) feature, the focus letter in the middle of the word is marked in red. This allows your eye to grasp the meaning of the word in milliseconds and reduces word searching to zero.\n\nThe Smart Pause System adds small wait times at punctuation marks to mimic natural reading. For example, it automatically slows down at commas (+100 ms), periods (+300 ms), or paragraph ends (+500 ms) to capture a flawless cognitive rhythm.\n\nThanks to our AI assistant, you can summarize any text you read with a single click, analyze word difficulty, and instantly learn the meaning, synonyms, and example sentences of any word you click!\n\nShortcut Keys:\n- [Space]: Play / Pause\n- [Left Arrow]: Rewind 10 words\n- [Right Arrow]: Fast forward 10 words\n- [Up Arrow]: Increase speed (+25 WPM)\n- [Down Arrow]: Decrease speed (-25 WPM)\n- [Esc]: Exit reader safely\n\nNow you can click the "Start Reading" button to have your first experience, and easily add your own book, word, md, or pdf documents to your library! We wish you success.`,
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
  }, [lang]);

  const selectedBook = useMemo(() => {
    const found = books.find(book => book.id === selectedBookId) || books[0] || null;
    return getLocalBook(found);
  }, [books, selectedBookId, getLocalBook]);

  useEffect(() => {
    if (selectedBook) {
      setEditTitle(selectedBook.title);
      setEditContent(selectedBook.content);
      setIsEditingContent(false);
    } else {
      setEditTitle('');
      setEditContent('');
      setIsEditingContent(false);
    }
  }, [selectedBook]);

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

  const booksWithFlashcards = useMemo(() => {
    return books.filter(b => flashcards.some((c: any) => c.bookId === b.id));
  }, [books, flashcards]);

  const saveBookNotes = useCallback((bookId: string) => {
    localStorage.setItem(noteKeyForBook(bookId), noteDrafts[bookId] || '');
  }, [noteDrafts]);

  const navigateToTab = useCallback((tab: any, bookId?: string | null, replace = false) => {
    if (tab === 'reader') {
      const bId = bookId || selectedBookId || (books.length > 0 ? books[0].id : null);
      const b = books.find((x: any) => x.id === bId) || books[0];
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
  }, [books, selectedBookId, setActiveTab, showCustomAlert]);

  const handleAddNewBook = useCallback((title: string, content: string, tags?: string[]) => {
    const book = StorageService.addBook(title, content, tags || []);
    refreshBooks();
    setSelectedBookId(book.id);
    setWorkspaceTab('analysis');
    navigateToTab('workspace', book.id);
  }, [refreshBooks, navigateToTab, setWorkspaceTab]);

  const handleDeleteBook = useCallback((bookId: string) => {
    showCustomConfirm('Bu belgeyi silmek istiyor musunuz?', () => {
      const remaining = StorageService.deleteBook(bookId);
      setBooks(remaining);
      setSelectedBookId(remaining[0]?.id || null);
    }, 'Belgeyi Sil');
  }, [showCustomConfirm]);

  const handleLaunchReader = useCallback((book: BookMark) => {
    setSelectedBookId(book.id);
    setActiveBook(book);
    window.history.pushState(null, '', `/reader/${encodeURIComponent(book.id)}`);
  }, []);

  const handleCloseReader = useCallback(() => {
    const closedBookId = activeBook?.id || selectedBookId;
    setActiveBook(null);
    refreshBooks();
    setStats(StorageService.getStats());
    navigateToTab('workspace', closedBookId, true);
  }, [activeBook, selectedBookId, refreshBooks, setStats, navigateToTab]);

  const handleReaderProgressUpdate = useCallback((index: number, progressPercent: number, speed: number, groupSize: number) => {
    if (!activeBook) return;
    StorageService.updateBookProgress(activeBook.id, index, progressPercent, speed, groupSize);
  }, [activeBook]);

  return {
    books,
    setBooks,
    selectedBookId,
    setSelectedBookId,
    activeBook,
    setActiveBook,
    isEditingContent,
    setIsEditingContent,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    bookSearch,
    setBookSearch,
    bookFilter,
    setBookFilter,
    noteDrafts,
    setNoteDrafts,
    selectedBook,
    recentBooks,
    filteredBooks,
    booksWithFlashcards,
    saveBookNotes,
    refreshBooks,
    navigateToTab,
    handleAddNewBook,
    handleDeleteBook,
    handleLaunchReader,
    handleCloseReader,
    handleReaderProgressUpdate
  };
}
