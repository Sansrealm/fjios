import { jwtVerify } from 'jose';
import { getToken } from '@auth/core/jwt';

/**
 * Helper to get session from mobile JWT (or cookie session as fallback)
 * @param {Request} request - Express request object
 * @returns {Promise<{user: {id: number, email: string, name: string}}|null>}
 */
export async function getSession(request) {
  // 1) Try Bearer JWT from mobile first
  // Accept multiple header names in case some proxies strip/rename Authorization
  const authHeader =
    request.headers.authorization ||
    request.headers['x-authorization'] ||
    request.headers['X-Authorization'];

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      if (payload?.sub) {
        return {
          user: {
            id: parseInt(payload.sub),
            email: payload.email,
            name: payload.name,
          },
        };
      }
    } catch (e) {
      console.error('JWT verify failed:', e);
      // fall through to cookie auth
    }
  }

  // 2) Fallback to cookie/session auth (useful when Authorization header is stripped in native dev proxy)
  try {
    // Convert Express request to Web API Request for getToken
    const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
    });

    const jwt = await getToken({
      req: webRequest,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith('https'),
    });
    if (jwt?.sub) {
      return {
        user: {
          id: parseInt(jwt.sub),
          email: jwt.email,
          name: jwt.name,
        },
      };
    }
  } catch (e) {
    console.error('Cookie auth fallback failed:', e);
  }

  return null;
}

/**
 * Resolve user ID from either cookie session or Authorization bearer
 * @param {Request} request - Express request object
 * @returns {Promise<string|null>}
 */
export async function resolveUserId(request) {
  // 1) Prefer explicit Authorization: Bearer <jwt> sent from mobile
  try {
    const authHeader =
      request.headers.authorization || request.headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const raw = authHeader.slice(7).trim();
      if (raw) {
        // Try to decode via Auth.js first (works for NextAuth & compatible JWTs)
        try {
          const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
          const webRequest = new Request(url, {
            method: request.method,
            headers: request.headers,
          });
          const jwt = await getToken({
            token: raw,
            secret: process.env.AUTH_SECRET,
          });
          if (jwt?.sub) return jwt.sub;
        } catch (_) {
          // fall through to manual verify
        }
        // Manual HS256 verification for custom-issued tokens
        try {
          const [headerB64, payloadB64, signature] = raw.split('.');
          if (headerB64 && payloadB64 && signature) {
            const { createHmac } = await import('node:crypto');
            const data = `${headerB64}.${payloadB64}`;
            const hmac = createHmac('sha256', process.env.AUTH_SECRET || '');
            hmac.update(data);
            const expected = hmac
              .digest('base64')
              .replace(/=/g, '')
              .replace(/\+/g, '-')
              .replace(/\//g, '_');
            if (expected === signature) {
              const json = JSON.parse(
                Buffer.from(
                  payloadB64.replace(/-/g, '+').replace(/_/g, '/'),
                  'base64'
                ).toString('utf8')
              );
              if (json?.sub) return String(json.sub);
            }
          }
        } catch (_) {
          // ignore
        }
      }
    }
  } catch (_e) {
    // no-op; fall back to cookie-based token
  }

  // 2) Fallback: read from cookies (web)
  try {
    const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
    });
    const jwt = await getToken({
      req: webRequest,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith('https'),
    });
    if (jwt?.sub) return String(jwt.sub);
  } catch (_) {
    // ignore
  }

  return null;
}

/**
 * Express middleware to require authentication
 */
export function requireAuth() {
  return async (req, res, next) => {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.session = session;
    next();
  };
}

