# Vercel Deployment Guide - Environment Variables Setup

## What Changed

Your Supabase credentials are now using environment variables instead of being hardcoded. This is:
- ✅ **Secure** - credentials aren't exposed in git
- ✅ **Flexible** - different credentials per environment (local, staging, production)
- ✅ **Required** for Vercel deployment

## Files Created/Modified

1. **`.env.local`** - Local development environment (git ignored)
   - Contains your Supabase credentials for local development

2. **`.env.example`** - Template for other developers
   - Shows what variables are needed

3. **`src/supabaseclient.js`** - Updated to read from environment variables
   - Uses `import.meta.env.VITE_SUPABASE_URL`
   - Uses `import.meta.env.VITE_SUPABASE_ANON_KEY`

## Steps to Deploy on Vercel

### Step 1: Install Vercel CLI (Optional but Recommended)
```bash
npm install -g vercel
```

### Step 2: Push Code to GitHub/GitLab
```bash
git add .
git commit -m "Add environment variables for Supabase"
git push origin main
```

### Step 3: Connect to Vercel

**Option A: Via Vercel Dashboard (Easiest)**
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Select the project
5. **IMPORTANT: Configure Environment Variables** (see Step 4)

**Option B: Via Vercel CLI**
```bash
vercel
```
Follow the prompts to connect your project.

### Step 4: Set Environment Variables in Vercel

In the Vercel Dashboard:
1. Go to your project settings
2. Navigate to **Settings → Environment Variables**
3. Add these two variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://ixlzcxymfqexedzocnvm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bHpjeHltZnFleGVkem9jbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDk2MTksImV4cCI6MjA4NDMyNTYxOX0.jYIsXbzjxYSj1qPYCOi9bEMZLjyWKnBqJezsLu4gUYk` |

4. Make sure variables are visible in:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. Click "Save"

### Step 5: Redeploy
After setting environment variables:
1. Go to **Deployments**
2. Click on the latest deployment
3. Click "Redeploy" → "Redeploy Now"

Or push a new commit:
```bash
git commit --allow-empty -m "Trigger Vercel rebuild"
git push origin main
```

## Local Development

Your local setup is already configured:
- ✅ `.env.local` file contains credentials
- ✅ `npm run dev` will automatically load these variables
- ✅ No additional setup needed

## Security Notes

⚠️ **IMPORTANT**: 
- `.env.local` is in `.gitignore` and will NOT be committed
- Never commit `.env.local` to version control
- The credentials shown here are "anonymous" keys (lower security)
- Consider rotating them if exposed

## Troubleshooting

**Error: "Missing Supabase environment variables"**
→ Check that environment variables are set in Vercel dashboard

**Error: "Could not resolve './pages/LandingPage'"**
→ This is usually a build cache issue. Click "Redeploy" in Vercel dashboard

**Vercel build still fails**
→ Check the build logs in Vercel dashboard for specific errors

## Testing Vercel Deployment Locally

To test the production build locally:
```bash
npm run build
npm run preview
```

This will build the app and serve it locally, simulating the Vercel environment.
