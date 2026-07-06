/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../utils/i18n';

export function EditFlashcardsModal({ bookId, bookTitle, cards, onClose, onSave, isLightTheme, surfaceClass, titleClass, mutedClass }: any) {
  const { t, lang } = useTranslation();
  const [editedCards, setEditedCards] = useState<any[]>(() => {
    return JSON.parse(JSON.stringify(cards));
  });

  const handleUpdateCard = (idx: number, field: string, val: string) => {
    const updated = [...editedCards];
    updated[idx] = { ...updated[idx], [field]: val };
    setEditedCards(updated);
  };

  const handleDeleteCard = (idx: number) => {
    const updated = editedCards.filter((_, i) => i !== idx);
    setEditedCards(updated);
  };

  const handleAddCard = () => {
    setEditedCards([...editedCards, {
      id: 'custom-card-' + Date.now(),
      bookId,
      bookTitle,
      front: '',
      back: '',
      status: 'normal',
      reviewsCount: 0
    }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border flex flex-col shadow-2xl ${surfaceClass}`}>
        {/* Header */}
        <div className="p-5 border-b border-stone-250/50 dark:border-zinc-850 flex justify-between items-center">
          <div>
            <h3 className={`text-base font-black ${titleClass}`}>{t('fc_edit_title' as any)}</h3>
            <p className={`text-[11px] ${mutedClass} mt-0.5`}>
              {bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : bookTitle}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 custom-note-scrollbar">
          {editedCards.length === 0 ? (
            <p className="text-xs text-center opacity-60 py-6">{t('fc_edit_no_cards' as any)}</p>
          ) : (
            editedCards.map((card, idx) => (
              <div key={card.id || idx} className={`p-4 rounded-2xl border ${isLightTheme ? 'border-stone-200 bg-stone-50' : 'border-zinc-850 bg-zinc-900/10'} flex flex-col gap-3 relative group`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-500 uppercase">{t('fc_edit_card' as any)} {idx + 1}</span>
                  <button
                    onClick={() => handleDeleteCard(idx)}
                    className="text-rose-500 hover:text-rose-600 text-xs font-bold"
                  >
                    {t('fc_edit_remove_card' as any)}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] opacity-75">{t('fc_front_label' as any)}</label>
                    <textarea
                      value={card.front}
                      onChange={(e) => handleUpdateCard(idx, 'front', e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs leading-relaxed resize-none h-16 focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] opacity-75">{t('fc_back_label' as any)}</label>
                    <textarea
                      value={card.back}
                      onChange={(e) => handleUpdateCard(idx, 'back', e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs leading-relaxed resize-none h-16 focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-805 bg-zinc-950 text-zinc-100'}`}
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add New Card Button */}
          <button
            onClick={handleAddCard}
            className={`h-10 w-full rounded-xl border-2 border-dashed text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isLightTheme ? 'border-stone-250 hover:bg-stone-50 text-stone-700' : 'border-zinc-800 hover:bg-zinc-900/30 text-zinc-400'
            }`}
          >
            + {t('fc_edit_add_card' as any)}
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
            onClick={() => onSave(editedCards)}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20"
          >
            {t('fc_edit_save' as any)}
          </button>
        </div>
      </div>
    </div>
  );
}
