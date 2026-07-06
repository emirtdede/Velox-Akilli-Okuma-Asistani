/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ThemeType, THEMES, ThemeConfig } from '../types';
import { useTranslation } from '../utils/i18n';

interface ThemeSelectorProps {
  currentTheme: ThemeType;
  onChangeTheme: (theme: ThemeType) => void;
}

export default function ThemeSelector({ currentTheme, onChangeTheme }: ThemeSelectorProps) {
  const { lang } = useTranslation();
  return (
    <div className="flex flex-col gap-2 p-2">
      <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {lang === 'tr' ? "Arayüz Teması / Okuma Vibe'ı" : "Interface Theme / Reading Vibe"}
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {(Object.keys(THEMES) as ThemeType[]).map((key) => {
          const theme: ThemeConfig = THEMES[key];
          const isActive = currentTheme === key;
          const name = lang === 'tr' ? theme.name : (
            key === 'light' ? 'Minimal Light (Apple Style)' :
            key === 'dark' ? 'Elegant Dark (Velox)' :
            key === 'sepia' ? 'Sepia (Kindle Feel)' :
            key === 'amoled' ? 'AMOLED (Deep Black)' :
            key === 'nord' ? 'Nord (Ice Blue & Gray)' :
            key === 'matrix' ? 'Matrix (Hacker Dream)' : theme.name
          );

          return (
            <button
              key={key}
              id={`theme-btn-${key}`}
              onClick={() => onChangeTheme(key)}
              className={`flex flex-col items-center justify-between p-3 rounded-xl border text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 scale-102 shadow-sm'
                  : 'border-stone-200/60 hover:border-indigo-400'
              } ${theme.bg} ${theme.text}`}
            >
              {/* Vibe color preview */}
              <div className="flex gap-1 mb-2">
                <span className={`w-3 h-3 rounded-full border border-stone-200/20 ${theme.cardBg}`} />
                <span className={`w-3 h-3 rounded-full ${theme.accent}`} />
                <span className="w-3 h-3 rounded-full bg-red-500" />
              </div>
              <span className="text-xs font-medium truncate w-full">{name.split(' (')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
