/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, RotateCcw } from 'lucide-react';

export function ResultModal({
  onClose,
  correct,
  wrong,
  empty,
  total,
  score,
  onRetake,
  surfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  let encouragement = 'Mükemmel! Tam isabet.';
  if (score < 50) {
    encouragement = 'Biraz daha pratik ve okuma yapmaya ne dersin?';
  } else if (score < 80) {
    encouragement = 'Güzel deneme! Kendini geliştirmeye devam et.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-stone-900/40 dark:bg-black/60">
      <div className={`w-full max-w-md overflow-hidden rounded-3xl border flex flex-col shadow-2xl p-6 text-center gap-5 ${surfaceClass}`}>
        <div className="mx-auto h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
          <Trophy className="w-8 h-8 text-indigo-500" />
        </div>
        <div>
          <h3 className={`text-lg font-black ${titleClass}`}>Sınav Sonucu</h3>
          <p className="text-2xl font-black text-indigo-500 mt-2">%{score} Başarı</p>
          <p className={`text-xs mt-1 ${mutedClass}`}>{encouragement}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-2">
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
            <span className="text-[10px] font-black uppercase text-emerald-500 block">Doğru</span>
            <span className="text-lg font-black text-emerald-500 mt-1 block">{correct}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center">
            <span className="text-[10px] font-black uppercase text-rose-500 block">Yanlış</span>
            <span className="text-lg font-black text-rose-500 mt-1 block">{wrong}</span>
          </div>
          <div className="p-3 rounded-2xl bg-stone-500/5 border border-stone-500/20 text-center">
            <span className="text-[10px] font-black uppercase opacity-60 block">Boş</span>
            <span className="text-lg font-black opacity-75 mt-1 block">{empty}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className={`flex-1 h-11 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isLightTheme ? 'border-stone-250 bg-white hover:bg-stone-50 text-stone-700' : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50 text-zinc-300'}`}
          >
            <RotateCcw className="w-4 h-4" /> Tekrar Çöz
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
          >
            Soruları İncele
          </button>
        </div>
      </div>
    </div>
  );
}
