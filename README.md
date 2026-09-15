# Learning Playground

A calm, premium-feeling **flashcard LMS discovery dashboard** that runs **entirely in your browser**. Excel is the source of truth: import a workbook, study with spaced repetition (SM-2), and export or save your progress straight back into an `.xlsx` file. There is no backend, no login, no AI, and no data ever leaves your device.

## ✨ What it does

1. Import an `.xlsx` / `.xls` file of flashcards (or load the built-in demo library).
2. Study using flip-card flashcards with keyboard shortcuts and 4-level SM-2 grading (Again / Hard / Good / Easy).
3. Progress is autosaved to **IndexedDB** (via Dexie) as you study.
4. When you're ready, **Save Progress**:
   - On Chrome/Edge with a linked workbook and granted permission → writes directly back into your original `.xlsx` file (File System Access API).
   - Otherwise → downloads a new `.xlsx` with all your progress (`learning-playground-progress-YYYY-MM-DD.xlsx`).
5. Next time, import that exported file back in — progress merges intelligently, nothing is lost.

## 🧱 Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · SheetJS (`xlsx`) · Dexie (IndexedDB) · File System Access API (progressive enhancement) · Lucide icons · Recharts · date-fns · vite-plugin-pwa · Vitest + Testing Library.

No backend, no Firebase/Supabase, no auth, no AI/chatbot.

## 🚀 Getting started

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build locally
```

> **Requires Node.js 18+**. All dependencies are listed in `package.json` — nothing else needs to be installed globally.

## 🧪 Running tests

```bash
npm run test        # run all unit + component tests once (Vitest)
npm run test:watch  # watch mode while developing
```

Tests cover:
- SM-2 scheduling (Again/Hard/Good/Easy, minimum ease factor, initial state, non-mutation)
- `normalizeKey` / stable card ID generation
- Excel schema validation (required fields, numeric/date validation, duplicate detection)
- Smart merge on re-import (by ID, by Topic+Term, progress preservation, new/missing cards)
- JSON backup validation and merge
- Key interactive components (Flashcard reveal, rating button gating, validation report rendering, save-status indicator)

## 📊 Trying it out

1. Run `npm run dev` and open the app.
2. Click **Load demo library** on the empty Dashboard (or go to **Import** → **Sample template** to download a starter `.xlsx`).
3. Click **Start Review**, reveal a card with `Space`, then grade it with `1`/`2`/`3`/`4` (Again/Hard/Good/Easy) or the on-screen buttons.
4. Go to **Data & Backup** → **Export Excel** to download your progress.
5. Re-import that same file from **Import & Data Preview** — your progress carries over exactly, and the merge report shows what changed.

### Sample Excel schema

| Column | Required | Notes |
|---|---|---|
| `ID` | No | Auto-generated from Topic+Term if blank |
| `Topic` | No | Defaults to "General" |
| `Term` | **Yes** | Front of the card |
| `Definition` | **Yes** | Back of the card |
| `Example` | No | Shown on the back |
| `Notes` | No | Shown on the back |
| `Tags` | No | Comma or semicolon separated |
| `LastReviewed`, `Correct`, `Wrong`, `EaseFactor`, `Repetitions`, `Interval`, `NextReview` | No | Progress columns — written automatically on export, read automatically on import |

Custom columns you add yourself are preserved on export, and other sheets in a multi-sheet workbook are left untouched.

## 🖥️ Testing "Direct Save" on Chrome/Edge

The File System Access API only works in Chromium-based browsers:

1. Open the app in **Chrome or Edge** (not Firefox/Safari — they'll just use the export/download flow instead).
2. Go to **Data & Backup** and click **Open linked workbook** — pick any `.xlsx` file via the native file picker.
3. Study a few cards, then click **Save to workbook**. The very first time, the browser will ask you to confirm write permission for that file — accept it.
4. The badge next to "Save your progress" shows **Direct save supported**, and the sidebar will show the linked file name plus "Saved to workbook" once a direct save succeeds.
5. If permission is ever revoked or the browser doesn't support it, the app automatically falls back to **Export Excel** (a normal download) — no data is lost either way.

## 📁 Project structure

```
learning-playground/
├── public/
│   ├── icons/icon.svg          # PWA icon (replace with PNG icons for stricter PWA installability if desired)
│   └── manifest.webmanifest
├── src/
│   ├── components/
│   │   ├── common/             # ErrorBoundary, ToastProvider, EmptyState, ConfirmDialog, StatCard, ProgressRing…
│   │   ├── layout/              # AppShell, Sidebar, MobileNavigation, Topbar
│   │   ├── dashboard/           # ActivityHeatmap, ReviewChart
│   │   ├── library/             # TopicCard, TopicDetailDrawer
│   │   ├── import/              # FileDropzone, SheetSelector, ColumnMapper, DataPreviewTable, ValidationReport, MergeReport, ImportWizard
│   │   └── study/                # Flashcard, RatingControls, SessionProgress, SessionSummary
│   ├── views/                   # DashboardView, LibraryView, StudyView, ImportView, ProgressView, SettingsView, BackupView, PrintView
│   ├── services/                # excelService, databaseService, fileSystemService, sm2Service, mergeService, backupService, activityService
│   ├── store/                   # AppContext (React Context + useReducer), appReducer, uiPreferences (localStorage)
│   ├── utils/                    # date, normalize, cardStatus, validation, fileNaming, topicSelectors
│   ├── data/demoData.ts          # 15 demo cards across Java / DSA / English Vocabulary
│   └── test/                     # Vitest unit + component tests
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🔒 Privacy

Your learning data stays in this browser and in files you choose. Nothing is uploaded to a server — there is no backend to upload it to. The app has no analytics, no third-party tracking, and no AI features.

## 📝 Notes on PWA icons

`public/icons/icon.svg` is a valid SVG placeholder used for both the favicon and the PWA manifest icon. For maximum compatibility with platforms that require raster icons (e.g. some Android launchers), you may want to additionally export 192×192 and 512×512 PNGs from this SVG and reference them in `public/manifest.webmanifest` and `vite.config.ts`'s `VitePWA` `manifest.icons` array.
