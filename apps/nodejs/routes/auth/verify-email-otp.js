import { sql } from '../../utils/database.js';

export default async function verifyEmailOtp(req, res) {
  console.log('🚀 verifyEmailOtp endpoint called');
  console.log('📥 Request body:', { email: req.body?.email, otp: req.body?.otp ? '***' : undefined });
  
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      console.error('❌ Missing email or OTP in request');
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    console.log('✅ Email and OTP received, starting verification...');

    // Find the OTP record for this email
    const otpRecords = await sql(
      `
      SELECT * FROM auth_verification_token 
      WHERE identifier = $1
      AND token LIKE $2
      AND expires > CURRENT_TIMESTAMP
      ORDER BY expires DESC
      LIMIT 1
    `,
      [email.toLowerCase(), `otp:${otp}`]
    );

    if (otpRecords.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const otpRecord = otpRecords[0];

    // Check if user exists and if they already have an account (password)
    const existingUsers = await sql(
      `
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u."emailVerified",
        a.password IS NOT NULL as has_password
      FROM auth_users u
      LEFT JOIN auth_accounts a ON a."userId" = u.id AND a.type = 'credentials'
      WHERE u.email = $1
    `,
      [otpRecord.identifier]
    );

    let user;
    
    // If user doesn't exist, create them
    if (existingUsers.length === 0) {
      console.log('📝 User not found, creating new user record for:', otpRecord.identifier);
      const newUsers = await sql(
        `
        INSERT INTO auth_users (email, "emailVerified")
        VALUES ($1, NOW())
        RETURNING id, email, name, "emailVerified"
      `,
        [otpRecord.identifier]
      );
      user = newUsers[0];
      console.log('✅ User created and email verified:', user.email, 'User ID:', user.id);
    } else {
      const existingUser = existingUsers[0];

      // If user already has a password, they're trying to verify email for an existing account
      // This shouldn't happen in the signup flow - they should sign in instead
      if (existingUser.has_password) {
        console.log('⚠️ User already has an account with password:', existingUser.email);
        return res.status(409).json({ 
          error: 'An account with this email already exists. Please sign in instead.',
          existingAccount: true
        });
      }

      // Verify the user's email (for new users without password)
      const users = await sql(
        `
        UPDATE auth_users
        SET "emailVerified" = NOW()
        WHERE email = $1
        RETURNING id, email, name, "emailVerified"
      `,
        [otpRecord.identifier]
      );

      user = users[0];
      console.log('✅ Email verified for user:', user.email, 'User ID:', user.id);
    }

    // Clean up token(s) for this identifier
    await sql(
      `
      DELETE FROM auth_verification_token WHERE identifier = $1
    `,
      [otpRecord.identifier]
    );
    console.log('🧹 Cleaned up OTP tokens');

    // Return success response without invite code
    const response = {
      message: 'Email verified successfully',
      email: user.email,
      user,
    };
    
    console.log('✅ Sending response:', { ...response, user: { ...response.user, id: response.user.id } });
    
    return res.json(response);
  } catch (error) {
    console.error('❌ ERROR in verifyEmailOtp:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to verify email OTP' });
  }
}

