import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Get saved cards for current user
router.get('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const savedCards = await sql(
      `
      SELECT c.*, u.email as user_email, sc.created_at as saved_at
      FROM saved_cards sc
      JOIN cards c ON sc.card_id = c.id
      JOIN auth_users u ON c.user_id = u.id
      WHERE sc.user_id = $1
      ORDER BY sc.created_at DESC
    `,
      [session.user.id]
    );

    // Get industry tags and asks for each saved card
    for (let card of savedCards) {
      const tags = await sql(
        `
        SELECT it.id, it.name, it.color 
        FROM industry_tags it 
        JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
        WHERE cit.card_id = $1
      `,
        [card.id]
      );
      card.industry_tags = tags;

      const asks = await sql(
        `
        SELECT id, title, description, video_url, button_order 
        FROM card_asks 
        WHERE card_id = $1 
        ORDER BY button_order ASC
      `,
        [card.id]
      );
      card.asks = asks;
    }

    return res.json({ saved_cards: savedCards });
  } catch (error) {
    console.error('Error fetching saved cards:', error);
    return res.status(500).json({ error: 'Failed to fetch saved cards' });
  }
});

export default router;

