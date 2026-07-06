/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, Suspense, lazy } from 'react';
import { BookOpen, Brain, Bookmark, Download, Trash2, Sparkles } from 'lucide-react';
import { useTranslation } from '../utils/i18n';
import { PageHeader } from '../components/common/UIHelpers';

const ProgressLineChart = lazy(() =>
  import('../components/charts/AnalyticsCharts').then((m) => ({ default: m.ProgressLineChart }))
);
const DistributionBarChart = lazy(() =>
  import('../components/charts/AnalyticsCharts').then((m) => ({ default: m.DistributionBarChart }))
);

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

export function ProgressPage({
  stats,
  todayWords,
  totalMinutes,
  quizHistory,
  flashcards,
  readingReport,
  setReadingReport,
  quizReport,
  setQuizReport,
  cardReport,
  setCardReport,
  readingReportHistory = [],
  setReadingReportHistory,
  quizReportHistory = [],
  setQuizReportHistory,
  cardReportHistory = [],
  setCardReportHistory,
  onDeleteHistoryItem,
  reportLoading,
  setReportLoading,
  postAi,
  surfaceClass,
  titleClass,
  mutedClass,
  isLightTheme
}: any) {
  const { t, lang } = useTranslation();
  // Subtab: 'reading' | 'quiz' | 'cards'
  const [progSubTab, setProgSubTab] = useState<'reading' | 'quiz' | 'cards'>('reading');
  const [progressRange, setProgressRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [quizProgressRange, setQuizProgressRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [cardProgressRange, setCardProgressRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [readingReportTab, setReadingReportTab] = useState<'active' | 'history'>('active');
  const [quizReportTab, setQuizReportTab] = useState<'active' | 'history'>('active');
  const [cardReportTab, setCardReportTab] = useState<'active' | 'history'>('active');

  const [selectedPastReadingReport, setSelectedPastReadingReport] = useState<any>(null);
  const [selectedPastQuizReport, setSelectedPastQuizReport] = useState<any>(null);
  const [selectedPastCardReport, setSelectedPastCardReport] = useState<any>(null);

  const computedChartData = useMemo(() => {
    type HistoryItem = { date: string; wordCount: number; durationSeconds: number };
    const history = stats.history || [];

    const getWeekNumber = (date: Date) => {
      const onejan = new Date(date.getFullYear(), 0, 1);
      return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    };

    if (progressRange === 'daily') {
      const historyMap = new Map<string, HistoryItem>(history.map(item => [item.date, item]));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().split('T')[0];
        const item = historyMap.get(key);
        return {
          date: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          words: item?.wordCount || 0,
          minutes: Math.round((item?.durationSeconds || 0) / 60)
        };
      });
    }

    if (progressRange === 'weekly') {
      const weeksMap = new Map<string, { words: number; seconds: number }>();
      history.forEach(item => {
        const date = new Date(item.date);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const key = `${year}-W${week}`;
        const existing = weeksMap.get(key) || { words: 0, seconds: 0 };
        weeksMap.set(key, {
          words: existing.words + item.wordCount,
          seconds: existing.seconds + item.durationSeconds
        });
      });

      return Array.from({ length: 4 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (3 - index) * 7);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const key = `${year}-W${week}`;
        const val = weeksMap.get(key) || { words: 0, seconds: 0 };
        return {
          date: lang === 'tr' ? `${index + 1}. Hafta` : `Week ${index + 1}`,
          words: val.words,
          minutes: Math.round(val.seconds / 60)
        };
      });
    }

    if (progressRange === 'monthly') {
      const monthsMap = new Map<string, { words: number; seconds: number }>();
      history.forEach(item => {
        const date = new Date(item.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const existing = monthsMap.get(key) || { words: 0, seconds: 0 };
        monthsMap.set(key, {
          words: existing.words + item.wordCount,
          seconds: existing.seconds + item.durationSeconds
        });
      });

      return Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index));
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const val = monthsMap.get(key) || { words: 0, seconds: 0 };
        return {
          date: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'long' }),
          words: val.words,
          minutes: Math.round(val.seconds / 60)
        };
      });
    }

    if (progressRange === 'yearly') {
      const yearsMap = new Map<number, { words: number; seconds: number }>();
      history.forEach(item => {
        const date = new Date(item.date);
        const year = date.getFullYear();
        const existing = yearsMap.get(year) || { words: 0, seconds: 0 };
        yearsMap.set(year, {
          words: existing.words + item.wordCount,
          seconds: existing.seconds + item.durationSeconds
        });
      });

      return Array.from({ length: 3 }, (_, index) => {
        const date = new Date();
        const year = date.getFullYear() - (2 - index);
        const val = yearsMap.get(year) || { words: 0, seconds: 0 };
        return {
          date: String(year),
          words: val.words,
          minutes: Math.round(val.seconds / 60)
        };
      });
    }

    if (progressRange === 'custom') {
      if (!customStartDate || !customEndDate) return [];
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const daysCount = Math.min(60, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      const historyMap = new Map<string, HistoryItem>(history.map(item => [item.date, item]));
      
      return Array.from({ length: daysCount }, (_, index) => {
        const date = new Date(start);
        date.setDate(date.getDate() + index);
        const key = date.toISOString().split('T')[0];
        const item = historyMap.get(key);
        return {
          date: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' }),
          words: item?.wordCount || 0,
          minutes: Math.round((item?.durationSeconds || 0) / 60)
        };
      });
    }

    return [];
  }, [stats.history, progressRange, customStartDate, customEndDate, lang]);

  const filteredQuizHistory = useMemo(() => {
    if (quizProgressRange === 'custom' && (!customStartDate || !customEndDate)) return quizHistory;
    const cutoff = new Date();
    if (quizProgressRange === 'daily') cutoff.setDate(cutoff.getDate() - 7);
    else if (quizProgressRange === 'weekly') cutoff.setDate(cutoff.getDate() - 28);
    else if (quizProgressRange === 'monthly') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (quizProgressRange === 'yearly') cutoff.setFullYear(cutoff.getFullYear() - 3);
    cutoff.setHours(0, 0, 0, 0);

    return quizHistory.filter((q: any) => {
      const qDate = parseCustomDate(q.date);
      if (quizProgressRange === 'custom') {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return qDate >= start && qDate <= end;
      }
      return qDate >= cutoff;
    });
  }, [quizHistory, quizProgressRange, customStartDate, customEndDate]);

  const filteredFlashcards = useMemo(() => {
    if (cardProgressRange === 'custom' && (!customStartDate || !customEndDate)) return flashcards;
    const cutoff = new Date();
    if (cardProgressRange === 'daily') cutoff.setDate(cutoff.getDate() - 7);
    else if (cardProgressRange === 'weekly') cutoff.setDate(cutoff.getDate() - 28);
    else if (cardProgressRange === 'monthly') cutoff.setMonth(cutoff.getMonth() - 6);
    else if (cardProgressRange === 'yearly') cutoff.setFullYear(cutoff.getFullYear() - 3);
    cutoff.setHours(0, 0, 0, 0);

    return flashcards.filter((c: any) => {
      if (!c.lastReviewed) return true;
      const rDate = parseCustomDate(c.lastReviewed);
      if (cardProgressRange === 'custom') {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return rDate >= start && rDate <= end;
      }
      return rDate >= cutoff;
    });
  }, [flashcards, cardProgressRange, customStartDate, customEndDate]);

  const handleExportData = (type: 'reading' | 'quiz' | 'cards', format: 'json' | 'csv' | 'txt') => {
    let content = '';
    let mimeType = 'text/plain';
    let filename = `velox_${type}_raporu.${format}`;

    if (type === 'reading') {
      if (format === 'json') {
        content = JSON.stringify(computedChartData, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = 'Tarih,Okunan Kelime,Süre (Dakika)\n';
        computedChartData.forEach(item => {
          content += `"${item.date}",${item.words},${item.minutes}\n`;
        });
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = `VELOX AKILLI OKUMA ASİSTANI - OKUMA ANALİZİ VE İLERLEME RAPORU\n`;
        content += `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `Filtreleme Aralığı: ${progressRange.toUpperCase()}\n`;
        content += `--------------------------------------------------\n\n`;
        computedChartData.forEach(item => {
          content += `- Dönem/Tarih: ${item.date}\n  Okunan Kelime: ${item.words.toLocaleString()} kelime\n  Okuma Süresi: ${item.minutes} dakika\n\n`;
        });
      }
    } else if (type === 'quiz') {
      if (format === 'json') {
        content = JSON.stringify(filteredQuizHistory, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = 'Tarih,Sınav Başlığı,Skor\n';
        filteredQuizHistory.forEach((item: any) => {
          content += `"${item.date}","${item.title || ''}",${item.score}\n`;
        });
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = `VELOX AKILLI OKUMA ASİSTANI - QUİZ BAŞARI ANALİZ RAPORU\n`;
        content += `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `Filtreleme Aralığı: ${quizProgressRange.toUpperCase()}\n`;
        content += `Toplam Çözülen Sınav: ${filteredQuizHistory.length}\n`;
        content += `Ortalama Başarı Skoru: %${avgScore}\n`;
        content += `--------------------------------------------------\n\n`;
        filteredQuizHistory.forEach((item: any) => {
          content += `- Tarih: ${item.date}\n  Sınav: ${item.title || 'Genel Test'}\n  Başarı Skoru: %${item.score}\n\n`;
        });
      }
    } else if (type === 'cards') {
      if (format === 'json') {
        content = JSON.stringify(filteredFlashcards, null, 2);
        mimeType = 'application/json';
      } else if (format === 'csv') {
        content = 'Soru/Kavram,Cevap,Kutu,Tekrar Sayısı,Son İnceleme\n';
        filteredFlashcards.forEach((item: any) => {
          content += `"${item.front}","${item.back}",${item.box || 1},${item.reviewsCount || 0},"${item.lastReviewed || ''}"\n`;
        });
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = `VELOX AKILLI OKUMA ASİSTANI - BİLGİ KARTLARI BELLEK ANALİZ RAPORU\n`;
        content += `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
        content += `Filtreleme Aralığı: ${cardProgressRange.toUpperCase()}\n`;
        content += `Toplam Aktif Kart: ${filteredFlashcards.length}\n`;
        content += `Toplam Tekrar Seansı: ${totalReviews}\n`;
        content += `--------------------------------------------------\n\n`;
        filteredFlashcards.forEach((item: any) => {
          content += `- Kavram/Soru: ${item.front}\n  Açıklama/Cevap: ${item.back}\n  Leitner Kutusu: Kutu ${item.box || 1}\n  Yapılan Tekrar: ${item.reviewsCount || 0} kez\n  Son İnceleme: ${item.lastReviewed || 'Hiç yapılmadı'}\n\n`;
        });
      }
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const avgScore = filteredQuizHistory.length > 0
    ? Math.round(filteredQuizHistory.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / filteredQuizHistory.length)
    : 0;

  const totalReviews = filteredFlashcards.reduce((acc: number, curr: any) => acc + (curr.reviewsCount || 0), 0);

  const scoreDistribution = useMemo(() => {
    let low = 0;
    let mid = 0;
    let high = 0;
    filteredQuizHistory.forEach((h: any) => {
      if (h.score < 60) low++;
      else if (h.score < 80) mid++;
      else high++;
    });
    return [
      { range: lang === 'tr' ? 'Geliştirilmeli (0-59)' : 'Needs Improvement (0-59)', count: low },
      { range: lang === 'tr' ? 'Başarılı (60-79)' : 'Successful (60-79)', count: mid },
      { range: lang === 'tr' ? 'Mükemmel (80-100)' : 'Excellent (80-100)', count: high }
    ];
  }, [filteredQuizHistory, lang]);

  const cardReviewDistribution = useMemo(() => {
    let unreviewed = 0;
    let low = 0;
    let mid = 0;
    let high = 0;
    filteredFlashcards.forEach((c: any) => {
      const count = c.reviewsCount || 0;
      if (count === 0) unreviewed++;
      else if (count <= 3) low++;
      else if (count <= 7) mid++;
      else high++;
    });
    return [
      { status: lang === 'tr' ? 'Çalışılmadı (0)' : 'Unreviewed (0)', count: unreviewed },
      { status: lang === 'tr' ? 'Tanışma (1-3)' : 'Learning (1-3)', count: low },
      { status: lang === 'tr' ? 'Pekiştirme (4-7)' : 'Reviewing (4-7)', count: mid },
      { status: lang === 'tr' ? 'Uzman (8+)' : 'Mastered (8+)', count: high }
    ];
  }, [filteredFlashcards, lang]);

  const handleGenerateReport = async (type: 'reading' | 'quiz' | 'cards') => {
    setReportLoading(type);
    try {
      let prompt = '';
      if (type === 'reading') {
        prompt = lang === 'tr'
          ? `Aşağıdaki hızlı okuma verilerimi analiz et ve Türkçe olarak kısa, öz, geliştirici bir gelişim raporu hazırla:\nToplam okunan kelime: ${stats.totalWordsRead}\nOkuma süresi: ${totalMinutes} dakika\nEn yüksek okuma hızı: ${stats.maxSpeedWpm} WPM\nGünlük seri: ${stats.dailyStreak} gün.\nRaporda Markdown kullan.`
          : `Analyze the following speed reading data and prepare a short, concise, and constructive progress report in English:\nTotal words read: ${stats.totalWordsRead}\nReading duration: ${totalMinutes} minutes\nMax reading speed: ${stats.maxSpeedWpm} WPM\nDaily streak: ${stats.dailyStreak} days.\nUse Markdown for formatting.`;
      } else if (type === 'quiz') {
        prompt = lang === 'tr'
          ? `Aşağıdaki yapay zeka sınav sonuç geçmişimi analiz et ve Türkçe olarak hangi konularda daha iyi olduğumu, neleri geliştirmem gerektiğini özetleyen kısa bir öğrenim gelişim raporu hazırla:\nToplam çözülen sınav sayısı: ${quizHistory.length}\nOrtalama sınav başarısı: %${avgScore}\nSon sınav skorları: ${JSON.stringify(quizHistory.slice(0, 3).map(h => h.score))}.\nRaporda Markdown kullan.`
          : `Analyze the following AI quiz history and prepare a short learning progress report in English summarizing what topics I excel in and what I need to improve:\nTotal quizzes taken: ${quizHistory.length}\nAverage score: %${avgScore}\nRecent quiz scores: ${JSON.stringify(quizHistory.slice(0, 3).map(h => h.score))}.\nUse Markdown for formatting.`;
      } else if (type === 'cards') {
        prompt = lang === 'tr'
          ? `Aşağıdaki akıllı bilgi kartı hafıza laboratuvarı verilerimi analiz et ve Türkçe olarak hatırlama gücümü artıracak pratik taktikler içeren kısa bir hafıza raporu hazırla:\nToplam bilgi kartı sayısı: ${flashcards.length}\nKart tekrarı sayısı: ${totalReviews}\nEn çok çalışılan kartların tekrar adetleri: ${JSON.stringify(flashcards.slice(0, 3).map(c => c.reviewsCount))}.\nRaporda Markdown kullan.`
          : `Analyze the following smart flashcard memory lab data and prepare a short memory report in English containing practical tactics to increase my recall power:\nTotal flashcards: ${flashcards.length}\nTotal card reviews: ${totalReviews}\nReview counts of most studied cards: ${JSON.stringify(flashcards.slice(0, 3).map(c => c.reviewsCount))}.\nUse Markdown for formatting.`;
      }

      const res = await postAi('/api/ai/insights', { text: prompt, title: 'Gelişim Analizi Raporu' });
      
      let reportText = '';
      if (res.keyInsights?.length || res.actionableIdea || res.mentalModel) {
        const insightsHeader = lang === 'tr' ? '### 💡 Önemli İçgörüler' : '### 💡 Key Insights';
        const actionLabel = lang === 'tr' ? '**Aksiyon:**' : '**Action:**';
        const modelLabel = lang === 'tr' ? '**Zihinsel Model:**' : '**Mental Model:**';
        
        const insightsList = res.keyInsights?.map((item: string) => `- ${item}`).join('\n') || '';
        reportText = `${insightsHeader}\n${insightsList}\n\n${actionLabel} ${res.actionableIdea || ''}\n\n${modelLabel} ${res.mentalModel || ''}`;
      } else {
        reportText = res.insights || res.content || (lang === 'tr' ? 'Okuma gelişim raporu hazırlandı.' : 'Reading progress report prepared.');
      }

      const newReportItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
        content: reportText
      };

      if (type === 'reading') {
        setReadingReport(reportText);
        localStorage.setItem('velox_reading_report_active', reportText);
        const updated = [newReportItem, ...readingReportHistory];
        setReadingReportHistory(updated);
        localStorage.setItem('velox_reading_reports_history', JSON.stringify(updated));
      }
      if (type === 'quiz') {
        setQuizReport(reportText);
        localStorage.setItem('velox_quiz_report_active', reportText);
        const updated = [newReportItem, ...quizReportHistory];
        setQuizReportHistory(updated);
        localStorage.setItem('velox_quiz_reports_history', JSON.stringify(updated));
      }
      if (type === 'cards') {
        setCardReport(reportText);
        localStorage.setItem('velox_card_report_active', reportText);
        const updated = [newReportItem, ...cardReportHistory];
        setCardReportHistory(updated);
        localStorage.setItem('velox_card_reports_history', JSON.stringify(updated));
      }
    } catch (e) {
      // Offline fallback
      let reportFallback = '';
      if (type === 'reading') {
        reportFallback = lang === 'tr'
          ? `### 📈 Okuma İlerleme Raporu

**Genel Değerlendirme:**
Toplamda ${stats.totalWordsRead.toLocaleString()} kelime okuyarak harika bir tempolu okuma disiplini edindiniz. Maksimum okuma hızınız olan ${stats.maxSpeedWpm} WPM, gözünüzün ORP (Optimal Tanıma Noktası) yeteneğini oldukça iyi geliştirdiğini gösteriyor.

**Gelişim Önerileri:**
- Subvocalization (iç seslendirme) alışkanlığını azaltmak için okuma hızınızı kademeli olarak 400 WPM üzerine sabitlemeye çalışın.
- Günlük ${stats.dailyStreak} günlük istikrarınızı koruyun.`
          : `### 📈 Reading Progress Report

**General Assessment:**
You have built a great speed reading discipline by reading a total of ${stats.totalWordsRead.toLocaleString()} words. Your maximum reading speed of ${stats.maxSpeedWpm} WPM shows that you have improved your eye's OVP (Optimal Visual Point) ability quite well.

**Development Suggestions:**
- Try to gradually stabilize your reading speed above 400 WPM to reduce the habit of subvocalization.
- Maintain your daily consistency of ${stats.dailyStreak} days.`;
        setReadingReport(reportFallback);
        localStorage.setItem('velox_reading_report_active', reportFallback);
        const newReportItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
          content: reportFallback
        };
        const updated = [newReportItem, ...readingReportHistory];
        setReadingReportHistory(updated);
        localStorage.setItem('velox_reading_reports_history', JSON.stringify(updated));
      } else if (type === 'quiz') {
        reportFallback = lang === 'tr'
          ? `### 🏆 Sınav Kavrama Analizi

**Genel Değerlendirme:**
Bugüne kadar çözdüğünüz ${quizHistory.length} sınav genelinde ortalama **%${avgScore}** başarı elde ederek yüksek bir okuduğunu anlama oranına ulaştınız.

**Gelişim Önerileri:**
- Hatalı yaptığınız soru başlıklarındaki metin bölümlerini Çalışma Alanında tekrar ziyaret edin.
- Zorluk seviyesini kademeli olarak 'Zor' seçeneğe taşıyarak yorum sorularında aktif akıl yürütme pratiği yapın.`
          : `### 🏆 Quiz Comprehension Analysis

**General Assessment:**
You have achieved a high reading comprehension rate with an average success of **%${avgScore}** across all ${quizHistory.length} quizzes taken so far.

**Development Suggestions:**
- Revisit the text sections of the question topics you got wrong in the Workspace.
- Gradually move the difficulty level to 'Hard' to practice active reasoning in interpretation questions.`;
        setQuizReport(reportFallback);
        localStorage.setItem('velox_quiz_report_active', reportFallback);
        const newReportItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
          content: reportFallback
        };
        const updated = [newReportItem, ...quizReportHistory];
        setQuizReportHistory(updated);
        localStorage.setItem('velox_quiz_reports_history', JSON.stringify(updated));
      } else if (type === 'cards') {
        reportFallback = lang === 'tr'
          ? `### 💡 Hafıza Laboratuvarı Gelişim Raporu

**Genel Değerlendirme:**
Toplamda ${flashcards.length} karta sahipsiniz ve bugüne kadar ${totalReviews} tekrar gerçekleştirerek bilgileri zihninizde pekiştirdiniz.

**Gelişim Önerileri:**
- "Sık Gösterilecekler" listesindeki kart sayısını azaltmak için her sabah 5 dakikalık bir odak kart seansı uygulayın.
- Feynman Tekniğini kullanarak en karmaşık kartları kendi kelimelerinizle açıklayın.`
          : `### 💡 Memory Lab Progress Report

**General Assessment:**
You have a total of ${flashcards.length} cards and have consolidated the information in your mind by performing ${totalReviews} repetitions so far.

**Development Suggestions:**
- Apply a 5-minute focused card session every morning to reduce the number of cards in the "Frequently Shown" list.
- Explain the most complex cards in your own words using the Feynman Technique.`;
        setCardReport(reportFallback);
        localStorage.setItem('velox_card_report_active', reportFallback);
        const newReportItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US'),
          content: reportFallback
        };
        const updated = [newReportItem, ...cardReportHistory];
        setCardReportHistory(updated);
        localStorage.setItem('velox_card_reports_history', JSON.stringify(updated));
      }
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t('pr_title')}
        description={t('pr_subtitle')}
        titleClass={titleClass}
        mutedClass={mutedClass}
      />

      {/* Sub-tab selection menu */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-zinc-900 pb-3">
        {[
          { id: 'reading', label: t('pr_tab_reading'), icon: BookOpen },
          { id: 'quiz', label: t('pr_tab_quiz'), icon: Brain },
          { id: 'cards', label: t('pr_tab_cards'), icon: Bookmark }
        ].map((tab) => {
          const isActive = progSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setProgSubTab(tab.id as any)}
              className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                  : isLightTheme
                  ? 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  : 'border-zinc-850 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Rendering based on SubTab */}
      {progSubTab === 'reading' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{t('pr_total_words_read')}</span>
                <span className="text-xl font-black mt-1 text-current">{stats.totalWordsRead.toLocaleString()}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'OKUMA SÜRESİ' : 'READING DURATION'}</span>
                <span className="text-xl font-black mt-1 text-current">{totalMinutes} {t('pr_mins_unit')}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'MAKS HIZ (WPM)' : 'MAX SPEED (WPM)'}</span>
                <span className="text-xl font-black mt-1 text-current">{stats.maxSpeedWpm}</span>
              </div>
            </div>

            {/* Reading Chart */}
            <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className={`text-xs font-black ${titleClass}`}>{t('pr_chart_reading_title')}</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    {[
                      { id: 'daily', label: t('pr_range_daily') },
                      { id: 'weekly', label: t('pr_range_weekly') },
                      { id: 'monthly', label: t('pr_range_monthly') },
                      { id: 'yearly', label: t('pr_range_yearly') },
                      { id: 'custom', label: t('pr_range_custom') }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProgressRange(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          progressRange === p.id
                            ? 'bg-indigo-600 text-white shadow'
                            : `${mutedClass} hover:text-indigo-500`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <button type="button" className="h-8 px-3 rounded-xl border border-stone-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-[10px] font-black flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-zinc-900">
                      <Download className="w-3.5 h-3.5" /> {t('pr_export_data')}
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 min-w-[120px]">
                      <button type="button" onClick={() => handleExportData('reading', 'csv')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{t('pr_export_csv')}</button>
                      <button type="button" onClick={() => handleExportData('reading', 'json')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{t('pr_export_json')}</button>
                      <button type="button" onClick={() => handleExportData('reading', 'txt')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{t('pr_export_txt')}</button>
                    </div>
                  </div>
                </div>
              </div>

              {progressRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-stone-150 dark:border-zinc-900">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{t('pr_custom_start')}</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{t('pr_custom_end')}</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                </div>
              )}

              <div className="h-[250px]">
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs opacity-50">{lang === 'tr' ? 'Grafik Yükleniyor...' : 'Loading Chart...'}</div>}>
                  <ProgressLineChart
                    isLightTheme={isLightTheme}
                    data={computedChartData}
                    dataKey="words"
                    stroke="#4f46e5"
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* AI Report Column */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4 h-full`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3 flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{t('pr_ai_report_title')}</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setReadingReportTab('active'); setSelectedPastReadingReport(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        readingReportTab === 'active' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? 'Son Rapor' : 'Latest'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingReportTab('history')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        readingReportTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? `Geçmiş (${readingReportHistory.length})` : `History (${readingReportHistory.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateReport('reading')}
                    disabled={reportLoading === 'reading'}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3 h-3" /> {reportLoading === 'reading' ? t('pr_ai_report_loading') : t('pr_ai_report_btn')}
                  </button>
                </div>
              </div>

              {readingReportTab === 'active' ? (
                readingReport ? (
                  <div className="text-xs leading-relaxed opacity-95 flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1 whitespace-pre-wrap">
                    {readingReport}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500 opacity-60 animate-pulse" />
                    <p className="text-xs opacity-60">{t('pr_ai_report_empty')}</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1">
                  {selectedPastReadingReport ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center bg-stone-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800">
                        <span className="text-[10px] font-black text-indigo-500">{selectedPastReadingReport.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPastReadingReport(null)}
                          className="text-[10px] font-black text-indigo-500 hover:underline"
                        >
                          {lang === 'tr' ? '← Geri' : '← Back'}
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">
                        {selectedPastReadingReport.content}
                      </div>
                    </div>
                  ) : readingReportHistory.length === 0 ? (
                    <p className="text-xs opacity-60 text-center py-8">{lang === 'tr' ? 'Henüz geçmiş rapor kaydı yok.' : 'No past report history yet.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {readingReportHistory.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedPastReadingReport(item)}
                            className="text-left font-black text-xs text-indigo-500 hover:underline flex-1 truncate mr-2"
                          >
                            📅 {item.date}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem('reading', item.id)}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {progSubTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'ÇÖZÜLEN SINAV' : 'COMPLETED QUIZZES'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredQuizHistory.length} {lang === 'tr' ? 'sınav' : 'quizzes'}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'ORTALAMA BAŞARI' : 'AVERAGE COMPREHENSION'}</span>
                <span className="text-xl font-black mt-1 text-current">%{avgScore}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'BAŞARI SERİSİ' : 'SUCCESS STREAK'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredQuizHistory.filter((h: any) => h.score >= 80).length} {lang === 'tr' ? 'sınav (%80+)' : 'quizzes (%80+)'}</span>
              </div>
            </div>

            {/* Quiz performance bar chart */}
            <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className={`text-xs font-black ${titleClass}`}>{lang === 'tr' ? 'Sınav Başarı Dağılımı' : 'Quiz Success Distribution'}</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    {[
                      { id: 'daily', label: lang === 'tr' ? 'Günlük' : 'Daily' },
                      { id: 'weekly', label: lang === 'tr' ? 'Haftalık' : 'Weekly' },
                      { id: 'monthly', label: lang === 'tr' ? 'Aylık' : 'Monthly' },
                      { id: 'yearly', label: lang === 'tr' ? 'Yıllık' : 'Yearly' },
                      { id: 'custom', label: lang === 'tr' ? 'Özel' : 'Custom' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setQuizProgressRange(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          quizProgressRange === p.id
                            ? 'bg-indigo-600 text-white shadow'
                            : `${mutedClass} hover:text-indigo-500`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <button type="button" className="h-8 px-3 rounded-xl border border-stone-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-[10px] font-black flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-zinc-900">
                      <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Verileri Dışa Aktar' : 'Export Data'}
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 min-w-[120px]">
                      <button type="button" onClick={() => handleExportData('quiz', 'csv')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">CSV (Excel)</button>
                      <button type="button" onClick={() => handleExportData('quiz', 'json')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'JSON Verisi' : 'JSON Data'}</button>
                      <button type="button" onClick={() => handleExportData('quiz', 'txt')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'TXT Metni' : 'TXT Text'}</button>
                    </div>
                  </div>
                </div>
              </div>

              {quizProgressRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-stone-150 dark:border-zinc-900">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BAŞLANGIÇ' : 'START'}</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BİTİŞ' : 'END'}</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                </div>
              )}

              {filteredQuizHistory.length === 0 ? (
                <p className="text-xs opacity-60 py-12 text-center">{lang === 'tr' ? 'Belirtilen aralıkta geçmiş sınav kaydı bulunmuyor.' : 'No past quiz records found in the specified range.'}</p>
              ) : (
                <div className="h-[250px]">
                  <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs opacity-50">{lang === 'tr' ? 'Grafik Yükleniyor...' : 'Loading Chart...'}</div>}>
                    <DistributionBarChart
                      isLightTheme={isLightTheme}
                      data={scoreDistribution}
                      xAxisKey="range"
                      dataKey="count"
                      name={lang === 'tr' ? 'Sınav Sayısı' : 'Quiz Count'}
                      fill="#ec4899"
                      fontSize={9}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>

          {/* AI Report Column */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4 h-full`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3 flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'AI SINAV RAPORU' : 'AI QUIZ REPORT'}</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setQuizReportTab('active'); setSelectedPastQuizReport(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        quizReportTab === 'active' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? 'Son Rapor' : 'Latest'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizReportTab('history')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        quizReportTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? `Geçmiş (${quizReportHistory.length})` : `History (${quizReportHistory.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateReport('quiz')}
                    disabled={reportLoading === 'quiz'}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3 h-3" /> {reportLoading === 'quiz' ? (lang === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...') : (lang === 'tr' ? 'Rapor Üret' : 'Generate Report')}
                  </button>
                </div>
              </div>

              {quizReportTab === 'active' ? (
                quizReport ? (
                  <div className="text-xs leading-relaxed opacity-95 flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1 whitespace-pre-wrap">
                    {quizReport}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500 opacity-60 animate-pulse" />
                    <p className="text-xs opacity-60">{lang === 'tr' ? 'Sınav sonuçlarınızı ve anlama derinliğinizi analiz etmek, gelişim raporunuzu hazırlamak için "Rapor Üret" butonuna basın.' : 'Click the "Generate Report" button to analyze your quiz results and comprehension depth and prepare your progress report.'}</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1">
                  {selectedPastQuizReport ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center bg-stone-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800">
                        <span className="text-[10px] font-black text-indigo-500">{selectedPastQuizReport.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPastQuizReport(null)}
                          className="text-[10px] font-black text-indigo-500 hover:underline"
                        >
                          {lang === 'tr' ? '← Geri' : '← Back'}
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">
                        {selectedPastQuizReport.content}
                      </div>
                    </div>
                  ) : quizReportHistory.length === 0 ? (
                    <p className="text-xs opacity-60 text-center py-8">{lang === 'tr' ? 'Henüz geçmiş rapor kaydı yok.' : 'No past report history yet.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {quizReportHistory.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedPastQuizReport(item)}
                            className="text-left font-black text-xs text-indigo-500 hover:underline flex-1 truncate mr-2"
                          >
                            📅 {item.date}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem('quiz', item.id)}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {progSubTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'TOPLAM KART' : 'TOTAL CARDS'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredFlashcards.length} {lang === 'tr' ? 'kart' : 'cards'}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'TOPLAM TEKRAR' : 'TOTAL REVIEWS'}</span>
                <span className="text-xl font-black mt-1 text-current">{totalReviews} {lang === 'tr' ? 'tekrar' : 'reviews'}</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col ${surfaceClass}`}>
                <span className={`text-[9px] font-black text-indigo-500 uppercase`}>{lang === 'tr' ? 'PEKİŞTİRİLEN KAVRAM' : 'REINFORCED CONCEPT'}</span>
                <span className="text-xl font-black mt-1 text-current">{filteredFlashcards.filter((c: any) => (c.reviewsCount || 0) > 3).length} {lang === 'tr' ? 'kart (3+ Tekrar)' : 'cards (3+ Reviews)'}</span>
              </div>
            </div>

            {/* Flashcard repetition breakdown chart */}
            <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className={`text-xs font-black ${titleClass}`}>{lang === 'tr' ? 'Bilgi Kartı Tekrar Dağılımı' : 'Flashcard Review Distribution'}</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    {[
                      { id: 'daily', label: lang === 'tr' ? 'Günlük' : 'Daily' },
                      { id: 'weekly', label: lang === 'tr' ? 'Haftalık' : 'Weekly' },
                      { id: 'monthly', label: lang === 'tr' ? 'Aylık' : 'Monthly' },
                      { id: 'yearly', label: lang === 'tr' ? 'Yıllık' : 'Yearly' },
                      { id: 'custom', label: lang === 'tr' ? 'Özel' : 'Custom' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCardProgressRange(p.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          cardProgressRange === p.id
                            ? 'bg-indigo-600 text-white shadow'
                            : `${mutedClass} hover:text-indigo-500`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <button type="button" className="h-8 px-3 rounded-xl border border-stone-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-[10px] font-black flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-zinc-900">
                      <Download className="w-3.5 h-3.5" /> {lang === 'tr' ? 'Verileri Dışa Aktar' : 'Export Data'}
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-20 min-w-[120px]">
                      <button type="button" onClick={() => handleExportData('cards', 'csv')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">CSV (Excel)</button>
                      <button type="button" onClick={() => handleExportData('cards', 'json')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'JSON Verisi' : 'JSON Data'}</button>
                      <button type="button" onClick={() => handleExportData('cards', 'txt')} className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-zinc-900 flex items-center gap-1.5">{lang === 'tr' ? 'TXT Metni' : 'TXT Text'}</button>
                    </div>
                  </div>
                </div>
              </div>

              {cardProgressRange === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 mb-4 bg-stone-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-stone-150 dark:border-zinc-900">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BAŞLANGIÇ' : 'START'}</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-stone-500">{lang === 'tr' ? 'BİTİŞ' : 'END'}</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`h-8 px-2 rounded-lg text-xs border ${isLightTheme ? 'border-stone-300 bg-white text-stone-900' : 'border-zinc-800 bg-zinc-950'}`}
                      style={{ colorScheme: isLightTheme ? 'light' : 'dark' }}
                    />
                  </label>
                </div>
              )}

              {filteredFlashcards.length === 0 ? (
                <p className="text-xs opacity-60 py-12 text-center">{lang === 'tr' ? 'Belirtilen aralıkta kayıtlı bilgi kartı bulunmuyor.' : 'No registered flashcards found in the specified range.'}</p>
              ) : (
                <div className="h-[250px]">
                  <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs opacity-50">{lang === 'tr' ? 'Grafik Yükleniyor...' : 'Loading Chart...'}</div>}>
                    <DistributionBarChart
                      isLightTheme={isLightTheme}
                      data={cardReviewDistribution}
                      xAxisKey="status"
                      dataKey="count"
                      name={lang === 'tr' ? 'Kart Sayısı' : 'Card Count'}
                      fill="#10b981"
                      fontSize={9}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>

          {/* AI Report Column */}
          <div className="flex flex-col gap-4">
            <div className={`p-5 rounded-3xl border ${surfaceClass} flex flex-col gap-4 h-full`}>
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-zinc-800/60 pb-3 flex-wrap gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedClass}`}>{lang === 'tr' ? 'AI HAFIZA RAPORU' : 'AI MEMORY REPORT'}</span>
                <div className="flex items-center gap-2">
                  <div className="flex bg-stone-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-stone-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => { setCardReportTab('active'); setSelectedPastCardReport(null); }}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        cardReportTab === 'active' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? 'Son Rapor' : 'Latest'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardReportTab('history')}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${
                        cardReportTab === 'history' ? 'bg-indigo-600 text-white shadow' : `${mutedClass} hover:text-indigo-500`
                      }`}
                    >
                      {lang === 'tr' ? `Geçmiş (${cardReportHistory.length})` : `History (${cardReportHistory.length})`}
                    </button>
                  </div>
                  <button
                    onClick={() => handleGenerateReport('cards')}
                    disabled={reportLoading === 'cards'}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black transition-all flex items-center gap-1 shadow-lg shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3 h-3" /> {reportLoading === 'cards' ? (lang === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...') : (lang === 'tr' ? 'Rapor Üret' : 'Generate Report')}
                  </button>
                </div>
              </div>

              {cardReportTab === 'active' ? (
                cardReport ? (
                  <div className="text-xs leading-relaxed opacity-95 flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1 whitespace-pre-wrap">
                    {cardReport}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500 opacity-60 animate-pulse" />
                    <p className="text-xs opacity-60">{lang === 'tr' ? 'Hafıza laboratuvarı pekiştirme seanslarınızı analiz etmek ve kişisel gelişim analiz raporunuzu hazırlamak için "Rapor Üret" butonuna basın.' : 'Click the "Generate Report" button to analyze your memory lab reinforcement sessions and prepare your progress report.'}</p>
                  </div>
                )
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[380px] custom-note-scrollbar pr-1">
                  {selectedPastCardReport ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center bg-stone-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-stone-200 dark:border-zinc-800">
                        <span className="text-[10px] font-black text-indigo-500">{selectedPastCardReport.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPastCardReport(null)}
                          className="text-[10px] font-black text-indigo-500 hover:underline"
                        >
                          {lang === 'tr' ? '← Geri' : '← Back'}
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed opacity-95 whitespace-pre-wrap">
                        {selectedPastCardReport.content}
                      </div>
                    </div>
                  ) : cardReportHistory.length === 0 ? (
                    <p className="text-xs opacity-60 text-center py-8">{lang === 'tr' ? 'Henüz geçmiş rapor kaydı yok.' : 'No past report history yet.'}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {cardReportHistory.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors">
                          <button
                            type="button"
                            onClick={() => setSelectedPastCardReport(item)}
                            className="text-left font-black text-xs text-indigo-500 hover:underline flex-1 truncate mr-2"
                          >
                            📅 {item.date}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryItem('cards', item.id)}
                            className="text-red-500 hover:text-red-700 text-xs p-1"
                            title={lang === 'tr' ? 'Sil' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
