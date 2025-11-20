# Environment Variables Setup

The Node.js server requires environment variables to be configured. Create a `.env` file in the `apps/nodejs` directory.

## Quick Setup

1. Copy the example file (if available) or create a new `.env` file:
```bash
cd apps/nodejs
touch .env
```

2. Add the following variables to your `.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
AUTH_SECRET=your-secret-key-here
AUTH_URL=http://localhost:3000

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=noreply@yourdomain.com

# Application URLs
APP_URL=http://localhost:3000

# CORS Configuration (optional - leave empty in development)
CORS_ORIGINS=

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Getting Your Database URL

If you're using the same database as the Vite project, you can:

1. Check the original Vite project's environment variables
2. Or get it from your Neon dashboard (if using Neon)
3. Or from your database provider's dashboard

The format is typically:
```
postgresql://username:password@host:port/database_name
```

## Generating AUTH_SECRET

Generate a secure random string:
```bash
openssl rand -base64 32
```

Or use an online generator to create a random 32+ character string.

## Important Notes

- The `.env` file is in `.gitignore` and will not be committed to version control
- Never commit your `.env` file with real credentials
- For production, set these variables in your hosting platform's environment settings

## Testing

After setting up your `.env` file, restart the server:
```bash
npm run dev
```

The server should start without the DATABASE_URL error.

