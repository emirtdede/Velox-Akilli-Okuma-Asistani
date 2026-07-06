/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Palette, KeyRound, Keyboard, Database, BookOpenCheck, FileDown, UploadCloud, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { PageHeader } from '../components/common/UIHelpers';
import ThemeSelector from '../components/ThemeSelector';
import { SettingsTab } from '../types';

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

const SETTINGS_TABS = [
  { id: 'appearance' as SettingsTab, label: 'Görünüm', icon: Palette },
  { id: 'ai' as SettingsTab, label: 'Yapay Zeka', icon: KeyRound },
  { id: 'shortcuts' as SettingsTab, label: 'Klavye Kısayolları', icon: Keyboard },
  { id: 'data' as SettingsTab, label: 'Veri Yönetimi', icon: Database },
  { id: 'language' as SettingsTab, label: 'Dil Seçeneği (Language)', icon: BookOpenCheck }
];

export function SettingsPage({
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

  const isResetEnabled = resetConfirmText.toLowerCase() === (lang === 'tr' ? 'sil' : 'sil');

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
