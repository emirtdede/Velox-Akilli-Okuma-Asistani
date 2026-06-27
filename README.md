# ReadFlow

ReadFlow is a local-first reading workspace with document import, focused RSVP reading, notes, progress tracking, and optional AI enrichment.

## Run Locally

Prerequisite: Node.js

```powershell
npm install
npm.cmd run dev
```

The server listens on `PORT` when provided, otherwise `3000`.

```powershell
$env:PORT="3001"
npm.cmd run dev
```

## Optional AI

Core reading features work without AI. If `GEMINI_API_KEY` is configured, ReadFlow enables optional AI features:

- summaries
- reading difficulty analysis
- word definitions
- comprehension quizzes
- insights and mental models

Without `GEMINI_API_KEY`, these AI controls are hidden or shown as disabled states, while document import, reading, notes, progress, themes, and URL text extraction continue to work.

## Local Data

ReadFlow keeps the UI fast with a small `localStorage` cache and mirrors core library data, stats, and preferences into IndexedDB for more durable local storage. Firestore cloud sync remains optional and runs as a separate mirror when credentials are available.

## Routes

The app supports direct links:

- `/`
- `/library`
- `/reading/:bookId`
- `/reader/:bookId`
- `/recall/:bookId`
- `/notes/:bookId`
- `/progress`
- `/settings`
