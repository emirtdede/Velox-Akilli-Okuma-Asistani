/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../utils/storage';

const GEMINI_KEY = 'velox_gemini_api_key';
const LEGACY_GEMINI_KEY = 'readflow_gemini_api_key';

function readLocalWithLegacy(key: string, legacyKey: string) {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) localStorage.setItem(key, legacy);
  return legacy || '';
}

export function useAiAssistant({ selectedBook, refreshBooks, lang }: { selectedBook: any; refreshBooks: () => void; lang: string }) {
  const [aiStatus, setAiStatus] = useState({ enabled: false, provider: 'none', checked: false });
  const [aiProvider, setAiProvider] = useState<string>(() => localStorage.getItem('velox_ai_provider') || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(() => readLocalWithLegacy(GEMINI_KEY, LEGACY_GEMINI_KEY));
  const [geminiDraftKey, setGeminiDraftKey] = useState(() => readLocalWithLegacy(GEMINI_KEY, LEGACY_GEMINI_KEY));
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('velox_gemini_model') || '');
  const [geminiDraftModel, setGeminiDraftModel] = useState(() => localStorage.getItem('velox_gemini_model') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('velox_openai_api_key') || '');
  const [openaiDraftKey, setOpenaiDraftKey] = useState(() => localStorage.getItem('velox_openai_api_key') || '');
  const [openaiModel, setOpenaiModel] = useState(() => localStorage.getItem('velox_openai_model') || '');
  const [openaiDraftModel, setOpenaiDraftModel] = useState(() => localStorage.getItem('velox_openai_model') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('velox_claude_api_key') || '');
  const [claudeDraftKey, setClaudeDraftKey] = useState(() => localStorage.getItem('velox_claude_api_key') || '');
  const [claudeModel, setClaudeModel] = useState(() => localStorage.getItem('velox_claude_model') || '');
  const [claudeDraftModel, setClaudeDraftModel] = useState(() => localStorage.getItem('velox_claude_model') || '');
  const [localUrl, setLocalUrl] = useState(() => localStorage.getItem('velox_local_url') || 'http://localhost:11434');
  const [localUrlDraft, setLocalUrlDraft] = useState(() => localStorage.getItem('velox_local_url') || 'http://localhost:11434');
  const [localModel, setLocalModel] = useState(() => localStorage.getItem('velox_local_model') || 'llama3');
  const [localModelDraft, setLocalModelDraft] = useState(() => localStorage.getItem('velox_local_model') || 'llama3');
  const [aiSaveMessage, setAiSaveMessage] = useState('');
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [wordQuery, setWordQuery] = useState('');
  const [dictionaryResult, setDictionaryResult] = useState<any>(null);
  const [comprehensionResult, setComprehensionResult] = useState<any>(null);
  const [insightsResult, setInsightsResult] = useState<any>(null);

  const refreshAiStatus = useCallback((
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
      if (geminiModel) headers['x-ai-model'] = geminiModel;
    } else if (provider === 'openai' && openaiKey) {
      headers['x-ai-api-key'] = openaiKey;
      if (openaiModel) headers['x-ai-model'] = openaiModel;
    } else if (provider === 'claude' && claudeKey) {
      headers['x-ai-api-key'] = claudeKey;
      if (claudeModel) headers['x-ai-model'] = claudeModel;
    } else if (provider === 'local') {
      headers['x-ai-local-url'] = lUrl;
      headers['x-ai-model'] = lModel;
    }

    fetch('/api/ai/status', { headers })
      .then(response => response.json())
      .then(data => setAiStatus({ enabled: Boolean(data.enabled), provider: data.provider || 'none', checked: true }))
      .catch(() => setAiStatus({ enabled: false, provider: 'none', checked: true }));
  }, [aiProvider, geminiApiKey, geminiModel, openaiApiKey, openaiModel, claudeApiKey, claudeModel, localUrl, localModel]);

  useEffect(() => {
    refreshAiStatus(aiProvider, geminiApiKey, openaiApiKey, claudeApiKey, localUrl, localModel);
  }, [aiProvider, geminiApiKey, openaiApiKey, claudeApiKey, localUrl, localModel, refreshAiStatus]);

  const saveAiSettings = useCallback((
    provider: string,
    geminiKey: string,
    openaiKey: string,
    claudeKey: string,
    lUrl: string,
    lModel: string,
    gModel = '',
    oModel = '',
    cModel = ''
  ) => {
    localStorage.setItem('velox_ai_provider', provider);
    setAiProvider(provider);

    localStorage.setItem(GEMINI_KEY, geminiKey.trim());
    setGeminiApiKey(geminiKey.trim());
    setGeminiDraftKey(geminiKey.trim());

    localStorage.setItem('velox_gemini_model', gModel.trim());
    setGeminiModel(gModel.trim());
    setGeminiDraftModel(gModel.trim());

    localStorage.setItem('velox_openai_api_key', openaiKey.trim());
    setOpenaiApiKey(openaiKey.trim());
    setOpenaiDraftKey(openaiKey.trim());

    localStorage.setItem('velox_openai_model', oModel.trim());
    setOpenaiModel(oModel.trim());
    setOpenaiDraftModel(oModel.trim());

    localStorage.setItem('velox_claude_api_key', claudeKey.trim());
    setClaudeApiKey(claudeKey.trim());
    setClaudeDraftKey(claudeKey.trim());

    localStorage.setItem('velox_claude_model', cModel.trim());
    setClaudeModel(cModel.trim());
    setClaudeDraftModel(cModel.trim());

    localStorage.setItem('velox_local_url', lUrl.trim());
    setLocalUrl(lUrl.trim());
    setLocalUrlDraft(lUrl.trim());

    localStorage.setItem('velox_local_model', lModel.trim());
    setLocalModel(lModel.trim());
    setLocalModelDraft(lModel.trim());

    setAiSaveMessage(lang === 'tr' ? 'Yapay zeka ayarları kaydedildi.' : 'AI settings saved.');
    refreshAiStatus(provider, geminiKey, openaiKey, claudeKey, lUrl, lModel);
  }, [lang, refreshAiStatus]);

  const clearAiSettings = useCallback(() => {
    localStorage.removeItem('velox_ai_provider');
    setAiProvider('gemini');

    localStorage.removeItem(GEMINI_KEY);
    localStorage.removeItem(LEGACY_GEMINI_KEY);
    setGeminiApiKey('');
    setGeminiDraftKey('');
    
    localStorage.removeItem('velox_gemini_model');
    setGeminiModel('');
    setGeminiDraftModel('');

    localStorage.removeItem('velox_openai_api_key');
    setOpenaiApiKey('');
    setOpenaiDraftKey('');

    localStorage.removeItem('velox_openai_model');
    setOpenaiModel('');
    setOpenaiDraftModel('');

    localStorage.removeItem('velox_claude_api_key');
    setClaudeApiKey('');
    setClaudeDraftKey('');

    localStorage.removeItem('velox_claude_model');
    setClaudeModel('');
    setClaudeDraftModel('');

    localStorage.removeItem('velox_local_url');
    setLocalUrl('http://localhost:11434');
    setLocalUrlDraft('http://localhost:11434');

    localStorage.removeItem('velox_local_model');
    setLocalModel('llama3');
    setLocalModelDraft('llama3');

    setAiStatus({ enabled: false, provider: 'none', checked: true });
    setAiSaveMessage(lang === 'tr' ? 'Yapay zeka ayarları sıfırlandı.' : 'AI settings reset.');
  }, [lang]);

  const aiHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ai-provider': aiProvider,
      'x-ai-lang': lang
    };
    if (aiProvider === 'gemini' && geminiApiKey) {
      headers['x-ai-api-key'] = geminiApiKey;
      headers['x-gemini-api-key'] = geminiApiKey;
      if (geminiModel) headers['x-ai-model'] = geminiModel;
    } else if (aiProvider === 'openai' && openaiApiKey) {
      headers['x-ai-api-key'] = openaiApiKey;
      if (openaiModel) headers['x-ai-model'] = openaiModel;
    } else if (aiProvider === 'claude' && claudeApiKey) {
      headers['x-ai-api-key'] = claudeApiKey;
      if (claudeModel) headers['x-ai-model'] = claudeModel;
    } else if (aiProvider === 'local') {
      headers['x-ai-local-url'] = localUrl;
      headers['x-ai-model'] = localModel;
    }
    return headers;
  }, [aiProvider, lang, geminiApiKey, geminiModel, openaiApiKey, openaiModel, claudeApiKey, claudeModel, localUrl, localModel]);

  const postAi = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Yapay zeka isteği tamamlanamadı.');
    return data;
  }, [aiHeaders]);

  const generateAiSummary = useCallback(async () => {
    if (!selectedBook || aiBusy) return;
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
  }, [selectedBook, aiBusy, postAi, refreshBooks]);

  const generateDifficultyAnalysis = useCallback(async () => {
    if (!selectedBook || aiBusy) return;
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
  }, [selectedBook, aiBusy, postAi, refreshBooks]);

  const generateWordDefinition = useCallback(async () => {
    if (!selectedBook || !wordQuery.trim() || aiBusy) return;
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
  }, [selectedBook, wordQuery, aiBusy, postAi]);

  const generateComprehension = useCallback(async () => {
    if (!selectedBook || aiBusy) return;
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
  }, [selectedBook, aiBusy, postAi, refreshBooks]);

  const generateInsights = useCallback(async () => {
    if (!selectedBook || aiBusy) return;
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
  }, [selectedBook, aiBusy, postAi, refreshBooks]);

  useEffect(() => {
    if (selectedBook) {
      setComprehensionResult(selectedBook.comprehensionQuestions || null);
      setInsightsResult(selectedBook.insightsResult || null);
    } else {
      setComprehensionResult(null);
      setInsightsResult(null);
    }
  }, [selectedBook]);

  return {
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
    openaiModel,
    openaiDraftModel,
    setOpenaiDraftModel,
    claudeApiKey,
    setClaudeApiKey,
    claudeDraftKey,
    setClaudeDraftKey,
    claudeModel,
    claudeDraftModel,
    setClaudeDraftModel,
    geminiModel,
    geminiDraftModel,
    setGeminiDraftModel,
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
  };
}
