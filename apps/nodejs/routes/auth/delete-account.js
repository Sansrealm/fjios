import { sql } from '../../utils/database.js';
import { resolveUserId } from '../../middleware/auth.js';

export default async function deleteAccount(req, res) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Ensure user exists
    const users = await sql('SELECT id FROM auth_users WHERE id = $1', [
      userId,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Deleting the user cascades to related tables via FK constraints
    const deleted = await sql(
      'DELETE FROM auth_users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (deleted.length === 0) {
      return res.status(500).json({ error: 'Could not delete account' });
    }

    // Best-effort: clear auth cookie for web (if any)
    res.clearCookie('next-auth.session-token');
    res.clearCookie('__Secure-next-auth.session-token');

    return res.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
}

