/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';

export interface TrainingSession {
  type: string;
  duration: number;
  score: number;
  accuracy: number;
}

export interface TrainingStats {
  totalDuration: number;
  totalSessions: number;
  bestScore: number;
  lastDate: string;
}

export function useCognitiveTraining(lang: string) {
  const [trainingLevel, setTrainingLevelRaw] = useState<string>(() => {
    return localStorage.getItem('velox_training_level') || 'beginner';
  });

  const setTrainingLevel = useCallback((level: string) => {
    setTrainingLevelRaw(level);
    localStorage.setItem('velox_training_level', level);
  }, []);

  const [trainingStats, setTrainingStats] = useState<TrainingStats>(() => {
    try {
      const stored = localStorage.getItem('velox_training_stats');
      return stored ? JSON.parse(stored) : { totalDuration: 0, totalSessions: 0, bestScore: 0, lastDate: '-' };
    } catch {
      return { totalDuration: 0, totalSessions: 0, bestScore: 0, lastDate: '-' };
    }
  });

  const [trainingHistory, setTrainingHistory] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('velox_training_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSaveTrainingSession = useCallback((session: TrainingSession) => {
    const completedAt = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newSession = {
      id: 'session-' + Date.now(),
      type: session.type,
      duration: session.duration,
      score: session.score,
      accuracy: session.accuracy,
      completedAt
    };

    setTrainingHistory(prevHistory => {
      const newHistory = [newSession, ...prevHistory];
      localStorage.setItem('velox_training_history', JSON.stringify(newHistory));
      return newHistory;
    });

    setTrainingStats(prevStats => {
      const totalDur = (prevStats?.totalDuration || 0) + session.duration;
      const totalSess = (prevStats?.totalSessions || 0) + 1;
      const bestS = Math.max(prevStats?.bestScore || 0, session.score);
      const newStats = {
        totalDuration: totalDur,
        totalSessions: totalSess,
        bestScore: bestS,
        lastDate: completedAt
      };
      localStorage.setItem('velox_training_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, [lang]);

  return {
    trainingLevel,
    setTrainingLevel,
    trainingStats,
    trainingHistory,
    handleSaveTrainingSession
  };
}
