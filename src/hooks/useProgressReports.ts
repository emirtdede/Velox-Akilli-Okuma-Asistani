/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

export interface ReportHistoryItem {
  id: string;
  date: string;
  content: string;
}

export function useProgressReports() {
  const [userGoals, setUserGoals] = useState<any>(() => {
    const stored = localStorage.getItem('velox_user_goals');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.showReadingGoal === undefined) parsed.showReadingGoal = true;
        if (parsed.showQuizzesGoal === undefined) parsed.showQuizzesGoal = true;
        if (parsed.showCardsGoal === undefined) parsed.showCardsGoal = true;
        return parsed;
      } catch (e) {}
    }
    const defaultGoals = {
      dailyWords: 3000,
      monthlyWords: 90000,
      yearlyWords: 1000000,
      dailyMinutes: 30,
      monthlyMinutes: 900,
      yearlyMinutes: 10000,
      dailyQuizzes: 1,
      monthlyQuizzes: 15,
      yearlyQuizzes: 100,
      dailyCards: 15,
      monthlyCards: 300,
      yearlyCards: 3000,
      showReadingGoal: true,
      showQuizzesGoal: true,
      showCardsGoal: true
    };
    localStorage.setItem('velox_user_goals', JSON.stringify(defaultGoals));
    return defaultGoals;
  });

  const [readingReport, setReadingReport] = useState<string>(() => {
    return localStorage.getItem('velox_reading_report_active') || '';
  });
  const [quizReport, setQuizReport] = useState<string>(() => {
    return localStorage.getItem('velox_quiz_report_active') || '';
  });
  const [cardReport, setCardReport] = useState<string>(() => {
    return localStorage.getItem('velox_card_report_active') || '';
  });

  const [readingReportHistory, setReadingReportHistory] = useState<ReportHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('velox_reading_reports_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [quizReportHistory, setQuizReportHistory] = useState<ReportHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('velox_quiz_reports_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [cardReportHistory, setCardReportHistory] = useState<ReportHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('velox_card_reports_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [reportLoading, setReportLoading] = useState<string | null>(null);

  const handleDeleteHistoryItem = useCallback((category: 'reading' | 'quiz' | 'cards', id: string) => {
    if (category === 'reading') {
      setReadingReportHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        localStorage.setItem('velox_reading_reports_history', JSON.stringify(updated));
        return updated;
      });
    } else if (category === 'quiz') {
      setQuizReportHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        localStorage.setItem('velox_quiz_reports_history', JSON.stringify(updated));
        return updated;
      });
    } else if (category === 'cards') {
      setCardReportHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        localStorage.setItem('velox_card_reports_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  return {
    userGoals,
    setUserGoals,
    readingReport,
    setReadingReport,
    quizReport,
    setQuizReport,
    cardReport,
    setCardReport,
    readingReportHistory,
    setReadingReportHistory,
    quizReportHistory,
    setQuizReportHistory,
    cardReportHistory,
    setCardReportHistory,
    reportLoading,
    setReportLoading,
    handleDeleteHistoryItem
  };
}
