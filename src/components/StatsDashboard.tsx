/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, BookOpen, Flame, RefreshCw, Timer, CalendarRange, CalendarDays } from 'lucide-react';
import { ThemeType, UserStats } from '../types';
import { StorageService } from '../utils/storage';

interface StatsDashboardProps {
  stats: UserStats;
  onStatsModified: (newStats: UserStats) => void;
  themeType?: ThemeType;
}

type RangePreset = '1d' | '7d' | '30d' | '6m' | '1y' | 'custom';

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDayLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) return dateKey;
  return `${day}.${month}`;
}

function prettyDate(date: Date) {
  return date.toLocaleDateString('tr-TR');
}

function shiftDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function DateField({
  label,
  value,
  onChange,
  isLightTheme,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isLightTheme: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-[180px]">
      <span className={`text-[11px] font-bold ${isLightTheme ? 'text-stone-700' : 'opacity-65'}`}>{label}</span>
      <div className="relative">
        <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none appearance-none border ${
            isLightTheme
              ? 'border-stone-300 bg-white text-stone-900'
              : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs'
          }`}
          style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
        />
      </div>
    </label>
  );
}

export default function StatsDashboard({ stats, onStatsModified, themeType = 'dark' }: StatsDashboardProps) {
  const [goalInput, setGoalInput] = useState(String(stats.dailyGoalWords || 3000));
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    setGoalInput(String(stats.dailyGoalWords || 3000));
  }, [stats.dailyGoalWords]);

  useEffect(() => {
    if (rangePreset !== 'custom') return;
    if (!customStart) setCustomStart(toDateKey(shiftDays(new Date(), -6)));
    if (!customEnd) setCustomEnd(toDateKey(new Date()));
  }, [rangePreset, customStart, customEnd]);

  const isLightTheme = themeType === 'light';
  const todayKey = toDateKey(new Date());
  const todayWords = stats.history.find(item => item.date === todayKey)?.wordCount || 0;
  const dailyGoal = Math.max(1, stats.dailyGoalWords || 3000);
  const dailyProgress = Math.min(100, Math.round((todayWords / dailyGoal) * 100));

  const rangeBounds = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (rangePreset) {
      case '1d':
        break;
      case '7d':
        start.setDate(start.getDate() - 6);
        break;
      case '30d':
        start.setDate(start.getDate() - 29);
        break;
      case '6m':
        start.setMonth(start.getMonth() - 5);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'custom':
        return {
          start: customStart ? new Date(`${customStart}T12:00:00`) : shiftDays(new Date(), -6),
          end: customEnd ? new Date(`${customEnd}T12:00:00`) : new Date()
        };
    }

    return { start, end };
  }, [rangePreset, customStart, customEnd]);

  const chartData = useMemo(() => {
    const historyMap = new Map(stats.history.map(item => [item.date, item]));
    const days: Array<{ date: string; words: number; minutes: number }> = [];
    const cursor = new Date(rangeBounds.start);
    const end = new Date(rangeBounds.end);

    cursor.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);

    while (cursor <= end) {
      const key = toDateKey(cursor);
      const entry = historyMap.get(key);
      days.push({
        date: formatDayLabel(key),
        words: entry?.wordCount || 0,
        minutes: Math.round((entry?.durationSeconds || 0) / 60)
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [stats.history, rangeBounds.start, rangeBounds.end]);

  const rangeSummary = useMemo(() => {
    const startLabel = prettyDate(rangeBounds.start);
    const endLabel = prettyDate(rangeBounds.end);
    return toDateKey(rangeBounds.start) === toDateKey(rangeBounds.end) ? startLabel : `${startLabel} - ${endLabel}`;
  }, [rangeBounds.start, rangeBounds.end]);

  const surfaceClass = isLightTheme
    ? 'bg-white border border-stone-300 shadow-[0_1px_0_rgba(0,0,0,0.02)]'
    : 'bg-stone-100/40 dark:bg-zinc-950/40 border border-stone-200/70 dark:border-zinc-800';
  const headingClass = isLightTheme ? 'text-stone-900' : 'text-current';
  const mutedClass = isLightTheme ? 'text-stone-600' : 'opacity-65';
  const secondaryButtonClass = isLightTheme
    ? 'border-stone-300 bg-white text-stone-900 hover:bg-stone-50'
    : 'border-stone-200 dark:border-zinc-800 text-xs font-bold';

  const handleSaveGoal = () => {
    const parsed = Number.parseInt(goalInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const updated = StorageService.updateDailyGoal(parsed);
    onStatsModified(updated);
    setIsEditingGoal(false);
  };

  const handleResetStats = () => {
    if (!confirm('Tüm okuma istatistikleri ve günlük kayıtlar sıfırlansın mı?')) return;
    const updated = StorageService.resetStats();
    onStatsModified(updated);
    setGoalInput(String(updated.dailyGoalWords || 3000));
    setIsEditingGoal(false);
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={`text-2xl font-extrabold tracking-tight ${headingClass}`}>Bilişsel Seviye Kontrol Merkezi</h2>
          <p className={`text-sm mt-1 ${mutedClass}`}>Sade özet, günlük hedef ve seçtiğin tarih aralığının okuma grafiği.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard themeType={themeType} icon={BookOpen} label="Kelime Okundu" value={stats.totalWordsRead.toLocaleString()} />
        <MetricCard themeType={themeType} icon={Timer} label="Okuma Süresi" value={`${Math.round(stats.totalReadingTimeSeconds / 60)} dk`} />
        <MetricCard themeType={themeType} icon={Flame} label="Günlük Seri" value={`${stats.dailyStreak || 0} gün`} />
        <MetricCard themeType={themeType} icon={Award} label="En Yüksek Hız" value={`${stats.maxSpeedWpm || 0} WPM`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-12 rounded-3xl p-5 flex flex-col gap-4 ${surfaceClass}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className={`text-sm font-black ${headingClass}`}>Günlük Okuma Hedefi</h3>
              <p className={`text-xs mt-1 ${mutedClass}`}>Bugün okunan: {todayWords.toLocaleString()} / {dailyGoal.toLocaleString()} kelime</p>
            </div>
            <div className="flex items-center gap-2">
              {isEditingGoal ? (
                <>
                  <input
                    value={goalInput}
                    onChange={(event) => setGoalInput(event.target.value)}
                    type="number"
                    min={1}
                    className={`w-28 px-3 py-2 rounded-xl text-xs outline-none border ${
                      isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  />
                  <button onClick={handleSaveGoal} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">Kaydet</button>
                  <button onClick={() => setIsEditingGoal(false)} className={`px-4 py-2 rounded-xl border ${secondaryButtonClass}`}>Vazgeç</button>
                </>
              ) : (
                <button onClick={() => setIsEditingGoal(true)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Hedefi Düzenle</button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold">
            <span className={isLightTheme ? 'text-stone-700' : 'text-stone-500 dark:text-zinc-400'}>{dailyProgress}%</span>
            <span className="text-indigo-600 dark:text-indigo-400">Kalan {Math.max(0, dailyGoal - todayWords).toLocaleString()} kelime</span>
          </div>

          <div className="h-2 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${dailyProgress}%` }} />
          </div>
        </div>

        <div className={`xl:col-span-12 rounded-3xl p-5 flex flex-col gap-4 ${surfaceClass}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className={`text-sm font-black ${headingClass}`}>Son Okuma Raporu (Kelime Sayısı)</h3>
              <p className={`text-xs mt-1 ${mutedClass}`}>Seçili aralık: {rangeSummary}</p>
            </div>
            <button
              onClick={handleResetStats}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${secondaryButtonClass}`}
            >
              <RefreshCw className="w-4 h-4" />
              Kayıtları Temizle
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: '1d', label: '1 Gün' },
                { id: '7d', label: '7 Gün' },
                { id: '30d', label: '30 Gün' },
                { id: '6m', label: '6 Ay' },
                { id: '1y', label: '1 Yıl' },
                { id: 'custom', label: 'Özel Aralık' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setRangePreset(option.id as RangePreset)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    rangePreset === option.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : isLightTheme
                        ? 'border-stone-300 bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50'
                        : 'border-stone-200 dark:border-zinc-800 text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {rangePreset === 'custom' && (
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <DateField label="Başlangıç" value={customStart} onChange={setCustomStart} isLightTheme={isLightTheme} />
                <DateField label="Bitiş" value={customEnd} onChange={setCustomEnd} isLightTheme={isLightTheme} />
                <button
                  onClick={() => {
                    setCustomStart(current => current || toDateKey(shiftDays(new Date(), -6)));
                    setCustomEnd(current => current || toDateKey(new Date()));
                  }}
                  className={`px-4 py-2 rounded-xl border ${secondaryButtonClass}`}
                >
                  Aralığı Uygula
                </button>
              </div>
            )}
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 12, bottom: 8, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: isLightTheme ? '#ffffff' : '#0a0a0a',
                    border: isLightTheme ? '1px solid #d4d4d8' : '1px solid #27272a',
                    borderRadius: 12,
                    color: isLightTheme ? '#111827' : '#f4f4f5',
                    fontSize: 12
                  }}
                  labelStyle={{ color: isLightTheme ? '#52525b' : '#a1a1aa' }}
                  formatter={(value: number) => [`${value.toLocaleString()} kelime`, 'Okunan']}
                />
                <Line
                  type="monotone"
                  dataKey="words"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className={`text-[11px] flex items-center gap-2 ${mutedClass}`}>
              <CalendarRange className="w-4 h-4" />
              Grafik, seçtiğin tarih aralığındaki günlük kayıtları gösterir.
            </p>
            <button
              onClick={handleResetStats}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${secondaryButtonClass}`}
            >
              <RefreshCw className="w-4 h-4" />
              Kayıtları Temizle
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  themeType,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  themeType: ThemeType;
}) {
  const isLightTheme = themeType === 'light';
  return (
    <div className={`p-5 rounded-2xl flex items-start gap-4 min-h-[112px] ${isLightTheme ? 'border border-stone-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]' : 'border border-stone-200/70 dark:border-zinc-800 bg-stone-100/40 dark:bg-zinc-950/40'}`}>
      <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-medium uppercase tracking-wide ${isLightTheme ? 'text-stone-700' : 'opacity-60'}`}>{label}</p>
        <div className="text-3xl font-black tracking-tight mt-1 text-stone-900 dark:text-current">{value}</div>
      </div>
    </div>
  );
}
