import { sql } from '../../utils/database.js';
import { hash } from 'argon2';

export default async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' });
    }

    // Verify token is valid and not expired
    const resetTokens = await sql(
      `
      SELECT * FROM password_reset_tokens 
      WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP
    `,
      [token]
    );

    if (resetTokens.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = resetTokens[0];

    // Hash the new password
    const hashedPassword = await hash(password);

    // Update user's password in auth_accounts table
    const existingAccounts = await sql(
      `
      SELECT id FROM auth_accounts 
      WHERE "userId" = $1 AND provider = 'credentials'
    `,
      [resetToken.user_id]
    );

    if (existingAccounts.length > 0) {
      // Update existing credentials account
      await sql(
        `
        UPDATE auth_accounts 
        SET password = $1 
        WHERE "userId" = $2 AND provider = 'credentials'
      `,
        [hashedPassword, resetToken.user_id]
      );
    } else {
      // Create new credentials account
      await sql(
        `
        INSERT INTO auth_accounts ("userId", type, provider, "providerAccountId", password)
        VALUES ($1, 'credentials', 'credentials', $2, $3)
      `,
        [resetToken.user_id, resetToken.user_id.toString(), hashedPassword]
      );
    }

    // Mark token as used
    await sql(
      `
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE token = $1
    `,
      [token]
    );

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}

