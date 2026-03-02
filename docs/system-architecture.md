# System Architecture - taoanh.nexme.vn

**Last Updated:** 2026-03-02
**Status:** Production

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        User Browser (Client)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  React 19 Application                                                    │
│  ├── Dashboard (Player Data Entry)                                       │
│  ├── Admin Panel (User Approval)                                         │
│  └── Image Preview Modal                                                │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────────────────┐
│            Cloudflare Workers (Next.js 16 Runtime)                       │
├──────────────────────────────────────────────────────────────────────────┤
│  Next.js 16 App Router                                                   │
│  ├── Auth Routes (/auth/*)                    → Supabase Auth            │
│  ├── Dashboard (/dashboard)                   → Main UI                  │
│  ├── Admin Dashboard (/admin)                 → User Approvals           │
│  └── API Routes (/api/*)                                                │
│      ├── /api/render           → Render API proxy (SSRF protected)       │
│      ├── /api/avatar           → Avatar conversion                       │
│      └── /api/download         → Image download                          │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
     ┌─────────┼─────────┬──────────────┐
     │         │         │              │
┌────▼──┐ ┌───▼──┐ ┌───▼───┐ ┌──────▼──────┐
│Supabase │ │Render│ │n8n    │ │Cloudflare  │
│         │ │API   │ │Flows  │ │  R2 (Cache)│
└────────┘ └──────┘ └───────┘ └────────────┘
```

## Component Layers

### 1. Client Layer (React)
**Location:** `app/src/`

**Components:**
- `app/layout.tsx` - Root layout with navbar
- `app/page.tsx` - Home/landing page
- `app/(auth)/*` - Auth pages (login/callback)
- `app/dashboard/page.tsx` - Main dashboard (1167 lines)
  - Player data entry
  - Image type selection (personal/team)
  - Day selection
  - Image preview
- `app/admin/page.tsx` - Admin approval dashboard
- `components/PlayerRow.tsx` - Reusable player input row
- `components/ImagePreview.tsx` - Image preview modal

**State Management:** React hooks (`useState`, `useCallback`)
**Styling:** TailwindCSS 4 + custom CSS variables in `globals.css`

### 2. API Layer (Next.js Routes)
**Location:** `app/src/app/api/`

**Endpoints:**

#### `/api/render` (Image Generation Proxy)
```
POST /api/render
Content-Type: application/json

{
  template: 'personal_progress.hbs' | 'daily_leaderboard.hbs',
  filename_prefix: 'personal' | 'team',
  width: 1080,
  height: 1444 | 1920,
  data: {...}  // Render-specific format
}

Response:
{
  image_url: string
}
```

**Purpose:**
- Proxy requests to external Render API (render.nexme.vn)
- Hide API key from client
- Validate request format

#### `/api/avatar` (Avatar Conversion)
```
GET /api/avatar?url=<external-avatar-url>

Response: Base64 data URL
```

**Purpose:**
- Convert external avatar URLs to base64 data URLs
- SSRF protection: validate and normalize URLs
- Prevent exposing external avatar service

#### `/api/download` (Image Download)
```
GET /api/download?url=<image-url>

Response: Image blob with attachment headers
```

**Purpose:**
- Stream image for download
- Proper HTTP headers (Content-Disposition, Content-Type)
- SSRF protection

### 3. Data Layer (Supabase)
**Service:** Supabase PostgreSQL + Auth + Storage

**Authentication:**
- Google OAuth via Supabase Auth
- Client-side with `@supabase/auth-helpers-nextjs`
- Session managed in browser

**Database Tables:**

| Table | Purpose |
|-------|---------|
| `auth.users` | Managed by Supabase Auth |
| `user_approvals` | User approval workflow |
| `marathon_datasets` | Teams/datasets per user |
| `marathon_players` | Player weight data (11 columns: day0-day10) |

**RLS (Row-Level Security):**
```sql
-- Users can only access their own data
CREATE POLICY "Users can access their own datasets"
  ON marathon_datasets
  FOR ALL
  USING (auth.uid() = user_id);

-- Cascade delete: deleting dataset deletes players
ALTER TABLE marathon_players
  ADD CONSTRAINT fk_dataset
  FOREIGN KEY (dataset_id)
  REFERENCES marathon_datasets(id)
  ON DELETE CASCADE;
```

**Storage:**
- User avatar uploads → `avatars/` bucket
- Public read access for avatar previews

### 4. External Services

#### Render API (render.nexme.vn)
**Purpose:** Generate Marathon progress images

**API:**
```
POST https://render.nexme.vn/render

{
  template: 'personal_progress.hbs' | 'daily_leaderboard.hbs',
  data: {
    // Template-specific data
  }
}

Response:
{
  image_url: string
}
```

**Templates:**
- `personal_progress.hbs` - 1080x1444, individual player
- `daily_leaderboard.hbs` - 1080x1920, team rankings

#### n8n Workflows (workflows/)
**Purpose:** Image generation automation & distribution

**Workflows:**
1. `1.Render_image_progress_player.json` - Personal progress
2. `2.Render_team_leaderboard.json` - Team leaderboard
3. `3.send_image_zalo_captain.json` - Send images via Zalo to team captain

## Data Flow

### 1. User Login
```
User → Google OAuth → Supabase Auth → Create auth.users record
→ Check user_approvals → If pending, show waiting screen
→ If approved, access dashboard
```

### 2. Weight Data Entry
```
User enters weight → PlayerRow component → State update
→ On blur → Call upsertPlayer(supabase) → Save to DB
→ Auto-reloaded into state
```

### 3. Image Generation
```
User selects players, day, image type
→ handleGenerateImages()
→ For each player:
  - Fetch avatar → Convert to base64 (SSRF-safe)
  - buildPlayerStats() → Calculate weights
  - buildPlayerGrid() → Calculate daily deltas
  - Call /api/render → External Render API
  - Store image URL in state
→ ImagePreview modal shows results
→ Download button streams image via /api/download
```

### 4. Team Leaderboard Generation
```
User selects team image type, players, day
→ calculateTeamData(dayNumber)
→ For each player:
  - Find first day with data (start weight)
  - Find latest day ≤ dayNumber with data (current weight)
  - Find nearest previous day with data (yesterday weight)
  - Calculate todayLoss, roundLoss
→ Sort non-captains by todayLoss descending
→ Mark top player(s) as is_top
→ Call /api/render with team data
```

## Weight Calculation Logic

### buildPlayerStats()
Finds first and latest day with weight data within selected day range.

```typescript
function buildPlayerStats(player: Player): {
  start_weight: number | null;
  current_weight: number | null;
  delta_weight: number | null;
} {
  // Find FIRST day (0 to selectedDay) with data
  let startWeight: number | null = null;
  for (let i = 0; i <= selectedDay; i++) {
    const w = player[`day${i}` as keyof Player];
    if (w !== null && w !== undefined) {
      startWeight = w;
      break;  // Exit on first hit
    }
  }

  // Find LATEST day (selectedDay to 0) with data
  let currentWeight: number | null = null;
  for (let i = selectedDay; i >= 0; i--) {
    const w = player[`day${i}` as keyof Player];
    if (w !== null && w !== undefined) {
      currentWeight = w;
      break;  // Exit on first hit
    }
  }

  const deltaWeight = (startWeight && currentWeight)
    ? currentWeight - startWeight
    : null;

  return { start_weight: startWeight, current_weight: currentWeight, delta_weight: deltaWeight };
}
```

### buildPlayerGrid()
Daily changes from nearest previous day with data.

```typescript
function buildPlayerGrid(player: Player): Array<{
  day: number;
  delta_from_start: number | null;
}> {
  const grid = [];
  for (let i = 1; i <= 10; i++) {
    let delta_from_start: number | null = null;
    if (i <= selectedDay) {
      const dayWeight = player[`day${i}` as keyof Player];
      if (dayWeight !== null && dayWeight !== undefined) {
        // Find NEAREST PREVIOUS day with weight
        let prevWeight: number | null = null;
        for (let d = i - 1; d >= 0; d--) {
          const w = player[`day${d}` as keyof Player];
          if (w !== null && w !== undefined) {
            prevWeight = w;
            break;  // Exit on first hit
          }
        }
        if (prevWeight !== null) {
          delta_from_start = dayWeight - prevWeight;
        }
      }
    }
    grid.push({ day: i, delta_from_start });
  }
  return grid;
}
```

### calculateTeamData()
Aggregates team statistics for leaderboard.

```typescript
async function calculateTeamData(dayNumber: number): Promise<TeamRenderData> {
  for (const player of players) {
    // Latest weight up to dayNumber
    let latestWeight = null;
    for (let d = dayNumber; d >= 0; d--) {
      const w = player[`day${d}` as keyof Player];
      if (w !== null && w !== undefined) {
        latestWeight = w;
        break;
      }
    }

    // First day with weight (start)
    let startWeight = null;
    for (let d = 0; d <= dayNumber; d++) {
      const w = player[`day${d}` as keyof Player];
      if (w !== null && w !== undefined) {
        startWeight = w;
        break;
      }
    }

    // Nearest previous day with weight (yesterday)
    let yesterdayWeight = null;
    for (let d = dayNumber - 1; d >= 0; d--) {
      const w = player[`day${d}` as keyof Player];
      if (w !== null && w !== undefined) {
        yesterdayWeight = w;
        break;
      }
    }

    const todayLoss = (todayWeight && yesterdayWeight)
      ? yesterdayWeight - todayWeight
      : 0;
    const roundLoss = (startWeight && latestWeight)
      ? startWeight - latestWeight
      : 0;
  }

  // Sort members by todayLoss descending (most loss first)
  members.sort((a, b) => {
    const aLoss = parseFloat(a.today_display);
    const bLoss = parseFloat(b.today_display);
    return aLoss - bLoss;  // Smaller (more loss) comes first
  });
}
```

## Security Considerations

### Authentication
- Google OAuth via Supabase (secure, no password management)
- User approval workflow adds extra barrier
- Admin hardcoded as `dqcong@gmail.com`

### Data Protection
- RLS ensures users only access their own data
- All DB queries include `auth.uid() = user_id` check
- No leaking of other users' data

### SSRF Protection
- All external API calls through `/api/*` routes
- `security.ts` validates and normalizes URLs
- Avatar URLs converted to data URLs (no external requests from client)
- Render API URL hardcoded in env, not user-controllable

### API Keys
- All API keys stored in environment variables
- Never exposed to client
- Added via server-side API routes

## Deployment Architecture

```
Git Repo (main branch)
    ↓
GitHub Actions (deploy.yml)
    ↓
npm run build (OpenNext)
    ↓
Wrangler deploy
    ↓
Cloudflare Workers
    ↓
Routed to taoanh.nexme.vn (custom domain)
    ↓
R2 Bucket (incremental cache)
```

**Trigger:** Push to `main` branch
**Build Time:** ~3-5 minutes
**Deployment:** Automatic via GitHub Actions

## Performance Characteristics

- **Page Load:** ~1 second (Cloudflare Workers latency)
- **Image Generation:** ~2-5 seconds (depends on Render API)
- **Auto-save:** <1 second (Supabase write)
- **Database Queries:** Typically <100ms (Supabase performance)

## Monitoring & Logging

- **Console Logs:** Dashboard logs key actions (player processing, avatar conversion)
- **Error Handling:** `alert()` for user errors
- **No external monitoring:** Relies on GitHub Actions logs + Cloudflare dashboard

## Future Considerations

- Multi-language support (currently Vietnamese only)
- Enhanced image templates
- Analytics dashboard
- Batch operations
- API for external integrations
