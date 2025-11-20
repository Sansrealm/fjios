import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Validate invite code
router.post('/', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const invites = await sql(
      `
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      [code]
    );

    if (invites.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }

    return res.json({ valid: true, message: 'Invite code is valid' });
  } catch (error) {
    console.error('Error validating invite code:', error);
    return res.status(500).json({ error: 'Failed to validate invite code' });
  }
});

// Use invite code (mark as used)
router.put('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Check if code is valid and unused
    const invites = await sql(
      `
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      [code]
    );

    if (invites.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }

    // Mark as used
    await sql(
      `
      UPDATE invite_codes 
      SET is_used = true, used_by_user_id = $1 
      WHERE code = $2
    `,
      [session.user.id, code]
    );

    return res.json({ message: 'Invite code used successfully' });
  } catch (error) {
    console.error('Error using invite code:', error);
    return res.status(500).json({ error: 'Failed to use invite code' });
  }
});

export default router;

