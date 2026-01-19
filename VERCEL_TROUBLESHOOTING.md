# Vercel Build Troubleshooting Guide

## What I've Added to Fix Common Issues:

1. **`.vercelignore`** - Tells Vercel what files to ignore
2. **`vercel.json`** - Configuration for Vercel build settings
3. **Environment variable validation** in `supabaseClient.js`

## If Build Still Fails:

### Step 1: Check the FULL error message
In Vercel Dashboard:
1. Go to **Deployments** → Latest deployment
2. Click **View Deployment** → **Build** tab
3. Scroll down to find the full error message
4. **Share the complete error message** with me

### Step 2: Common Issues & Fixes

#### Issue: "Missing Supabase environment variables"
**Solution:**
- Go to Vercel Dashboard
- Settings → Environment Variables
- Add both variables:
  - `VITE_SUPABASE_URL` = `https://ixlzcxymfqexedzocnvm.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Make sure "Production" is checked**
- Click Save

#### Issue: "Could not resolve './pages/LandingPage'"
**Solution:**
This should be fixed now. If still fails:
1. Clear build cache in Vercel
2. Click "Redeploy" → "Redeploy now"

#### Issue: "ENOENT: no such file or directory"
**Solution:**
- Means a file is missing in the repository
- Make sure all files are committed: `git status`
- Push to GitHub: `git push origin main`

### Step 3: Manually Test Build Locally

To simulate Vercel's build environment exactly:

```bash
# Clear build cache
rm -rf dist

# Install dependencies fresh
npm ci

# Build (same as Vercel)
npm run build

# Preview
npm run preview
```

If this works locally, the issue is with Vercel configuration.

### Step 4: Manual Vercel Redeploy

1. Go to Vercel Dashboard
2. Click your project
3. Go to **Deployments**
4. Find the failed deployment
5. Click the **3 dots menu** → **Redeploy**
6. Click **Redeploy without new build** (uses previous cache)
7. If that fails, click **Redeploy** → **Redeploy now** (fresh build)

### Step 5: Check Vercel Build Logs in Detail

```bash
# Install Vercel CLI
npm install -g vercel

# View logs of last build
vercel logs --tail
```

## Files to Check

Make sure these files exist in your repo:
- ✅ `src/pages/LandingPage.jsx`
- ✅ `src/pages/GameScreen.jsx`
- ✅ `src/pages/AdminPanel.jsx`
- ✅ `src/hooks/useGameState.js`
- ✅ `src/supabaseClient.js`
- ✅ `package.json`
- ✅ `vite.config.js`

## Quick Checklist Before Redeploy:

- [ ] Environment variables set in Vercel (both Production + Preview)
- [ ] All files committed to GitHub: `git status` shows nothing
- [ ] Latest commit pushed: `git push origin main`
- [ ] All imports use correct case sensitivity
- [ ] No files have red squiggly lines locally

## Need More Help?

When you reply, please include:
1. **Full error message from Vercel build log**
2. **Screenshot of Vercel Environment Variables page**
3. **Output of `git status`**
4. **Output of `npm run build` locally**

---

**Note:** I've added configuration files to help. Now I'm waiting for the actual error message to help you further!
