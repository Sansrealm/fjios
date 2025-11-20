import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router({ mergeParams: true });

async function assertOwnership(cardId, askId, userId) {
  const rows = await sql(
    `SELECT c.user_id, a.card_id
     FROM card_asks a
     JOIN cards c ON c.id = a.card_id
     WHERE a.id = $1`,
    [askId]
  );
  if (rows.length === 0) {
    return { status: 404, error: 'Ask not found' };
  }
  const row = rows[0];
  if (String(row.card_id) !== String(cardId)) {
    return { status: 400, error: 'Ask does not belong to this card' };
  }
  if (String(row.user_id) !== String(userId)) {
    return { status: 403, error: 'Unauthorized' };
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const { id, askId } = req.params;
    const asks = await sql(
      `SELECT id, title, description, video_url, button_order, card_id
       FROM card_asks WHERE id = $1 AND card_id = $2`,
      [askId, id]
    );
    if (asks.length === 0) {
      return res.status(404).json({ error: 'Ask not found' });
    }
    return res.json({ ask: asks[0] });
  } catch (e) {
    console.error('Error fetching ask:', e);
    return res.status(500).json({ error: 'Failed to fetch ask' });
  }
});

router.put('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { id, askId } = req.params;
    const { title, description, video_url, button_order } = req.body;

    const ownershipErr = await assertOwnership(id, askId, session.user.id);
    if (ownershipErr) {
      return res.status(ownershipErr.status).json({ error: ownershipErr.error });
    }

    // Build dynamic update
    const sets = [];
    const vals = [];
    let idx = 0;
    if (title !== undefined) {
      idx++;
      sets.push(`title = $${idx}`);
      vals.push(title);
    }
    if (description !== undefined) {
      idx++;
      sets.push(`description = $${idx}`);
      vals.push(description);
    }
    if (video_url !== undefined) {
      idx++;
      sets.push(`video_url = $${idx}`);
      vals.push(video_url);
    }
    if (button_order !== undefined) {
      idx++;
      sets.push(`button_order = $${idx}`);
      vals.push(button_order);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    idx++;
    vals.push(askId);
    const updated = await sql(
      `UPDATE card_asks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, title, description, video_url, button_order, card_id`,
      vals
    );

    return res.json({ ask: updated[0] });
  } catch (e) {
    console.error('Error updating ask:', e);
    return res.status(500).json({ error: 'Failed to update ask' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { id, askId } = req.params;

    const ownershipErr = await assertOwnership(id, askId, session.user.id);
    if (ownershipErr) {
      return res.status(ownershipErr.status).json({ error: ownershipErr.error });
    }

    await sql(`DELETE FROM card_asks WHERE id = $1`, [askId]);
    return res.json({ success: true });
  } catch (e) {
    console.error('Error deleting ask:', e);
    return res.status(500).json({ error: 'Failed to delete ask' });
  }
});

export default router;

