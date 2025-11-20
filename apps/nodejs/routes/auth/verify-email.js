import express from 'express';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Verify email by token
async function verifyEmailHandler(req, res) {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find token
    const rows = await sql(
      `
      SELECT identifier, expires
      FROM auth_verification_token
      WHERE token = $1
    `,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const row = rows[0];
    const now = new Date();
    const expiresAt =
      row.expires instanceof Date ? row.expires : new Date(row.expires);
    if (expiresAt < now) {
      return res.status(400).json({ error: 'Token expired' });
    }

    // Verify the user's email
    const users = await sql(
      `
      UPDATE auth_users
      SET "emailVerified" = NOW()
      WHERE email = $1
      RETURNING id, email, name, "emailVerified"
    `,
      [row.identifier]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Clean up token(s) for this identifier
    await sql(
      `
      DELETE FROM auth_verification_token WHERE identifier = $1
    `,
      [row.identifier]
    );

    return res.json({
      message: 'Email verified successfully',
      user,
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ error: 'Failed to verify email' });
  }
}

router.get('/', verifyEmailHandler);
router.post('/', verifyEmailHandler);

export default router;

