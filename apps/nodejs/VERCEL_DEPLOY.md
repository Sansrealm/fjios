# Vercel Deployment Guide

This guide explains how to deploy the Node.js backend to Vercel.

## Configuration

The project includes a `vercel.json` file that configures Vercel to:
- Deploy as a Node.js serverless function (not Remix)
- Route all requests to `server.js`
- Use Node.js 20.x runtime

## Deployment Steps

### 1. Set Root Directory

In Vercel dashboard:
1. Go to your project settings
2. Under "General" → "Root Directory"
3. Set it to: `apps/nodejs`

### 2. Environment Variables

Add these environment variables in Vercel dashboard (Settings → Environment Variables):

```
DATABASE_URL=your_database_connection_string
AUTH_SECRET=your_auth_secret
AUTH_URL=https://your-vercel-domain.vercel.app
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=your_from_email
APP_URL=https://your-vercel-domain.vercel.app
CORS_ORIGINS=https://your-frontend-domain.com
NODE_ENV=production
PORT=3000
```

### 3. Build Settings

Vercel should auto-detect:
- **Framework Preset**: Other
- **Build Command**: `npm run build` (or leave empty)
- **Output Directory**: `.` (current directory)
- **Install Command**: `npm install`

### 4. Deploy

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy from the nodejs directory
cd apps/nodejs
vercel

# For production deployment
vercel --prod
```

## Troubleshooting

### Error: Failed to resolve "@remix-run/dev"

This error occurs when Vercel tries to detect the framework incorrectly. The `vercel.json` file should prevent this by:
- Setting `"framework": null` to disable auto-detection
- Explicitly configuring it as a Node.js serverless function

If you still see this error:
1. Check that `vercel.json` is in the `apps/nodejs` directory
2. Ensure the root directory is set to `apps/nodejs` in Vercel settings
3. Try deleting `.vercel` folder and redeploying

### Server Not Starting

- Make sure all environment variables are set in Vercel
- Check Vercel function logs for errors
- Verify `DATABASE_URL` is correctly formatted

### Routes Not Working

- All routes should be accessible at: `https://your-domain.vercel.app/api/*`
- Health check: `https://your-domain.vercel.app/health`

## Important Notes

- The server runs as a serverless function on Vercel (not a traditional server)
- `app.listen()` is only called in non-Vercel environments
- All routes are automatically routed through the Express app
- Make sure your database allows connections from Vercel's IP addresses

