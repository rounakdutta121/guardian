# Guardian

Premium mobile-first women safety application built with Next.js 15, Capacitor, Drizzle ORM, and Better Auth.

## Quick Start

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Min 32 characters
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — App URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Optional Google OAuth
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Optional Google Maps

## Database

```bash
npm run db:generate   # Generate migrations from schema
npm run db:migrate    # Apply migrations
npm run db:studio     # Open Drizzle Studio
```

## Mobile (Capacitor)

```bash
npm run build
npx cap add android
npm run cap:sync
npm run cap:android
```

## Features

- **Authentication** — Email, Google OAuth, forgot password, session management
- **SOS Emergency Engine** — 3s countdown, GPS, SMS/call preview, live tracking, offline queue
- **Emergency Contacts** — CRUD, search, favorites, priority
- **Test SOS** — Full simulation without sending messages
- **Fake Call** — Scheduled incoming call screen
- **Safe Check-In** — Timers with confirm / need help flow
- **Guardian Mode** — Live destination tracking with pause/resume/stop
- **Journey Tracking** — GPS, speed, distance, battery, share link
- **Notifications** — History, unread counts
- **Profile & Settings** — Medical info, theme, permissions, export data
- **Activity Log** — Full safety timeline

## Architecture

```
src/
├── app/              # Next.js App Router pages & API routes
├── components/       # UI components (shadcn-style)
├── hooks/            # React hooks
├── lib/
│   ├── auth/         # Better Auth configuration
│   ├── db/           # Drizzle schema & migrations
│   ├── repositories/ # Data access layer
│   ├── services/     # Business logic
│   └── validations/  # Zod schemas
└── stores/           # Zustand state
```

## Tech Stack

- Next.js 15+ App Router, TypeScript, Tailwind CSS v4
- Drizzle ORM + Neon PostgreSQL
- Better Auth
- Zustand + TanStack Query
- Framer Motion
- Capacitor (Android/iOS)
