# Code Standards - taoanh.nexme.vn

**Last Updated:** 2026-03-02
**Framework:** Next.js 16 + React 19 + TypeScript
**Style Guide:** TailwindCSS 4

## Code Structure

### Directory Organization

```
app/src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── callback/
│   │   └── layout.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── api/
│   │   ├── render/
│   │   ├── avatar/
│   │   └── download/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── PlayerRow.tsx
│   └── ImagePreview.tsx
├── lib/
│   ├── supabase.ts
│   └── security.ts
├── types/
│   └── index.ts
└── db/
    ├── schema.sql
    └── setup-all.sql
```

### File Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| React Components | PascalCase | `PlayerRow.tsx`, `ImagePreview.tsx` |
| Pages | lowercase | `page.tsx`, `layout.tsx` |
| Utility files | kebab-case or camelCase | `supabase.ts`, `security.ts` |
| CSS classes | kebab-case | `.player-row`, `.image-preview` |
| Database tables | snake_case | `marathon_datasets`, `marathon_players` |
| Database columns | snake_case | `team_name`, `player_name`, `day0` |

## TypeScript Standards

### Type Definitions

**Location:** `src/types/index.ts`

```typescript
// User & Auth Types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Data Model Types
export interface MarathonDataset {
  id?: string;
  user_id?: string;
  team_name: string;
  round_name: string;
  round_number: number | null;
  time_range: string;
  created_at?: string;
}

export interface Player {
  id?: string;
  dataset_id?: string;
  player_name: string;
  avatar_url?: string;
  role?: 'captain' | 'member';
  day0?: number | null;
  day1?: number | null;
  // ... day2 through day10
  created_at?: string;
  updated_at?: string;
}

// API Request/Response Types
export interface RenderRequest {
  template: 'personal_progress.hbs' | 'daily_leaderboard.hbs';
  filename_prefix: string;
  width: number;
  height: number;
  data: PersonalProgressData | TeamRenderData;
}

export interface RenderResponse {
  image_url: string;
}
```

### Type Usage Rules

1. **Always declare types explicitly** for function parameters and return values:
   ```typescript
   function buildPlayerStats(player: Player): {
     start_weight: number | null;
     current_weight: number | null;
     delta_weight: number | null;
   }
   ```

2. **Use union types** for limited options:
   ```typescript
   const imageType: 'personal' | 'team' = 'personal';
   ```

3. **Mark nullable values clearly**:
   ```typescript
   const weight: number | null = player.day0;
   ```

4. **Import types from `@/types`**:
   ```typescript
   import type { Player, MarathonDataset } from '@/types';
   ```

## React Component Standards

### Component Structure

**All components are client components** (`'use client'`):

```typescript
'use client';

import { useCallback, useState } from 'react';
import type { Player } from '@/types';

interface PlayerRowProps {
  player: Player;
  onPlayerChange: (player: Player) => void;
}

export default function PlayerRow({ player, onPlayerChange }: PlayerRowProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback((field: keyof Player, value: any) => {
    const updated = { ...player, [field]: value };
    onPlayerChange(updated);
  }, [player, onPlayerChange]);

  return (
    <div className="player-row">
      {/* Component content */}
    </div>
  );
}
```

### State Management Rules

1. **Use `useState` for local component state**
2. **Use `useCallback` for memoized event handlers** (avoid recreating functions on render)
3. **No external state management** (Redux, Zustand, etc.)
4. **Props are the primary data flow mechanism**

### Component Props

1. **Define props interface explicitly**:
   ```typescript
   interface ComponentProps {
     data: string;
     onDataChange: (value: string) => void;
   }
   ```

2. **Destructure props in function signature**
3. **Use `type React.FC<Props>` sparingly** (prefer explicit return type)

## Next.js Patterns

### API Routes

**Location:** `app/src/app/api/`

```typescript
// app/src/app/api/render/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { RenderRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequest = await request.json();

    // Validate input
    if (!body.template) {
      return NextResponse.json(
        { error: 'Missing template' },
        { status: 400 }
      );
    }

    // Call external API (env var is safe here)
    const response = await fetch(process.env.RENDER_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Rules:**
- Always validate request input
- Return appropriate HTTP status codes
- Never leak sensitive information in error messages
- Handle errors with try-catch

### Server Actions

**Not used in this project** (no `'use server'` actions). All server logic is in API routes.

## Styling Standards

### TailwindCSS + Custom CSS Variables

**Design tokens defined in:** `app/src/app/globals.css`

```css
:root {
  --color-brand-50: #fff7f0;
  --color-brand-100: #ffe8d8;
  --color-brand-200: #ffceb0;
  --color-brand-300: #ff9f70;
  --color-brand-400: #ff6b35;
  --color-brand-500: #ff4500;
  /* etc. */

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  /* etc. */
}
```

### Class Naming

1. **Use Tailwind utility classes primarily**:
   ```tsx
   <div className="flex flex-col gap-4 p-6 rounded-lg bg-white shadow">
   ```

2. **Create utility classes for reusable patterns**:
   ```css
   @layer components {
     .button-primary {
       @apply px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition;
     }

     .spinner-dark {
       @apply border-brand-500 border-t-transparent;
     }
   }
   ```

3. **Avoid arbitrary values** (use design tokens instead):
   ```tsx
   /* Good */
   <div className="bg-brand-500 text-white">

   /* Avoid */
   <div className="bg-[#ff4500] text-white">
   ```

### Responsive Design

- **Mobile-first approach**
- **Tailwind breakpoints:** `sm`, `md`, `lg`, `xl`, `2xl`
- **Example:**
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  ```

## Supabase Integration Standards

### Client Setup

**Location:** `app/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default supabase;
```

### Data Operations

1. **Always include type hints**:
   ```typescript
   const { data, error } = await supabase
     .from('marathon_players')
     .select('*')
     .eq('dataset_id', datasetId)
     .returns<Player[]>();
   ```

2. **Handle RLS checks**:
   ```typescript
   // RLS automatically filters to auth.uid() = user_id
   const { data: players } = await supabase
     .from('marathon_players')
     .select('*')
     .eq('dataset_id', datasetId);
   // Guaranteed to be user's own data
   ```

3. **Error handling**:
   ```typescript
   const { data, error } = await supabase.from('table').select('*');
   if (error) {
     console.error('Supabase error:', error);
     alert('Lỗi tải dữ liệu');
     return;
   }
   ```

## Database Standards

### SQL Schema

**Location:** `app/src/db/schema.sql`

```sql
-- Use snake_case for tables and columns
CREATE TABLE marathon_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  round_name TEXT DEFAULT 'Marathon',
  round_number INT,
  time_range TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments for clarity
COMMENT ON TABLE marathon_datasets IS 'User datasets (teams) for marathon tracking';
COMMENT ON COLUMN marathon_datasets.team_name IS 'Team name, required';
```

### RLS Policies

```sql
-- Create comprehensive RLS policies
CREATE POLICY "Users can access their own datasets"
  ON marathon_datasets
  FOR ALL
  USING (auth.uid() = user_id);

-- Ensure all tables have RLS enabled
ALTER TABLE marathon_datasets ENABLE ROW LEVEL SECURITY;
```

## Error Handling

### Client-Side Errors

```typescript
try {
  const response = await fetch('/api/render', { method: 'POST' });
  if (!response.ok) {
    alert('Lỗi tạo ảnh');
    return;
  }
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  alert('Lỗi không mong muốn');
}
```

### API Route Errors

```typescript
export async function POST(request: NextRequest) {
  try {
    // Do something
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Logging Standards

- **Console logging** for debugging (will appear in browser DevTools)
- **Use `console.log` with context prefix**:
  ```typescript
  console.log('[Dashboard] Processing player:', player.player_name);
  console.log('[API] Rendering template:', template);
  ```
- **No external logging service** (keep it simple)
- **Remove debug logs before commit** (or keep them if they're useful)

## Security Standards

### Input Validation

1. **Validate all API inputs**:
   ```typescript
   if (!body.template || typeof body.template !== 'string') {
     return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
   }
   ```

2. **Sanitize URLs** using `security.ts`:
   ```typescript
   import { normalizeAvatarUrl } from '@/lib/security';
   const safeUrl = normalizeAvatarUrl(userProvidedUrl);
   ```

### API Key Protection

- All API keys stored in `.env.local` (never committed)
- `RENDER_API_KEY` never exposed to client
- Only used server-side in `/api/*` routes

### SSRF Protection

- All external URLs validated in `security.ts`
- Avatar URLs converted to data URLs (prevent external requests)
- URL scheme must be `https`

## Testing Standards

**Not implemented yet.** Future work:

- Unit tests for utility functions (Jest)
- Component tests (React Testing Library)
- E2E tests (Playwright)
- Test coverage target: 70%+

## Deployment Checklist

Before deploying to production:

1. **Run linting:**
   ```bash
   npm run lint
   ```

2. **Verify environment variables** are set in Cloudflare/GitHub
3. **Test image generation** workflow end-to-end
4. **Check database migrations** are applied
5. **Verify RLS policies** are in place
6. **Test user approval workflow**

## Common Patterns

### Weight Calculation

**Pattern:** Find first/latest day with data, not assuming day0 or day10 exist.

```typescript
// Find first day with weight (0 to selectedDay)
let startWeight: number | null = null;
for (let i = 0; i <= selectedDay; i++) {
  const w = player[`day${i}` as keyof Player];
  if (w !== null && w !== undefined) {
    startWeight = w;
    break;
  }
}

// Find latest day with weight (selectedDay to 0)
let currentWeight: number | null = null;
for (let i = selectedDay; i >= 0; i--) {
  const w = player[`day${i}` as keyof Player];
  if (w !== null && w !== undefined) {
    currentWeight = w;
    break;
  }
}
```

### Auto-save on Blur

```typescript
const handleBlur = useCallback(async () => {
  setSaving(true);
  try {
    await upsertPlayer(supabase, player);
    // Refetch or update state
  } finally {
    setSaving(false);
  }
}, [player]);

return (
  <input
    onBlur={handleBlur}
    // ...
  />
);
```

## Code Review Checklist

- [ ] TypeScript types are explicit
- [ ] All React components are functional with hooks
- [ ] Props are typed with interfaces
- [ ] Error handling is present
- [ ] API security standards followed
- [ ] RLS is verified for database operations
- [ ] No hardcoded secrets
- [ ] Tailwind classes used consistently
- [ ] Comments added for complex logic
- [ ] No console errors in production build

## Future Improvements

1. Add comprehensive test suite
2. Implement error boundary components
3. Add analytics for feature usage
4. Create reusable form component library
5. Consider i18n for multi-language support
6. Add storybook for component documentation
