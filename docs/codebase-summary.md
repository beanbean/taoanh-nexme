# Codebase Summary - taoanh.nexme.vn

**Last Updated:** 2026-03-02
**Status:** Production (Deployed on Cloudflare Workers)
**Repository:** taoanh.nexme.vn

## Overview

This is a **monorepo-style Next.js 16 application** for generating Marathon progress images. It's deployed on Cloudflare Workers with Supabase backend, running live at `https://taoanh.nexme.vn`.

## Directory Structure

```
.
├── app/                          # Next.js 16 working directory
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── (auth)/           # Auth pages
│   │   │   ├── admin/            # Admin approval dashboard
│   │   │   ├── dashboard/        # Main user dashboard (1167 lines)
│   │   │   ├── api/              # API routes
│   │   │   │   ├── render/       # Image render proxy
│   │   │   │   ├── avatar/       # Avatar conversion
│   │   │   │   └── download/     # Image download
│   │   │   ├── globals.css       # Design tokens (TailwindCSS 4)
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── page.tsx          # Home page
│   │   ├── components/           # React components
│   │   │   ├── PlayerRow.tsx     # Single player input row
│   │   │   └── ImagePreview.tsx  # Image preview modal
│   │   ├── lib/                  # Utilities
│   │   │   ├── supabase.ts       # Supabase client + auth helpers
│   │   │   └── security.ts       # SSRF protection utilities
│   │   ├── types/                # TypeScript interfaces
│   │   │   └── index.ts          # All types defined here
│   │   └── db/                   # Database schema
│   │       ├── schema.sql        # Table definitions
│   │       └── setup-all.sql     # RLS policies
│   ├── docs/
│   │   └── prd.md                # Product Requirements Document
│   ├── public/                   # Static assets
│   └── Configuration files (next.config.ts, wrangler.jsonc, etc.)
├── workflows/                    # n8n workflow JSON files
│   ├── 1.Render_image_progress_player.json
│   ├── 2.Render_team_leaderboard.json
│   └── 3.send_image_zalo_captain.json
├── plans/                        # Project planning & QA reports
├── .github/workflows/            # CI/CD (GitHub Actions)
│   └── deploy.yml                # Auto-deploy to Cloudflare on push to main
└── CLAUDE.md                     # Project instructions for Claude Code

```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + TailwindCSS 4 |
| **Framework** | Next.js 16 (App Router) |
| **Runtime** | Cloudflare Workers via @opennextjs/cloudflare |
| **Auth** | Supabase Auth (Google OAuth) |
| **Database** | Supabase PostgreSQL with RLS |
| **Storage** | Supabase Storage (avatar uploads) |
| **Image Generation** | External Render API (render.nexme.vn) |
| **Deployment** | Cloudflare Workers + GitHub Actions |

## Key Features

### 1. User Authentication
- Google OAuth login via Supabase
- User approval workflow (admin at `dqcong@gmail.com` approves new users)
- RLS (Row-Level Security) on all database tables

### 2. Team & Player Management
- Create multiple datasets (teams) per user
- Add up to 9+ players per dataset
- Track weight data for each player across Day 0-10
- Auto-save on blur: changes save to Supabase when input loses focus

### 3. Weight Tracking Logic (Recent Updates)
- **Start weight:** First day with data (not always day 0)
- **Current weight:** Latest day with data
- **Daily delta:** Change from nearest previous day with data (not strictly day[N-1])
- **Round loss:** Change from start to latest day
- **Day selection:** Required before generating images; `-1` = not selected

### 4. Image Generation
Two templates available:
- **Personal progress:** 1080x1444 pixels, individual player stats
- **Team leaderboard:** 1080x1920 pixels, team rankings sorted by daily weight loss

### 5. Admin Dashboard
- Approve/reject pending user applications
- View approval status at `/admin`

## Core Files

### Main Application
- **`app/src/app/dashboard/page.tsx`** (1167 lines)
  - Core business logic
  - `buildPlayerStats()`: Calculates start, current, and delta weights
  - `buildPlayerGrid()`: Creates day-by-day grid with daily deltas
  - `calculateTeamData()`: Aggregates team statistics
  - Image generation orchestration

### Components
- **`app/src/components/PlayerRow.tsx`**: Single player weight input row
- **`app/src/components/ImagePreview.tsx`**: Image preview modal

### Backend Services
- **`app/src/lib/supabase.ts`**: Supabase client, auth functions, CRUD operations
- **`app/src/lib/security.ts`**: SSRF protection for external API calls
- **`app/src/app/api/render/route.ts`**: Proxy for image render API
- **`app/src/app/api/avatar/route.ts`**: Avatar URL to base64 conversion
- **`app/src/app/api/download/route.ts`**: Image download with proper headers

### Database
- **`app/src/db/schema.sql`**: Table definitions
- **`app/src/db/setup-all.sql`**: RLS policies and constraints

### Types
- **`app/src/types/index.ts`**: All TypeScript interfaces (MarathonDataset, Player, RenderRequest, etc.)

## Database Schema

### Tables
| Table | Purpose | Columns |
|-------|---------|---------|
| `marathon_datasets` | Team info per user | `id`, `user_id`, `team_name`, `round_name`, `round_number`, `time_range`, `created_at` |
| `marathon_players` | Player weight data | `id`, `dataset_id`, `player_name`, `avatar_url`, `role`, `day0`-`day10`, `created_at`, `updated_at` |
| `user_approvals` | Approval workflow | `id`, `user_id`, `status`, `created_at`, `reviewed_at`, `reviewed_by` |

### RLS Policies
- All tables: Users can only access their own `user_id` rows
- Cascade delete: Deleting dataset deletes all related players

## Key Patterns

### 1. Client-Side Rendering
- **All pages are client components** (`'use client'`)
- State managed with React hooks (`useState`, `useCallback`)
- Single Supabase client instance: `src/lib/supabase.ts`

### 2. Auto-save Pattern
- Dataset and player changes save on input blur
- Errors show via `alert()`, not toast notifications
- Uses Supabase RLS for data isolation

### 3. Day Selection
- `selectedDay` state: `-1` (not selected) to `10`
- Day selection is **required** before generating images
- `is_finished` flag set when `selectedDay === 10`

### 4. Weight Calculation Logic
```
buildPlayerStats(player):
  startWeight = first day (0-selectedDay) with data
  currentWeight = latest day (selectedDay-0) with data
  deltaWeight = currentWeight - startWeight

buildPlayerGrid(player):
  for each day 1-10:
    if day <= selectedDay:
      dailyDelta = current_day_weight - nearest_previous_day_with_data

calculateTeamData(dayNumber):
  for each player:
    startWeight = first day (0-dayNumber) with data
    latestWeight = latest day (dayNumber-0) with data
    yesterdayWeight = nearest previous day with data
    todayLoss = yesterdayWeight - todayWeight
    roundLoss = startWeight - latestWeight
```

### 5. API Security
- All external API calls go through `/api/*` routes
- API keys stored in environment variables, never exposed to client
- SSRF protection in `src/lib/security.ts` validates all URLs

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
RENDER_API_URL=https://render.nexme.vn/render
RENDER_API_KEY=<api-key>
```

## Build & Deployment

### Local Development
```bash
cd app
npm install
npm run dev          # Dev server on port 3000
npm run lint         # ESLint check
```

### Production Build
```bash
cd app
npm run build        # Next.js build
npm run preview      # Local preview of Cloudflare build
npm run deploy       # Deploy to Cloudflare Workers
```

### CI/CD
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Triggers on push to `main` branch
- Builds with OpenNext, deploys via Wrangler
- R2 bucket for incremental cache

## Import Path Aliases

```
@/* → ./src/*
```

Configured in `tsconfig.json` for cleaner imports:
```tsx
import { supabase } from '@/lib/supabase';
import type { Player } from '@/types';
```

## Code Quality

- **Linting:** ESLint with modern config
- **Type Safety:** Full TypeScript strict mode
- **Styling:** TailwindCSS 4 with custom design tokens
- **Components:** Functional components with hooks
- **No external animation libraries:** Uses CSS for animations

## Notes

- All pages are Vietnamese-only UI
- No multi-language support
- Admin account hardcoded: `dqcong@gmail.com`
- Image templates are served from external Render API
- No local image generation; relies on render.nexme.vn service
