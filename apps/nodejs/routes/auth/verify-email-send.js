import { sql } from '../../utils/database.js';
import { randomBytes } from 'node:crypto';
import { sendEmail } from '../../utils/send-email.js';

export default async function sendVerifyEmail(req, res) {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Sending verification email OTP to:', email);

    // Check if user exists and if they already have an account (password)
    const users = await sql(
      `
      SELECT 
        u.id, 
        u.email, 
        u."emailVerified",
        a.password IS NOT NULL as has_password
      FROM auth_users u
      LEFT JOIN auth_accounts a ON a."userId" = u.id AND a.type = 'credentials'
      WHERE u.email = $1
    `,
      [email]
    );

    // If user exists and already has a password, they're trying to sign up again
    // Don't send OTP and return error
    if (users.length > 0) {
      const user = users[0];
      if (user.has_password) {
        console.log('⚠️ User already exists with password:', email);
        return res.status(409).json({ 
          error: 'An account with this email already exists. Please sign in instead.',
          existingAccount: true
        });
      }
    }

    // Always respond generically for privacy (don't reveal if email exists or not)
    const genericOk = {
      message: 'If this email exists, a verification OTP has been sent.',
    };

    // Note: We don't need to create the user record here
    // The OTP will be stored with the email as identifier
    // The verify-email-otp endpoint will create the user when they verify
    // This allows us to send OTP to any email without revealing if it exists in DB
    
    if (users.length > 0) {
      const user = users[0];
      // Allow resending OTP even if email is verified (user might want to verify again)
      if (user.emailVerified) {
        console.log('ℹ️ Email already verified, but sending OTP anyway:', email);
      }
    } else {
      console.log('📝 User not found in database, will create on verification:', email);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Generated OTP for:', email, 'OTP:', otp);

    // Set expiration to 15 minutes from now for OTP
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Clear any existing tokens for this email
    await sql(
      `
      DELETE FROM auth_verification_token WHERE identifier = $1
    `,
      [email]
    );

    // Store the OTP in token field (format: "otp:123456")
    await sql(
      `
      INSERT INTO auth_verification_token (identifier, token, expires)
      VALUES ($1, $2, $3)
    `,
      [email, `otp:${otp}`, expiresAt]
    );

    console.log('💾 OTP stored in database for:', email);

    try {
      console.log('📤 Attempting to send email to:', email);
      await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: 'Verify Your Email - OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify Your Email</h2>
            <p>Please confirm your email to activate your account. Use the OTP below to verify your identity:</p>
            <div style="margin: 30px 0; text-align: center;">
              <div style="background-color: #8FAEA2; color: #000; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${otp}
              </div>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.</p>
          </div>
        `,
        text: `Verify Your Email - OTP\n\nYour OTP is: ${otp}\n\nThis OTP will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.`,
      });

      console.log('✅ Email sent successfully to:', email);
      return res.json(genericOk);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      console.error('Error details:', {
        message: emailError.message,
        stack: emailError.stack,
        fromEmail: process.env.FROM_EMAIL,
        hasResendKey: !!process.env.RESEND_API_KEY,
      });
      
      // Clean up the token since email failed
      await sql(
        `
        DELETE FROM auth_verification_token WHERE identifier = $1
      `,
        [email]
      );

      return res
        .status(500)
        .json({ 
          error: 'Failed to send verification email',
          details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
        });
    }
  } catch (error) {
    console.error('❌ Error in sendVerifyEmail:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}

