import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';
import askById from './askById.js';
import autoAsk from './autoAsk.js';

const router = express.Router({ mergeParams: true });

// Get asks for a card
router.get('/', async (req, res) => {
  try {
    const { id } = req.params;

    const asks = await sql(
      `
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `,
      [id]
    );

    return res.json({ asks });
  } catch (error) {
    console.error('Error fetching asks:', error);
    return res.status(500).json({ error: 'Failed to fetch asks' });
  }
});

// Create new ask for a card
router.post('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { title, description, video_url, button_order } = req.body;

    if (!title || !video_url) {
      return res
        .status(400)
        .json({ error: 'Title and video URL are required' });
    }

    // Verify card ownership
    const cards = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (cards[0].user_id !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create the ask
    const asks = await sql(
      `
      INSERT INTO card_asks (card_id, title, description, video_url, button_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [id, title, description, video_url, button_order || 0]
    );

    return res.json({ ask: asks[0] });
  } catch (error) {
    console.error('Error creating ask:', error);
    return res.status(500).json({ error: 'Failed to create ask' });
  }
});

// Mount nested routes
router.use('/auto', autoAsk);
router.use('/:askId', askById);

export default router;

