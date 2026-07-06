/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ChevronsRight,
  ChevronLeft,
  X,
  Plus,
  Home,
  BookOpen,
  LibraryBig,
  Brain,
  Target,
  Activity,
  HelpCircle,
  Settings,
  Shield
} from 'lucide-react';
import { useTranslation } from '../../utils/i18n';
import { AppTab, SidebarMode, ThemeConfig } from '../../types';

export const APP_NAME = 'Velox';

export const NAV_ITEMS = [
  { tab: 'home' as AppTab, icon: Home, label: 'Anasayfa' },
  { tab: 'reader' as AppTab, icon: BookOpen, label: 'Okuma Alanı' },
  { tab: 'workspace' as AppTab, icon: LibraryBig, label: 'Çalışma Alanı', bookAware: true },
  { tab: 'quiz' as AppTab, icon: Brain, label: 'Hatırlama & Quiz' },
  { tab: 'training' as AppTab, icon: Target, label: 'Training Lab' },
  { tab: 'progress' as AppTab, icon: Activity, label: 'İlerleme & Gelişim' },
  { tab: 'guide' as AppTab, icon: HelpCircle, label: 'Uygulama Rehberi' },
  { tab: 'settings' as AppTab, icon: Settings, label: 'Ayarlar' },
  { tab: 'about' as AppTab, icon: Shield, label: 'Hakkında' }
];

export function Sidebar({
  activeTab,
  aiEnabled,
  mode,
  theme,
  onAdd,
  onNavigate,
  onSetMode
}: {
  activeTab: AppTab;
  aiEnabled: boolean;
  mode: SidebarMode;
  theme: ThemeConfig;
  onAdd: () => void;
  onNavigate: (tab: AppTab) => void;
  onSetMode: (mode: SidebarMode) => void;
}) {
  const { t } = useTranslation();

  if (mode === 'hidden') {
    return (
      <button
        onClick={() => onSetMode('full')}
        title={t('nav_settings')}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 h-14 w-7 rounded-r-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 grid place-items-center transition-all"
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    );
  }

  const isFull = mode === 'full';
  const isCompact = mode === 'compact';
  const labelClass = isFull ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none';

  return (
    <aside className={`group/sidebar w-full ${isFull ? 'md:w-[280px]' : 'md:w-[76px]'} shrink-0 border-b md:border-b-0 md:border-r ${theme.border} ${theme.cardBg} md:h-screen md:sticky md:top-0 z-30 overflow-hidden transition-[width] duration-300 ease-out`}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          <div className={`flex items-center ${isFull ? 'justify-between' : 'justify-center'} gap-3 min-w-0`}>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => isCompact && onSetMode('full')}
                title={isCompact ? 'Expand Menu' : APP_NAME}
                className={`${isCompact ? 'cursor-pointer group/brand' : 'cursor-default'} relative h-12 w-12 grid place-items-center bg-transparent shrink-0 overflow-hidden`}
              >
                <img src="/velox-icon.svg" alt="Velox" className={`${isCompact ? 'group-hover/brand:opacity-0' : ''} w-12 h-12 object-contain transition-opacity`} />
                {isCompact && <ChevronsRight className="absolute w-5 h-5 opacity-0 group-hover/brand:opacity-100 transition-opacity text-indigo-500" />}
              </button>
              <div className={`${labelClass} transition-all duration-200 min-w-0 overflow-hidden`}>
                <h1 className="text-lg font-black tracking-tight text-indigo-500 leading-tight">Velox</h1>
                <p className="text-[10px] opacity-65 whitespace-nowrap">{t('home_subtitle')}</p>
              </div>
            </div>
            {isFull && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onSetMode('compact')} title="Minimize" className={`h-8 w-8 rounded-lg border ${theme.border} grid place-items-center text-stone-500 dark:text-zinc-400 hover:text-current`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => onSetMode('hidden')} title="Hide" className={`h-8 w-8 rounded-lg border ${theme.border} grid place-items-center text-stone-500 dark:text-zinc-400 hover:text-current`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onAdd}
            title={isCompact ? t('home_action_add') : undefined}
            className={`${isCompact ? 'justify-center px-0 gap-0' : 'px-3 gap-3'} h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center shadow-lg shadow-indigo-600/15`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className={`${labelClass} whitespace-nowrap transition-all overflow-hidden`}>{t('home_action_add')}</span>
          </button>

          <div title={isCompact ? (aiEnabled ? t('st_ai_status_active') : t('st_ai_status_passive')) : undefined} className={`${isCompact ? 'justify-center px-0 gap-0' : 'px-3 gap-3'} h-10 rounded-xl border ${theme.border} bg-white/[0.025] flex items-center`}>
            <span className={`w-2 h-2 rounded-full ${aiEnabled ? 'bg-emerald-400' : 'bg-stone-500'}`} />
            <span className={`${labelClass} text-[10px] font-black uppercase tracking-wide whitespace-nowrap transition-all overflow-hidden`}>
              {aiEnabled ? t('st_ai_status_active') : t('st_ai_status_passive')}
            </span>
          </div>

          <nav className="flex flex-col gap-2 pt-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.tab}
                onClick={() => onNavigate(item.tab)}
                title={t(`nav_${item.tab}` as any)}
                className={`${isCompact ? 'justify-center px-0 gap-0' : 'px-3 gap-3'} h-11 rounded-xl flex items-center text-xs font-bold transition-all ${
                  activeTab === item.tab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900/70'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className={`${labelClass} whitespace-nowrap transition-all overflow-hidden`}>
                  {t(`nav_${item.tab}` as any)}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div />
      </div>
    </aside>
  );
}
