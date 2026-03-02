# Project Overview & PDR - taoanh.nexme.vn

**Last Updated:** 2026-03-02
**Status:** Production (Live at https://taoanh.nexme.vn)
**Maintained By:** Development Team

---

## Executive Summary

**taoanh.nexme.vn** is a web application for generating Marathon competition progress images. Users authenticate with Google, manage team/player weight data across a 10-day Marathon event (Days 0-10), and generate shareable progress and leaderboard images via an external render service.

**Key Stats:**
- **Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS 4, Supabase
- **Deployment:** Cloudflare Workers
- **Database:** Supabase PostgreSQL with RLS
- **Image Generation:** External Render API (render.nexme.vn)
- **Language:** Vietnamese (UI)
- **Launch Date:** 2026-02-16

---

## Product Vision

### Vision Statement
To provide Marathon teams with a simple, fast tool for creating beautiful progress images that celebrate daily achievements, motivate team members, and share competition progress across their networks.

### Product Goals

| Goal | Description | Priority | Status |
|------|-------------|----------|--------|
| Easy Data Entry | Simple weight tracking for up to 9+ players | P0 | Done |
| Auto-save | Automatic data persistence on blur | P0 | Done |
| Multi-dataset Support | Multiple teams per user | P1 | Done |
| User Approval Workflow | Admin screening of new users | P0 | Done |
| Personal Progress Images | Individual player stats + grid | P0 | Done |
| Team Leaderboard Images | Team rankings by daily loss | P0 | Done |
| Day-by-day Tracking | Track changes across Day 0-10 | P0 | Done |
| Mobile-responsive UI | Works on all screen sizes | P1 | Done |

### Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2 seconds | ~1s (Cloudflare) |
| Image Generation Time | < 5 seconds | ~3-5s (Render API) |
| User Approval Rate | 95%+ | High |
| DAU (Daily Active Users) | 50+ | TBD |
| Images Generated/Day | 100+ | TBD |

---

## Product Requirements

### Functional Requirements

#### FR-1: Authentication
- Users login via Google OAuth
- New users enter approval queue
- Approved users access dashboard
- Admin (`dqcong@gmail.com`) manages approvals at `/admin`

#### FR-2: Data Management
- Create multiple datasets (teams) per user
- Add/edit/delete players in dataset
- Track weight for each player (Day 0-10)
- Auto-save on input blur
- Delete all data (with confirmation)

#### FR-3: Weight Calculation
- **Start weight:** First day with data (handles missing days)
- **Current weight:** Latest day with data
- **Daily delta:** Change from nearest previous day with data
- **Round loss:** Total change from start to latest day
- Handles sparse data (missing middle days)

#### FR-4: Image Generation
- **Personal progress:** Individual player stats + daily grid
- **Team leaderboard:** Team rankings sorted by daily loss
- Select players to include
- Select day (0-10) as "current date"
- Preview images before download
- Download generated images

#### FR-5: Admin Dashboard
- View pending user approvals
- Approve/reject applications
- See approval status

### Non-Functional Requirements

| Requirement | Specification |
|------------|---------------|
| **Performance** | Page load < 2s, image gen < 5s |
| **Availability** | 99.9% uptime (Cloudflare SLA) |
| **Security** | HTTPS, RLS on database, SSRF protection |
| **Scalability** | Handle 100+ concurrent users |
| **Data Protection** | GDPR-compliant, RLS isolation |
| **Accessibility** | WCAG 2.1 AA standard |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |

### Technical Constraints

1. **Next.js 16** runtime on Cloudflare Workers (via OpenNext)
2. **Supabase** for auth and database (no self-managed infrastructure)
3. **External Render API** for image generation (no local image processing)
4. **Vietnamese-only UI** (no multi-language support currently)
5. **Google OAuth only** (no other auth providers)

### Scope

#### In Scope
- User authentication and approval workflow
- Team and player data management
- Weight tracking (Days 0-10)
- Personal and team image generation
- Image preview and download
- Admin dashboard

#### Out of Scope
- Multi-language support
- Alternative authentication methods
- Local image generation
- Real-time collaboration
- Offline mode
- API for third-party integrations (future)

---

## Architecture Overview

### System Architecture

```
Client (React)
  ↓
Next.js 16 API Routes
  ├── /api/render → Render API (image generation)
  ├── /api/avatar → Avatar conversion (SSRF safe)
  └── /api/download → Image download (SSRF safe)
  ↓
Supabase
  ├── Auth (Google OAuth)
  ├── PostgreSQL (Data)
  ├── Storage (Avatars)
  └── RLS (Security)
  ↓
External Services
  └── Render API (Image rendering)
```

### Data Model

```
User (via Supabase Auth)
  ├── User Approvals (status: pending/approved/rejected)
  │
  └── Marathon Datasets (teams)
      └── Marathon Players (weight data: day0-day10)
```

### Key Algorithms

#### buildPlayerStats()
Finds first and latest day with data, calculates overall progress:
```
startWeight ← first day (0 to selectedDay) with data
currentWeight ← latest day (selectedDay to 0) with data
deltaWeight ← currentWeight - startWeight
```

#### buildPlayerGrid()
Calculates daily changes from nearest previous day:
```
for each day 1-10:
  if day <= selectedDay:
    previousWeight ← nearest day (day-1 to 0) with data
    dailyDelta ← dayWeight - previousWeight
```

#### calculateTeamData()
Aggregates team statistics and ranks by daily loss:
```
for each player:
  startWeight ← first day (0 to dayNumber) with data
  latestWeight ← latest day (dayNumber to 0) with data
  yesterdayWeight ← nearest day (dayNumber-1 to 0) with data
  todayLoss ← yesterdayWeight - todayWeight
  roundLoss ← startWeight - latestWeight

sort players by todayLoss descending (most loss = rank 1)
```

---

## User Personas

### Primary Personas

#### Persona 1: Team Captain
- **Age:** 25-45
- **Goals:** Track team progress, motivate members, share results
- **Pain Points:** Manual image creation is tedious
- **Use Case:** Generate daily leaderboard to post on team chat

#### Persona 2: Admin/Organization Owner
- **Age:** 30-50
- **Goals:** Approve users, manage multiple teams
- **Pain Points:** Spam users, data quality control
- **Use Case:** Approve 10+ new user applications daily

#### Persona 3: Individual Participant
- **Age:** 20-50
- **Goals:** Track personal progress, share with friends
- **Pain Points:** Forgot weight on some days, wants to show progress
- **Use Case:** Generate personal progress image to share on social media

---

## Feature Specifications

### Feature 1: Dashboard (Main Page)

**Location:** `/dashboard`

**Components:**
- Dataset selector (dropdown)
- "New Dataset" form
- Player list with weight inputs (Day 0-10)
- Image type selector (personal/team)
- Day selector (0-10)
- "Generate Images" button
- Image preview modal

**Flow:**
1. User loads dashboard
2. See existing datasets or create new
3. Add/edit players and their weights
4. Select day, image type, players
5. Click "Generate"
6. Preview images
7. Download

**State Management:**
- `selectedDay`: -1 (not selected) to 10
- `selectedPlayers`: Set of player IDs
- `imageType`: 'personal' | 'team'
- `renderedImages`: Array of { player_name, image_url }

### Feature 2: Admin Dashboard

**Location:** `/admin`

**Components:**
- Pending approvals list
- Approve/reject buttons
- User info display

**Access:** Only `dqcong@gmail.com`

### Feature 3: Image Generation

**Personal Progress Image:**
- Player name, team, avatar
- Start weight, current weight, delta weight
- Day-by-day grid (Day 1-10) with daily deltas
- Template: 1080x1444 pixels

**Team Leaderboard Image:**
- Team name, round info, day number
- Player rankings (1st, 2nd, 3rd, etc.)
- Daily loss and round loss for each player
- Sorted by daily loss descending
- Template: 1080x1920 pixels

### Feature 4: Data Validation

**Player Weight Input:**
- Numeric only
- Optional (can skip days)
- Range: 0-999 kg (no validation on range)

**Dataset Fields:**
- `team_name`: Required, max 100 characters
- `round_name`: Optional, default "Marathon"
- `round_number`: Optional, numeric
- `time_range`: Optional, text (e.g., "15-21 Feb 2026")

---

## User Stories & Acceptance Criteria

### Story 1: New User Registration & Approval
```
AS A new user
I WANT TO sign up with Google
SO THAT I can access the Marathon tracker

ACCEPTANCE CRITERIA:
- Redirect to Google OAuth login
- New users shown "pending approval" message
- Admin can approve at /admin
- Approved users can access dashboard
```

### Story 2: Track Team Weight
```
AS A team captain
I WANT TO enter player weights for each day
SO THAT we can track our Marathon progress

ACCEPTANCE CRITERIA:
- Add up to 9+ players to dataset
- Enter/edit weight for days 0-10
- Data saves automatically on blur
- Can delete individual players
- Can clear all data (with confirmation)
```

### Story 3: Generate Personal Progress Image
```
AS A team member
I WANT TO generate a personal progress image
SO THAT I can share my achievements with friends

ACCEPTANCE CRITERIA:
- Select player
- Select current day (0-10)
- See personal stats (start, current, delta)
- See day-by-day grid
- Download image as file
```

### Story 4: Generate Team Leaderboard
```
AS A team captain
I WANT TO generate a team leaderboard image
SO THAT the team can see who lost the most weight today

ACCEPTANCE CRITERIA:
- Select multiple players
- Select current day (0-10)
- See rankings sorted by daily loss
- Captains excluded from ranking
- Download image as file
```

### Story 5: Day Selection
```
AS A user
I WANT TO specify which day I'm on (0-10)
SO THAT the images show correct data for that specific day

ACCEPTANCE CRITERIA:
- Day selection is required before generating
- Can select 0-10
- Shows "Ảnh sẽ chỉ hiển thị dữ liệu từ ngày X đến ngày Y"
- Alert if day not selected
```

---

## Technical Decisions

| Decision | Rationale | Alternative |
|----------|-----------|-------------|
| Next.js 16 | Modern framework, Cloudflare Workers support | Astro, SvelteKit |
| Supabase | All-in-one: Auth, DB, Storage, RLS | Firebase, custom backend |
| Cloudflare Workers | Fast, serverless, pay-per-request | Vercel, AWS Lambda |
| External Render API | Decouples image generation | Server-side image generation |
| React hooks | Simple state, no dependencies | Redux, Zustand |
| TailwindCSS | Utility-first, rapid development | Bootstrap, custom CSS |

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Render API outage | Users can't generate images | Medium | Fallback message, status page |
| Database performance | Slow queries | Low | RLS indexed on user_id, connection pooling |
| Cloudflare limits | Rate limiting | Low | Request batching, caching |
| User data loss | Users lose weight data | Low | Daily backups via Supabase |
| Security breach | Unauthorized access | Low | RLS, SSRF protection, HTTPS |

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| MVP Development | 4 weeks | Completed (2026-02-16) |
| Production Deployment | 1 week | Completed (2026-02-16) |
| Bug Fixes & Refinements | 2 weeks | In Progress (2026-03-02) |
| Future Enhancements | TBD | Planned |

---

## Release Notes

### Version 1.0 (Production)
- Initial launch 2026-02-16
- Core features: Auth, data management, image generation
- Admin approval workflow
- Support for Days 0-10 tracking

### Current Build (2026-03-02)
- Fixed weight calculation for missing days
- Improved daily delta calculation
- Leaderboard sorted by daily loss (not round total)
- Required day selection before image generation
- Always show delta_weight, hide current_weight until day 10

---

## Support & Documentation

- **User Guide:** Available in dashboard help text (Vietnamese)
- **Admin Guide:** In-app instructions at `/admin`
- **Technical Docs:** `./docs/` directory
- **Support Email:** Contact admin for issues
- **Bug Reports:** GitHub issues or email to maintainer

---

## Future Roadmap

### Phase 2 (Q2 2026)
- [ ] Multi-language support (English, Vietnamese)
- [ ] Advanced admin features (user analytics, data export)
- [ ] Batch operations (bulk weight import)
- [ ] Team analytics dashboard

### Phase 3 (Q3 2026)
- [ ] API for external integrations
- [ ] Custom image templates
- [ ] Real-time notifications
- [ ] Mobile app (native iOS/Android)

### Phase 4 (Q4 2026+)
- [ ] Offline mode with sync
- [ ] Advanced analytics
- [ ] Gamification features
- [ ] Third-party integrations (Slack, Zalo, etc.)

---

## Appendix

### Database Schema

```sql
-- User Approvals
CREATE TABLE user_approvals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status ENUM('pending', 'approved', 'rejected'),
  created_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by TEXT
);

-- Datasets (Teams)
CREATE TABLE marathon_datasets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  team_name TEXT NOT NULL,
  round_name TEXT,
  round_number INT,
  time_range TEXT,
  created_at TIMESTAMP
);

-- Players
CREATE TABLE marathon_players (
  id UUID PRIMARY KEY,
  dataset_id UUID REFERENCES marathon_datasets(id) ON DELETE CASCADE,
  player_name TEXT,
  avatar_url TEXT,
  role ENUM('captain', 'member'),
  day0 NUMERIC,
  day1 NUMERIC,
  ... day10 NUMERIC,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### API Response Examples

**Image Generation Response:**
```json
{
  "image_url": "https://render.nexme.vn/images/abc123.png"
}
```

**Player Data Format:**
```json
{
  "id": "uuid",
  "dataset_id": "uuid",
  "player_name": "Nguyễn Văn A",
  "avatar_url": "https://example.com/avatar.jpg",
  "role": "member",
  "day0": 70.5,
  "day1": 70.2,
  "day2": null,
  "day3": 69.8,
  ...
}
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Render API
RENDER_API_URL=https://render.nexme.vn/render
RENDER_API_KEY=secret_key_xxx
```

---

**Document Version:** 1.0
**Last Updated:** 2026-03-02 by Documentation Team
**Next Review:** 2026-04-02
