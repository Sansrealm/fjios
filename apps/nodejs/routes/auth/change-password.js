import { sql } from '../../utils/database.js';
import { verify, hash } from 'argon2';
import { resolveUserId } from '../../middleware/auth.js';

export default async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Get user ID from JWT token
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's current password
    const accounts = await sql(
      `
      SELECT password 
      FROM auth_accounts 
      WHERE "userId" = $1 AND provider = 'credentials'
    `,
      [userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No password account found' });
    }

    const account = accounts[0];

    // Verify old password
    let isPasswordValid = false;
    try {
      if (
        typeof account.password === 'string' &&
        account.password.startsWith('$argon2')
      ) {
        isPasswordValid = await verify(account.password, oldPassword);
      } else {
        // Legacy plain text password
        isPasswordValid = account.password === oldPassword;
      }
    } catch (e) {
      isPasswordValid = account.password === oldPassword;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword);

    // Update password
    await sql(
      `
      UPDATE auth_accounts 
      SET password = $1 
      WHERE "userId" = $2 AND provider = 'credentials'
    `,
      [hashedPassword, parseInt(userId)]
    );

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}

