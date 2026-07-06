/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState } from 'react';
import { AppTab, WorkspaceTab, SettingsTab } from './types';
import { Sidebar } from './components/common/Sidebar';
import { CustomDialog } from './components/common/CustomDialog';
import { PageHeader } from './components/common/UIHelpers';
import { useTranslation } from './utils/i18n';
import { useCognitiveTraining } from './hooks/useCognitiveTraining';
import { useAiAssistant } from './hooks/useAiAssistant';
import { useCustomModal } from './hooks/useCustomModal';
import { useAppPreferences } from './hooks/useAppPreferences';
import { useProgressReports } from './hooks/useProgressReports';
import { useAssessmentAndCards } from './hooks/useAssessmentAndCards';
import { useLibraryAndNotes } from './hooks/useLibraryAndNotes';
import { HomePage } from './pages/HomePage';
import { ProgressPage } from './pages/ProgressPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SettingsPage } from './pages/SettingsPage';
import { GuidePage } from './pages/GuidePage';
import { AboutPage } from './pages/AboutPage';
import { RecallQuizPage } from './pages/RecallQuizPage';
import { TrainingPage } from './pages/TrainingPage';

const AddDocumentModal = lazy(() => import('./components/AddDocumentModal'));
const SpeedReader = lazy(() => import('./components/SpeedReader'));

const LazyPanelFallback = () => <div className="p-4 text-xs opacity-60">Yükleniyor...</div>;

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
  const initialRoute = parseRoute();
  const [activeTab, setActiveTab] = useState<AppTab>(initialRoute.tab);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('content');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const {
    trainingLevel,
    setTrainingLevel,
    trainingStats,
    trainingHistory,
    handleSaveTrainingSession
  } = useCognitiveTraining(lang);

  const {
    dialogConfig,
    setDialogConfig,
    showCustomAlert,
    showCustomConfirm,
    closeDialog
  } = useCustomModal();

  const {
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
  } = useAppPreferences();

  const {
    userGoals,
    setUserGoals,
    readingReport,
    setReadingReport,
    quizReport,
    setQuizReport,
    cardReport,
    setCardReport,
    readingReportHistory,
    setReadingReportHistory,
    quizReportHistory,
    setQuizReportHistory,
    cardReportHistory,
    setCardReportHistory,
    reportLoading,
    setReportLoading,
    handleDeleteHistoryItem
  } = useProgressReports();

  const {
    quizHistory,
    setQuizHistory,
    flashcards,
    setFlashcards
  } = useAssessmentAndCards();

  const {
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
  } = useLibraryAndNotes({
    initialBookId: initialRoute.bookId || initialRoute.readerBookId,
    flashcards,
    lang,
    showCustomAlert,
    showCustomConfirm,
    setStats,
    setPrefs,
    setActiveTab,
    setWorkspaceTab
  });

  const {
    aiStatus,
    setAiStatus,
    aiProvider,
    setAiProvider,
    geminiApiKey,
    setGeminiApiKey,
    geminiDraftKey,
    setGeminiDraftKey,
    openaiApiKey,
    setOpenaiApiKey,
    openaiDraftKey,
    setOpenaiDraftKey,
    claudeApiKey,
    setClaudeApiKey,
    claudeDraftKey,
    setClaudeDraftKey,
    localUrl,
    setLocalUrl,
    localUrlDraft,
    setLocalUrlDraft,
    localModel,
    setLocalModel,
    localModelDraft,
    setLocalModelDraft,
    aiSaveMessage,
    setAiSaveMessage,
    aiBusy,
    aiError,
    setAiError,
    wordQuery,
    setWordQuery,
    dictionaryResult,
    setDictionaryResult,
    comprehensionResult,
    setComprehensionResult,
    insightsResult,
    setInsightsResult,
    refreshAiStatus,
    saveAiSettings,
    clearAiSettings,
    generateAiSummary,
    generateDifficultyAnalysis,
    generateWordDefinition,
    generateComprehension,
    generateInsights,
    postAi
  } = useAiAssistant({ selectedBook, refreshBooks, lang });

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

          {activeTab === 'training' && (
            <TrainingPage
              trainingLevel={trainingLevel}
              setTrainingLevel={setTrainingLevel}
              trainingStats={trainingStats}
              trainingHistory={trainingHistory}
              onSaveSession={handleSaveTrainingSession}
              surfaceClass={surfaceClass}
              softSurfaceClass={softSurfaceClass}
              titleClass={titleClass}
              mutedClass={mutedClass}
              isLightTheme={isLightTheme}
              currentTheme={currentTheme}
              books={books}
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
              <GuidePage currentTheme={currentTheme} surfaceClass={surfaceClass} softSurfaceClass={softSurfaceClass} titleClass={titleClass} mutedClass={mutedClass} isLightTheme={isLightTheme} />
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
