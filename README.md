# Komet (V1) — Next.js + Vercel + Supabase + Meta Official API

## 1. Supabase Setup
1. Create a free project on [Supabase](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Copy **Project URL** (`SUPABASE_URL`) and **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`).

## 2. GitHub & Vercel Deploy
1. Push this folder to a GitHub repository.
2. Import the repo in [Vercel](https://vercel.com) and add these Environment Variables (from `.env.example`):
   - `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`
   - `INSTAGRAM_APP_ID`
   - `INSTAGRAM_APP_SECRET`
   - `META_WEBHOOK_VERIFY_TOKEN` (any random string you choose)
   - `APP_SESSION_SECRET` (any 32+ char random string)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click **Deploy**.

## 3. Meta Developer Dashboard URLs
In **Meta for Developers → Your App → Instagram → API setup with Instagram login**:
- **OAuth Redirect URI:** `https://your-app.vercel.app/api/auth/instagram/callback`
- **Webhook Callback URL:** `https://your-app.vercel.app/api/webhook`
- **Verify Token:** Same value as `META_WEBHOOK_VERIFY_TOKEN`
- **Webhook Field to Subscribe:** `comments`
- **Privacy Policy URL:** `https://your-app.vercel.app/privacy`
- **Data Deletion Callback URL:** `https://your-app.vercel.app/api/data-deletion`
- **Data Deletion Instructions URL:** `https://your-app.vercel.app/data-deletion`
