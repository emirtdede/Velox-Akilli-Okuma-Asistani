/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface ActivityScatterChartProps {
  isLightTheme: boolean;
  lang: string;
  okumaPoints: any[];
  quizPoints: any[];
  cardPoints: any[];
  aiPoints: any[];
  clickPoints: any[];
}

export function ActivityScatterChart({
  isLightTheme,
  lang,
  okumaPoints,
  quizPoints,
  cardPoints,
  aiPoints,
  clickPoints
}: ActivityScatterChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
        <XAxis dataKey="day" type="category" allowDuplicatedCategory={false} tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis dataKey="count" type="number" tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 8 }} />
        <Scatter name={lang === 'tr' ? 'Okuma (Kelime x150)' : 'Reading (Words x150)'} data={okumaPoints} fill="#4f46e5" />
        <Scatter name={lang === 'tr' ? 'Sınavlar' : 'Quizzes'} data={quizPoints} fill="#ec4899" />
        <Scatter name={lang === 'tr' ? 'Kart Çalışması' : 'Card Practice'} data={cardPoints} fill="#10b981" />
        <Scatter name={lang === 'tr' ? 'Yapay Zeka' : 'Artificial Intelligence'} data={aiPoints} fill="#8b5cf6" />
        <Scatter name={lang === 'tr' ? 'Tıklamalar' : 'Clicks'} data={clickPoints} fill="#f59e0b" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

interface ProgressLineChartProps {
  isLightTheme: boolean;
  data: any[];
  dataKey?: string;
  stroke?: string;
}

export function ProgressLineChart({
  isLightTheme,
  data,
  dataKey = 'words',
  stroke = '#4f46e5'
}: ProgressLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
        <XAxis dataKey="date" tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 12 }} />
        <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DistributionBarChartProps {
  isLightTheme: boolean;
  data: any[];
  xAxisKey: string;
  dataKey?: string;
  name?: string;
  fill?: string;
  fontSize?: number;
}

export function DistributionBarChart({
  isLightTheme,
  data,
  xAxisKey,
  dataKey = 'count',
  name = 'Count',
  fill = '#ec4899',
  fontSize = 9
}: DistributionBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? '#e7e5e4' : '#27272a'} />
        <XAxis dataKey={xAxisKey} tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: isLightTheme ? '#57534e' : '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: isLightTheme ? '#ffffff' : '#09090b', border: isLightTheme ? '1px solid #e7e5e4' : '1px solid #27272a', borderRadius: 12 }} />
        <Bar dataKey={dataKey} name={name} fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
