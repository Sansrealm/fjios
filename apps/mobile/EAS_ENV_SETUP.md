# EAS Environment Variables Setup

## Why `.env` Files Don't Work in EAS Builds

**Important:** `.env` files are **NOT automatically loaded** during EAS builds. This is by design for security and build reproducibility.

### Reasons:
1. **Security**: `.env` files often contain secrets and shouldn't be committed to git
2. **Build Reproducibility**: EAS builds need consistent, version-controlled configuration
3. **Environment Isolation**: Different build profiles (dev/preview/prod) need different values

## How to Set Environment Variables in EAS

### Method 1: `eas.json` (Recommended for Public Values)

Add environment variables directly in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_BASE_URL": "https://fjios.vercel.app/",
        "EXPO_PUBLIC_HOST": "https://fjios.vercel.app"
      }
    }
  }
}
```

**Pros:**
- Version controlled
- Easy to see what's configured
- Good for non-sensitive values

**Cons:**
- Not suitable for secrets (committed to git)
- Same values for all team members

### Method 2: EAS Secrets (For Sensitive Values)

For sensitive values like API keys, use EAS secrets:

```bash
# Set a secret
eas secret:create --scope project --name EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY --value "your-key-here"

# List secrets
eas secret:list

# Delete a secret
eas secret:delete --name EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY
```

**Pros:**
- Secure (encrypted, not in git)
- Per-project or per-environment
- Team members can have different values

**Cons:**
- Requires EAS CLI
- Not visible in code

### Method 3: EAS Dashboard

1. Go to https://expo.dev
2. Select your project
3. Go to **Settings** → **Secrets**
4. Add environment variables there

## Required Environment Variables

Based on your codebase, these variables are used:

### Required:
- `EXPO_PUBLIC_BASE_URL` - Main API base URL
- `EXPO_PUBLIC_PROXY_BASE_URL` - Proxy/base URL (optional, falls back to BASE_URL)
- `EXPO_PUBLIC_HOST` - Host URL for headers

### Optional (but may be needed):
- `EXPO_PUBLIC_PROJECT_GROUP_ID` - Project group ID for auth
- `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY` - Uploadcare public key
- `EXPO_PUBLIC_BASE_CREATE_USER_CONTENT_URL` - User content URL

## Current Configuration

Your `eas.json` now includes all environment variables with placeholder values. **You need to:**

1. **Fill in the actual values** for each build profile
2. **Use EAS secrets** for sensitive values like API keys
3. **Update values** when deploying to different environments

## Example Setup

### For Development:
```json
"development": {
  "env": {
    "EXPO_PUBLIC_BASE_URL": "http://localhost:3000",
    "EXPO_PUBLIC_HOST": "http://localhost:3000"
  }
}
```

### For Production:
```json
"production": {
  "env": {
    "EXPO_PUBLIC_BASE_URL": "https://fjios.vercel.app/",
    "EXPO_PUBLIC_HOST": "https://fjios.vercel.app"
  }
}
```

And set secrets via CLI:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY --value "your-actual-key"
```

## Local Development

For local development, you **can** use `.env` files:

1. Create `.env` in `apps/mobile/`:
```env
EXPO_PUBLIC_BASE_URL=http://localhost:3000
EXPO_PUBLIC_HOST=http://localhost:3000
EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY=your-key-here
```

2. Install `dotenv` (if not using Expo's built-in support):
```bash
npm install dotenv
```

3. Expo automatically loads `.env` files for local development with `expo start`

**Note:** `.env` files are in `.gitignore` and won't be committed, which is correct.

## Troubleshooting

### Variables not working in EAS build?
1. Check `eas.json` has the `env` section
2. Verify variable names start with `EXPO_PUBLIC_` (required for client-side access)
3. Check EAS secrets are set: `eas secret:list`
4. Rebuild after changing environment variables

### Variables work locally but not in build?
- Local: Uses `.env` file
- EAS: Uses `eas.json` or EAS secrets
- Make sure both are configured

## Best Practices

1. **Use `eas.json`** for non-sensitive, environment-specific values
2. **Use EAS secrets** for API keys, tokens, and sensitive data
3. **Prefix with `EXPO_PUBLIC_`** for client-side accessible variables
4. **Document** which variables are required in your README
5. **Never commit** `.env` files or secrets to git


