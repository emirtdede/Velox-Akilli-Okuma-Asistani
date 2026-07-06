/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from '../../utils/i18n';

export function PageHeader({ title, description, titleClass, mutedClass }: { title: string; description: string; titleClass: string; mutedClass: string }) {
  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight ${titleClass}`}>{title}</h2>
      <p className={`text-sm mt-1 ${mutedClass}`}>{description}</p>
    </div>
  );
}

export function MetricTile({ icon: Icon, label, value, surfaceClass, mutedClass }: { icon: any; label: string; value: string; surfaceClass: string; mutedClass: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-indigo-600/12 text-indigo-500 grid place-items-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-wide ${mutedClass}`}>{label}</p>
          <h3 className="text-2xl font-black mt-1">{value}</h3>
        </div>
      </div>
    </div>
  );
}

export function Panel({ title, children, surfaceClass, titleClass }: { title: string; children: React.ReactNode; surfaceClass: string; titleClass: string; mutedClass?: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
      <h3 className={`text-sm font-black ${titleClass}`}>{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function AiDisabledCard({ onOpenSettings, surfaceClass, mutedClass }: { onOpenSettings: () => void; surfaceClass: string; mutedClass: string }) {
  const { lang } = useTranslation();
  return (
    <div className={`rounded-2xl border p-6 ${surfaceClass}`}>
      <h3 className="text-base font-black">{lang === 'tr' ? 'AI Kapalı' : 'AI Offline / Disabled'}</h3>
      <p className={`text-sm mt-2 max-w-2xl leading-relaxed ${mutedClass}`}>
        {lang === 'tr'
          ? 'Yapay zeka özellikleri isteğe bağlıdır. Ayarlar sayfasından bir yapay zeka sağlayıcısı (Gemini, OpenAI, Claude veya Lokal Model) yapılandırdığınızda; metin özeti, zorluk analizi, kelime sözlüğü ve kavrama araçları aktif hale gelecektir.'
          : 'AI features are optional. Once you configure an AI provider (Gemini, OpenAI, Claude, or a Local Model) in Settings, text summaries, difficulty analysis, flashcards, and comprehension quiz tools will become active.'}
      </p>
      <button onClick={onOpenSettings} className="mt-4 h-10 px-4 rounded-xl bg-indigo-600 text-white text-xs font-black">
        {lang === 'tr' ? 'Ayarlara Git' : 'Go to Settings'}
      </button>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-zinc-800 text-stone-600 dark:text-zinc-400 text-sm">{text}</div>;
}
