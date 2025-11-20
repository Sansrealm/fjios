import { sql } from '../../utils/database.js';
import { verify } from 'argon2';
import { createHmac } from 'node:crypto';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signToken(payloadObj) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET not configured');
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payloadObj));
  const data = `${headerB64}.${payloadB64}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  const signature = base64url(hmac.digest());
  return `${data}.${signature}`;
}

export default async function credentialsSignin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const users = await sql(
      `
      SELECT u.*, a.password 
      FROM auth_users u 
      JOIN auth_accounts a ON u.id = a."userId" 
      WHERE u.email = $1 AND a.type = 'credentials'
    `,
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password using argon2 if it looks like an argon2 hash; otherwise fallback to legacy plain text
    let isPasswordValid = false;
    try {
      if (
        typeof user.password === 'string' &&
        user.password.startsWith('$argon2')
      ) {
        isPasswordValid = await verify(user.password, password);
      } else {
        isPasswordValid = user.password === password;
      }
    } catch (e) {
      isPasswordValid = user.password === password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate HMAC-signed token (JWT-compatible structure without external libs)
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      iat: nowSec,
      exp: nowSec + 60 * 60 * 24, // 24h
    };
    const token = signToken(payload);

    // Return user data and token
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error('Signin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

