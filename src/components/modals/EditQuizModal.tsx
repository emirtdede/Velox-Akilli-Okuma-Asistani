/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../utils/i18n';

export function EditQuizModal({ quiz, onClose, onSave, isLightTheme, surfaceClass, titleClass, mutedClass }: any) {
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
