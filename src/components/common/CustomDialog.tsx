/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from '../../utils/i18n';

export function CustomDialog({ config, onClose, surfaceClass, titleClass, mutedClass, isLightTheme }: any) {
  const { lang } = useTranslation();
  if (!config || !config.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-md overflow-hidden rounded-3xl border flex flex-col shadow-2xl p-6 gap-5 ${surfaceClass}`}>
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>{config.title}</h3>
          <p className={`text-xs mt-2 leading-relaxed ${mutedClass}`}>{config.message}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {config.type === 'confirm' && (
            <button
              onClick={() => {
                if (config.onCancel) config.onCancel();
                onClose();
              }}
              className={`h-10 px-4 rounded-xl border text-xs font-bold transition-all ${
                isLightTheme
                  ? 'border-stone-250 bg-white hover:bg-stone-50 text-stone-700'
                  : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50 text-zinc-300'
              }`}
            >
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </button>
          )}
          <button
            onClick={() => {
              if (config.onConfirm) config.onConfirm();
              onClose();
            }}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
          >
            {config.type === 'confirm' ? (lang === 'tr' ? 'Onayla' : 'Confirm') : (lang === 'tr' ? 'Tamam' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}
