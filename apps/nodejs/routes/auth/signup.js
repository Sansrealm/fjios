import { sql } from '../../utils/database.js';
import { hash } from 'argon2';
import { SignJWT } from 'jose';

export default async function signup(req, res) {
  try {
    const { email, password, name, inviteCode } = req.body;

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: 'Name, email and password are required' });
    }

    // Enforce invite-only: require a valid, unused invite code
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Validate invite code (unused and not expired)
    const invites = await sql(
      `
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      [inviteCode]
    );

    if (invites.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user exists - if they do, update their account instead of creating new
    const existingUsers = await sql(
      `
      SELECT u.id, u.name, u."emailVerified", a.password IS NOT NULL as has_password
      FROM auth_users u
      LEFT JOIN auth_accounts a ON a."userId" = u.id AND a.type = 'credentials'
      WHERE u.email = $1
    `,
      [normalizedEmail]
    );

    let user;
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // If user already has a password, they should sign in instead
      if (existingUser.has_password) {
        return res.status(409).json({ 
          error: 'An account with this email already exists. Please sign in instead.',
          existingAccount: true
        });
      }
      
      // User exists but no password - update their account
      const updatedUsers = await sql(
        `
        UPDATE auth_users
        SET name = $1, "emailVerified" = COALESCE("emailVerified", NOW())
        WHERE email = $2
        RETURNING *
      `,
        [name, normalizedEmail]
      );
      user = updatedUsers[0];
    } else {
      // Create new user
      const newUsers = await sql(
        `
        INSERT INTO auth_users (name, email, "emailVerified")
        VALUES ($1, $2, NOW())
        RETURNING *
      `,
        [name, normalizedEmail]
      );
      user = newUsers[0];
    }

    // Hash the password
    const hashedPassword = await hash(password);

    // Check if auth account already exists
    const existingAccounts = await sql(
      `
      SELECT id FROM auth_accounts 
      WHERE "userId" = $1 AND type = 'credentials'
    `,
      [user.id]
    );

    if (existingAccounts.length > 0) {
      // Update existing password
      await sql(
        `
        UPDATE auth_accounts
        SET password = $1
        WHERE "userId" = $2 AND type = 'credentials'
      `,
        [hashedPassword, user.id]
      );
    } else {
      // Create auth account with hashed password
      await sql(
        `
        INSERT INTO auth_accounts ("userId", type, provider, "providerAccountId", password)
        VALUES ($1, 'credentials', 'credentials', $2, $3)
      `,
        [user.id, normalizedEmail, hashedPassword]
      );
    }

    // Mark invite as used by this user
    await sql(
      `
      UPDATE invite_codes
      SET is_used = true, used_by_user_id = $1
      WHERE code = $2
    `,
      [user.id, inviteCode]
    );

    // Generate JWT token for immediate client session
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const token = await new SignJWT({
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Return user data and token
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

