<div align="center">

# 🦉 Velox - Akıllı Okuma Asistanı & Bilişsel Antrenman Platformu

[![](https://img.shields.io/badge/Language-English-blue?style=for-the-badge&logo=google-translate)](#english-version)
&nbsp;&nbsp;&nbsp;&nbsp;
[![](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge&logo=google-translate)](#turkish-version)

---

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

---

<a id="english-version"></a>
# English Version

**Velox** is a local-first, AI-powered intelligent speed-reading workspace and cognitive training application designed as a desktop-friendly web app powered by Electron. It combines RSVP (Rapid Serial Visual Presentation) speed reading, per-document note taking, advanced reading analytics, AI-powered cognitive helpers (Gemini), and interactive cognitive training exercises to improve reading speed, comprehension, and peripheral vision.

It is designed for researchers, students, and professionals who want to read faster, keep work notes beside each document, monitor their cognitive improvement over time, and optionally enrich content with artificial intelligence in a private, high-performance desktop application.

---

## 🚀 Key Features

*   **⚡ RSVP Speed Reader**: 
    *   **Customizable RSVP Controls**: Configurable words per minute (WPM), word group sizes, active line highlights, and smart pauses at punctuation or long words.
    *   **Anti-Regression Mode**: Automatically fades out past words to prevent back-reading habits.
    *   **Metronome Audio Feedback**: Provides optional auditory metronome beats to establish a reading rhythm.
*   **🌋 Multiple Focus & Zen Modes**: 
    *   True fullscreen overlays that hide all distracting UI elements.
    *   **ORP (Optimal Recognition Point)**: Highlights the easiest letter to recognize in each word for lightning-fast eye tracking.
    *   **Center Focus Lines**: Displays optional alignment guides to keep the eyes locked in the center.
*   **🧠 Cognitive Training Lab**:
    *   **Saccade Training (Nokta Takibi)**: Dynamic eye jumping trainer with Horizontal, Vertical, Diagonal, and Random patterns, live speed adjustments, and a dedicated Zen Focus Mode (with fade-out controls).
    *   **Schulte Table Training**: Customizable size (3x3 to 7x7) interactive visual grid trainer to expand peripheral vision and visual search speed.
    *   **Word Expansion Exercise**: Pyramidal text expansion exercise to increase horizontal span.
*   **🤖 AI Reading Assistant**: Fully integrated Google Gemini API chat assistant to summarize documents, explain selected paragraphs, analyze readability, and generate comprehension tests.
*   **💾 Promise-Based IndexedDB Storage**: High-capacity local-first asynchronous persistence layer with robust error handling and fallback to localStorage to store millions of notes and thousands of books safely.
*   **📊 Performance Analytics**: Dynamic charts monitoring reading progress, daily reading streaks, total words read, time spent, and cognitive training histories.
*   **📚 Document Library & Notes**: Import PDF, DOCX (via mammoth), and TXT documents with progress tracking, bookmarks, and per-document independent notes.

---

## 🛠️ Technology Stack

### Frontend & Client
- **React 19** (Modern component UI framework)
- **TypeScript 5.8** (Type-safe codebase)
- **Vite 6** (Blazing-fast client bundling)
- **Tailwind CSS 4** (Modern utility-first CSS styling)
- **Recharts 3** (Dynamic performance data charting)
- **Zustand 5** (State management)
- **Motion** (Smooth micro-animations)

### Desktop App & Server
- **Electron 43** (Desktop wrapper runtime)
- **Node.js & Express 4** (Local backend server)
- **esbuild** (Fast Node.js compilation)
- **electron-builder** (Production packaging & installer creation)

---

## 📁 Project Structure

```text
Velox/
├── src/                       # Frontend React application directory
│   ├── components/            # UI components (charts, common elements, modals)
│   │   ├── cognitive/         # Schulte, Saccade, and Word Expansion training components
│   │   └── modals/            # Legal, Quizzes, Flashcard editing modals
│   ├── hooks/                 # Custom React hooks (AI, Storage, Library, Training)
│   ├── pages/                 # Page views (Home, Workspace, Training, Settings, Progress)
│   ├── utils/                 # Utilities (IndexedDB adapters, storage, parsers)
│   └── types.ts               # Global TypeScript declarations
├── dist/                      # Compiled production assets
├── dist-desktop/              # Packaged Electron executable installer (.exe)
├── electron.cjs               # Electron main process entry point
├── server.ts                  # Local Express backend server
└── README.md                  # Project documentation (English & Turkish)
```

---

## ⚙️ Setup & Execution Guide

### 1. Developer Mode Execution
Ensure Node.js is installed. Clone the repository and run:
```bash
npm install
# In one terminal, start the local Express backend server:
npm run dev
# In another terminal, start the Electron wrapper:
npm run electron:dev
```

### 2. Packaging Desktop Application (.exe)
To package Velox as a standalone Windows application installer:
```bash
npm run electron:build
```
*💡 Output executable installer `Velox Setup 1.0.0.exe` and unpacked binaries will be generated inside the `dist-desktop` directory.*
---

## ⚖️ License
This project is licensed under the [MIT License](LICENSE).

---

<a id="turkish-version"></a>
# Türkçe Versiyon

**Velox**, RSVP (Hızlı Seri Görsel Sunum) formatında hızlı okuma, belgeye özel not tutma, ayrıntılı okuma analitikleri, yapay zeka destekli okuma asistanı (Gemini) ve etkileşimli bilişsel egzersizleri bir araya getiren, Electron tabanlı akıllı bir okuma asistanı ve bilişsel antrenman platformudur.

Okuma hızını artırmak, belgelerin yanına özel notlar almak, bilişsel gelişimini zamanla izlemek ve isteğe bağlı olarak yapay zeka ile içeriklerini zenginleştirmek isteyen öğrenciler, araştırmacılar ve profesyoneller için özel bir masaüstü uygulaması olarak tasarlanmıştır.

---

## 🚀 Öne Çıkan Özellikler

*   **⚡ RSVP Hızlı Okuyucu**: 
    *   **Özelleştirilebilir RSVP Kontrolleri**: Ayarlanabilir kelime hızı (WPM), kelime grubu boyutu, satır takibi ve noktalama işaretleri ile uzun kelimelerde akıllı esler.
    *   **Anti-Regression Modu**: Geriye dönük okuma alışkanlıklarını engellemek için okunan kelimeleri otomatik olarak soluklaştırır.
    *   **Metronome Ses Geri Bildirimi**: Okuma ritmini sabitlemek için isteğe bağlı işitsel metronom vuruşları sağlar.
*   **🌋 Çoklu Odak & Zen Modları**: 
    *   Dikkati dağıtan tüm arayüz bileşenlerini gizleyen gerçek tam ekran görünümü.
    *   **ORP (Optimal Tanıma Noktası)**: Hızlı göz takibi için her kelimenin en kolay tanınan harfini vurgular.
    *   **Odak Çizgileri**: Gözlerin merkezde kalmasını kolaylaştıran odak çizgileri.
*   **🧠 Bilişsel Antrenman Laboratuvarı**:
    *   **Saccade (Nokta Takibi) Egzersizi**: Yatay, Dikey, Çapraz ve Rastgele desenlerde göz sıçrama antrenmanı, canlı hız kontrolü ve özel odak modu (hover görünüm efektli).
    *   **Schulte Tablosu**: Çevresel görüşü ve görsel arama hızını artırmak için 3x3'ten 7x7 boyutuna kadar dinamik Schulte matrisleri.
    *   **Göz Genişletme Egzersizi**: Yatay görüş açısını genişleten piramit yapılı kelime egzersizi.
*   **🤖 Yapay Zeka Okuma Asistanı**: Seçili metinleri açıklayan, doküman özetleri çıkaran ve okuma anlama seviyenizi test etmek için quiz üreten entegre Google Gemini API desteği.
*   **💾 Promise Tabanlı IndexedDB Depolama**: Milyonlarca not ve binlerce kitabı güvenle saklamak için limitleri ortadan kaldıran, asenkron yerel veritabanı (localStorage yedeklemeli).
*   **📊 Performans Analitikleri**: Günlük hedefler, okuma geçmişi ve bilişsel egzersiz gelişimini görselleştiren dinamik grafikler.
*   **📚 Kütüphane ve Not Defteri**: PDF, DOCX (mammoth ile), TXT belgelerini yükleme, okuma yüzdesi takibi, yer imleri ve belgelere özel notlar alabilme.

---

## 🛠️ Kullanılan Teknolojiler

### Önyüz ve İstemci
- **React 19** (Modern bileşen tabanlı arayüz mimarisi)
- **TypeScript 5.8** (Tip güvenli kod yapısı)
- **Vite 6** (Hızlı istemci derleyici)
- **Tailwind CSS 4** (Modern CSS biçimlendirme)
- **Recharts 3** (Dinamik okuma analitiği grafikleri)
- **Zustand 5** (Durum yönetimi)
- **Motion** (Yumuşak mikro animasyonlar)

### Sunucu ve Paketleme
- **Electron 43** (Masaüstü uygulama çalışma ortamı)
- **Node.js & Express 4** (Yerel sunucu)
- **esbuild** (Hızlı Node.js derleyici)
- **electron-builder** (Windows kurulum dosyası paketleyici)

---

## 📁 Proje Yapısı

```text
Velox/
├── src/                       # Önyüz React kaynak kodları dizini
│   ├── components/            # Arayüz bileşenleri (grafikler, modallar)
│   │   ├── cognitive/         # Schulte, Saccade ve Göz Genişletme antrenmanları
│   │   └── modals/            # Legal, Quiz ve Flashcard düzenleme modalları
│   ├── hooks/                 # Özel React hook'ları (AI, Depolama, Kütüphane)
│   ├── pages/                 # Sayfa görünümleri (Ana Sayfa, Çalışma Alanı, Ayarlar)
│   ├── utils/                 # Araçlar (IndexedDB adaptörleri, veri dönüştürücüler)
│   └── types.ts               # Genel TypeScript bildirimleri
├── dist/                      # Derlenmiş üretim çıktısı
├── dist-desktop/              # Paketlenmiş Electron kurulum dosyası (.exe)
├── electron.cjs               # Electron ana işlem giriş noktası
├── server.ts                  # Yerel Express sunucu dosyası
└── README.md                  # Proje dökümantasyonu (İngilizce & Türkçe)
```

---

## ⚙️ Kurulum ve Çalıştırma

### 1. Geliştirici Modunda Çalıştırma
Node.js yüklü olduğundan emin olun. Projeyi klonlayıp çalıştırın:
```bash
npm install
# Bir terminalde yerel Express sunucusunu başlatın:
npm run dev
# Diğer terminalde Electron arayüzünü başlatın:
npm run electron:dev
```

### 2. Masaüstü Kurulum Dosyasını Paketleme (.exe)
Velox'u tek başına çalışan bir Windows kurulum dosyasına (.exe) dönüştürmek için:
```bash
npm run electron:build
```
*💡 Çıktı olarak üretilen `Velox Setup 1.0.0.exe` kurulum dosyası `dist-desktop` klasörü altında bulunabilir.*
---

## ⚖️ Lisans
Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır.
