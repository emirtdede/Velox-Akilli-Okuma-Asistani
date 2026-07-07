/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

export function useAssessmentAndCards() {
  const [quizHistory, setQuizHistory] = useState<any[]>(() => {
    const history = localStorage.getItem('velox_quiz_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const sampleHistory: any[] = [];
    localStorage.setItem('velox_quiz_history', JSON.stringify(sampleHistory));
    return sampleHistory;
  });

  const [flashcards, setFlashcards] = useState<any[]>(() => {
    const cards = localStorage.getItem('velox_flashcards');
    if (cards) {
      try {
        const parsed = JSON.parse(cards);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const sampleFlashcards: any[] = [];
    localStorage.setItem('velox_flashcards', JSON.stringify(sampleFlashcards));
    return sampleFlashcards;
  });

  return {
    quizHistory,
    setQuizHistory,
    flashcards,
    setFlashcards
  };
}
