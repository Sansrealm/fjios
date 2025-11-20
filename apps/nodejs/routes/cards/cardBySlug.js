import express from 'express';
import { sql } from '../../utils/database.js';

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    const cards = await sql(
      `SELECT c.*, u.email as user_email FROM cards c JOIN auth_users u ON c.user_id = u.id WHERE c.slug = $1`,
      [slug]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cards[0];

    const tags = await sql(
      `SELECT it.id, it.name, it.color FROM industry_tags it JOIN card_industry_tags cit ON it.id = cit.industry_tag_id WHERE cit.card_id = $1`,
      [card.id]
    );
    const asks = await sql(
      `SELECT id, title, description, video_url, button_order FROM card_asks WHERE card_id = $1 ORDER BY button_order ASC`,
      [card.id]
    );

    card.industry_tags = tags;
    card.asks = asks;

    return res.json({ card });
  } catch (e) {
    console.error('Error fetching card by slug:', e);
    return res.status(500).json({ error: 'Failed to fetch card' });
  }
});

export default router;

