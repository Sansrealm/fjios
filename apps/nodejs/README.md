# Node.js Backend Server

This is a Node.js/Express backend server that provides all the API functionality for the web application. It has been converted from the Vite/React Router setup to a pure Node.js implementation.

## Features

- Express.js server with RESTful API routes
- Authentication using JWT tokens and cookie sessions
- Database integration with Neon (PostgreSQL)
- Email functionality via Resend
- File upload support
- CORS configuration
- Error handling middleware

## Setup

1. Install dependencies:
```bash
cd apps/nodejs
npm install
```

2. Set up environment variables. Create a `.env` file in the `nodejs` directory:

```bash
cd apps/nodejs
touch .env
```

Add the following to your `.env` file:
```
DATABASE_URL=your_database_connection_string
AUTH_SECRET=your_auth_secret
AUTH_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=your_from_email
APP_URL=http://localhost:3000
CORS_ORIGINS=
PORT=3000
NODE_ENV=development
```

**Important:** 
- If you're using the same database as the Vite project, copy the `DATABASE_URL` from your Vite project's `.env` file
- Generate `AUTH_SECRET` using: `openssl rand -base64 32`
- See `ENV_SETUP.md` for detailed instructions

3. Run the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

4. Check syntax:
```bash
# Simple syntax check
npm run build
```

## API Routes

### Authentication (`/api/auth`)
- `POST /api/auth/credentials-signin` - Sign in with email/password
- `POST /api/auth/signup` - Create new account
- `GET /api/auth/token` - Get current user token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/verify-email/send` - Send verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `DELETE /api/auth/delete-account` - Delete user account
- `GET /api/auth/expo-web-success` - Expo web success callback
- `POST /api/auth/milestones` - Update user milestone
- `GET /api/auth/milestones/:userId` - Get user milestones

### Cards (`/api/cards`)
- `GET /api/cards` - List all cards
- `POST /api/cards` - Create new card
- `GET /api/cards/:id` - Get card by ID
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card
- `GET /api/cards/slug/:slug` - Get card by slug
- `GET /api/cards/:id/asks` - Get asks for a card
- `POST /api/cards/:id/asks` - Create ask for a card
- `GET /api/cards/:id/asks/:askId` - Get ask by ID
- `PUT /api/cards/:id/asks/:askId` - Update ask
- `DELETE /api/cards/:id/asks/:askId` - Delete ask
- `POST /api/cards/:id/asks/auto` - Create ask with auto-generated title
- `GET /api/cards/:id/messages` - Get messages for a card
- `POST /api/cards/:id/messages` - Send message to card owner
- `PUT /api/cards/:id/messages` - Mark messages as read
- `GET /api/cards/:id/saved` - Check if card is saved
- `POST /api/cards/:id/saved` - Save card
- `DELETE /api/cards/:id/saved` - Unsave card

### Invite Codes (`/api/invite-codes`)
- `GET /api/invite-codes` - Get user's invite codes
- `POST /api/invite-codes` - Create new invite code
- `POST /api/invite-codes/validate` - Validate invite code
- `PUT /api/invite-codes/validate` - Use invite code

### Industry Tags (`/api/industry-tags`)
- `GET /api/industry-tags` - Get all industry tags

### Messages (`/api/messages`)
- `GET /api/messages/unread-count` - Get unread message count

### Saved Cards (`/api/saved-cards`)
- `GET /api/saved-cards` - Get user's saved cards

### System Settings (`/api/system-settings`)
- `GET /api/system-settings` - Get system settings
- `PUT /api/system-settings` - Update system setting

## Project Structure

```
nodejs/
├── server.js              # Main server entry point
├── package.json          # Dependencies and scripts
├── routes/               # API route handlers
│   ├── auth/            # Authentication routes
│   ├── cards/           # Card-related routes
│   ├── invite-codes/    # Invite code routes
│   ├── industry-tags/  # Industry tag routes
│   ├── messages/        # Message routes
│   ├── saved-cards/     # Saved card routes
│   └── system-settings/ # System settings routes
├── middleware/          # Express middleware
│   └── auth.js         # Authentication middleware
└── utils/              # Utility functions
    ├── database.js     # Database connection
    ├── adapter.js      # Auth adapter
    ├── send-email.js   # Email sending
    └── upload.js       # File upload
```

## Development

The server runs on port 3000 by default (configurable via PORT environment variable). In development mode, it uses Node's `--watch` flag for automatic reloading on file changes.

## Mobile App Integration

The mobile app (React Native/Expo) connects to this Node.js backend using environment variables.

### Configuration

Set the following environment variable in your mobile app:

```env
EXPO_PUBLIC_BASE_URL=http://localhost:3000
```

**For different environments:**
- **iOS Simulator**: `http://localhost:3000`
- **Android Emulator**: `http://10.0.2.2:3000`
- **Physical Device**: `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.100:3000`)
- **Production**: `https://your-production-domain.com`

### CORS Configuration

The server is configured to:
- **Development**: Allow all origins (for mobile app testing)
- **Production**: Use `CORS_ORIGINS` environment variable for specific allowed origins

### Authentication

The mobile app sends JWT tokens in the `Authorization: Bearer <token>` header. The server supports:
- JWT Bearer tokens (for mobile apps)
- Cookie-based sessions (for web)

See `MOBILE_CONFIG.md` for detailed mobile setup instructions.

## Notes

- All routes maintain the same API structure as the original Vite/React Router implementation
- Authentication supports both JWT Bearer tokens (for mobile) and cookie sessions (for web)
- Database queries use parameterized statements to prevent SQL injection
- Error handling is centralized in the Express error middleware
- CORS is configured to allow mobile app connections in development

