/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Sparkles, Play, Flame, BookOpen, HelpCircle, Layers, Brain, MessageSquareText, Plus } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { PageHeader } from '../components/common/UIHelpers';
import { BookMark } from '../types';

const ActivityScatterChart = lazy(() =>
  import('../components/charts/AnalyticsCharts').then((m) => ({ default: m.ActivityScatterChart }))
);

export function HomePage({
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
    let readingReports: any[] = [];
    let quizReports: any[] = [];
    let cardReports: any[] = [];
    try {
      readingReports = JSON.parse(localStorage.getItem('velox_reading_reports_history') || '[]');
      quizReports = JSON.parse(localStorage.getItem('velox_quiz_reports_history') || '[]');
      cardReports = JSON.parse(localStorage.getItem('velox_card_reports_history') || '[]');
    } catch (e) {
      console.error(e);
    }

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'short' });
      const dayIsoStr = date.toISOString().split('T')[0];
      const dayLocaleStr = date.toLocaleDateString('tr-TR');

      const historyItem = (stats?.history || []).find((h: any) => h.date === dayIsoStr);
      
      // 1. Okuma (Reading) count (represented as normalized sessions)
      const wordsCount = historyItem ? Math.max(0, Math.round(historyItem.wordCount / 200)) : 0;
      
      // 2. Quizler (Quizzes) count
      const quizDbCount = quizHistory.filter((q: any) => {
        if (!q.date) return false;
        return q.date.includes(dayLocaleStr) || q.date.includes(date.toLocaleDateString());
      }).length;
      const quizzesCount = historyItem?.quizCount || quizDbCount;

      // 3. Kartlar (Cards) reviews count
      const cardsCount = historyItem?.cardReviewsCount || 0;

      // 4. Yapay Zeka (AI) usage count
      const countReportsForDay = (reports: any[]) => {
        return reports.filter((r: any) => {
          if (!r.id) return false;
          const rDate = new Date(Number(r.id));
          return !isNaN(rDate.getTime()) && rDate.toISOString().split('T')[0] === dayIsoStr;
        }).length;
      };
      const aiUsageCount = countReportsForDay(readingReports) + countReportsForDay(quizReports) + countReportsForDay(cardReports);

      // 5. Tıklamalar (Clicks) - computed based on actual actions
      const clicksCount = wordsCount * 2 + quizzesCount * 5 + cardsCount * 3 + aiUsageCount * 4;

      return [
        { day: dateStr, category: 'Okuma', count: wordsCount },
        { day: dateStr, category: 'Quizler', count: quizzesCount },
        { day: dateStr, category: 'Kartlar', count: cardsCount },
        { day: dateStr, category: 'Yapay Zeka', count: aiUsageCount },
        { day: dateStr, category: 'Tıklamalar', count: clicksCount }
      ];
    }).flat();
  }, [stats?.history, quizHistory]);

  const okumaPoints = useMemo(() => interactionData.filter(d => d.category === 'Okuma'), [interactionData]);
  const quizPoints = useMemo(() => interactionData.filter(d => d.category === 'Quizler'), [interactionData]);
  const cardPoints = useMemo(() => interactionData.filter(d => d.category === 'Kartlar'), [interactionData]);
  const aiPoints = useMemo(() => interactionData.filter(d => d.category === 'Yapay Zeka'), [interactionData]);
  const clickPoints = useMemo(() => interactionData.filter(d => d.category === 'Tıklamalar'), [interactionData]);

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
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs opacity-50">{lang === 'tr' ? 'Grafik Yükleniyor...' : 'Loading Chart...'}</div>}>
                <ActivityScatterChart
                  isLightTheme={isLightTheme}
                  lang={lang}
                  okumaPoints={okumaPoints}
                  quizPoints={quizPoints}
                  cardPoints={cardPoints}
                  aiPoints={aiPoints}
                  clickPoints={clickPoints}
                />
              </Suspense>
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
