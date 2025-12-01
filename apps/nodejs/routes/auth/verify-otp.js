import { sql } from '../../utils/database.js';
import { randomBytes } from 'node:crypto';

export default async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find the OTP record for this user
    const otpRecords = await sql(
      `
      SELECT * FROM password_reset_tokens 
      WHERE user_id = (SELECT id FROM auth_users WHERE email = $1)
      AND token LIKE $2
      AND used = false
      AND expires_at > CURRENT_TIMESTAMP
      ORDER BY expires_at DESC
      LIMIT 1
    `,
      [email.toLowerCase(), `otp:${otp}`]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const otpRecord = otpRecords[0];

    // Generate secure token for password reset
    const token = randomBytes(32).toString('hex');

    // Update expiration to 1 hour from now for the reset token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Update the record with the actual reset token
    await sql(
      `
      UPDATE password_reset_tokens 
      SET token = $1, expires_at = $2
      WHERE id = $3
    `,
      [token, expiresAt, otpRecord.id]
    );

    return res.json({ 
      message: 'OTP verified successfully',
      token // Return token for password reset
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

