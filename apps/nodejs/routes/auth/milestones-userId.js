import { sql } from '../../utils/database.js';

export default async function milestonesByUserId(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user milestone flags
    const users = await sql(
      `
      SELECT milestone_flags 
      FROM auth_users 
      WHERE id = $1
    `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const milestoneFlags = users[0].milestone_flags || {};

    return res.json({ milestoneFlags });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

