# Documentation - taoanh.nexme.vn

Welcome to the taoanh.nexme.vn documentation. This directory contains comprehensive guides for understanding and working with the Marathon image generator application.

## Quick Navigation

### Overview Documents
- **[project-overview-pdr.md](./project-overview-pdr.md)** - Complete project overview and Product Development Requirements
  - Executive summary, product vision, user personas
  - Functional and non-functional requirements
  - Feature specifications and user stories
  - Technical decisions and roadmap

### Technical Documentation
- **[system-architecture.md](./system-architecture.md)** - System design and component architecture
  - Architecture overview and layers
  - Data flow diagrams
  - Weight calculation algorithms
  - Security considerations
  - Performance characteristics

- **[codebase-summary.md](./codebase-summary.md)** - Codebase structure and technical overview
  - Directory structure and file organization
  - Technology stack details
  - Key files and their purposes
  - Core patterns and conventions
  - Build and deployment information

- **[code-standards.md](./code-standards.md)** - Development standards and guidelines
  - Code structure and organization
  - TypeScript and React standards
  - Styling guidelines (TailwindCSS)
  - Supabase integration patterns
  - Database standards and security
  - Error handling and logging

### Project Management
- **[project-changelog.md](./project-changelog.md)** - Historical record of changes and releases
  - Detailed changelog of all updates
  - Version history
  - Known issues and roadmap
  - Breaking changes and migrations

---

## Document Purposes

### For New Developers
Start with:
1. [project-overview-pdr.md](./project-overview-pdr.md) - Understand what the project does
2. [codebase-summary.md](./codebase-summary.md) - Understand the codebase structure
3. [code-standards.md](./code-standards.md) - Learn development standards

### For Architects
Focus on:
1. [system-architecture.md](./system-architecture.md) - System design and data flow
2. [project-overview-pdr.md](./project-overview-pdr.md) - Requirements and constraints
3. [codebase-summary.md](./codebase-summary.md) - Implementation details

### For Project Managers
Reference:
1. [project-overview-pdr.md](./project-overview-pdr.md) - Product requirements and roadmap
2. [project-changelog.md](./project-changelog.md) - Release history and status

### For QA/Testing
Consult:
1. [project-overview-pdr.md](./project-overview-pdr.md) - Acceptance criteria and requirements
2. [project-changelog.md](./project-changelog.md) - Recent changes to test
3. [code-standards.md](./code-standards.md) - Code review checklist

---

## Key Concepts

### Weight Calculation (Recent Update - 2026-03-02)

The system now handles missing weight data gracefully:

**Start Weight:** First day with data (not always day 0)
**Current Weight:** Latest day with data up to selected day
**Daily Delta:** Change from nearest previous day with data (not strictly day[N-1])

Example: If player entered data on Day 1, Day 3, Day 4:
- Day 1 = 70 kg (start)
- Day 3 = 68 kg (delta from day 1 = -2 kg)
- Day 4 = 67 kg (delta from day 3 = -1 kg)

### Day Selection

- Required before generating images
- Range: 0-10 (representing days of marathon)
- Images only show data up to selected day
- `is_finished` flag set when `selectedDay === 10`

### User Approval Workflow

1. New user logs in with Google
2. System creates pending approval record
3. Admin (`dqcong@gmail.com`) reviews at `/admin`
4. Admin approves or rejects
5. Approved user can access dashboard

---

## Important Files & Locations

### Application Code
- **Main Dashboard:** `app/src/app/dashboard/page.tsx` (1167 lines)
  - Core business logic
  - Weight calculation functions
  - Image generation orchestration

- **Components:** `app/src/components/`
  - `PlayerRow.tsx` - Player input component
  - `ImagePreview.tsx` - Image preview modal

- **Backend Services:** `app/src/lib/`
  - `supabase.ts` - Database client and auth
  - `security.ts` - SSRF protection utilities

- **API Routes:** `app/src/app/api/`
  - `render/` - Image generation proxy
  - `avatar/` - Avatar conversion
  - `download/` - Image download

- **Database:** `app/src/db/`
  - `schema.sql` - Table definitions
  - `setup-all.sql` - RLS policies

- **Types:** `app/src/types/index.ts`
  - All TypeScript interfaces

### Configuration
- **Next.js:** `app/next.config.ts`
- **Cloudflare:** `app/wrangler.jsonc`
- **TypeScript:** `app/tsconfig.json`
- **Styling:** `app/src/app/globals.css`

### Deployment
- **CI/CD:** `.github/workflows/deploy.yml`
- **Git:** `.git/` directory

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + TailwindCSS 4 |
| **Framework** | Next.js 16 (App Router) |
| **Runtime** | Cloudflare Workers (via @opennextjs/cloudflare) |
| **Authentication** | Supabase Auth (Google OAuth) |
| **Database** | Supabase PostgreSQL (with RLS) |
| **Storage** | Supabase Storage |
| **Image Generation** | External Render API (render.nexme.vn) |
| **Deployment** | Cloudflare Workers + GitHub Actions |

---

## Common Tasks

### Running Locally
```bash
cd app
npm install
npm run dev          # Start dev server on port 3000
```

### Building for Production
```bash
cd app
npm run build        # Build Next.js app
npm run preview      # Preview Cloudflare build locally
npm run deploy       # Deploy to Cloudflare Workers
```

### Code Quality
```bash
cd app
npm run lint         # Run ESLint
```

### Database Migrations
Updates are applied via Supabase dashboard or SQL scripts in `app/src/db/`

---

## FAQ

### Q: How is weight data stored?
**A:** Each player has 11 weight fields (day0 through day10) in the `marathon_players` table. Any day can be null if weight wasn't entered.

### Q: How does the leaderboard sort players?
**A:** By daily weight loss (`todayLoss`) in descending order. This is calculated from the nearest previous day with data to the selected day.

### Q: What happens if a player skips a day?
**A:** The system automatically finds the nearest previous day with data for delta calculation. This handles missing middle days gracefully.

### Q: Can users have multiple teams?
**A:** Yes, each user can create multiple datasets (teams) via the dataset selector on the dashboard.

### Q: Is there multi-language support?
**A:** Currently Vietnamese only. Multi-language support is on the roadmap for Phase 2.

### Q: How is security handled?
**A:**
- Google OAuth for authentication
- RLS on all database tables (users only access their data)
- SSRF protection for all external API calls
- API keys stored server-side, never exposed to client

---

## Documentation Maintenance

These documents are maintained alongside code changes. When updating code, please also update relevant documentation:

- Feature changes → Update [project-changelog.md](./project-changelog.md)
- Architecture changes → Update [system-architecture.md](./system-architecture.md)
- New code patterns → Update [code-standards.md](./code-standards.md)
- Requirement changes → Update [project-overview-pdr.md](./project-overview-pdr.md)

---

## Support

For questions about:
- **Product requirements** - See [project-overview-pdr.md](./project-overview-pdr.md)
- **Technical implementation** - See [system-architecture.md](./system-architecture.md)
- **Code standards** - See [code-standards.md](./code-standards.md)
- **Recent changes** - See [project-changelog.md](./project-changelog.md)
- **Specific files** - See [codebase-summary.md](./codebase-summary.md)

For issues or questions not covered, please contact the development team or create a GitHub issue.

---

**Last Updated:** 2026-03-02
**Documentation Version:** 1.0
