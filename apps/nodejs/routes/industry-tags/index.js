import express from 'express';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Get all industry tags
router.get('/', async (req, res) => {
  try {
    const tags = await sql('SELECT * FROM industry_tags ORDER BY name ASC');
    return res.json({ tags });
  } catch (error) {
    console.error('Error fetching industry tags:', error);
    return res.status(500).json({ error: 'Failed to fetch industry tags' });
  }
});

export default router;

