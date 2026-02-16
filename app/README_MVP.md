# Marathon Weight Tracking MVP

A Next.js 15 application for tracking marathon team weight data and generating custom images.

## Setup Instructions

### 1. Environment Variables

Update `.env.local` with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vkhqqybnvnoagxqglnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
RENDER_API_URL=https://render.nexme.vn/render
RENDER_API_KEY=goPT@marathon10000TV
```

### 2. Supabase Database Setup

Run the SQL script in `src/db/schema.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `src/db/schema.sql`
3. Execute the SQL to create tables and RLS policies

### 3. Supabase Storage Setup

Create the storage bucket for avatars:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `marathon-avatars`
3. Make it **public**
4. Run the storage policies from `src/db/schema.sql` (uncomment the storage policy section)

### 4. Google OAuth Setup

Configure Google OAuth in Supabase:

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials
4. Add authorized redirect URLs:
   - Development: `http://localhost:3000/dashboard`
   - Production: `https://yourdomain.com/dashboard`

### 5. Install & Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Features

### Authentication
- Google OAuth login
- Session management
- Auto-redirect to dashboard when logged in

### Team Management
- Set team name, round name, round number, time range
- Auto-save on blur

### Player Management
- Add/remove players
- Set player name and role (player/captain)
- Upload avatar images to Supabase Storage
- Enter weight data for Days 0-10
- Select players for image generation

### Image Generation

**Personal Images:**
- Select individual players using checkboxes
- Generate custom progress images for each selected player
- Uses template: `personal_progress.hbs`
- Dimensions: 1080x1444

**Team Leaderboard:**
- Generates team ranking image with all players
- Shows daily weight loss and round totals
- Uses template: `daily_leaderboard.hbs`
- Dimensions: 1080x1920

### Data Management
- Auto-save all changes to Supabase
- Clear all data with confirmation
- Data is user-isolated (RLS policies)

## File Structure

```
src/
  types/index.ts                 - TypeScript interfaces
  lib/supabase.ts                - Supabase client & DB functions
  app/
    globals.css                  - TailwindCSS styles
    layout.tsx                   - Root layout
    page.tsx                     - Login page
    dashboard/page.tsx           - Main dashboard
    api/render/route.ts          - Render API proxy
  components/
    PlayerRow.tsx                - Player input row
    ImagePreview.tsx             - Image preview modal
  db/
    schema.sql                   - Database schema & policies
```

## API Integration

The app uses an external render API at `https://render.nexme.vn/render` to generate images. The API key is securely stored server-side and proxied through `/api/render`.

## Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Supabase** - Authentication, database, storage
- **External Render API** - Image generation

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- API keys are server-side only
- OAuth authentication via Supabase
- Public avatar storage with authenticated uploads

## Usage Flow

1. User logs in with Google
2. User enters team information
3. User adds players and fills in weight data
4. User uploads player avatars (optional)
5. User selects image type (personal or team)
6. For personal: select players to generate images for
7. Click "TẠO ẢNH" to generate
8. Preview and download generated images

## Notes

- All data auto-saves on input blur
- Mobile-friendly responsive design
- Vietnamese UI labels
- Green color scheme for marathon theme
- Download works on mobile browsers
