# Vibeify

A Spotify-inspired music streaming web app. Browse, search, and play 30-second preview tracks from the iTunes catalog; sign in to save playlists, liked songs, albums, and followed artists.

> **Note on audio:** tracks stream **iTunes preview clips (~30s)**, not full songs — this keeps the app legal without licensing deals. Playback is real HTML5 audio. Add a `JAMENDO_CLIENT_ID` to also surface Jamendo's licensed catalog in search results.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **Lucide icons** + **Framer Motion** (toasts)
- **Supabase** — auth (email/password + Google OAuth) and Postgres persistence with Row Level Security
- Music metadata/audio via **iTunes Search API** (proxied through `/api/*` route handlers) and optionally **Jamendo API**

## Features

- Persistent bottom player: play/pause, next/prev, seek, volume, mute, shuffle, repeat (off/all/one), queue popover, keyboard shortcuts (space, ←/→ seek, ↑/↓ volume, N/P track skip)
- Home: greeting, recently played, genre browse, curated sections (trending, chill, focus, albums, artists)
- Search: debounced live search across songs/albums/artists, recent searches, genre browsing
- Album & artist pages with play/shuffle, discography, follow/save
- Playlists: create, rename, delete, add/remove/reorder tracks, play/shuffle — persisted in Supabase
- Liked Songs, saved albums, followed artists, recently played — all synced per user
- Guest browsing without login; auth required for personal features
- Dark Spotify-style UI, skeleton loaders, toasts, empty states, custom 404, responsive mobile layout

## Project structure

```
src/
  app/                  # routes: /, /search, /library, /playlist/[id], /album/[id], /artist/[id], /login, /signup
    api/                # /api/search, /api/home, /api/album/[id], /api/artist/[id]
  components/
    layout/             # AppShell, Sidebar, MobileNav
    player/             # PlayerBar + queue
    music/              # TrackRow, MediaCard, SectionRow
    ui/                 # Skeletons, GoogleIcon
  context/              # AuthContext, PlayerContext, ToastContext
  lib/                  # music.ts (iTunes/Jamendo), services.ts (Supabase), supabase clients
  types/
supabase/migrations/    # 0001_init.sql — full schema + RLS
```

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for auth/data) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for auth/data) | Supabase anon/public key |
| `JAMENDO_CLIENT_ID` | No | Free ID from https://devportal.jamendo.com — adds Jamendo tracks to search |

Without Supabase env vars the app still works as a guest: full catalog browsing, search, and playback. Login/signup shows a configuration notice.

## Supabase setup

1. Create a project at https://supabase.com
2. **SQL Editor** → paste and run `supabase/migrations/0001_init.sql`
3. **Authentication → Providers**: enable Email. Optionally enable Google and add your Google OAuth credentials + redirect URL `${SITE_URL}/auth/callback`-style (Supabase handles the callback; set `redirectTo` already points to `/library`).
4. Copy `Project URL` and `anon public` key into `.env.local` / Vercel env vars.

The schema creates `profiles`, `playlists`, `playlist_tracks`, `liked_songs`, `saved_albums`, `followed_artists`, `recently_played` — all with RLS so users can only touch their own rows. Track/album/artist payloads are stored as `jsonb`.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm start       # serve production build
npm run lint    # eslint
npx tsc --noEmit# typecheck
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → **Add New Project** → import the repo (framework: Next.js, defaults are fine).
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `JAMENDO_CLIENT_ID`.
4. Deploy. No build config needed — `next build` works out of the box.

## Testing notes

- Verified: production build, all routes (200/404 as expected), `/api/search`, `/api/home`, `/api/album/[id]`, `/api/artist/[id]` returning real iTunes data, and preview audio URLs returning `206 audio/x-m4p`.
- Requires a browser for interactive verification of playback controls and Supabase auth (needs real credentials).
