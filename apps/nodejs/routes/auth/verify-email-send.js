import { sql } from '../../utils/database.js';
import { randomBytes } from 'node:crypto';
import { sendEmail } from '../../utils/send-email.js';

export default async function sendVerifyEmail(req, res) {
  try {
    const email = (req.body?.email || '').toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const users = await sql(
      `
      SELECT id, email, "emailVerified" FROM auth_users WHERE email = $1
    `,
      [email]
    );

    // Always respond generically for privacy
    const genericOk = {
      message: 'If this email exists, a verification link has been sent.',
    };

    if (users.length === 0) {
      return res.json(genericOk);
    }

    const user = users[0];

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    // Clear any existing tokens for this email
    await sql(
      `
      DELETE FROM auth_verification_token WHERE identifier = $1
    `,
      [email]
    );

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await sql(
      `
      INSERT INTO auth_verification_token (identifier, token, expires)
      VALUES ($1, $2, $3)
    `,
      [email, token, expiresAt]
    );

    const baseUrl =
      process.env.APP_URL || process.env.EXPO_PUBLIC_BASE_URL || '';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    try {
      await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: 'Verify your email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email</h2>
            <p>Please confirm your email to activate your account.</p>
            <div style="margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #8FAEA2; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #8FAEA2;">${verifyUrl}</a></p>
          </div>
        `,
        text: `Verify your email: ${verifyUrl}`,
      });

      return res.json(genericOk);
    } catch (emailError) {
      return res
        .status(500)
        .json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

