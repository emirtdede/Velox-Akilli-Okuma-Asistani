/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Minimize2, Maximize2, X, RotateCcw, Eye, Brain, Layers, Bookmark, LibraryBig, ListPlus, Trash2, Download, Edit, Undo, ChevronRight, Search, FileQuestion } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { StorageService } from '../utils/storage';
import { SearchableBookSelect } from '../components/common/SearchableBookSelect';
import { EditQuizModal } from '../components/modals/EditQuizModal';
import { EditFlashcardsModal } from '../components/modals/EditFlashcardsModal';
import { ResultModal } from '../components/modals/ResultModal';
import { AiDisabledCard, EmptyState } from '../components/common/UIHelpers';
import { VirtualList } from '../components/common/VirtualList';

function parseCustomDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  if (dateStr.includes('.')) {
    const parts = dateStr.split(' ')[0].split('.');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  return new Date(dateStr);
}

export function RecallQuizPage({
  books,
  aiStatus,
  surfaceClass,
  softSurfaceClass,
  titleClass,
  mutedClass,
  isLightTheme,
  onOpenSettings,
  postAi,
  showConfirm,
  showAlert,
  quizHistory,
  setQuizHistory,
  flashcards,
  setFlashcards,
  setStats
}: any) {
  const [subTab, setSubTab] = useState<'quiz-builder' | 'quiz-library' | 'flashcards' | 'flashcards-library' | 'flashcards-manager'>('quiz-builder');
  const [activeExportQuizId, setActiveExportQuizId] = useState<string | null>(null);
  const [activeExportDesteId, setActiveExportDesteId] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [editingDesteBookId, setEditingDesteBookId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const { t, lang } = useTranslation();

  const booksWithFlashcards = useMemo(() => {
    return books.filter((b: any) => flashcards.some((c: any) => c.bookId === b.id));
  }, [books, flashcards]);
  
  // Quiz Builder / Active Exam States
  const [quizData, setQuizData] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exam custom options
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('Orta');
  const [quizType, setQuizType] = useState<string>('Bilgi Soruları');
  const [customInstructions, setCustomInstructions] = useState<string>('');

  // Local databases loaded from localStorage
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [flashcardCount, setFlashcardCount] = useState<number>(5);
  const [flashcardTopic, setFlashcardTopic] = useState<string>('Genel');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [cardHistoryStack, setCardHistoryStack] = useState<{ cardId: string; prevStatus: string }[]>([]);
  const [isFlashcardFocusMode, setIsFlashcardFocusMode] = useState<boolean>(false);
  const [flashcardSearch, setFlashcardSearch] = useState<string>('');
  const [flashcardManagerTab, setFlashcardManagerTab] = useState<'more' | 'none'>('more');

  // Load selectedBookId to the first book if available and not set
  useEffect(() => {
    if (books.length > 0 && !selectedBookId) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBookId]);

  const handleSaveEditedQuiz = (updatedQuestions: any[]) => {
    if (!editingQuiz) return;
    const updated = savedQuizzes.map(q => {
      if (q.id === editingQuiz.id) {
        return { ...q, questions: updatedQuestions, questionCount: updatedQuestions.length };
      }
      return q;
    });
    setSavedQuizzes(updated);
    localStorage.setItem('velox_saved_quizzes', JSON.stringify(updated));
    setEditingQuiz(null);
  };

  const handleSaveEditedDeste = (updatedCards: any[]) => {
    if (!editingDesteBookId) return;
    // Keep cards from other books, replace the ones for this book
    const filteredOut = flashcards.filter((c: any) => c.bookId !== editingDesteBookId);
    const merged = [...filteredOut, ...updatedCards];
    saveFlashcards(merged);
    setEditingDesteBookId(null);
  };

  // Load databases on mount
  useEffect(() => {
    const saved = localStorage.getItem('velox_saved_quizzes');
    let hasSavedData = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedQuizzes(parsed);
          hasSavedData = true;
        }
      } catch (e) {}
    }
    if (!hasSavedData) {
      const sampleQuizzes = [
        {
          id: "sample-quiz-1",
          bookId: "sample-welcome-tr",
          bookTitle: "Velox okuma rehberi",
          createdAt: new Date().toLocaleString('tr-TR'),
          questionCount: 3,
          difficulty: "Orta",
          type: "Bilgi Soruları",
          difficultyRating: 72,
          questions: [
            {
              question: "Velox uygulamasındaki ORP (Optimal Tanıma Noktası) özelliğinin temel işlevi nedir?",
              options: [
                "Okuma hızını otomatik olarak her paragraf sonunda yarıya indirmek.",
                "Kelimenin ortasındaki odak harfini kırmızı işaretleyerek gözün kelimeyi saniyeler içinde kavramasını sağlamak.",
                "Yabancı kelimelerin Türkçe anlamlarını ve eş anlamlılarını otomatik olarak bulmak.",
                "Metindeki noktalama işaretlerini analiz ederek doğal duraklamalar eklemek."
              ],
              correctOptionIndex: 1,
              explanation: "Metinde ORP özelliğinin kelimenin ortasındaki odak harfini kırmızıyla işaretleyerek gözün kelimeyi saniyeler içinde kavramasını sağladığı ve kelime aramalarını sıfırladığı belirtilmiştir."
            },
            {
              question: "Akıllı Duraklama Sistemi'ne göre, okuyucu bir paragraf sonuna geldiğinde ne kadarlık bir otomatik bekleme süresi eklenir?",
              options: [
                "100 ms",
                "300 ms",
                "Sistem, kullanıcının WPM değerine göre dinamik bekleme ekler.",
                "Sadece kelime uzunluğuna göre bekleme ekler."
              ],
              correctOptionIndex: 2,
              explanation: "Akıllı duraklama sistemi, kullanıcının ayarladığı okuma hızına (WPM) bağlı olarak paragraf ve cümle sonlarında gözün dinlenmesi için dinamik duraklamalar yapar."
            },
            {
              question: "Hızlı Okuma tekniklerinde 'alt seslendirme' (subvocalization) alışkanlığını kırmak için hangi yöntem önerilir?",
              options: [
                "Kelimeleri yüksek sesle tekrar etmek.",
                "Kelimeleri tek tek heceleyerek okumak.",
                "Görsel odaklanma (ORP) ve ritmik kaydırma ile kelimeleri seslendirmeden doğrudan zihinde anlamlandırmak.",
                "Metinleri geriye doğru okumak."
              ],
              correctOptionIndex: 2,
              explanation: "Görsel odaklanma ve ritmik okuma hızı, iç seslendirmeyi (subvocalization) baskılayarak kelimeleri doğrudan zihninizde resim gibi algılamanıza yardımcı olur."
            }
          ]
        }
      ];
      setSavedQuizzes(sampleQuizzes);
      localStorage.setItem('velox_saved_quizzes', JSON.stringify(sampleQuizzes));
    }

    const history = localStorage.getItem('velox_quiz_history');
    let hasHistoryData = false;
    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuizHistory(parsed);
          hasHistoryData = true;
        }
      } catch (e) {}
    }
    if (!hasHistoryData) {
      const sampleHistory: any[] = [];
      setQuizHistory(sampleHistory);
      localStorage.setItem('velox_quiz_history', JSON.stringify(sampleHistory));
    }

    const cards = localStorage.getItem('velox_flashcards');
    let hasCardsData = false;
    if (cards) {
      try {
        const parsed = JSON.parse(cards);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFlashcards(parsed);
          hasCardsData = true;
        }
      } catch (e) {}
    }
    if (!hasCardsData) {
      const sampleFlashcards = [
        {
          id: "sample-card-1",
          bookId: "sample-welcome-tr",
          bookTitle: "Velox okuma rehberi",
          front: "Optimal Tanıma Noktası (ORP) Nedir?",
          back: "Gözün bir kelimeyi en hızlı şekilde tanıması için odaklanması gereken, kelimenin ortasındaki kırmızı ile işaretlenen harf konumudur.",
          status: "more"
        },
        {
          id: "sample-card-2",
          bookId: "sample-welcome-tr",
          bookTitle: "Velox okuma rehberi",
          front: "İç Seslendirme (Subvocalization) Okuma Hızını Nasıl Etkiler?",
          back: "Okuma hızını konuşma hızına (dakikada ~150-200 kelime) sınırlar. Bu alışkanlığı kırmak hızlı okumanın anahtarıdır.",
          status: "normal"
        },
        {
          id: "sample-card-3",
          bookId: "sample-welcome-tr",
          bookTitle: "Velox okuma rehberi",
          front: "Feynman Tekniği ile Öğrenme Adımları Nelerdir?",
          back: "1. Konuyu seç. 2. Basitçe açıkla. 3. Boşlukları tespit et ve kaynağa dön. 4. Benzetmelerle basitleştir.",
          status: "more"
        }
      ];
      setFlashcards(sampleFlashcards);
      localStorage.setItem('velox_flashcards', JSON.stringify(sampleFlashcards));
    }
  }, []);

  // Sync databases helper
  const saveSavedQuizzes = (updated: any[]) => {
    setSavedQuizzes(updated);
    localStorage.setItem('velox_saved_quizzes', JSON.stringify(updated));
  };

  const saveFlashcards = (updated: any[]) => {
    setFlashcards(updated);
    localStorage.setItem('velox_flashcards', JSON.stringify(updated));
  };

  // Load active exam progress when selectedBookId changes
  useEffect(() => {
    if (!selectedBookId) {
      setQuizData(null);
      setUserAnswers({});
      setIsFinished(false);
      return;
    }

    const savedQuiz = localStorage.getItem(`velox_quiz_data_${selectedBookId}`);
    if (savedQuiz) {
      try { setQuizData(JSON.parse(savedQuiz)); } catch (e) { setQuizData(null); }
    } else {
      setQuizData(null);
    }

    const savedAnswers = localStorage.getItem(`velox_quiz_answers_${selectedBookId}`);
    if (savedAnswers) {
      try { setUserAnswers(JSON.parse(savedAnswers)); } catch (e) { setUserAnswers({}); }
    } else {
      setUserAnswers({});
    }

    const savedFinished = localStorage.getItem(`velox_quiz_finished_${selectedBookId}`);
    setIsFinished(savedFinished === 'true');
    setError(null);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  }, [selectedBookId]);

  // Escape key for focus modes exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
        setIsFlashcardFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedBook = books.find((b: any) => b.id === selectedBookId);

  // Generate new quiz via Gemini AI
  const handleGenerateQuiz = async () => {
    if (!selectedBook) return;
    setIsBusy(true);
    setError(null);
    setIsFinished(false);
    setUserAnswers({});
    localStorage.removeItem(`velox_quiz_answers_${selectedBookId}`);
    localStorage.removeItem(`velox_quiz_finished_${selectedBookId}`);

    const finalTopic = quizType === 'Özel Tarz' ? customInstructions : quizType;

    try {
      const data = await postAi('/api/ai/comprehension', {
        text: selectedBook.content,
        title: selectedBook.title,
        questionCount,
        difficulty,
        topic: finalTopic
      });
      if (data && data.questions) {
        localStorage.setItem(`velox_quiz_data_${selectedBookId}`, JSON.stringify(data));
        setQuizData(data);

        // Also save this quiz to saved quizzes database
        const newQuizEntry = {
          id: Date.now().toString(),
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          createdAt: new Date().toLocaleString('tr-TR'),
          questionCount: data.questions.length,
          difficulty: difficulty,
          type: quizType,
          questions: data.questions,
          difficultyRating: data.difficultyRating
        };
        saveSavedQuizzes([newQuizEntry, ...savedQuizzes]);
      }
    } catch (err: any) {
      setError(err.message || 'Kavrama sınavı üretilemedi.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isFinished) return;
    const updated = { ...userAnswers, [questionIndex]: optionIndex };
    setUserAnswers(updated);
    localStorage.setItem(`velox_quiz_answers_${selectedBookId}`, JSON.stringify(updated));
  };

  const handleFinishQuiz = () => {
    if (!quizData) return;
    setIsFinished(true);
    localStorage.setItem(`velox_quiz_finished_${selectedBookId}`, 'true');

    // Calculate score
    let correct = 0;
    let wrong = 0;
    let empty = 0;
    const total = quizData.questions.length;

    quizData.questions.forEach((q: any, idx: number) => {
      const ans = userAnswers[idx];
      if (ans === undefined) {
        empty += 1;
      } else if (ans === q.correctOptionIndex) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const successRate = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Add entry to history
    const historyEntry = {
      id: Date.now().toString(),
      bookTitle: selectedBook.title,
      date: new Date().toLocaleString('tr-TR'),
      correctCount: correct,
      wrongCount: wrong,
      emptyCount: empty,
      totalQuestions: total,
      difficulty: difficulty,
      score: successRate
    };

    const updatedHistory = [historyEntry, ...quizHistory];
    setQuizHistory(updatedHistory);
    localStorage.setItem('velox_quiz_history', JSON.stringify(updatedHistory));

    // Update quiz streak
    const nextStats = StorageService.logQuizSession();
    setStats(nextStats);

    setShowResultModal(true);
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setIsFinished(false);
    localStorage.removeItem(`velox_quiz_answers_${selectedBookId}`);
    localStorage.removeItem(`velox_quiz_finished_${selectedBookId}`);
  };

  const handleDeleteSavedQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm('Bu sınavı kütüphaneden kalıcı olarak silmek istiyor musunuz?', () => {
      const updated = savedQuizzes.filter(q => q.id !== id);
      saveSavedQuizzes(updated);
    }, 'Sınavı Sil');
  };

  const handleLoadSavedQuiz = (quiz: any) => {
    localStorage.setItem(`velox_quiz_data_${quiz.bookId}`, JSON.stringify({
      questions: quiz.questions,
      difficultyRating: quiz.difficultyRating
    }));
    localStorage.removeItem(`velox_quiz_answers_${quiz.bookId}`);
    localStorage.removeItem(`velox_quiz_finished_${quiz.bookId}`);
    
    setSelectedBookId(quiz.bookId);
    setQuizData({
      questions: quiz.questions,
      difficultyRating: quiz.difficultyRating
    });
    setUserAnswers({});
    setIsFinished(false);
    setSubTab('quiz-builder');
  };

  const handleClearHistory = () => {
    showConfirm(t('quiz_clear_confirm'), () => {
      setQuizHistory([]);
      localStorage.removeItem('velox_quiz_history');
    }, t('quiz_clear_confirm_title'));
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quizHistory.filter(item => item.id !== id);
    setQuizHistory(updated);
    localStorage.setItem('velox_quiz_history', JSON.stringify(updated));
  };

  // Exporters
  const handleExportFile = (quiz: any, format: 'txt' | 'md' | 'html' | 'doc') => {
    let content = '';
    let mimeType = 'text/plain;charset=utf-8';
    let fileExtension = 'txt';

    if (format === 'txt') {
      content = `SINAV: ${quiz.bookTitle}\nSoru Sayısı: ${quiz.questions.length} | Zorluk: ${quiz.difficulty || 'N/A'}\n\n`;
      quiz.questions.forEach((q: any, idx: number) => {
        content += `${idx + 1}. ${q.question}\n`;
        q.options.forEach((opt: string, oIdx: number) => {
          content += `  ${String.fromCharCode(65 + oIdx)}) ${opt}\n`;
        });
        content += `\n`;
      });
    } else if (format === 'md') {
      fileExtension = 'md';
      content = `# Sınav: ${quiz.bookTitle}\n**Soru Sayısı:** ${quiz.questions.length} | **Zorluk:** ${quiz.difficulty || 'N/A'}\n\n---\n\n`;
      quiz.questions.forEach((q: any, idx: number) => {
        content += `### ${idx + 1}. ${q.question}\n`;
        q.options.forEach((opt: string, oIdx: number) => {
          content += `- [ ] **${String.fromCharCode(65 + oIdx)})** ${opt}\n`;
        });
        content += `\n`;
      });
    } else if (format === 'html' || format === 'doc') {
      fileExtension = format === 'html' ? 'html' : 'doc';
      mimeType = format === 'html' ? 'text/html;charset=utf-8' : 'application/msword;charset=utf-8';
      content = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 10px; color: #4f46e5; }
            .question { margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
            .options { list-style: none; padding-left: 0; }
            .option { padding: 8px 12px; border: 1px solid #d1d5db; margin-top: 6px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Sınav: ${quiz.bookTitle}</h1>
          <p><strong>Soru Sayısı:</strong> ${quiz.questions.length} | <strong>Zorluk Seviyesi:</strong> ${quiz.difficulty || 'N/A'}</p>
          <hr/>
      `;
      quiz.questions.forEach((q: any, idx: number) => {
        content += `
          <div class="question">
            <h3>${idx + 1}. ${q.question}</h3>
            <ul class="options">
        `;
        q.options.forEach((opt: string, oIdx: number) => {
          content += `<li class="option"><strong>${String.fromCharCode(65 + oIdx)})</strong> ${opt}</li>`;
        });
        content += `
            </ul>
          </div>
        `;
      });
      content += `</body></html>`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.bookTitle.replace(/\s+/g, '_')}_quiz.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = (quiz: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let html = `
      <html>
      <head>
        <title>Sınav: ${quiz.bookTitle}</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { border-bottom: 2px solid #000; padding-bottom: 10px; color: #000; }
          .question { margin-bottom: 30px; page-break-inside: avoid; }
          .options { list-style: none; padding-left: 0; }
          .option { padding: 6px 12px; border: 1px solid #ccc; margin-top: 6px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>Sınav: ${quiz.bookTitle}</h1>
        <p><strong>Soru Sayısı:</strong> ${quiz.questions.length}</p>
        <hr/>
    `;
    quiz.questions.forEach((q: any, idx: number) => {
      html += `
        <div class="question">
          <h3>${idx + 1}. ${q.question}</h3>
          <ul class="options">
      `;
      q.options.forEach((opt: string, oIdx: number) => {
        html += `<li class="option"><strong>${String.fromCharCode(65 + oIdx)})</strong> ${opt}</li>`;
      });
      html += `
          </ul>
        </div>
      `;
    });
    html += `
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportAnswerKey = (quiz: any) => {
    let content = `SINAV CEVAP ANAHTARI: ${quiz.bookTitle}\n\n`;
    quiz.questions.forEach((q: any, idx: number) => {
      content += `${idx + 1}. Soru Doğru Cevap: ${String.fromCharCode(65 + q.correctOptionIndex)}\n`;
      content += `   Açıklama: ${q.explanation}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.bookTitle.replace(/\s+/g, '_')}_cevap_anahtari.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate Flashcards
  const handleGenerateFlashcards = async () => {
    if (!selectedBook) return;
    setIsBusy(true);
    setError(null);
    try {
      const topicText = flashcardTopic === 'Özel' ? customTopic : flashcardTopic;
      const data = await postAi('/api/ai/flashcards', {
        text: selectedBook.content,
        title: selectedBook.title,
        count: flashcardCount,
        topic: topicText
      });

      if (data && data.flashcards) {
        const newCards = data.flashcards.map((c: any) => ({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          front: c.front,
          back: c.back,
          status: 'normal'
        }));

        const updated = [...newCards, ...flashcards];
        saveFlashcards(updated);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
      }
    } catch (err: any) {
      setError(err.message || 'Bilgi kartları üretilemedi.');
    } finally {
      setIsBusy(false);
    }
  };

  // Card status modification
  const handleUpdateCardStatus = (cardId: string, newStatus: 'normal' | 'more' | 'none') => {
    const cardIndex = flashcards.findIndex((c: any) => c.id === cardId);
    if (cardIndex === -1) return;

    const prevStatus = flashcards[cardIndex].status || 'normal';
    const updated = [...flashcards];
    updated[cardIndex] = { 
      ...updated[cardIndex], 
      status: newStatus,
      reviewsCount: (updated[cardIndex].reviewsCount || 0) + 1,
      lastReviewed: new Date().toLocaleDateString('tr-TR')
    };
    saveFlashcards(updated);

    // Update card streak
    const nextStats = StorageService.logCardSession();
    setStats(nextStats);

    // Keep history stack for Undo
    setCardHistoryStack([{ cardId, prevStatus }, ...cardHistoryStack].slice(0, 10));

    // Next Card Auto-trigger
    const bookCards = updated.filter((c: any) => c.bookId === selectedBookId);
    if (currentCardIndex < bookCards.length - 1) {
      setTimeout(() => {
        setIsCardFlipped(false);
        setCurrentCardIndex(currentCardIndex + 1);
      }, 300);
    }
  };

  // Undo Last Card Action
  const handleUndoCardAction = () => {
    if (cardHistoryStack.length === 0) return;
    const [{ cardId, prevStatus }, ...rest] = cardHistoryStack;

    const updated = [...flashcards];
    const index = updated.findIndex((c: any) => c.id === cardId);
    if (index !== -1) {
      updated[index] = { ...updated[index], status: prevStatus };
      saveFlashcards(updated);
    }
    setCardHistoryStack(rest);
  };

  // Delete individual flashcard
  const handleDeleteFlashcard = (id: string) => {
    const updated = flashcards.filter((c: any) => c.id !== id);
    saveFlashcards(updated);
  };

  const handleExportFlashcards = (bookId: string, format: 'txt' | 'md' | 'html' | 'doc') => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const bookCards = flashcards.filter((c: any) => c.bookId === bookId);
    let exportContent = '';
    let mimeType = 'text/plain;charset=utf-8';
    let fileExtension = 'txt';

    if (format === 'txt') {
      exportContent = `BİLGİ KARTLARI: ${book.title}\nToplam Kart: ${bookCards.length}\n\n`;
      bookCards.forEach((c: any, idx: number) => {
        exportContent += `${idx + 1}. KART\nÖn Yüz:\n${c.front}\n\nArka Yüz:\n${c.back}\n\n--------------------\n\n`;
      });
    } else if (format === 'md') {
      fileExtension = 'md';
      exportContent = `# Bilgi Kartları: ${book.title}\n**Toplam Kart:** ${bookCards.length}\n\n---\n\n`;
      bookCards.forEach((c: any, idx: number) => {
        exportContent += `### Kart ${idx + 1}\n\n**Ön Yüz (Soru/Kavram):**\n${c.front}\n\n**Arka Yüz (Açıklama/Cevap):**\n${c.back}\n\n---\n\n`;
      });
    } else if (format === 'html' || format === 'doc') {
      fileExtension = format === 'html' ? 'html' : 'doc';
      mimeType = format === 'html' ? 'text/html;charset=utf-8' : 'application/msword;charset=utf-8';
      exportContent = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 10px; color: #4f46e5; }
            .card-item { margin-bottom: 20px; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
            .face-title { font-weight: bold; color: #4f46e5; margin-bottom: 4px; display: block; }
          </style>
        </head>
        <body>
          <h1>Bilgi Kartları: ${book.title}</h1>
          <p><strong>Toplam Kart Sayısı:</strong> ${bookCards.length}</p>
          <hr/>
      `;
      bookCards.forEach((c: any, idx: number) => {
        exportContent += `
          <div class="card-item">
            <h3>Kart ${idx + 1}</h3>
            <p><span class="face-title">Ön Yüz (Soru/Terim):</span> ${c.front}</p>
            <p><span class="face-title">Arka Yüz (Cevap/Açıklama):</span> ${c.back}</p>
          </div>
        `;
      });
      exportContent += `</body></html>`;
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/\s+/g, '_')}_bilgi_kartlari.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Computed views
  const flashcardsByBookId = useMemo(() => {
    const map = new Map<string, any[]>();
    flashcards.forEach((c: any) => {
      if (!map.has(c.bookId)) map.set(c.bookId, []);
      map.get(c.bookId)!.push(c);
    });
    return map;
  }, [flashcards]);

  const flashcardsMoreCount = useMemo(() => flashcards.filter((c: any) => c.status === 'more').length, [flashcards]);
  const flashcardsNoneCount = useMemo(() => flashcards.filter((c: any) => c.status === 'none').length, [flashcards]);
  const reviewedFlashcards = useMemo(() => flashcards.filter((c: any) => (c.reviewsCount || 0) > 0), [flashcards]);

  const bookFlashcards = useMemo(() => {
    return flashcardsByBookId.get(selectedBookId) || [];
  }, [flashcardsByBookId, selectedBookId]);

  const activeCard = bookFlashcards[currentCardIndex];

  const filteredManagerCards = useMemo(() => {
    return flashcards.filter((c: any) => {
      if (c.status !== flashcardManagerTab) return false;
      if (!flashcardSearch.trim()) return true;
      const term = flashcardSearch.toLowerCase();
      return (
        c.front.toLowerCase().includes(term) ||
        c.back.toLowerCase().includes(term) ||
        c.bookTitle.toLowerCase().includes(term)
      );
    });
  }, [flashcards, flashcardManagerTab, flashcardSearch]);

  // Quiz Results calculations
  let correctCount = 0;
  let wrongCount = 0;
  let emptyCount = 0;
  let totalQuestions = 0;
  if (quizData && quizData.questions) {
    totalQuestions = quizData.questions.length;
    quizData.questions.forEach((q: any, idx: number) => {
      const ans = userAnswers[idx];
      if (ans === undefined) {
        emptyCount += 1;
      } else if (ans === q.correctOptionIndex) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });
  }
  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const quizMainContent = (
    <div className={`flex flex-col gap-5 ${isFocusMode ? 'max-w-3xl w-full mx-auto' : ''}`}>
      {/* Active Exam Header */}
      <div className="flex justify-between items-start gap-4 border-b border-stone-200 dark:border-zinc-800/60 pb-4">
        <div>
          <h3 className={`text-base font-black ${titleClass}`}>
            {selectedBook?.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : selectedBook?.title} - {lang === 'tr' ? 'Kavrama Sınavı' : 'Comprehension Quiz'}
          </h3>
          <p className={`text-xs mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Yapay zeka tarafından üretilen spaced-repetition hatırlama testi.' : 'Spaced-repetition recall test generated by AI.'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            title={isFocusMode ? (lang === 'tr' ? 'Odak Modundan Çık' : 'Exit Focus Mode') : (lang === 'tr' ? 'Odak Moduna Geç' : 'Enter Focus Mode')}
            className={`p-2 rounded-xl border transition-all ${isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'}`}
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              showConfirm(lang === 'tr' ? 'Mevcut aktif sınavı kapatmak ve sıfırlamak istiyor musunuz?' : 'Do you want to close and reset the current active exam?', () => {
                setQuizData(null);
                setUserAnswers({});
                setIsFinished(false);
                localStorage.removeItem(`velox_quiz_data_${selectedBookId}`);
                localStorage.removeItem(`velox_quiz_answers_${selectedBookId}`);
                localStorage.removeItem(`velox_quiz_finished_${selectedBookId}`);
              }, lang === 'tr' ? 'Sınavı Kapat' : 'Close Exam');
            }}
            title={lang === 'tr' ? 'Sınavı Kapat' : 'Close Exam'}
            className={`p-2 rounded-xl border transition-all ${isLightTheme ? 'border-stone-250 bg-white text-rose-600 hover:bg-rose-50/50' : 'border-zinc-800 bg-transparent text-rose-500 hover:bg-rose-500/10'}`}
          >
            <X className="w-4 h-4" />
          </button>
          {quizData && isFinished && (
            <button
              onClick={handleResetQuiz}
              className="h-9 px-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Tekrar Çöz' : 'Solve Again'}
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Body */}
      {isBusy ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className={`text-xs ${mutedClass}`}>{lang === 'tr' ? 'Yapay Zeka Soruları Hazırlanıyor...' : 'Preparing AI Questions...'}</p>
        </div>
      ) : quizData ? (
        <div className="flex flex-col gap-6">
          {/* Difficulty rating badge */}
          {quizData.difficultyRating && (
            <div className="flex items-center gap-2 text-xs">
              <span className={mutedClass}>{lang === 'tr' ? 'Metin Kavrama Puanı:' : 'Text Comprehension Score:'}</span>
              <span className="font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">{quizData.difficultyRating} / 100</span>
            </div>
          )}

          {/* Questions */}
          {quizData.questions && quizData.questions.map((q: any, qIdx: number) => {
            const selectedOpt = userAnswers[qIdx];
            const isAnswered = selectedOpt !== undefined;

            return (
              <div key={qIdx} className="rounded-2xl border border-stone-200 dark:border-zinc-800 p-5 flex flex-col gap-4">
                <h4 className={`text-sm font-black leading-relaxed ${titleClass}`}>
                  {qIdx + 1}. {q.question}
                </h4>
                
                {/* Options */}
                <div className="grid grid-cols-1 gap-2.5">
                  {q.options && q.options.map((opt: string, oIdx: number) => {
                    const isSelected = selectedOpt === oIdx;
                    const isCorrect = q.correctOptionIndex === oIdx;
                    
                    let optStyle = isLightTheme 
                      ? 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-850' 
                      : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-350';
                    
                    if (isFinished) {
                      if (isCorrect) {
                        optStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-bold cursor-default';
                      } else if (isSelected) {
                        optStyle = 'border-rose-500/40 bg-rose-500/10 text-rose-500 font-bold cursor-default';
                      } else {
                        optStyle = 'border-stone-200 dark:border-zinc-850 opacity-40 cursor-default';
                      }
                    } else if (isSelected) {
                      optStyle = 'border-indigo-500 bg-indigo-600/10 text-indigo-500 font-bold ring-1 ring-indigo-500';
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={isFinished}
                        onClick={() => handleSelectOption(qIdx, oIdx)}
                        className={`w-full py-3 px-4 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {isFinished && isCorrect && <span className="text-emerald-500 font-extrabold text-[10px] uppercase">{lang === 'tr' ? 'Doğru' : 'Correct'}</span>}
                        {isFinished && isSelected && !isCorrect && <span className="text-rose-500 font-extrabold text-[10px] uppercase">{lang === 'tr' ? 'Yanlış' : 'Incorrect'}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {isFinished && q.explanation && (
                  <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-zinc-900/60 border border-stone-200/50 dark:border-zinc-850/50 text-[11px] leading-relaxed opacity-95">
                    <span className="font-bold text-indigo-500 block mb-1">{lang === 'tr' ? '💡 Açıklama:' : '💡 Explanation:'}</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-stone-200 dark:border-zinc-800/60 pt-4">
            {!isFinished ? (
              <button
                onClick={handleFinishQuiz}
                className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
              >
                {lang === 'tr' ? 'Sınavı Bitir' : 'Finish Quiz'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowResultModal(true)}
                  className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-xs font-black transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> {lang === 'tr' ? 'Sonuçları Göster' : 'Show Results'}
                </button>
                <button
                  onClick={handleResetQuiz}
                  className={`h-10 px-5 rounded-xl border text-xs font-bold transition-all ${isLightTheme ? 'border-stone-250 bg-white hover:bg-stone-50 text-stone-700' : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50 text-zinc-300'}`}
                >
                  {lang === 'tr' ? 'Sınavı Yeniden Başlat' : 'Restart Quiz'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 grid place-items-center">
            <Brain className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h4 className={`text-base font-black ${titleClass}`}>{lang === 'tr' ? 'Henüz Sınav Tasarlanmadı' : 'No Exam Designed Yet'}</h4>
            <p className={`text-xs mt-1.5 max-w-sm leading-relaxed ${mutedClass}`}>
              {lang === 'tr' ? 'Sol paneldeki kriterlerinizi belirleyin ve ilk yapay zeka sınavınızı tasarlayın!' : 'Determine your criteria in the left panel and design your first AI exam!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const totalSolved = useMemo(() => {
    let count = 0;
    books.forEach((b: any) => {
      if (localStorage.getItem(`velox_quiz_finished_${b.id}`) === 'true') {
        count += 1;
      }
    });
    return count;
  }, [books, quizHistory]);

  const solvedPercentage = books.length > 0 ? Math.round((totalSolved / books.length) * 100) : 0;

  if (!aiStatus.enabled) {
    return <AiDisabledCard onOpenSettings={onOpenSettings} surfaceClass={surfaceClass} mutedClass={mutedClass} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
 Backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border-radius: 1.5rem;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
      {/* Top Professional Pill Nav Menu */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-zinc-900 pb-4">
        {[
          { id: 'quiz-builder', label: lang === 'tr' ? 'Ölçme ve Değerlendirme' : 'Evaluation & Assessment', icon: FileQuestion },
          { id: 'quiz-library', label: lang === 'tr' ? 'Sınav Kütüphanesi' : 'Quiz Library', icon: Layers },
          { id: 'flashcards', label: lang === 'tr' ? 'Akıllı Bilgi Kartları' : 'Smart Flashcards', icon: Bookmark },
          { id: 'flashcards-library', label: lang === 'tr' ? 'Kart Kütüphanesi' : 'Card Library', icon: LibraryBig },
          { id: 'flashcards-manager', label: lang === 'tr' ? 'Hafıza Laboratuvarı' : 'Memory Lab', icon: ListPlus }
        ].map((tab) => {
          const isActive = subTab === tab.id;
          const IconComp = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                  : isLightTheme
                  ? 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  : 'border-zinc-850 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'quiz-builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel options */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass}`}>
              <label className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'METİN SEÇİN' : 'SELECT TEXT'}</label>
              {books.length === 0 ? (
                <p className="text-xs mt-2 opacity-60">{lang === 'tr' ? 'Kütüphanede hiç belge bulunmuyor.' : 'No documents in the library.'}</p>
              ) : (
                <SearchableBookSelect
                  books={books}
                  selectedBookId={selectedBookId}
                  onSelectBook={setSelectedBookId}
                  isLightTheme={isLightTheme}
                  surfaceClass={surfaceClass}
                  mutedClass={mutedClass}
                  titleClass={titleClass}
                />
              )}
            </div>

            {/* Custom parameters */}
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'SINAV HEDEFLERİ' : 'EXAM GOALS'}</span>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Soru Sayısı' : 'Number of Questions'}</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value)))}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Zorluk Seviyesi' : 'Difficulty Level'}</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                >
                  <option value="Kolay">{lang === 'tr' ? 'Kolay' : 'Easy'}</option>
                  <option value="Orta">{lang === 'tr' ? 'Orta' : 'Medium'}</option>
                  <option value="Zor">{lang === 'tr' ? 'Zor' : 'Hard'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Sınav Tarzı & Şablonu' : 'Exam Style & Template'}</label>
                <select
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                >
                  <option value="Bilgi Soruları">{lang === 'tr' ? 'Bilgi Soruları (Olgu ve Kavramlar)' : 'Knowledge Questions (Fact and Concepts)'}</option>
                  <option value="Yorum Soruları">{lang === 'tr' ? 'Yorum Soruları (Analiz ve Çıkarım)' : 'Interpretation Questions (Analysis and Inference)'}</option>
                  <option value="Teknik Terimler">{lang === 'tr' ? 'Teknik Terimler (Tanım ve Glosaryum)' : 'Technical Terms (Definitions and Glossary)'}</option>
                  <option value="Özel Tarz">{lang === 'tr' ? 'Kişiselleştirilmiş Yapay Zeka Komutu' : 'Custom AI Command'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Özel Yönlendirme (İsteğe Bağlı)' : 'Custom Instructions (Optional)'}</label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={lang === 'tr' ? 'Örn: Metindeki temel kavramları ask, ana fikre odaklan veya sadece belirli bölümlere yönelik sorular üret...' : 'E.g., ask key concepts in the text, focus on the main idea, or generate questions only for specific sections...'}
                  className={`w-full h-20 p-2.5 rounded-xl border text-xs leading-relaxed resize-none focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-850 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <button
                onClick={handleGenerateQuiz}
                disabled={isBusy}
                className="h-10 w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
              >
                {isBusy ? (lang === 'tr' ? 'Sınav Hazırlanıyor...' : 'Preparing Exam...') : (lang === 'tr' ? 'Yapay Zeka Sınavı Tasarla' : 'Design AI Exam')}
              </button>
            </div>
          </div>

          {/* Right main area */}
          <div className="lg:col-span-2">
            {selectedBook ? (
              <div className={`p-6 rounded-3xl border ${surfaceClass}`}>
                {quizMainContent}
              </div>
            ) : (
              <EmptyState text="Sınav görüntülemek için lütfen bir belge seçin veya ekleyin." />
            )}
          </div>
        </div>
      )}

      {subTab === 'quiz-library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Quizzes Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass}`}>
              <h3 className={`text-base font-black ${titleClass} mb-4`}>{lang === 'tr' ? 'Kayıtlı Sınavlar' : 'Saved Quizzes'} ({savedQuizzes.length})</h3>
              {savedQuizzes.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs opacity-60">{lang === 'tr' ? 'Kütüphanede kayıtlı sınav bulunmuyor.' : 'No quizzes saved in the library.'}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {savedQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className={`p-4 rounded-2xl border flex flex-col gap-3 relative ${
                        isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className={`text-sm font-black ${titleClass}`}>
                            {quiz.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : quiz.bookTitle}
                          </h4>
                          <span className={`text-[10px] block mt-0.5 ${mutedClass}`}>{lang === 'tr' ? 'Oluşturulma:' : 'Created:'} {quiz.createdAt}</span>
                        </div>
                        <span className="text-[10px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                          {(lang === 'tr' ? `${quiz.questionCount} Soru` : `${quiz.questionCount} ${quiz.questionCount === 1 ? 'Question' : 'Questions'}`) + ' | ' + (lang === 'tr' ? quiz.difficulty : (quiz.difficulty === 'Kolay' ? 'Easy' : quiz.difficulty === 'Orta' ? 'Medium' : 'Hard'))}
                        </span>
                      </div>

                      {/* Exporters and solvers */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/50 dark:border-zinc-800/50 pt-3">
                        <div className="flex flex-wrap gap-1.5 items-center relative">
                          {/* Floating Export Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveExportQuizId(activeExportQuizId === quiz.id ? null : quiz.id)}
                              className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1 transition-all ${
                                isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-850 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Dışa Aktar' : 'Export'}
                            </button>

                            {activeExportQuizId === quiz.id && (
                              <div className={`absolute left-0 bottom-9 z-40 rounded-xl border p-1 w-40 shadow-xl flex flex-col gap-0.5 ${
                                isLightTheme ? 'border-stone-200 bg-white' : 'border-zinc-850 bg-zinc-950'
                              }`}>
                                {[
                                  { format: 'txt', label: lang === 'tr' ? 'TXT Dosyası (.txt)' : 'TXT File (.txt)' },
                                  { format: 'md', label: 'Markdown (.md)' },
                                  { format: 'html', label: lang === 'tr' ? 'HTML Sayfası (.html)' : 'HTML Page (.html)' },
                                  { format: 'doc', label: lang === 'tr' ? 'Word Belgesi (.doc)' : 'Word Document (.doc)' }
                                ].map((opt) => (
                                  <button
                                    key={opt.format}
                                    onClick={() => {
                                      handleExportFile(quiz, opt.format as any);
                                      setActiveExportQuizId(null);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition-colors ${
                                      isLightTheme ? 'hover:bg-stone-100 text-stone-700' : 'hover:bg-zinc-900 text-zinc-300'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handlePrintPdf(quiz)}
                            className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1 ${
                              isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-850 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                            }`}
                          >
                            {lang === 'tr' ? 'Yazdır / PDF' : 'Print / PDF'}
                          </button>

                          <button
                            onClick={() => handleExportAnswerKey(quiz)}
                            className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black hover:bg-emerald-500/20 flex items-center gap-1"
                          >
                            {lang === 'tr' ? 'Cevap Anahtarı' : 'Answer Key'}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingQuiz(quiz)}
                            className={`h-8 w-8 rounded-lg border text-indigo-500 hover:bg-indigo-50/25 grid place-items-center transition-all ${
                              isLightTheme ? 'border-stone-250 bg-white' : 'border-zinc-800 bg-transparent'
                            }`}
                            title={lang === 'tr' ? 'Sınav Sorularını Düzenle' : 'Edit Quiz Questions'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleLoadSavedQuiz(quiz)}
                            className="h-8 px-3.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700"
                          >
                            {lang === 'tr' ? 'Sınavı Çöz' : 'Solve Quiz'}
                          </button>
                          <button
                            onClick={(e) => handleDeleteSavedQuiz(quiz.id, e)}
                            className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 grid place-items-center hover:bg-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sınav Sonucu Geçmişi */}
          <div className="flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-3`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'SINAV SONUCU GEÇMİŞİ' : 'QUIZ SCORE HISTORY'}</span>
                {quizHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] text-rose-500 hover:underline font-bold"
                  >
                    {lang === 'tr' ? 'Temizle' : 'Clear'}
                  </button>
                )}
              </div>
              {quizHistory.length === 0 ? (
                <p className="text-xs opacity-60 py-2">{lang === 'tr' ? 'Henüz girilmiş sınav sonucu bulunmuyor.' : 'No quiz score logs found yet.'}</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto custom-note-scrollbar pr-1">
                  {quizHistory.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 relative group ${
                        isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-start pr-5">
                        <span className={`text-xs font-black truncate max-w-[140px] ${titleClass}`}>
                          {item.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : item.bookTitle}
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-500">%{item.score}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] opacity-60">
                        <span>{item.date.split(' ')[0]}</span>
                        <span>
                          {lang === 'tr' ? 'D' : 'C'}: {item.correctCount} | {lang === 'tr' ? 'Y' : 'I'}: {item.wrongCount} | {lang === 'tr' ? 'Z' : 'D'}: {item.difficulty === 'Kolay' ? (lang === 'tr' ? 'Kolay' : 'Easy') : item.difficulty === 'Orta' ? (lang === 'tr' ? 'Orta' : 'Medium') : (lang === 'tr' ? 'Zor' : 'Hard')}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-600"
                        title={lang === 'tr' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'flashcards-library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Flashcard sets Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass}`}>
              <h3 className={`text-base font-black ${titleClass} mb-4`}>{t('fc_library_saved_decks' as any)} ({booksWithFlashcards.length})</h3>
              {booksWithFlashcards.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs opacity-60">{t('fc_library_no_decks' as any)}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {booksWithFlashcards.map((book: any) => {
                    const bookCards = flashcardsByBookId.get(book.id) || [];
                    return (
                      <div
                        key={book.id}
                        className={`p-4 rounded-2xl border flex flex-col gap-3 relative ${
                          isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className={`text-sm font-black ${titleClass}`}>
                              {book.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : book.title}
                            </h4>
                            <span className={`text-[10px] block mt-0.5 ${mutedClass}`}>
                              {t('fc_library_total_cards' as any)}: {bookCards.length} {bookCards.length === 1 ? t('fc_library_card_singular' as any) : t('fc_library_card_plural' as any)}
                            </span>
                          </div>
                        </div>

                        {/* Exporters and solvers */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/50 dark:border-zinc-800/50 pt-3">
                          <div className="flex flex-wrap gap-1.5 items-center relative">
                            {/* Floating Export Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveExportDesteId(activeExportDesteId === book.id ? null : book.id)}
                                className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1 transition-all ${
                                  isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-855 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5" /> {t('quiz_export' as any)}
                              </button>

                              {activeExportDesteId === book.id && (
                                <div className={`absolute left-0 bottom-9 z-40 rounded-xl border p-1 w-40 shadow-xl flex flex-col gap-0.5 ${
                                  isLightTheme ? 'border-stone-200 bg-white' : 'border-zinc-850 bg-zinc-950'
                                }`}>
                                  {[
                                    { format: 'txt', label: lang === 'tr' ? 'TXT Dosyası (.txt)' : 'TXT File (.txt)' },
                                    { format: 'md', label: 'Markdown (.md)' },
                                    { format: 'html', label: lang === 'tr' ? 'HTML Sayfası (.html)' : 'HTML Page (.html)' },
                                    { format: 'doc', label: lang === 'tr' ? 'Word Belgesi (.doc)' : 'Word Document (.doc)' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.format}
                                      onClick={() => {
                                        handleExportFlashcards(book.id, opt.format as any);
                                        setActiveExportDesteId(null);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-black transition-colors ${
                                        isLightTheme ? 'hover:bg-stone-100 text-stone-700' : 'hover:bg-zinc-900 text-zinc-300'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingDesteBookId(book.id)}
                              className={`h-8 w-8 rounded-lg border text-indigo-500 hover:bg-indigo-50/25 grid place-items-center transition-all ${
                                isLightTheme ? 'border-stone-250 bg-white' : 'border-zinc-800 bg-transparent'
                              }`}
                              title={t('fc_library_edit_tooltip' as any)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBookId(book.id);
                                setSubTab('flashcards');
                              }}
                              className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700"
                            >
                              {t('fc_library_start_study' as any)}
                            </button>
                            <button
                              onClick={() => {
                                showConfirm(t('fc_library_delete_confirm' as any), () => {
                                  const updated = flashcards.filter((c: any) => c.bookId !== book.id);
                                  saveFlashcards(updated);
                                }, t('fc_library_delete_confirm_title' as any));
                              }}
                              className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 grid place-items-center hover:bg-rose-500/20"
                              title={t('fc_library_delete_tooltip' as any)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Flashcard Stats Column (Right Side Panel) */}
          <div className="flex flex-col gap-4">
            <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <div className="border-b border-stone-200 dark:border-zinc-800/60 pb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{t('fc_library_stats_title' as any)}</span>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2.5 rounded-xl border ${isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/15'} flex flex-col items-center text-center`}>
                  <span className={`text-[8px] font-black ${mutedClass} uppercase`}>{t('fc_library_stats_created' as any)}</span>
                  <span className="text-base font-black text-indigo-500 mt-1">{flashcards.length}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/15'} flex flex-col items-center text-center`}>
                  <span className={`text-[8px] font-black ${mutedClass} uppercase`}>{t('fc_library_stats_frequent' as any)}</span>
                  <span className="text-base font-black text-emerald-500 mt-1">{flashcardsMoreCount}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${isLightTheme ? 'border-stone-150 bg-stone-50' : 'border-zinc-900 bg-zinc-900/15'} flex flex-col items-center text-center`}>
                  <span className={`text-[8px] font-black ${mutedClass} uppercase`}>{t('fc_library_stats_hidden' as any)}</span>
                  <span className="text-base font-black text-rose-500 mt-1">{flashcardsNoneCount}</span>
                </div>
              </div>

              {/* List of most studied cards */}
              <div className="flex flex-col gap-2 mt-2">
                <span className={`text-[9px] font-black ${mutedClass} uppercase tracking-wider`}>{t('fc_library_frequent_cards' as any)}</span>
                {reviewedFlashcards.length === 0 ? (
                  <p className="text-[11px] opacity-60 py-2 font-bold text-center">{t('fc_library_no_frequent_cards' as any)}</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-note-scrollbar pr-1">
                    {reviewedFlashcards
                      .sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0))
                      .slice(0, 5)
                      .map((card) => (
                        <div
                          key={card.id}
                          className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                            isLightTheme ? 'border-stone-150 bg-stone-50/55' : 'border-zinc-900/40 bg-zinc-900/10'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`text-[11px] font-black truncate max-w-[170px] ${titleClass}`}>{card.front}</span>
                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                              {card.reviewsCount || 0} {lang === 'tr' ? 'Tekrar' : (card.reviewsCount === 1 ? 'Review' : 'Reviews')}
                            </span>
                          </div>
                          <span className="text-[9px] opacity-60 truncate">{card.bookTitle}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'flashcards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card builder panel */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass}`}>
              <label className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'METİN SEÇİN' : 'SELECT TEXT'}</label>
              {books.length === 0 ? (
                <p className="text-xs mt-2 opacity-60">{lang === 'tr' ? 'Kütüphanede hiç belge bulunmuyor.' : 'No documents in the library.'}</p>
              ) : (
                <SearchableBookSelect
                  books={books}
                  selectedBookId={selectedBookId}
                  onSelectBook={setSelectedBookId}
                  isLightTheme={isLightTheme}
                  surfaceClass={surfaceClass}
                  mutedClass={mutedClass}
                  titleClass={titleClass}
                />
              )}
            </div>

            {/* Flashcard options */}
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4`}>
              <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'BİLGİ KARTLARI AYARLARI' : 'FLASHCARD SETTINGS'}</span>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Kart Sayısı' : 'Number of Cards'}</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={flashcardCount}
                  onChange={(e) => setFlashcardCount(Math.max(1, Number(e.target.value)))}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Odak Konusu' : 'Focus Topic'}</label>
                <select
                  value={flashcardTopic}
                  onChange={(e) => setFlashcardTopic(e.target.value)}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950 text-zinc-100'}`}
                >
                  <option value="Genel">{lang === 'tr' ? 'Genel Soru / Cevap' : 'General Question & Answer'}</option>
                  <option value="Tanımlar">{lang === 'tr' ? 'Tanım ve Terimler' : 'Definitions & Terms'}</option>
                  <option value="Önemli Tarihler">{lang === 'tr' ? 'Önemli Tarihler ve Olaylar' : 'Key Dates & Events'}</option>
                  <option value="Formül ve Kodlama">{lang === 'tr' ? 'Formül ve Kod Şablonları' : 'Formulas & Code Templates'}</option>
                  <option value="Özel">{lang === 'tr' ? 'Özel Konu Odaklı' : 'Custom Topic-Focused'}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] opacity-70">{lang === 'tr' ? 'Özel Yönlendirme (İsteğe Bağlı)' : 'Custom Instructions (Optional)'}</label>
                <textarea
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder={lang === 'tr' ? 'Örn: En önemli kavramları, akılda kalması zor kilit bilgileri veya pratik özetleri bilgi kartı haline getirin...' : 'E.g., turn the most important concepts, hard-to-remember key facts, or practical summaries into flashcards...'}
                  className={`w-full h-20 p-2.5 rounded-xl border text-xs leading-relaxed resize-none focus:outline-none focus:border-indigo-500 ${isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-850 bg-zinc-950 text-zinc-100'}`}
                />
              </div>

              <button
                onClick={handleGenerateFlashcards}
                disabled={isBusy}
                className="h-10 w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/20"
              >
                {isBusy ? (lang === 'tr' ? 'Kartlar Hazırlanıyor...' : 'Preparing Cards...') : (lang === 'tr' ? 'Yapay Zeka ile Bilgi Kartı Üret' : 'Generate Flashcards with AI')}
              </button>
            </div>
          </div>

          {/* Card Swiper/Flipper Column */}
          <div className="lg:col-span-2">
            {selectedBook ? (
              <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
                <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3">
                  <div>
                    <h3 className={`text-base font-black ${titleClass}`}>
                      {selectedBook.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : selectedBook.title} - {lang === 'tr' ? 'Bilgi Kartları' : 'Flashcards'}
                    </h3>
                    <p className={`text-xs mt-1 ${mutedClass}`}>{lang === 'tr' ? 'Bilgi kartları yardımıyla aktif hatırlama ve pekiştirme yapın.' : 'Practice active recall and reinforcement using flashcards.'}</p>
                  </div>
                  {bookFlashcards.length > 0 && (
                    <button
                      onClick={() => setIsFlashcardFocusMode(true)}
                      className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/50'
                      }`}
                    >
                      <Maximize2 className="w-4 h-4" /> {lang === 'tr' ? 'Odak Modu' : 'Focus Mode'}
                    </button>
                  )}
                </div>

                {isBusy ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    <p className={`text-xs ${mutedClass}`}>{lang === 'tr' ? 'Yapay Zeka Bilgi Kartları Hazırlanıyor...' : 'Preparing AI Flashcards...'}</p>
                  </div>
                ) : activeCard ? (
                  <div className="flex flex-col gap-6">
                    {/* Card container */}
                    <div className="flex justify-center py-4">
                      <div className="perspective-1000 w-full max-w-md h-72">
                        <div 
                          onClick={() => setIsCardFlipped(!isCardFlipped)}
                          className={`flip-card-inner cursor-pointer select-none ${isCardFlipped ? 'flipped' : ''}`}
                        >
                          {/* Front Face */}
                          <div className={`flip-card-front p-6 border text-center shadow-lg ${surfaceClass}`}>
                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-lg">{lang === 'tr' ? 'Ön Yüz' : 'Front Face'}</span>
                            <p className={`text-sm font-black leading-relaxed ${titleClass} mt-4`}>{activeCard.front}</p>
                            <span className={`text-[10px] mt-6 ${mutedClass}`}>{lang === 'tr' ? 'Detayları görmek için karta tıklayın' : 'Click card to see details'}</span>
                          </div>

                          {/* Back Face */}
                          <div className={`flip-card-back p-6 border text-center shadow-lg ${isLightTheme ? 'border-indigo-500/40 bg-indigo-50/50' : 'border-indigo-500/40 bg-indigo-950/20'} ${surfaceClass}`}>
                            <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">{lang === 'tr' ? 'Arka Yüz (Açıklama)' : 'Back Face (Explanation)'}</span>
                            <p className={`text-xs font-semibold leading-relaxed ${titleClass} mt-4`}>{activeCard.back}</p>
                            <span className={`text-[10px] mt-6 ${mutedClass}`}>{lang === 'tr' ? 'Geri dönmek için tıklayın' : 'Click to go back'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controls row */}
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleUpdateCardStatus(activeCard.id, 'none')}
                        className="h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition-all"
                      >
                        {lang === 'tr' ? 'Tekrar Gösterme' : 'Do Not Show Again'}
                      </button>
                      <button
                        onClick={() => handleUpdateCardStatus(activeCard.id, 'normal')}
                        className={`h-10 rounded-xl border text-xs font-bold transition-all ${
                          isLightTheme ? 'border-stone-250 bg-white text-stone-700 hover:bg-stone-50' : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        {lang === 'tr' ? 'Normal Göster' : 'Show Normal'}
                      </button>
                      <button
                        onClick={() => handleUpdateCardStatus(activeCard.id, 'more')}
                        className="h-10 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all"
                      >
                        {lang === 'tr' ? 'Daha Sık Göster' : 'Show More Often'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center border-t border-stone-200 dark:border-zinc-800/60 pt-4 px-1">
                      <button
                        disabled={currentCardIndex === 0}
                        onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex - 1); }}
                        className="text-xs font-bold opacity-60 hover:opacity-100 disabled:opacity-30"
                      >
                        {lang === 'tr' ? '← Önceki' : '← Previous'}
                      </button>
                      
                      {cardHistoryStack.length > 0 && (
                        <button
                          onClick={handleUndoCardAction}
                          className="text-xs text-indigo-500 font-bold hover:underline flex items-center gap-1"
                        >
                          <Undo className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Geri Al' : 'Undo'}
                        </button>
                      )}

                      <button
                        disabled={currentCardIndex === bookFlashcards.length - 1}
                        onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex + 1); }}
                        className="text-xs font-bold opacity-60 hover:opacity-100 disabled:opacity-30"
                      >
                        {lang === 'tr' ? 'Sonraki →' : 'Next →'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <Bookmark className="w-8 h-8 text-indigo-500 opacity-60" />
                    <p className="text-xs opacity-60">{lang === 'tr' ? 'Bu belgeye ait bilgi kartı bulunmuyor.' : 'No flashcards found for this document.'}</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState text={lang === 'tr' ? 'Belge seçimi gerekli.' : 'Document selection required.'} />
            )}
          </div>
        </div>
      )}

      {subTab === 'flashcards-manager' && (
        <div className={`p-6 rounded-3xl border ${surfaceClass} flex flex-col gap-5`}>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 dark:border-zinc-800/60 pb-4">
            <div>
              <h3 className={`text-base font-black ${titleClass}`}>{t('fc_title')}</h3>
              <p className={`text-xs mt-1 ${mutedClass}`}>{t('fc_manager_subtitle' as any)}</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none opacity-60">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={flashcardSearch}
                onChange={(e) => setFlashcardSearch(e.target.value)}
                placeholder={t('fc_manager_search_placeholder' as any)}
                className={`w-full h-9 pl-9 pr-4 rounded-xl border text-xs focus:outline-none focus:border-indigo-500 ${
                  isLightTheme ? 'border-stone-200 bg-white text-stone-900' : 'border-zinc-855 bg-zinc-950 text-zinc-100'
                }`}
              />
            </div>
          </div>

          {/* Filter sub-tab menu */}
          <div className="flex gap-2">
            <button
              onClick={() => setFlashcardManagerTab('more')}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                flashcardManagerTab === 'more'
                  ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                  : 'border border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {t('fc_manager_tab_more' as any)}
            </button>
            <button
              onClick={() => setFlashcardManagerTab('none')}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                flashcardManagerTab === 'none'
                  ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                  : 'border border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {t('fc_manager_tab_none' as any)}
            </button>
          </div>

          {/* Cards List Grid */}
          {filteredManagerCards.length === 0 ? (
            <div className="py-16 text-center text-xs opacity-60">
              {t('fc_manager_no_cards' as any)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${isLightTheme ? 'border-stone-200 text-stone-600' : 'border-zinc-800 text-zinc-400'} font-bold uppercase tracking-wider text-[10px]`}>
                    <th className="pb-3 pl-4 w-1/4">{t('fc_manager_col_book' as any)}</th>
                    <th className="pb-3 w-1/3">{t('fc_manager_col_front' as any)}</th>
                    <th className="pb-3 w-1/3">{t('fc_manager_col_back' as any)}</th>
                    <th className="pb-3 pr-4 text-right w-[100px]">{t('fc_manager_col_actions' as any)}</th>
                  </tr>
                </thead>
              </table>
              <VirtualList
                items={filteredManagerCards}
                itemHeight={64}
                containerHeight={Math.min(filteredManagerCards.length * 64, 520)}
                overscan={5}
                keyExtractor={(card: any) => card.id}
                renderItem={(card: any) => (
                  <div className={`flex items-center group hover:bg-stone-50 dark:hover:bg-zinc-900/40 transition-colors border-b ${isLightTheme ? 'border-stone-100' : 'border-zinc-900'}`} style={{ height: 64 }}>
                    <div className="py-3 pl-4 pr-3 font-semibold text-indigo-500 truncate w-1/4 text-xs">
                      {card.bookTitle === 'Velox okuma rehberi' && lang !== 'tr' ? 'Velox Speed Reading Guide' : card.bookTitle}
                    </div>
                    <div className={`py-3 pr-3 font-black ${titleClass} break-words w-1/3 text-xs`}>
                      {card.front}
                    </div>
                    <div className="py-3 pr-3 opacity-80 break-words w-1/3 text-xs">
                      {card.back}
                    </div>
                    <div className="py-3 pr-4 text-right whitespace-nowrap w-[100px]">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          onClick={() => handleUpdateCardStatus(card.id, 'normal')}
                          className="text-[11px] text-indigo-500 font-bold hover:underline"
                          title={t('fc_manager_remove_tag' as any)}
                        >
                          {t('fc_manager_remove_tag' as any)}
                        </button>
                        <button
                          onClick={() => handleDeleteFlashcard(card.id)}
                          className="text-rose-500 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-opacity"
                          title={t('fc_manager_delete_tooltip' as any)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </div>
      )}

      {/* Quiz Editing Modal */}
      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSave={handleSaveEditedQuiz}
          isLightTheme={isLightTheme}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
      )}

      {/* Flashcard Editing Modal */}
      {editingDesteBookId && (
        <EditFlashcardsModal
          bookId={editingDesteBookId}
          bookTitle={books.find((b: any) => b.id === editingDesteBookId)?.title || ''}
          cards={flashcards.filter((c: any) => c.bookId === editingDesteBookId)}
          onClose={() => setEditingDesteBookId(null)}
          onSave={handleSaveEditedDeste}
          isLightTheme={isLightTheme}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
        />
      )}

      {/* Result Modal */}
      {showResultModal && (
        <ResultModal
          onClose={() => setShowResultModal(false)}
          correct={correctCount}
          wrong={wrongCount}
          empty={emptyCount}
          total={totalQuestions}
          score={scorePercentage}
          onRetake={() => {
            setShowResultModal(false);
            handleResetQuiz();
          }}
          surfaceClass={surfaceClass}
          titleClass={titleClass}
          mutedClass={mutedClass}
          isLightTheme={isLightTheme}
        />
      )}

      {/* Flashcard Focus Mode Fullscreen View */}
      {isFlashcardFocusMode && activeCard && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-6 backdrop-blur-xl bg-stone-900/95 dark:bg-black/95">
          {/* Header */}
          <div className="flex justify-between items-center w-full max-w-4xl mx-auto border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wider">
                {selectedBook?.id === 'sample-welcome' && lang !== 'tr' ? 'Velox Speed Reading Guide' : selectedBook?.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">{t('fc_focus_mode_desc' as any)}</p>
            </div>
            <button
              onClick={() => setIsFlashcardFocusMode(false)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-1.5 text-xs font-bold"
              title={t('fc_focus_mode_esc_tip' as any)}
            >
              <Minimize2 className="w-4 h-4" /> {t('fc_focus_mode_exit' as any)}
            </button>
          </div>

          {/* Central Card container */}
          <div className="flex-1 flex items-center justify-center py-8 w-full">
            <div className="perspective-1000 w-full max-w-xl h-80">
              <div 
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className={`flip-card-inner cursor-pointer select-none ${isCardFlipped ? 'flipped' : ''}`}
              >
                {/* Front Face */}
                <div className="flip-card-front p-8 border border-white/10 text-center shadow-2xl bg-zinc-900/90 text-white">
                  <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{t('fc_front_side')}</span>
                  <p className="text-lg font-black text-white leading-relaxed mt-4">{activeCard.front}</p>
                  <span className="text-[10px] mt-6 text-zinc-500">{t('fc_flip_hint')}</span>
                </div>

                {/* Back Face */}
                <div className="flip-card-back p-8 border border-white/10 text-center shadow-2xl bg-indigo-955/40 text-white">
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{t('fc_back_side')}</span>
                  <p className="text-sm font-semibold text-zinc-200 leading-relaxed mt-4">{activeCard.back}</p>
                  <span className="text-[10px] mt-6 text-zinc-500">{t('fc_flip_back_hint')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 border-t border-white/10 pt-4">
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleUpdateCardStatus(activeCard.id, 'none')}
                className="h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all"
              >
                {t('fc_btn_no_show')}
              </button>
              <button
                onClick={() => handleUpdateCardStatus(activeCard.id, 'normal')}
                className="h-12 rounded-xl border border-white/10 bg-white/5 text-zinc-300 text-xs font-bold hover:bg-white/10 transition-all"
              >
                {t('fc_btn_show_normal')}
              </button>
              <button
                onClick={() => handleUpdateCardStatus(activeCard.id, 'more')}
                className="h-12 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                {t('fc_btn_show_more')}
              </button>
            </div>

            <div className="flex justify-between items-center px-1">
              <button
                disabled={currentCardIndex === 0}
                onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex - 1); }}
                className="text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-30"
              >
                ← {t('fc_focus_mode_prev_card' as any)}
              </button>
              
              {cardHistoryStack.length > 0 && (
                <button
                  onClick={handleUndoCardAction}
                  className="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Undo className="w-3.5 h-3.5" /> {t('fc_focus_mode_undo_eval' as any)}
                </button>
              )}

              <button
                disabled={currentCardIndex === bookFlashcards.length - 1}
                onClick={() => { setIsCardFlipped(false); setCurrentCardIndex(currentCardIndex + 1); }}
                className="text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-30"
              >
                {t('fc_focus_mode_next_card' as any)} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
