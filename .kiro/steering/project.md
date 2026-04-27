# Shuspot Project

## Stack
- Frontend: React 18 + TypeScript + Vite 8 + Tailwind CSS
- Hosting: Alibaba Cloud ECS (nginx), server IP `47.76.248.16`
- Live URL: https://shuspot.com
- Database: Supabase (PostgreSQL) — `xzwdtcczndgglqikmlwj.supabase.co`
- Auth: Supabase Auth
- TTS/ISE: iFlyTek (Singapore endpoints)
- Translation: LibreTranslate (local or hosted)

## Brand Colors
- `brand-pink`: #d85f9c — CTAs, highlights, primary accent
- `brand-yellow`: #e2d151 — badges, progress bars, earnings
- `brand-blue`: #a1cfd2 — secondary accent, charts, teal elements

## Deployment
To deploy the latest frontend changes, run from the project root:
```bash
./deploy-frontend.sh "your commit message"
```
For build-only local deploy (no git):
```bash
./deploy-quick.sh
```
Both scripts: build locally → tar (excluding heavy image folders) → SCP to server → wipe old dist → copy new → reload nginx.

IMPORTANT: The server serves from `/var/www/shuspot/` (not `/var/www/shuspot/dist/`). Deploy scripts must copy `dist/*` into the root.

## Environment Variables
- `.env` — local dev
- `.env.production` — production build values
- Key vars: `VITE_IFLYTEK_APP_ID/KEY/SECRET`, `VITE_LIBRETRANSLATE_URL`

## Dev Server
```bash
npm run dev   # runs on port 5174
```
LibreTranslate (for EN/ZH toggle):
```bash
libretranslate --load-only en,zh   # runs on port 5000
```

## App Architecture

### Main App (`src/App.tsx`)
- Entry point, handles all routing via `currentView` state
- `/affiliate` path → renders `AffiliateApp` (separate portal)
- Everything else → `AppContent` with providers (Language, Subscription, Admin, UserStats, ParentalControls, Navigation)

### Key Sections & Components

**Dashboard / Library** (`AppContent` in App.tsx)
- Three-tier navigation: Grade → Media Type → Genre (`NewThreeTierNavigation.tsx`)
- Book sections: Books, Video Books, Voice Coach, Read to Me, Audiobooks
- Continue Reading section (`ContinueReadingSection.tsx`)
- Book cards with hover (`BookCardWithHover.tsx`)

**Read to Me / Book Reader** (`ReactPageFlipReader.tsx`)
- Uses `react-pageflip` (HTMLFlipBook) for page-turning
- Audio per page via `useAudioManager.ts` hook
- Autoplay: auto-turns pages after audio finishes, pauses on user interaction
- Wrapper: `ShuSpotImageReaderWrapper.tsx` → `ShuSpotImageReader.jsx` → `ReactPageFlipReader.tsx`

**Voice Coach** (`VoiceCoachPracticeInterface.tsx`)
- iFlyTek TTS for Listen (text-to-speech with AbortController for stop)
- iFlyTek ISE for Read Aloud (pronunciation assessment via WebSocket)
- Browser SpeechRecognition for live transcript
- MediaRecorder for audio capture → ISE scoring
- Score display: overall score ring + accuracy/fluency/completeness bars
- "What did I say?" toggle shows transcript in Words to Practice box
- EN/ZH toggle via LibreTranslate
- Mic stops on unmount/navigate away

**Affiliate Portal** (`src/components/affiliate/`)
- Separate app at `/affiliate` route
- `AffiliateApp.tsx` — layout wrapper with login gate
- `AffiliateLogin.tsx` — dark themed login screen
- `AffiliateDashboard.tsx` — stats, chart, sharing tools, referrals table
- `AffiliateEarnings.tsx` — earnings summary, commission breakdown, payout history
- `AffiliateContent.tsx` — downloadable assets by platform
- `AffiliateSettings.tsx` — profile, notifications, password, compliance
- `AffiliateSidebar.tsx` — dark navy sidebar with nav + tier badge
- `AffiliateNavbar.tsx` — white top bar with translate toggle
- `AffiliateLanguageContext.tsx` — EN/ZH translation via LibreTranslate
- `types.ts` — all interfaces + mock data
- Currently uses mock data — API-ready structure

**User Portal** (`UserPortal.tsx`)
- User profile, reading stats, favorites by category

**Parental Controls** (`ContentBlockingPanel.tsx`)
- Media type blocking, grade level restrictions, genre blocking
- Data stored in Supabase `parental_controls` table

### Services
- `src/services/iflytek-tts.ts` — iFlyTek text-to-speech (WebSocket + AudioContext, supports AbortController)
- `src/services/iflytek-ise.ts` — iFlyTek pronunciation assessment (WebSocket, returns scores + word-level data)
- `src/lib/supabase.ts` — Supabase client + helper functions
- `src/api/` — favourites, parental controls, reading history, book import APIs

### Contexts
- `NavigationContext.tsx` — three-tier nav state (grade, media type, genre)
- `LanguageContext.tsx` — app-wide EN/ZH language
- `UserStatsContext.tsx` — reading sessions, progress, achievements
- `ParentalControlsContext.tsx` — blocked content management
- `SubscriptionContext.tsx` — subscription status
- `AdminContext.tsx` — admin panel visibility

### Hooks
- `useAudioManager.ts` — audio playback for book reader (per-page, sequential, autoplay callback)
- `useBooks.ts` — fetch books from Supabase with filters
- `useGenres.ts` — genre data
- `useReadingProgress.ts` — track reading progress
- `useReadingHistoryTracking.ts` — session tracking
- `useParentalControls.ts` — parental controls CRUD

## Git
- Repo: `https://github.com/Steigs89/shuspot.git`
- Auth: PAT token embedded in remote URL
- Branch: `main`

## Book Admin & Content Upload
- Full guide: `BOOK_UPLOAD_GUIDE.md`
- Book Admin UI: `shuspot.com/book-admin` (or `localhost:3001` locally)
- Backend: FastAPI at `localhost:8000`, proxied via nginx at `/book-admin/api/`
- Storage: Supabase S3-compatible bucket via Rclone (all books are page images, no PDFs)
- Videos: BunnyCDN Stream (HLS)
- Upload flow: Local folder → Rclone → Supabase → Manifest JSON → Book Admin import
- Tools: `book-admin/tools/` — rclone_uploader.py, quick_manifest.py, audio_page_matcher.py
