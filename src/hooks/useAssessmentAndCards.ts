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
    const sampleHistory = [
      {
        id: "sample-history-1",
        bookTitle: "Velox okuma rehberi",
        date: new Date().toLocaleString('tr-TR'),
        correctCount: 3,
        wrongCount: 0,
        emptyCount: 0,
        totalQuestions: 3,
        difficulty: "Orta",
        score: 100
      },
      {
        id: "sample-history-2",
        bookTitle: "Yapay Zeka Okuması",
        date: new Date(Date.now() - 86400000).toLocaleString('tr-TR'),
        correctCount: 4,
        wrongCount: 1,
        emptyCount: 0,
        totalQuestions: 5,
        difficulty: "Kolay",
        score: 80
      }
    ];
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
    const sampleFlashcards = [
      {
        id: "sample-card-1",
        bookId: "sample-welcome",
        bookTitle: "Velox okuma rehberi",
        front: "Optimal Tanıma Noktası (ORP) Nedir?",
        back: "Gözün bir kelimeyi en hızlı şekilde tanıması için odaklanması gereken, kelimenin ortasındaki kırmızı ile işaretlenen harf konumudur.",
        status: "more",
        reviewsCount: 8
      },
      {
        id: "sample-card-2",
        bookId: "sample-welcome",
        bookTitle: "Velox okuma rehberi",
        front: "İç Seslendirme (Subvocalization) Okuma Hızını Nasıl Etkiler?",
        back: "Okuma hızını konuşma hızına (dakikada ~150-200 kelime) sınırlar. Bu alışkanlığı kırmak hızlı okumanın anahtarıdır.",
        status: "normal",
        reviewsCount: 4
      },
      {
        id: "sample-card-3",
        bookId: "sample-welcome",
        bookTitle: "Velox okuma rehberi",
        front: "Feynman Tekniği ile Öğrenme Adımları Nelerdir?",
        back: "1. Konuyu seç. 2. Basitçe açıkla. 3. Boşlukları tespit et ve kaynağa dön. 4. Benzetmelerle basitleştir.",
        status: "more",
        reviewsCount: 6
      }
    ];
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
