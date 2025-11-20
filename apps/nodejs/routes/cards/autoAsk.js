import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router({ mergeParams: true });

async function generateTitleFromVideo(videoUrl) {
  try {
    if (process.env.ASSEMBLYAI_API_KEY && videoUrl) {
      const createRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          Authorization: process.env.ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_url: videoUrl }),
      });
      const created = await createRes.json();
      if (!createRes.ok || !created.id) throw new Error('failed to create transcript');
      const started = Date.now();
      while (Date.now() - started < 20000) {
        await new Promise((r) => setTimeout(r, 1500));
        const statusRes = await fetch(`https://api.assemblyai.com/v2/transcript/${created.id}`, {
          headers: { Authorization: process.env.ASSEMBLYAI_API_KEY },
        });
        const status = await statusRes.json();
        if (status.status === 'completed' && status.text) {
          const words = status.text.trim().split(/\s+/).slice(0, 6).join(' ');
          return words || 'Video Ask';
        }
        if (status.status === 'error') break;
      }
    }
  } catch (e) {
    console.error('Transcription error:', e);
  }
  return 'Video Ask';
}

router.post('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { id } = req.params;
    let { title, description, video_url, button_order } = req.body;
    if (!video_url) {
      return res.status(400).json({ error: 'Video URL is required' });
    }
    const cards = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (cards[0].user_id !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!title || !title.trim()) {
      title = await generateTitleFromVideo(video_url);
    }

    const asks = await sql(
      `INSERT INTO card_asks (card_id, title, description, video_url, button_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, title, description || null, video_url, button_order || 0]
    );

    return res.json({ ask: asks[0] });
  } catch (e) {
    console.error('Error creating ask auto:', e);
    return res.status(500).json({ error: 'Failed to create ask' });
  }
});

export default router;

