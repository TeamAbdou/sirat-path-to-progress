# Sirat — Your Journey Toward Positive Change

**Sirat** is a free, privacy-first Progressive Web App (PWA) designed to help young people overcome negative habits and build healthier lives. It combines on-device AI guidance, daily progress tracking, gamification, and emergency support tools — all without collecting personal data or requiring an account.

---

## Mission

Sirat supports youth in quitting harmful behaviors including:
- Pornography addiction
- Compulsive masturbation
- Smoking
- Drug use
- Harassment tendencies
- Neglecting prayer (for Muslim users)

The app operates with a **non-profit ethos**: no ads, no data selling, no subscriptions.

---

## Core Features

### 1. AI-Powered Chat Guidance
- **Local on-device AI** runs entirely in your browser using WebGPU (via `@mlc-ai/web-llm`)
- Talk to "مرشد صراط" (Sirat Guide) — a compassionate, culturally-aware AI mentor
- **Voice input support** with clear recording/processing status indicators
- Chat history is stored locally and persists between sessions
- Optional spiritual guidance mode cites authenticated hadiths from a local database (Bukhari & Muslim only)

### 2. Progress Tracking & Streaks
- Track daily "clean days" and mark relapses honestly
- View current streak, best streak, and total days clean
- Visual charts showing progress over time
- Daily motivational quotes tailored to your journey

### 3. Gamification & Badges
- Earn badges for milestones (e.g., 7-day streak, 30-day streak)
- Badge system updates in real-time as you progress
- Encouragement-focused, not shame-based

### 4. Emergency SOS Hub
- **Always works offline** — no internet required
- Breathing exercise (4-4-6 technique) with animated visual guide
- Motivation bank with rejection phrases
- One-tap emergency chat that sends a distress prompt to the AI
- Quick access to local emergency services (112)

### 5. Privacy & Data Sovereignty
- **100% local-first**: All data lives in your browser's IndexedDB
- **AES-GCM encryption** at rest with non-extractable CryptoKey
- No authentication, no cloud sync, no tracking
- **Encrypted export/import**: Back up your journey as a `.sirat` file with password protection
- Private notifications (disguised as "New message") to protect your privacy

### 6. Multilingual & Accessible
- Supported languages: **English**, **Arabic** (RTL), **French**, **Kabyle**, **Chinese**
- Smooth RTL/LTR layout switching
- Accessible UI with proper ARIA labels and screen-reader support

### 7. PWA & Mobile-First
- Install as a native-like app on Android/iOS
- Works offline with Service Worker caching
- Airplane-mode capable after first load
- Mobile-optimized bottom navigation and touch interactions
- Daily reminder notifications at your chosen time

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Animations | Framer Motion |
| State Management | React Context |
| Local Database | Dexie (IndexedDB wrapper) |
| Local AI | `@mlc-ai/web-llm` (Llama-3.2-1B via WebGPU) |
| PWA | `vite-plugin-pwa` + Service Worker |
| Charts | Recharts |
| Testing | Vitest + Testing Library |

---

## Architecture Highlights

- **Client-side only** — No backend server, no API calls for core functionality
- **Supabase integration decoupled** — Code is fully separated; only auto-generated integration files remain
- **WebLLM Worker** — AI inference runs in a Web Worker to avoid blocking the UI thread
- **Crypto Layer** — Sensitive preferences encrypted with AES-GCM; encryption key stored separately in a `meta` table

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Requirements
- A modern browser with **WebGPU support** for the AI chat feature (Chrome 113+, Edge 113+)
- For testing the PWA features, use HTTPS or `localhost`

---

## Project Structure

```
src/
  components/       # Reusable UI components (shadcn/ui + custom)
  components/voice/ # Voice input (MicButton, Waveform)
  contexts/         # React contexts (App, LocalProfile)
  data/             # Static motivational assets
  hooks/            # Custom React hooks
  lib/              # Core business logic
    badges/         # Badge system & observer
    challenges.ts   # Habit categories
    i18n.ts         # Translation keys & strings
    llm/            # AI engine, providers, worker, types
    localdb/        # Dexie DB, crypto, repository
    notifications.ts
    sirat-file.ts   # Encrypted export/import format
  pages/            # Route-level pages
  integrations/     # Auto-generated Supabase/Cloud files (unused)
public/
  sw.js             # Custom service worker for offline caching
```

---

## Privacy & Security

- No user accounts or passwords
- No analytics, cookies, or third-party trackers
- All AI processing happens locally on your device
- Data never leaves your browser unless you explicitly export it
- Medical disclaimer included — the app is a supportive tool, not a substitute for professional help

---

## Roadmap

- [ ] Integrate tAI multimodal model (unified text + voice engine)
- [ ] Enhanced voice interaction with natural speech output
- [ ] Community challenges and accountability partnerships
- [ ] Deeper progress insights with mood detection
- [ ] Expanded hadith bank and spiritual content

---

## License

This project is built for the public good. It is free to use, modify, and distribute for non-commercial purposes.

---

<p align="center">
  <strong>Sirat — طريقك نحو التغيير الإيجابي</strong><br/>
  <em>Your path toward positive change</em>
</p>
