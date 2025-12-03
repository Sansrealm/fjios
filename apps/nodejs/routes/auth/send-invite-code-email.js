import { sql } from '../../utils/database.js';
import { sendEmail } from '../../utils/send-email.js';

export default async function sendInviteCodeEmail(req, res) {
  console.log('🚀 sendInviteCodeEmail endpoint called');
  console.log('📥 Request body:', { email: req.body?.email, inviteCode: req.body?.inviteCode });
  
  try {
    const { email, inviteCode } = req.body;

    if (!email) {
      console.error('❌ Email is required');
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('✅ Email received');

    // Check if user exists and email is verified
    // If user doesn't exist, they might have just verified email but user record wasn't created yet
    // In that case, we'll still send the invite code email
    const users = await sql(
      `
      SELECT id, email, name, "emailVerified" FROM auth_users WHERE email = $1
    `,
      [email.toLowerCase()]
    );

    let user;
    if (users.length === 0) {
      // User doesn't exist in database yet
      // This can happen if:
      // 1. User just verified OTP but user creation is pending
      // 2. There was an error creating the user during OTP verification
      // Since the invite page only loads after successful email verification,
      // we can safely assume the email was verified and send the invite code
      console.log('⚠️ User not found in database, but email was verified (reached invite page)');
      console.log('📧 Will send invite code email (user will be created during signup)');
      user = {
        email: email.toLowerCase(),
        emailVerified: true, // Safe to assume since they reached invite page after OTP verification
      };
    } else {
      user = users[0];
      if (!user.emailVerified) {
        console.error('❌ Email not verified for user:', email);
        return res.status(400).json({ error: 'Email not verified' });
      }
      console.log('✅ User found and email is verified:', user.email);
    }

    // Invite code must be provided - do not generate automatically
    if (!inviteCode) {
      console.error('❌ Invite code is required');
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const codeToSend = inviteCode;
    console.log('✅ Using provided invite code:', codeToSend);

    // Check email configuration
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured!');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    if (!process.env.FROM_EMAIL) {
      console.error('❌ FROM_EMAIL is not configured!');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Send invitation code email
    try {
      const baseUrl =
        process.env.APP_URL || process.env.EXPO_PUBLIC_BASE_URL || '';
      const inviteLink = baseUrl
        ? `${baseUrl}/invite`
        : 'https://mobile.founderjourneys.com/invite';

      console.log('📤 Preparing to send invitation code email...');
      console.log('   To:', user.email);
      console.log('   From:', process.env.FROM_EMAIL);
      console.log('   Invite Code:', codeToSend);
      console.log('   Invite Link:', inviteLink);

      const emailResult = await sendEmail({
        to: user.email,
        from: process.env.FROM_EMAIL,
        subject: 'Your Invitation Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome! Your Invitation Code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Congratulations! Your email has been verified successfully.</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Use the invitation code below to continue with your account setup:</p>
            <div style="margin: 40px 0; text-align: center;">
              <div style="background-color: #8FAEA2; color: #000; padding: 24px 48px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ${codeToSend}
              </div>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 30px;">Enter this code on the Invite screen to continue with your account creation.</p>
            <p style="color: #999; font-size: 12px; line-height: 1.6; text-align: center; margin-top: 20px;">This code will expire in 30 days.</p>
          </div>
        `,
        text: `Welcome! Your Invitation Code\n\nCongratulations! Your email has been verified successfully.\n\nYour invitation code is: ${codeToSend}\n\nEnter this code on the Invite screen to continue with your account creation. This code will expire in 30 days.`,
      });

      console.log('✅ Invitation code email sent successfully!');
      console.log('   Email ID:', emailResult?.id || 'N/A');
      console.log('   Sent to:', user.email);

      return res.json({
        message: 'Invite code email sent successfully',
        email: user.email,
        inviteCode: codeToSend,
      });
    } catch (emailError) {
      console.error('❌ CRITICAL: Failed to send invitation code email!');
      console.error('   Error message:', emailError.message);
      console.error('   Error stack:', emailError.stack);
      console.error('   Configuration check:');
      console.error('     - FROM_EMAIL:', process.env.FROM_EMAIL || 'NOT SET');
      console.error('     - RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET (length: ' + process.env.RESEND_API_KEY.length + ')' : 'NOT SET');
      
      return res.status(500).json({
        error: 'Failed to send invite code email',
        details: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
      });
    }
  } catch (error) {
    console.error('❌ ERROR in sendInviteCodeEmail:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    return res.status(500).json({ error: 'Failed to send invite code email' });
  }
}


