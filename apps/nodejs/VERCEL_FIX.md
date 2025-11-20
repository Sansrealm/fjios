# Vercel Deployment Fix for "@remix-run/dev" Error

## Problem
Vercel was trying to auto-detect the project as a Remix app and looking for `@remix-run/dev` dependency, which doesn't exist in this Node.js/Express project.

## Solution Applied

### 1. Created `vercel.json`
- Set `"framework": null` to disable auto-detection
- Explicitly configured `@vercel/node` builder
- Set up proper routing to the serverless function

### 2. Created `api/index.js`
- Standard Vercel serverless function entry point
- Imports and exports the Express app
- Ensures Vercel treats this as a Node.js function

### 3. Updated `server.js`
- Exports Express app for Vercel
- Only calls `app.listen()` when not on Vercel
- Checks for `VERCEL` environment variable

## Verification Checklist

✅ `vercel.json` exists with `"framework": null`
✅ `api/index.js` exists and exports the app
✅ `package.json` has no Remix dependencies
✅ Build command won't fail deployment
✅ Server exports app correctly for Vercel

## Deployment Steps

1. **Set Root Directory in Vercel:**
   - Go to Project Settings → General
   - Set Root Directory to: `apps/nodejs`

2. **Set Framework Preset:**
   - In Build & Development Settings
   - Framework Preset: **Other** (or leave empty)
   - Do NOT select Remix or React Router

3. **Add Environment Variables:**
   - All required env vars in Vercel dashboard

4. **Deploy:**
   ```bash
   cd apps/nodejs
   vercel --prod
   ```

## Expected Result

- ✅ No "@remix-run/dev" error
- ✅ Build completes successfully
- ✅ Serverless function deploys correctly
- ✅ All API routes work at `/api/*`

## If Error Persists

1. Delete `.vercel` folder if it exists
2. Clear Vercel build cache
3. Verify Root Directory is set to `apps/nodejs`
4. Check that Framework Preset is set to "Other"
5. Redeploy

