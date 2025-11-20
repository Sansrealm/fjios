import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';
import asksRoutes from './asks.js';
import messagesRoutes from './messages.js';
import savedRoutes from './saved.js';

const router = express.Router({ mergeParams: true });

// Get single card by ID
router.get('/', async (req, res) => {
  try {
    const { id } = req.params;

    const cards = await sql(
      `
      SELECT c.*, u.email as user_email 
      FROM cards c 
      JOIN auth_users u ON c.user_id = u.id 
      WHERE c.id = $1
    `,
      [id]
    );

    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const card = cards[0];

    // Get industry tags
    const tags = await sql(
      `
      SELECT it.id, it.name, it.color 
      FROM industry_tags it 
      JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
      WHERE cit.card_id = $1
    `,
      [id]
    );
    card.industry_tags = tags;

    // Get asks
    const asks = await sql(
      `
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `,
      [id]
    );
    card.asks = asks;

    return res.json({ card });
  } catch (error) {
    console.error('Error fetching card:', error);
    return res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Update card
router.put('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const body = req.body;

    // Verify card ownership
    const existingCards = await sql(
      'SELECT user_id, slug FROM cards WHERE id = $1',
      [id]
    );
    if (existingCards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const existingCard = existingCards[0];
    if (existingCard.user_id !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      name,
      startup_name,
      startup_website,
      role,
      description,
      profile_video_url,
      profile_image_url,
      industry_tag_ids,
      location_city,
      location_state,
      location_country,
    } = body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
    }
    if (startup_name !== undefined) {
      paramCount++;
      updateFields.push(`startup_name = $${paramCount}`);
      updateValues.push(startup_name);
    }
    if (startup_website !== undefined) {
      paramCount++;
      updateFields.push(`startup_website = $${paramCount}`);
      updateValues.push(startup_website);
    }
    if (role !== undefined) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
    }
    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
    }
    if (profile_video_url !== undefined) {
      paramCount++;
      updateFields.push(`profile_video_url = $${paramCount}`);
      updateValues.push(profile_video_url);
    }
    if (profile_image_url !== undefined) {
      paramCount++;
      updateFields.push(`profile_image_url = $${paramCount}`);
      updateValues.push(profile_image_url);
    }
    if (location_city !== undefined) {
      paramCount++;
      updateFields.push(`location_city = $${paramCount}`);
      updateValues.push(location_city);
    }
    if (location_state !== undefined) {
      paramCount++;
      updateFields.push(`location_state = $${paramCount}`);
      updateValues.push(location_state);
    }
    if (location_country !== undefined) {
      paramCount++;
      updateFields.push(`location_country = $${paramCount}`);
      updateValues.push(location_country);
    }

    // If the card has no slug yet and a new name is provided, generate a slug once
    if (!existingCard.slug && name) {
      const baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      let slug = baseSlug || `user-${session.user.id}`;
      let suffix = 1;
      while (true) {
        const conflict = await sql(
          `SELECT 1 AS exists FROM cards WHERE slug = $1 AND id <> $2 LIMIT 1`,
          [slug, id]
        );
        if (conflict.length === 0) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
        if (suffix > 1000) break;
      }
      paramCount++;
      updateFields.push(`slug = $${paramCount}`);
      updateValues.push(slug);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      paramCount++;
      updateValues.push(id);
      const query = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      await sql(query, updateValues);
    }

    // Update industry tags if provided
    if (industry_tag_ids !== undefined) {
      await sql('DELETE FROM card_industry_tags WHERE card_id = $1', [id]);
      if (industry_tag_ids.length > 0) {
        for (const tagId of industry_tag_ids) {
          await sql(
            `
            INSERT INTO card_industry_tags (card_id, industry_tag_id)
            VALUES ($1, $2)
          `,
            [id, tagId]
          );
        }
      }
    }

    // Return updated card
    const cards = await sql(
      `
      SELECT c.*, u.email as user_email 
      FROM cards c 
      JOIN auth_users u ON c.user_id = u.id 
      WHERE c.id = $1
    `,
      [id]
    );
    const card = cards[0];

    const tags = await sql(
      `
      SELECT it.id, it.name, it.color 
      FROM industry_tags it 
      JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
      WHERE cit.card_id = $1
    `,
      [id]
    );
    card.industry_tags = tags;

    const asks = await sql(
      `
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `,
      [id]
    );
    card.asks = asks;

    return res.json({ card });
  } catch (error) {
    console.error('Error updating card:', error);
    return res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card
router.delete('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Verify card ownership
    const existingCards = await sql(
      'SELECT user_id FROM cards WHERE id = $1',
      [id]
    );
    if (existingCards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (existingCards[0].user_id !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete card (cascades to related tables)
    await sql('DELETE FROM cards WHERE id = $1', [id]);

    return res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    return res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Mount nested routes
router.use('/asks', asksRoutes);
router.use('/messages', messagesRoutes);
router.use('/saved', savedRoutes);

export default router;

