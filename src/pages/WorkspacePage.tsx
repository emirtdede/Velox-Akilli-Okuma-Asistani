/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Plus, Search, Trash2, Download, ChevronDown, Save } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { BookMark, BookFilter, WorkspaceTab } from '../types';
import { StorageService } from '../utils/storage';
import { PageHeader, AiDisabledCard, Panel, EmptyState } from '../components/common/UIHelpers';

export function WorkspacePage({
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

  const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: any }[] = [
    { id: 'content', label: lang === 'tr' ? 'Belge İçeriği' : 'Document Content', icon: Play },
    { id: 'notes', label: lang === 'tr' ? 'Notlarım' : 'My Notes', icon: Save },
    { id: 'analysis', label: lang === 'tr' ? 'Yapay Zeka Analizi' : 'AI Analysis', icon: Plus },
    { id: 'actions', label: lang === 'tr' ? 'Yapay Zeka Soru & Aksiyon' : 'AI Question & Action', icon: Play }
  ];

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
                      {tab.label}
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

export function AnalysisTab(props: any) {
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

export function ActionsTab({
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
