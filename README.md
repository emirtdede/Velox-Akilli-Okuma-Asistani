<div align="center">
[![](https://img.shields.io/badge/Language-English-blue?style=for-the-badge&logo=google-translate)](#english-version)
&nbsp;&nbsp;&nbsp;&nbsp;
[![](https://img.shields.io/badge/Dil-T%C3%BCrk%C3%A7e-red?style=for-the-badge&logo=google-translate)](#turkish-version)
</div>

<a id="english-version"></a>
# English Version

## 💻 Project Overview

ReadFlow is a local-first intelligent reading workspace for documents, notes, and progress tracking. It combines RSVP-style speed reading, per-document note taking, reading analytics, optional Gemini-powered AI features, and multiple visual themes in a single desktop-friendly web app.

The application is designed for users who want to read faster, keep work notes beside each document, monitor their progress over time, and optionally enrich content with AI without making the core experience dependent on an API key.

## 🚀 Key Features

- RSVP speed reading with configurable WPM, word group size, ORP highlighting, and smart pause behavior.
- Document library with import flow for text-based content.
- Per-document notes stored independently so each book keeps its own draft.
- Reading progress tracking with daily goals, streaks, total words, time spent, and reading history.
- AI tools for summaries, difficulty analysis, word explanations, comprehension, and insights.
- User-controlled Gemini API key support with optional AI usage.
- Theme system with light, dark, sepia, nord, amoled, and matrix modes.
- Local-first persistence with `localStorage` plus IndexedDB mirroring, and optional Firestore cloud sync.
- Responsive sidebar modes: full, compact, and hidden.

## 🛠️ Tech Stack

<div>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Zustand-5-FFB300?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Recharts-3-8884FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Lucide_Icons-React-222222?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Google_Gen_AI-2.4-4285F4?style=for-the-badge&logo=google&logoColor=white" />
</div>

## 📁 Project Structure

```text
readflow/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ index.css
│  ├─ types.ts
│  ├─ components/
│  │  ├─ AddDocumentModal.tsx
│  │  ├─ SpeedReader.tsx
│  │  ├─ StatsDashboard.tsx
│  │  └─ ThemeSelector.tsx
│  ├─ lib/
│  │  └─ firebase.ts
│  └─ utils/
│     ├─ localDatabase.ts
│     ├─ parsers.ts
│     ├─ storage.ts
│     └─ storageAdapter.ts
├─ server.ts
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ firestore.rules
```

## 💾 Database/Data Schema

ReadFlow uses a hybrid local storage model:

| Layer | Key / Collection | Purpose | Shape |
|---|---|---|---|
| `localStorage` | `readflow_books` | Library state | `BookMark[]` |
| `localStorage` | `readflow_stats` | Reading analytics | `UserStats` |
| `localStorage` | `readflow_prefs` | Reader preferences | `UserPreferences` |
| `localStorage` | `readflow_notes_text_<bookId>` | Per-document notes | `string` |
| IndexedDB | same core keys | Durable local mirror | mirrored JSON payloads |
| Firestore | `users`, `library`, `sessions` | Optional cloud sync | mirrored documents |

### Main local models

```ts
BookMark {
  id: string;
  title: string;
  content: string;
  currentWordIndex: number;
  progress: number;
  lastReadDate: string;
  speedWpm: number;
  groupSize: number;
  estimatedMinutesTotal: number;
  tags?: string[];
  difficultyInfo?: {
    score: number;
    level: string;
    complexWords: string[];
    description: string;
  } | null;
  aiSummary?: {
    mainIdea: string;
    keyPoints: string[];
    summary: string;
  } | null;
}

UserStats {
  totalWordsRead: number;
  totalReadingTimeSeconds: number;
  dailyStreak: number;
  lastReadDate: string | null;
  maxSpeedWpm: number;
  longestSessionSeconds: number;
  dailyGoalWords: number;
  history: Array<{
    date: string;
    wordCount: number;
    durationSeconds: number;
  }>;
}

UserPreferences {
  theme: 'light' | 'dark' | 'sepia' | 'nord' | 'amoled' | 'matrix';
  mode: 'center' | 'line' | 'teleprompter' | 'bionic' | 'highlight';
  speedWpm: number;
  groupSize: number;
  isOrp: boolean;
  smartPauses: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}
```

## ⚙️ Installation & Usage

### Requirements

- Node.js 18+
- npm

### Install dependencies

```powershell
npm install
```

### Run in development

```powershell
$env:PORT="3001"
npm.cmd run dev
```

If `PORT` is not provided, the server defaults to `3000`.

### Build for production

```powershell
npm.cmd run build
```

### Start production server

```powershell
npm.cmd run start
```

### Optional environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port for the Express/Vite server |
| `GEMINI_API_KEY` | Enables server-side Gemini access |
| `GEMINI_MODEL` | Overrides the Gemini model name |

### Usage notes

- Core reading, notes, library, progress, and themes work without an API key.
- If a user enters their own Gemini API key in the settings screen, AI features become available.
- The app supports direct routes such as `/reading/:bookId`, `/notes/:bookId`, `/progress`, `/guide`, and `/settings`.

## ⚖️ License

Licensed under the Apache License 2.0. See the `SPDX-License-Identifier: Apache-2.0` headers in the source files.

---

<a id="turkish-version"></a>
# Türkçe Versiyon

## 💻 Proje Amacı ve Tanımı

ReadFlow, belgeler, notlar ve ilerleme takibi için yerel öncelikli çalışan akıllı bir okuma çalışma alanıdır. RSVP tabanlı hız okuma, belge bazlı not tutma, okuma analitiği, isteğe bağlı Gemini destekli yapay zeka özellikleri ve çoklu tema desteğini tek bir masaüstü dostu web uygulamasında birleştirir.

Uygulama; daha hızlı okumak, her belgeye özel notları ayrı tutmak, ilerlemeyi zaman içinde izlemek ve çekirdek deneyimi bir API anahtarına bağımlı olmadan kullanmak isteyen kullanıcılar için tasarlanmıştır.

## 🚀 Uygulamanın Öne Çıkan Teknik Özellikleri

- WPM, kelime grubu, ORP vurgusu ve akıllı duraklama davranışları ayarlanabilen RSVP hız okuma.
- Metin tabanlı içerik için belge kütüphanesi ve içe aktarma akışı.
- Her belgenin notlarını ayrı tutan bağımsız not yapısı.
- Günlük hedef, seri, toplam kelime, geçirilen süre ve geçmiş ile okuma ilerleme takibi.
- Özet, zorluk analizi, kelime açıklama, kavrama ve içgörü üretimi için AI araçları.
- Kullanıcının kendi Gemini API key’ini girebildiği, isteğe bağlı AI kullanımı.
- Light, dark, sepia, nord, amoled ve matrix temaları.
- `localStorage` + IndexedDB yedekli yerel saklama ve isteğe bağlı Firestore bulut senkronizasyonu.
- Full, compact ve hidden olmak üzere üç modlu yan menü.

## 🛠️ Kullanılan Teknolojiler

<div>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Zustand-5-FFB300?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Recharts-3-8884FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Lucide_Icons-React-222222?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Google_Gen_AI-2.4-4285F4?style=for-the-badge&logo=google&logoColor=white" />
</div>

## 📁 Proje Yapısı

```text
readflow/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ index.css
│  ├─ types.ts
│  ├─ components/
│  │  ├─ AddDocumentModal.tsx
│  │  ├─ SpeedReader.tsx
│  │  ├─ StatsDashboard.tsx
│  │  └─ ThemeSelector.tsx
│  ├─ lib/
│  │  └─ firebase.ts
│  └─ utils/
│     ├─ localDatabase.ts
│     ├─ parsers.ts
│     ├─ storage.ts
│     └─ storageAdapter.ts
├─ server.ts
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ firestore.rules
```

## 💾 Veri Modeli / Şema

ReadFlow hibrit bir yerel saklama modeli kullanır:

| Katman | Anahtar / Koleksiyon | Amaç | Yapı |
|---|---|---|---|
| `localStorage` | `readflow_books` | Kütüphane durumu | `BookMark[]` |
| `localStorage` | `readflow_stats` | Okuma analitiği | `UserStats` |
| `localStorage` | `readflow_prefs` | Okuyucu tercihleri | `UserPreferences` |
| `localStorage` | `readflow_notes_text_<bookId>` | Belge bazlı notlar | `string` |
| IndexedDB | aynı çekirdek anahtarlar | Daha kalıcı yerel kopya | yansıtılan JSON verisi |
| Firestore | `users`, `library`, `sessions` | İsteğe bağlı bulut senkronizasyonu | yansıtılan dokümanlar |

### Temel yerel modeller

```ts
BookMark {
  id: string;
  title: string;
  content: string;
  currentWordIndex: number;
  progress: number;
  lastReadDate: string;
  speedWpm: number;
  groupSize: number;
  estimatedMinutesTotal: number;
  tags?: string[];
  difficultyInfo?: {
    score: number;
    level: string;
    complexWords: string[];
    description: string;
  } | null;
  aiSummary?: {
    mainIdea: string;
    keyPoints: string[];
    summary: string;
  } | null;
}

UserStats {
  totalWordsRead: number;
  totalReadingTimeSeconds: number;
  dailyStreak: number;
  lastReadDate: string | null;
  maxSpeedWpm: number;
  longestSessionSeconds: number;
  dailyGoalWords: number;
  history: Array<{
    date: string;
    wordCount: number;
    durationSeconds: number;
  }>;
}

UserPreferences {
  theme: 'light' | 'dark' | 'sepia' | 'nord' | 'amoled' | 'matrix';
  mode: 'center' | 'line' | 'teleprompter' | 'bionic' | 'highlight';
  speedWpm: number;
  groupSize: number;
  isOrp: boolean;
  smartPauses: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}
```

## ⚙️ Kurulum ve Kullanım

### Gereksinimler

- Node.js 18+
- npm

### Bağımlılıkları kur

```powershell
npm install
```

### Geliştirme modunda çalıştır

```powershell
$env:PORT="3001"
npm.cmd run dev
```

`PORT` verilmezse sunucu varsayılan olarak `3000` portunda çalışır.

### Production build

```powershell
npm.cmd run build
```

### Production sunucusunu başlat

```powershell
npm.cmd run start
```

### İsteğe bağlı ortam değişkenleri

| Değişken | Amaç |
|---|---|
| `PORT` | Express/Vite sunucusu için HTTP portu |
| `GEMINI_API_KEY` | Sunucu tarafı Gemini erişimini etkinleştirir |
| `GEMINI_MODEL` | Kullanılacak Gemini model adını değiştirir |

### Kullanım notları

- Çekirdek okuma, not alma, kütüphane, ilerleme ve tema özellikleri API anahtarı olmadan çalışır.
- Kullanıcı ayarlardan kendi Gemini API key’ini girerse AI özellikleri aktif olur.
- Uygulama `/reading/:bookId`, `/notes/:bookId`, `/progress`, `/guide` ve `/settings` gibi doğrudan rotaları destekler.

## ⚖️ Lisans

Bu proje Apache License 2.0 ile lisanslanmıştır. Kaynak dosyalardaki `SPDX-License-Identifier: Apache-2.0` başlıkları geçerlidir.
