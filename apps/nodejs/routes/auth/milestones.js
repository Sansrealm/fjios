import { sql } from '../../utils/database.js';

export default async function milestones(req, res) {
  try {
    const { userId, milestone } = req.body;

    if (!userId || !milestone) {
      return res
        .status(400)
        .json({ error: 'userId and milestone are required' });
    }

    // Get current milestone flags
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

    const currentFlags = users[0].milestone_flags || {};

    // Only update if milestone hasn't been completed yet
    if (currentFlags[milestone] === true) {
      return res.json({
        success: true,
        alreadyCompleted: true,
        milestoneFlags: currentFlags,
      });
    }

    // Update the milestone flag
    const updatedFlags = {
      ...currentFlags,
      [milestone]: true,
    };

    await sql(
      `
      UPDATE auth_users 
      SET milestone_flags = $1
      WHERE id = $2
    `,
      [JSON.stringify(updatedFlags), userId]
    );

    return res.json({
      success: true,
      alreadyCompleted: false,
      milestoneFlags: updatedFlags,
    });
  } catch (error) {
    console.error('Milestone update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

