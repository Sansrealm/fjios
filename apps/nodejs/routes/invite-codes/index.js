import express from 'express';
import { resolveUserId } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';
import validate from './validate.js';

const router = express.Router();

// Get invite codes for the current user
router.get('/', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user details to check unlimited_invites flag
    const users = await sql(`SELECT unlimited_invites FROM auth_users WHERE id = $1`, [
      userId,
    ]);

    // Get user's invite codes
    const inviteCodes = await sql(
      `
      SELECT id, code, is_used, used_by_user_id, expires_at, created_at
      FROM invite_codes 
      WHERE created_by_user_id = $1 
      ORDER BY created_at DESC
    `,
      [userId]
    );

    // Check if user has unlimited invites
    const hasUnlimitedInvites = users[0]?.unlimited_invites || false;

    if (hasUnlimitedInvites) {
      return res.json({
        inviteCodes,
        inviteLimit: null,
        remainingInvites: null,
        totalCreated: inviteCodes.length,
        unlimited: true,
      });
    }

    // Get the current invite limit (fallback to 25 if not configured)
    const settings = await sql(
      `
      SELECT setting_value FROM system_settings 
      WHERE setting_key = 'invite_limit_per_user'
    `,
      []
    );

    const inviteLimit = parseInt(settings[0]?.setting_value || '25');
    const remainingInvites = Math.max(0, inviteLimit - inviteCodes.length);

    return res.json({
      inviteCodes,
      inviteLimit,
      remainingInvites,
      totalCreated: inviteCodes.length,
      unlimited: false,
    });
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    return res.status(500).json({ error: 'Failed to fetch invite codes' });
  }
});

// Create a new invite code
router.post('/', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user details to check unlimited_invites flag
    const users = await sql(`SELECT unlimited_invites FROM auth_users WHERE id = $1`, [
      userId,
    ]);

    const hasUnlimitedInvites = users[0]?.unlimited_invites || false;
    let remainingInvites = null;

    // Only check limits if user doesn't have unlimited invites
    if (!hasUnlimitedInvites) {
      // Get the current invite limit (fallback to 25 if not configured)
      const settings = await sql(
        `
        SELECT setting_value FROM system_settings 
        WHERE setting_key = 'invite_limit_per_user'
      `,
        []
      );

      const inviteLimit = parseInt(settings[0]?.setting_value || '25');

      // Check how many invites the user has already created
      const userInviteCounts = await sql(
        `
        SELECT COUNT(*) as count 
        FROM invite_codes 
        WHERE created_by_user_id = $1
      `,
        [userId]
      );

      if (parseInt(userInviteCounts[0].count) >= inviteLimit) {
        return res.status(400).json({
          error: `You have reached the maximum limit of ${inviteLimit} invites per user.`,
        });
      }

      remainingInvites = inviteLimit - parseInt(userInviteCounts[0].count) - 1;
    }

    // Generate a unique invite code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let code;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate a unique code
    do {
      code = generateCode();
      const existing = await sql(
        `
        SELECT id FROM invite_codes WHERE code = $1
      `,
        [code]
      );

      if (existing.length === 0) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique invite code' });
    }

    // Set expiration to 30 days from now (optional)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create the invite code
    const newInviteCodes = await sql(
      `
      INSERT INTO invite_codes (code, created_by_user_id, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [code, userId, expiresAt]
    );

    return res.json({
      inviteCode: newInviteCodes[0],
      remainingInvites,
      unlimited: hasUnlimitedInvites,
    });
  } catch (error) {
    console.error('Error creating invite code:', error);
    return res.status(500).json({ error: 'Failed to create invite code' });
  }
});

// Mount validate route
router.use('/validate', validate);

export default router;

