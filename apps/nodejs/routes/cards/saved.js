import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router({ mergeParams: true });

// Check if card is saved by current user
router.get('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.json({ is_saved: false });
    }

    const { id } = req.params;

    const savedCards = await sql(
      `
      SELECT id FROM saved_cards 
      WHERE user_id = $1 AND card_id = $2
    `,
      [session.user.id, id]
    );

    return res.json({ is_saved: savedCards.length > 0 });
  } catch (error) {
    console.error('Error checking saved status:', error);
    return res.json({ is_saved: false });
  }
});

// Save card for current user
router.post('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Check if card exists
    const cards = await sql('SELECT id FROM cards WHERE id = $1', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Save the card (ignore if already saved due to unique constraint)
    await sql(
      `
      INSERT INTO saved_cards (user_id, card_id) 
      VALUES ($1, $2) 
      ON CONFLICT (user_id, card_id) DO NOTHING
    `,
      [session.user.id, id]
    );

    return res.json({ message: 'Card saved successfully' });
  } catch (error) {
    console.error('Error saving card:', error);
    return res.status(500).json({ error: 'Failed to save card' });
  }
});

// Unsave card for current user
router.delete('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    await sql(
      `
      DELETE FROM saved_cards 
      WHERE user_id = $1 AND card_id = $2
    `,
      [session.user.id, id]
    );

    return res.json({ message: 'Card unsaved successfully' });
  } catch (error) {
    console.error('Error unsaving card:', error);
    return res.status(500).json({ error: 'Failed to unsave card' });
  }
});

export default router;

