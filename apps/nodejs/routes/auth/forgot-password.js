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
        'If an account with this email exists, you will receive an OTP to reset your password.',
    };

    if (users.length === 0) {
      return res.json(genericOk);
    }

    const user = users[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 15 minutes from now for OTP
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Store the OTP in token field (we'll verify it and then generate actual token)
    // Format: "otp:123456" where 123456 is the OTP
    await sql(
      `
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES ($1, $2, $3)
    `,
      [`otp:${otp}`, user.id, expiresAt]
    );

    try {
      await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: 'Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset OTP</h2>
            <p>You requested a password reset for your account. Use the OTP below to verify your identity:</p>
            <div style="margin: 30px 0; text-align: center;">
              <div style="background-color: #8FAEA2; color: #000; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${otp}
              </div>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 15 minutes. If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
        `,
        text: `Password Reset OTP\n\nYour OTP is: ${otp}\n\nThis OTP will expire in 15 minutes. If you didn't request this password reset, you can safely ignore this email.`,
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

