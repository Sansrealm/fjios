import express from 'express';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get count of unread messages for cards owned by this user
    const result = await sql(
      `
      SELECT COUNT(*) as unread_count
      FROM card_messages cm
      JOIN cards c ON cm.card_id = c.id
      WHERE c.user_id = $1
      AND cm.is_read = false
    `,
      [userId]
    );

    const unreadCount = parseInt(result[0]?.unread_count || 0);

    return res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Unread count fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

