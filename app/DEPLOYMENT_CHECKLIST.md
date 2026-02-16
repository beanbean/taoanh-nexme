# Deployment Checklist

## Before Deployment

### 1. Supabase Setup (REQUIRED)
- [ ] Run `src/db/schema.sql` in Supabase SQL Editor
- [ ] Create storage bucket `marathon-avatars` (make it public)
- [ ] Enable Google OAuth provider in Supabase Authentication settings
- [ ] Add OAuth redirect URLs for your domain
- [ ] Copy your actual `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase settings

### 2. Environment Variables
Update `.env.local` (and your hosting platform's env vars):

```env
NEXT_PUBLIC_SUPABASE_URL=https://vkhqqybnvnoagxqglnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (your actual key)
RENDER_API_URL=https://render.nexme.vn/render
RENDER_API_KEY=goPT@marathon10000TV
```

### 3. Google OAuth Configuration
- [ ] Create Google OAuth credentials (https://console.cloud.google.com/)
- [ ] Add authorized JavaScript origins:
  - `http://localhost:3000` (development)
  - `https://yourdomain.com` (production)
- [ ] Add authorized redirect URIs:
  - `https://vkhqqybnvnoagxqglnkn.supabase.co/auth/v1/callback`
- [ ] Add credentials to Supabase Dashboard → Authentication → Providers → Google

### 4. Test Locally
```bash
npm install
npm run dev
```

- [ ] Test Google login
- [ ] Test adding team info
- [ ] Test adding players
- [ ] Test uploading avatar
- [ ] Test entering weight data
- [ ] Test generating personal image
- [ ] Test generating team image
- [ ] Test downloading images
- [ ] Test delete data functionality
- [ ] Test logout

### 5. Build Test
```bash
npm run build
npm start
```
- [ ] Verify no build errors
- [ ] Test production build locally

## Deployment

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard.

### Option 2: Other platforms
Ensure Node.js 18+ and set all environment variables.

## Post-Deployment

- [ ] Test login on production URL
- [ ] Test image generation on production
- [ ] Test mobile responsiveness
- [ ] Verify avatar uploads work
- [ ] Test download functionality on mobile

## Troubleshooting

### Login Issues
- Check Google OAuth redirect URIs match your domain
- Verify Supabase URL and anon key are correct
- Check browser console for errors

### Avatar Upload Issues
- Ensure `marathon-avatars` bucket exists and is public
- Check storage policies in Supabase
- Verify user is authenticated

### Image Generation Issues
- Check RENDER_API_URL and RENDER_API_KEY are set
- Verify external API is accessible
- Check browser console and server logs

### Data Not Saving
- Verify RLS policies are created
- Check user authentication status
- Review Supabase logs for errors

## Database Schema Verification

Run this query in Supabase to verify tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('marathon_datasets', 'marathon_players');
```

Should return both table names.

## Storage Verification

Check storage bucket exists:
1. Go to Supabase → Storage
2. Verify `marathon-avatars` bucket exists
3. Check it's marked as public
