# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**taoanh.nexme.vn** — Marathon image generator tool for Nexme. Users log in with Google, manage teams/players with daily weight tracking (Day 0-10), and generate shareable progress images via an external render API. Vietnamese-only UI. Live at `https://taoanh.nexme.vn`.

## Repository Structure

This is a **monorepo-style layout** where the Next.js app lives inside `app/`. All commands must be run from `app/`.

```
.
├── app/                  # Next.js application (working directory for all commands)
│   └── src/
│       ├── app/          # Next.js App Router pages
│       ├── components/   # React components (PlayerRow, ImagePreview)
│       ├── lib/          # Supabase client, security utilities
│       ├── types/        # TypeScript interfaces
│       └── db/           # SQL schema files
├── workflows/            # n8n workflow JSON files (image rendering automation)
└── .github/workflows/    # CI/CD (deploy to Cloudflare on push to main)
```

## Commands

All commands run from `app/` directory:

```bash
cd app
npm install           # Install dependencies
npm run dev           # Local dev server (port 3000)
npm run build         # Next.js production build
npm run lint          # ESLint
npm run build:cloudflare  # Build for Cloudflare Workers (OpenNext)
npm run preview       # Build + preview Cloudflare locally
npm run deploy        # Build + deploy to Cloudflare Workers
npm run cf-typegen    # Generate Cloudflare env types
```

## Architecture

### Tech Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Supabase**: Auth (Google OAuth), PostgreSQL database, Storage (avatar uploads)
- **TailwindCSS 4** with custom design tokens in `globals.css`
- External **Render API** (`render.nexme.vn`) for image generation

### Data Flow
1. User authenticates via Google OAuth → Supabase Auth
2. New users enter approval queue → admin (`dqcong@gmail.com`) approves at `/admin`
3. Approved users manage datasets (teams) and players with weight data → stored in Supabase with RLS
4. Image generation: client → `/api/render` (server proxy adds API key) → `render.nexme.vn` → returns image URL
5. Avatar display: client → `/api/avatar` (SSRF-safe proxy) → converts external URL to base64 data URL
6. Download: client → `/api/download` (SSRF-safe proxy) → streams image with attachment headers

### Key Patterns
- **All pages are client components** (`'use client'`) — state managed with React hooks
- **Auto-save on blur**: dataset and player changes save to Supabase when inputs lose focus
- **Single Supabase client** exported from `src/lib/supabase.ts` — used directly in components (no SSR Supabase)
- **Admin check is hardcoded**: `isAdmin()` in `supabase.ts` checks for `dqcong@gmail.com`
- **RLS on all tables**: users can only access their own data via `auth.uid() = user_id`
- **API routes proxy external calls**: `/api/render`, `/api/avatar`, `/api/download` hide API keys and validate URLs (SSRF protection in `src/lib/security.ts`)

### Database Tables (Supabase PostgreSQL)
- `marathon_datasets` — team info per user (team_name, round_name, round_number, time_range)
- `marathon_players` — player data with 11 weight columns (day0-day10), linked to dataset via FK with CASCADE delete
- `user_approvals` — approval workflow (status: pending/approved/rejected)

### Image Generation Templates
- **Personal progress**: `personal_progress.hbs` — 1080x1444, individual player stats
- **Team leaderboard**: `daily_leaderboard.hbs` — 1080x1920, team rankings

## Environment Variables

Required in `.env.local` (and Cloudflare/GitHub secrets for deployment):

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
RENDER_API_URL=<render-api-endpoint>
RENDER_API_KEY=<render-api-key>
```

## Deployment

CI/CD via GitHub Actions (`.github/workflows/deploy.yml`): push to `main` triggers build and deploy to Cloudflare Workers using `wrangler`. The worker is routed to `taoanh.nexme.vn` with R2 bucket for incremental cache.

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
