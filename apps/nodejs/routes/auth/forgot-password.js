import { sql } from '../../utils/database.js';
import { sendEmail } from '../../utils/send-email.js';
import { randomBytes } from 'node:crypto';

export default async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const users = await sql(
      `
      SELECT id, email FROM auth_users 
      WHERE email = $1
    `,
      [email]
    );

    // Always respond with generic message to avoid user enumeration
    const genericOk = {
      message:
        'If an account with this email exists, you will receive a password reset link.',
    };

    if (users.length === 0) {
      return res.json(genericOk);
    }

    const user = users[0];

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store the token in database
    await sql(
      `
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES ($1, $2, $3)
    `,
      [token, user.id, expiresAt]
    );

    // Create reset link
    const baseUrl =
      process.env.APP_URL || process.env.EXPO_PUBLIC_BASE_URL || '';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>You requested a password reset for your account. Click the link below to create a new password:</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #8FAEA2; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.</p>
            <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: #8FAEA2;">${resetUrl}</a></p>
          </div>
        `,
        text: `Reset Your Password\n\n${resetUrl}\n\nThis link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.`,
      });

      return res.json(genericOk);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);

      // Clean up the token since email failed
      await sql(
        `
        DELETE FROM password_reset_tokens 
        WHERE token = $1
      `,
        [token]
      );

      return res.status(500).json({
        error:
          'Failed to send reset email. Please configure your email provider.',
      });
    }
  } catch (error) {
    console.error('Error in forgot password:', error);
    return res
      .status(500)
      .json({ error: 'Failed to process password reset request' });
  }
}

