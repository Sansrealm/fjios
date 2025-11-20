# Mobile App Configuration for Node.js Backend

This guide explains how to configure the mobile app to connect to the Node.js backend server.

## Environment Variables

The mobile app uses the following environment variables to connect to the backend:

- `EXPO_PUBLIC_BASE_URL` - Primary API base URL
- `EXPO_PUBLIC_PROXY_BASE_URL` - Proxy/alternative API base URL (optional)

## Local Development Setup

### For iOS Simulator
```env
EXPO_PUBLIC_BASE_URL=http://localhost:3000
```

### For Android Emulator
```env
EXPO_PUBLIC_BASE_URL=http://10.0.2.2:3000
```
Note: Android emulator uses `10.0.2.2` as an alias for `localhost` on the host machine.

### For Physical Devices
1. Find your local IP address:
   - **macOS/Linux**: Run `ifconfig` or `ip addr` and look for your network interface IP (usually starts with `192.168.` or `10.`)
   - **Windows**: Run `ipconfig` and look for IPv4 Address

2. Set the environment variable:
```env
EXPO_PUBLIC_BASE_URL=http://YOUR_LOCAL_IP:3000
```
Example: `http://192.168.1.100:3000`

## Production Setup

Update `mobile/eas.json` to point to your production Node.js server:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_BASE_URL": "https://your-production-domain.com"
      }
    }
  }
}
```

## Testing the Connection

1. Start the Node.js server:
```bash
cd apps/nodejs
npm run dev
```

2. Test the health endpoint:
```bash
curl http://localhost:3000/health
```

3. In your mobile app, the API calls will automatically use the configured base URL.

## API Endpoints

All API endpoints are prefixed with `/api`:

- Authentication: `/api/auth/*`
- Cards: `/api/cards/*`
- Invite Codes: `/api/invite-codes/*`
- Industry Tags: `/api/industry-tags/*`
- Messages: `/api/messages/*`
- Saved Cards: `/api/saved-cards/*`
- System Settings: `/api/system-settings/*`

The mobile app's `fetchWithAuth` function in `mobile/src/utils/api.js` automatically prepends the base URL to all API calls.

## Troubleshooting

### Connection Refused
- Make sure the Node.js server is running on port 3000
- Check that your firewall allows connections on port 3000
- For physical devices, ensure your device and computer are on the same network

### CORS Errors
- The Node.js server is configured to allow all origins in development
- In production, set `CORS_ORIGINS` environment variable with comma-separated allowed origins

### Authentication Issues
- Ensure `AUTH_SECRET` is set in the Node.js server's `.env` file
- The mobile app sends JWT tokens in the `Authorization: Bearer <token>` header
- Token refresh is handled automatically by `fetchWithAuth`

