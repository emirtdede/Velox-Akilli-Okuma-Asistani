/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReadingHistory {
  date: string; // YYYY-MM-DD
  wordCount: number;
  durationSeconds: number;
}

export interface UserStats {
  totalWordsRead: number;
  totalReadingTimeSeconds: number;
  dailyStreak: number;
  lastReadDate: string | null; // YYYY-MM-DD
  quizStreak?: number;
  lastQuizDate?: string | null;
  cardStreak?: number;
  lastCardDate?: string | null;
  maxSpeedWpm: number;
  longestSessionSeconds: number;
  dailyGoalWords: number; // e.g. 5000 words
  history: ReadingHistory[];
}

export type ThemeType = 'light' | 'dark' | 'sepia' | 'nord' | 'amoled' | 'matrix';

export type ReadingMode = 'center' | 'line' | 'teleprompter' | 'bionic' | 'highlight';

export interface BookMark {
  id: string;
  title: string;
  content: string;
  currentWordIndex: number;
  progress: number; // 0 to 100
  lastReadDate: string;
  speedWpm: number;
  groupSize: number; // e.g. 1, 2, 3 words
  estimatedMinutesTotal: number;
  tags?: string[];
  difficultyInfo?: {
    score: number; // 1-100
    level: string; // "Kolay" | "Orta" | "Zor"
    complexWords: string[];
    description: string;
  } | null;
  aiSummary?: {
    mainIdea: string;
    keyPoints: string[];
    summary: string;
  } | null;
  comprehensionQuestions?: any;
  insightsResult?: any;
}

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  bg: string;
  cardBg: string;
  text: string;
  accent: string;
  accentHover: string;
  accentText: string;
  border: string;
  mutedText: string;
  highlightBg: string;
  highlightText: string;
  orpColor: string;
  fontClass: string;
}

export const THEMES: Record<ThemeType, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Minimal Light (Apple Tarzı)',
    bg: 'bg-stone-50',
    cardBg: 'bg-white',
    text: 'text-stone-900',
    accent: 'bg-indigo-600',
    accentHover: 'hover:bg-indigo-700',
    accentText: 'text-indigo-600',
    border: 'border-stone-200',
    mutedText: 'text-stone-500',
    highlightBg: 'bg-yellow-100',
    highlightText: 'text-stone-900',
    orpColor: 'text-red-500',
    fontClass: 'font-sans'
  },
  dark: {
    id: 'dark',
    name: 'Elegant Dark (Velox)',
    bg: 'bg-[#050505]',
    cardBg: 'bg-[#0a0a0a]',
    text: 'text-[#e5e5e5]',
    accent: 'bg-[#4A6CFF]',
    accentHover: 'hover:bg-[#5B7FFF]',
    accentText: 'text-[#4A6CFF]',
    border: 'border-[#262626]',
    mutedText: 'text-[#737373]',
    highlightBg: 'bg-[#171717]',
    highlightText: 'text-white',
    orpColor: 'text-[#4A6CFF]',
    fontClass: 'font-sans'
  },
  sepia: {
    id: 'sepia',
    name: 'Sepya (Kindle Hissi)',
    bg: 'bg-[#f4ecd8]',
    cardBg: 'bg-[#fbf0da]',
    text: 'text-[#433422]',
    accent: 'bg-[#704214]',
    accentHover: 'hover:bg-[#5c3410]',
    accentText: 'text-[#704214]',
    border: 'border-[#e4d0b1]',
    mutedText: 'text-[#7c6950]',
    highlightBg: 'bg-[#d8c39e]/40',
    highlightText: 'text-[#433422]',
    orpColor: 'text-red-700',
    fontClass: 'font-serif'
  },
  amoled: {
    id: 'amoled',
    name: 'AMOLED (Derin Siyah)',
    bg: 'bg-black',
    cardBg: 'bg-[#121212]',
    text: 'text-zinc-200',
    accent: 'bg-zinc-100',
    accentHover: 'hover:bg-white',
    accentText: 'text-zinc-100',
    border: 'border-zinc-800',
    mutedText: 'text-zinc-500',
    highlightBg: 'bg-zinc-900',
    highlightText: 'text-emerald-400',
    orpColor: 'text-red-500',
    fontClass: 'font-sans'
  },
  nord: {
    id: 'nord',
    name: 'Nord (Buz Mavisi & Gri)',
    bg: 'bg-[#2e3440]',
    cardBg: 'bg-[#3b4252]',
    text: 'text-[#d8dee9]',
    accent: 'bg-[#88c0d0]',
    accentHover: 'hover:bg-[#8fbcbb]',
    accentText: 'text-[#88c0d0]',
    border: 'border-[#4c566a]',
    mutedText: 'text-[#a3be8c]',
    highlightBg: 'bg-[#434c5e]',
    highlightText: 'text-[#eceff4]',
    orpColor: 'text-[#bf616a]',
    fontClass: 'font-sans'
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix (Digital Terminal)',
    bg: 'bg-black',
    cardBg: 'bg-[#050c05]',
    text: 'text-[#00ff41]',
    accent: 'bg-[#003b00]',
    accentHover: 'hover:bg-[#005f00]',
    accentText: 'text-[#00ff41]',
    border: 'border-[#008f11]',
    mutedText: 'text-[#00ff41]/60',
    highlightBg: 'bg-[#002f00]',
    highlightText: 'text-[#00ff41]',
    orpColor: 'text-red-500',
    fontClass: 'font-mono'
  }
};

export type AppTab = 'home' | 'reader' | 'workspace' | 'quiz' | 'training' | 'progress' | 'guide' | 'settings' | 'about';
export type WorkspaceTab = 'content' | 'analysis' | 'actions' | 'notes';
export type SettingsTab = 'appearance' | 'ai' | 'data' | 'shortcuts' | 'language';
export type BookFilter = 'all' | 'active' | 'completed';
export type SidebarMode = 'full' | 'compact' | 'hidden';

