/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback } from 'react';
import { StorageService } from '../utils/storage';
import { ThemeConfig, THEMES, ThemeType } from '../types';

const SIDEBAR_PREFS_KEY = 'velox_sidebar_pref';

function formatShortDate(date: Date) {
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

export function useAppPreferences() {
  const [stats, setStats] = useState(() => StorageService.getStats());
  const [prefs, setPrefs] = useState(() => StorageService.getPreferences());

  const [sidebarMode, setSidebarModeRaw] = useState<'compact' | 'hidden' | 'full'>(() => {
    const stored = localStorage.getItem(SIDEBAR_PREFS_KEY);
    return stored === 'compact' || stored === 'hidden' || stored === 'full' ? stored : 'full';
  });

  const setSidebarMode = useCallback((mode: 'compact' | 'hidden' | 'full') => {
    setSidebarModeRaw(mode);
    localStorage.setItem(SIDEBAR_PREFS_KEY, mode);
  }, []);

  const refreshStats = useCallback(() => {
    setStats(StorageService.getStats());
  }, []);

  const refreshPrefs = useCallback(() => {
    setPrefs(StorageService.getPreferences());
  }, []);

  const currentThemeType: ThemeType = prefs?.theme || 'dark';
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

  const todayKey = new Date().toISOString().split('T')[0];
  const todayHistory = stats?.history?.find((item: any) => item.date === todayKey);
  const todayWords = todayHistory?.wordCount || 0;
  const dailyGoal = Math.max(1, stats?.dailyGoalWords || 3000);
  const dailyProgress = Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  const totalMinutes = Math.max(0, Math.round((stats?.totalReadingTimeSeconds || 0) / 60));

  const chartData = useMemo(() => {
    type HistoryItem = { date: string; wordCount: number; durationSeconds: number };
    const historyMap = new Map<string, HistoryItem>(
      (stats?.history || []).map((item: HistoryItem) => [item.date, item])
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
  }, [stats?.history]);

  const handleThemeChange = useCallback((theme: ThemeType) => {
    setPrefs((prev: any) => {
      const nextPrefs = { ...prev, theme };
      StorageService.savePreferences(nextPrefs);
      return nextPrefs;
    });
  }, []);

  return {
    stats,
    setStats,
    refreshStats,
    prefs,
    setPrefs,
    refreshPrefs,
    sidebarMode,
    setSidebarMode,
    currentThemeType,
    currentTheme,
    isLightTheme,
    surfaceClass,
    softSurfaceClass,
    titleClass,
    mutedClass,
    todayWords,
    dailyGoal,
    dailyProgress,
    totalMinutes,
    chartData,
    handleThemeChange
  };
}
