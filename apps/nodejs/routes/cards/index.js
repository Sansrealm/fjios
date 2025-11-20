import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Get cards list - public endpoint for viewing cards with saved status for authenticated users
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    const search = req.query.search;
    const saved_only = req.query.saved_only === 'true';

    const session = await getSession(req);

    let query = `
      SELECT DISTINCT c.*, u.email as user_email
      ${session?.user?.id ? `, CASE WHEN sc.id IS NOT NULL THEN true ELSE false END as is_saved` : ', false as is_saved'}
      FROM cards c 
      JOIN auth_users u ON c.user_id = u.id
      ${session?.user?.id ? `LEFT JOIN saved_cards sc ON c.id = sc.card_id AND sc.user_id = $${session.user.id ? '1' : 'NULL'}` : ''}
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (session?.user?.id) {
      paramCount++;
      params.push(session.user.id);
    }

    if (userId) {
      paramCount++;
      query += ` AND c.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (saved_only && session?.user?.id) {
      query += ' AND sc.id IS NOT NULL';
    }

    if (search) {
      paramCount++;
      query += ` AND (LOWER(c.name) LIKE LOWER($${paramCount}) OR LOWER(c.startup_name) LIKE LOWER($${paramCount}) OR LOWER(c.description) LIKE LOWER($${paramCount}) OR LOWER(c.role) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY c.updated_at DESC';

    const cards = await sql(query, params);

    // Get industry tags for each card
    for (let card of cards) {
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

      // Get asks for each card
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

    return res.json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Create new card (enforce one per user)
router.post('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
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
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (description && description.length > 124) {
      return res
        .status(400)
        .json({ error: 'Description must be 124 characters or less' });
    }

    // One-card-per-user enforcement
    const existing = await sql(
      `SELECT id FROM cards WHERE user_id = $1 LIMIT 1`,
      [session.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        error: 'You already have a card. Please edit your existing card.',
      });
    }

    // Generate a clean unique slug from the name
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
        `SELECT 1 AS exists FROM cards WHERE slug = $1 LIMIT 1`,
        [slug]
      );
      if (conflict.length === 0) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
      if (suffix > 1000) break; // safety
    }

    // Create the card with slug + optional location fields
    const cards = await sql(
      `
      INSERT INTO cards (
        user_id, name, startup_name, startup_website, role, description,
        profile_video_url, profile_image_url, slug,
        location_city, location_state, location_country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
      [
        session.user.id,
        name,
        startup_name,
        startup_website,
        role,
        description,
        profile_video_url,
        profile_image_url,
        slug,
        location_city || null,
        location_state || null,
        location_country || null,
      ]
    );

    const card = cards[0];

    // Add industry tags if provided
    if (industry_tag_ids && industry_tag_ids.length > 0) {
      for (const tagId of industry_tag_ids) {
        await sql(
          `
          INSERT INTO card_industry_tags (card_id, industry_tag_id)
          VALUES ($1, $2)
        `,
          [card.id, tagId]
        );
      }
    }

    // Get the complete card with tags
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
    card.asks = [];

    return res.json({ card });
  } catch (error) {
    console.error('Error creating card:', error);
    return res.status(500).json({ error: 'Failed to create card' });
  }
});

// Import nested routes
import cardById from './cardById.js';
import cardBySlug from './cardBySlug.js';

router.use('/slug/:slug', cardBySlug);
router.use('/:id', cardById);

export default router;

