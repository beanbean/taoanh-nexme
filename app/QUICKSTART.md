# Quick Start Guide

## 1. Update Environment Variables

Edit `.env.local` and add your actual Supabase anon key:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

Find it at: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

## 2. Setup Supabase Database

### Copy & Run SQL
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire content of `src/db/schema.sql`
3. Paste and click "Run"
4. Wait for success message

### Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `marathon-avatars`
4. Check "Public bucket"
5. Click "Create bucket"

## 3. Setup Google OAuth

### Get Google Credentials
1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Add Authorized redirect URIs:
   ```
   https://vkhqqybnvnoagxqglnkn.supabase.co/auth/v1/callback
   ```
7. Copy Client ID and Client Secret

### Configure Supabase
1. Go to Supabase Dashboard → Authentication → Providers
2. Find "Google" and enable it
3. Paste your Client ID and Client Secret
4. Save

## 4. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 5. Test the App

1. Click "Đăng nhập bằng Google"
2. Authorize with your Google account
3. You'll be redirected to the dashboard
4. Fill in team info:
   - Tên đội: "Đội Hổ Con"
   - Tên vòng: "Marathon"
   - Số vòng: 7
   - Thời gian: "1/2-10/2/26"
5. Click "Thêm người chơi"
6. Fill in player info and weights
7. Upload an avatar (optional)
8. Select "Ảnh cá nhân" and check a player
9. Click "TẠO ẢNH"
10. Preview and download the image

## Troubleshooting

### "Error signing in"
- Make sure Google OAuth is configured correctly
- Check that redirect URI matches exactly
- Verify Supabase URL is correct

### "Error uploading avatar"
- Ensure `marathon-avatars` bucket exists
- Check bucket is set to public
- Verify you're logged in

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Ready to Deploy?

See `DEPLOYMENT_CHECKLIST.md` for deployment steps.

## Need Help?

Check these files:
- `README_MVP.md` - Complete documentation
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `BUILD_SUMMARY.md` - Technical overview
