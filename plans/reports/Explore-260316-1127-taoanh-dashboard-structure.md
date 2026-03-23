# Exploration Report: taoanh.nexme.vn Dashboard Structure

**Date:** 2026-03-16  
**Focus:** Dashboard structure, datasets (teams), players CRUD, database schema, delete functionality

---

## 1. Main Dashboard Page

**File:** `app/src/app/dashboard/page.tsx` (1167 lines)

### Core Structure
- **Client-side:** `'use client'` — uses React hooks, no SSR
- **Auth Flow:** 
  - Checks user auth via `getUser()`
  - Routes to `/` if no user
  - Supports approval workflow: pending/approved/rejected status
  - Admin bypass: `isAdmin()` checks for `dqcong@gmail.com`
  
### State Management
```typescript
- user: current authenticated user
- approvalStatus: 'approved' | 'pending' | 'rejected' | null
- dataset: MarathonDataset (team/round/time info)
- datasetId: current team's UUID
- allDatasets: list of all user's datasets
- players: array of Player objects (1 dataset = many players)
- selectedPlayers: Set<playerId> for image generation
- imageType: 'personal' | 'team' (image render type)
- selectedDay: 0-10 (day of marathon)
- renderedImages: RenderedImage[] (generated images)
```

### Key Functions

#### Dataset Operations
1. **`loadData(userId)`** — Load all datasets & latest players
2. **`switchDataset(dsId)`** — Switch active dataset, load its players
3. **`startNewDataset()`** — Create new empty dataset
4. **`saveDataset()`** — Upsert (create/update) dataset to Supabase
   - **Trigger:** On blur of any dataset field
   - **Auto-save:** When adding first player (if no datasetId)

#### Player Operations
1. **`addPlayer()`** — Add new empty player to current dataset
   - Check: requires team_name (must belong to a dataset)
   - Limit: MAX_PLAYERS = 9 per dataset (1 captain + 8 members)
2. **`savePlayer(index)`** — Upsert player to database
   - **Trigger:** On blur of player field (auto-save on blur)
   - **Auto-create dataset:** If player added before dataset saved
3. **`handlePlayerChange(index, updatedPlayer)`** — Update player state & save
4. **`handleDeletePlayer(index)`** — Delete player from DB & UI
   - **Process:**
     1. Call `deletePlayer(playerId)` if player has ID
     2. Remove from players array (index-based)
     3. Remove from selectedPlayers Set

#### Image Generation
1. **`handleGenerateImages()`** — Generate personal or team images
   - Validates: selectedDay >= 0, dataset.team_name set, players selected
   - **Personal images:** Calls `/api/render` for each selected player
   - **Team images:** Calculates team stats, calls `/api/render` once
   - Returns RenderedImage[] with URLs & filenames
2. **`calculateTeamData(dayNumber)`** — Build team ranking data
   - Calculates weight loss (today & total)
   - Sorts players by daily loss (descending)
   - Marks captain & top performers
   - Returns TeamRenderData struct

#### Data Deletion
- **`handleClearData()`** — Delete ALL datasets (with user confirmation)
  - Calls `clearAllData(userId)` from supabase.ts
  - Wipes all user's teams & players

### UI Sections (4-Step Progress)
1. **Step 1: Team Info**
   - Fields: team_name, round_name, round_number, time_range
   - Auto-save on blur
   
2. **Step 2: Player List**
   - Display: {players.length}/{MAX_PLAYERS} (9)
   - Buttons: + Add, Select All, Deselect
   - Per-player row: avatar, name, role (player/captain), delete, weight inputs (day0-day10)
   - Auto-save on blur

3. **Step 3: Select for Image**
   - Toggle: Personal (select players) | Team (auto-include all)
   - Day selector (0-10)
   - Player selection grid (checkboxes)

4. **Step 4: Generate & Clear**
   - Button: TẠO ẢNH (disabled if no players/selections)
   - Button: XÓA DỮ LIỆU (clear all user data)
   - Shows image preview modal on success

---

## 2. Database Schema

**Files:** 
- `app/src/db/schema.sql` (136 lines)
- `app/src/db/setup-all.sql` (135 lines)

### Tables

#### `marathon_datasets` (Teams)
```sql
CREATE TABLE marathon_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_name TEXT NOT NULL,
  round_name TEXT DEFAULT 'Marathon',
  round_number INTEGER,
  time_range TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marathon_datasets_user_id ON marathon_datasets(user_id);
```

- **Relationship:** 1 user : N datasets (teams)
- **Cascade:** ON DELETE CASCADE (deleting dataset → deletes all players)
- **RLS:** All ops protected by `auth.uid() = user_id`

#### `marathon_players` (Players)
```sql
CREATE TABLE marathon_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES marathon_datasets(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'captain')),
  avatar_url TEXT,
  day0 NUMERIC, day1 NUMERIC, ... day10 NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marathon_players_dataset_id ON marathon_players(dataset_id);
```

- **Relationship:** 1 dataset : N players
- **Cascade:** ON DELETE CASCADE on dataset_id FK
- **RLS:** All ops protected by checking dataset's user_id via subquery
- **Weights:** 11 days (day0-day10), NUMERIC type (allows decimals)

### Row-Level Security (RLS) Policies

#### `marathon_datasets`
- **SELECT:** User sees own datasets only (`auth.uid() = user_id`)
- **INSERT:** User can create in own account
- **UPDATE:** User can update own datasets
- **DELETE:** User can delete own datasets

#### `marathon_players`
- **SELECT:** User sees players in own datasets (subquery check)
- **INSERT:** User can add players to own datasets
- **UPDATE:** User can update players in own datasets
- **DELETE:** User can delete players from own datasets

**Note:** No direct `user_id` on players table — RLS joins to datasets to verify ownership.

---

## 3. TypeScript Interfaces

**File:** `app/src/types/index.ts`

### Data Models
```typescript
interface MarathonDataset {
  id?: string;
  user_id?: string;
  team_name: string;
  round_name: string;
  round_number: number | null;
  time_range: string;
  created_at?: string;
  updated_at?: string;
}

interface Player {
  id?: string;
  dataset_id?: string;
  player_name: string;
  role: 'player' | 'captain';
  avatar_url: string | null;
  day0: number | null;
  day1: number | null;
  ... day10: number | null;
  created_at?: string;
  updated_at?: string;
}
```

---

## 4. Supabase Client Library

**File:** `app/src/lib/supabase.ts` (312 lines)

### Dataset Functions
1. **`getAllDatasets(userId: string)`** → `MarathonDataset[]`
   - Fetches all user's datasets, ordered by created_at DESC
   - Used: Initial load, dataset switcher

2. **`getDataset(userId, datasetId?)`** → `MarathonDataset | null`
   - If datasetId: fetch specific dataset
   - Else: fetch most recent (latest) dataset
   - Used: Dashboard initialization

3. **`upsertDataset(dataset, userId)`** → `string | null` (new ID or existing ID)
   - **Create:** No dataset.id → INSERT, returns new UUID
   - **Update:** Has dataset.id → UPDATE
   - Sets updated_at timestamp
   - Used: Auto-save on blur, saveDataset()

4. **`clearAllData(userId)`** → `boolean`
   - DELETE all datasets for user (cascades to players)
   - Used: "XÓA DỮ LIỆU" button

### Player Functions
1. **`getPlayers(datasetId)`** → `Player[]`
   - Fetch all players for dataset
   - Ordered by created_at ASC (first added = first in list)

2. **`upsertPlayer(player, datasetId)`** → `string | null` (ID)
   - **Create:** No player.id → INSERT, returns new UUID
   - **Update:** Has player.id → UPDATE
   - Sets dataset_id (required)
   - Used: Auto-save on blur

3. **`deletePlayer(playerId)`** → `boolean`
   - DELETE single player by ID
   - Used: Player row delete button

### Auth Functions
1. **`getUser()`** → `{ user, error }`
   - Get current session user
   - Used: Auth checks

2. **`signOut()`** — Sign out user

3. **`isAdmin(email?)`** → `boolean`
   - Checks if `email === 'dqcong@gmail.com'`
   - Hardcoded admin account

### Approval Workflow
1. **`checkApprovalStatus(userId)`** → `{ status, needsRequest }`
2. **`requestApproval(user)`** — Create pending approval record
3. **`getAllApprovals()`**, **`approveUser()`**, **`rejectUser()`** — Admin functions
   - Used: `/admin` page for user approval flow

### Avatar Upload
**`uploadAvatar(file)`** → `string | null` (public URL)
- Uploads to Supabase Storage bucket: `marathon-avatars`
- Returns public URL for player.avatar_url

---

## 5. Component: PlayerRow

**File:** `app/src/components/PlayerRow.tsx` (157 lines)

### Props
```typescript
interface PlayerRowProps {
  player: Player;
  index: number;
  hasCaptain: boolean;
  checked: boolean;
  onCheckChange: (checked) => void;
  onChange: (updatedPlayer) => void;
  onDelete: () => void;
}
```

### Features
1. **Checkbox** — Select for image generation
2. **Avatar** — Upload/display, click to upload image
3. **Player Name** — Text input (max 20 chars)
4. **Role Selector** — Dropdown: player | captain (one captain per team)
5. **Weight Inputs** — 11 inputs (day0-day10)
6. **Delete Button** — Remove player
7. **Auto-save** — On blur of any field calls `onChange()`

### Avatar Handling
- Click avatar → file input (image/* only)
- Upload via `uploadAvatar()` → get public URL
- Show spinner while uploading
- Error alert on failure

---

## 6. Component: ImagePreview

**File:** `app/src/components/ImagePreview.tsx` (195 lines)

### Modal Display
- Shows rendered images in carousel (if multiple)
- Navigation: dots, prev/next arrows
- Single image: just display

### Download Options
1. **Download Current** — Single image
2. **Download All** — All images (batch with 500ms delay)
- Both call `/api/download` proxy endpoint
- Prompts browser save dialog

---

## 7. Admin Page

**File:** `app/src/app/admin/page.tsx`

### Features
- **Access:** Only `dqcong@gmail.com` (hardcoded check)
- **Workflow:** Tabbed interface
  - **Pending:** User approval requests (1st tab)
  - **Approved:** Approved users (2nd tab)
  - **Rejected:** Rejected users (3rd tab)
- **Actions:** Approve, Reject pending users
- **Approval Record:** 
  - user_id, email, display_name, avatar_url, status, timestamps

---

## 8. CRUD Operations Summary

### Create
- **Dataset:** `upsertDataset()` (new dataset.id = null)
- **Player:** `upsertPlayer()` (new player.id = null)
- **Approval:** `requestApproval()` (new user auto-added to pending)

### Read
- **Datasets:** `getAllDatasets()`, `getDataset()`
- **Players:** `getPlayers(datasetId)`
- **Approvals:** `getAllApprovals()`, `checkApprovalStatus()`

### Update
- **Dataset:** `upsertDataset()` (existing dataset.id = UUID)
- **Player:** `upsertPlayer()` (existing player.id = UUID)
- **Approval:** `approveUser()`, `rejectUser()` (status field)

### Delete
- **Single Player:** `deletePlayer(playerId)`
- **All User Data:** `clearAllData(userId)` → cascades datasets + players
- **No individual dataset delete UI** — only "clear all"

---

## 9. Delete Functionality Analysis

### Existing Delete Operations
1. **Player Delete** — Via `PlayerRow.onDelete()` → `handleDeletePlayer()` → `deletePlayer(playerId)`
   - **Confirmed:** Works for individual players
   - **UI:** Red delete button per player
   
2. **All Data Delete** — Via `handleClearData()` → `clearAllData(userId)`
   - **Confirmed:** Clears ALL datasets for user (RLS-protected)
   - **UI:** "XÓA DỮ LIỆU" button (red/danger style)
   - **Safety:** Requires user confirmation popup

### Missing Delete Operations
1. **No single dataset delete** — No "delete this team" button
   - Can only clear all teams at once
   - UI shows dataset selector, no delete option
   - Could add delete icon next to dataset name

2. **No avatar delete** — Only upload/overwrite
   - Could add "Remove avatar" button on player row

### Cascade Behavior
- **Dataset DELETE → cascades to players** (via FK `ON DELETE CASCADE`)
- RLS ensures user can only delete own datasets/players
- Storage objects (avatars) NOT deleted when player deleted (orphaned URLs)

---

## 10. API Endpoints (Planned)

**Status:** Folder structure exists, but **routes NOT IMPLEMENTED**

```
app/src/app/api/
├── render/        — POST /api/render (call external render service)
├── avatar/        — GET /api/avatar (fetch & proxy avatar as base64)
└── download/      — GET /api/download (proxy image download)
```

**Dashboard calls these:**
- `POST /api/render` → body: RenderRequest → returns RenderResponse
- `GET /api/download?url=...&filename=...` → returns image blob

**These routes need to be implemented** (currently empty folders).

---

## 11. Key Insights

### Architecture
- **Client-first:** All data ops in components, auto-save on blur
- **Supabase:** RLS enforces data ownership, no backend logic needed
- **Stateful:** React hooks for all state (no Redux/Context)
- **Auto-save:** Implicit saves, no explicit "Save" button (except image generation)

### Data Flow
```
User Input → React State → onChange/onBlur → saveDataset/savePlayer → Supabase RLS
                           ↓
                      UI Update (Set State)
```

### Security
- **Auth:** Google OAuth via Supabase
- **RLS:** All table ops protected
- **Admin:** Single hardcoded email `dqcong@gmail.com`
- **SSRF:** API routes should validate external URLs (not yet implemented)

### Naming
- **Teams** = `marathon_datasets` (confusing name; should be `marathon_teams`)
- **Players** = `marathon_players`
- **No separate schedule/events table** (round info stored as fields on dataset)

### Limits
- MAX_PLAYERS = 9 per dataset (1 captain + 8 members) — hardcoded in dashboard.tsx
- MAX_DAYS = 11 (day0-day10) — fixed columns, no flexibility

---

## 12. File Organization

```
app/src/
├── app/
│   ├── layout.tsx              — Root layout
│   ├── page.tsx                — Home/login
│   ├── dashboard/
│   │   └── page.tsx            — Main dashboard (1167 lines) ⭐ CORE
│   ├── admin/
│   │   └── page.tsx            — Admin approval UI
│   ├── api/                    — API routes (EMPTY - NOT IMPLEMENTED)
│   │   ├── render/
│   │   ├── avatar/
│   │   └── download/
│   └── globals.css             — Design tokens, Tailwind + custom
├── components/
│   ├── PlayerRow.tsx           — Player input row
│   ├── ImagePreview.tsx        — Image carousel & download
│   └── ErrorBoundary.tsx       — Error UI
├── lib/
│   ├── supabase.ts             — All Supabase ops (312 lines)
│   └── security.ts             — SSRF validation (if implemented)
├── types/
│   └── index.ts                — All interfaces
└── db/
    ├── schema.sql              — Table definitions + RLS
    └── setup-all.sql           — Complete setup script
```

---

## Unresolved Questions

1. **API Routes:** How should `/api/render`, `/api/avatar`, `/api/download` be implemented?
   - What external service does render API call? (render.nexme.vn)
   - Should routes validate API keys, URL origin, etc.?

2. **Single Dataset Delete:** Is there a reason no "delete this team" button exists?
   - Should it cascade (delete all players)?
   - Should it be available via dropdown menu?

3. **Avatar Cleanup:** When players/datasets deleted, avatar storage objects orphaned?
   - Should implement cleanup in delete endpoints?

4. **Dataset Switching:** Is dataset selector dropdown intended for team switching only?
   - Or should users see all historical datasets?

5. **Performance:** With many datasets/players, pagination needed?
   - Current loads all datasets + players on init

6. **Hardcoded Admin:** Single email as admin safe?
   - Should migrate to admin table in Supabase?
