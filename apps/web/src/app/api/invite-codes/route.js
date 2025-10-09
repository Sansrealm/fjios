import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get invite codes for the current user
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's invite codes
    const inviteCodes = await sql(`
      SELECT id, code, is_used, used_by_user_id, expires_at, created_at
      FROM invite_codes 
      WHERE created_by_user_id = $1 
      ORDER BY created_at DESC
    `, [session.user.id]);

    // Get the current invite limit
    const [setting] = await sql(`
      SELECT setting_value FROM system_settings 
      WHERE setting_key = 'invite_limit_per_user'
    `, []);
    
    const inviteLimit = parseInt(setting?.setting_value || '20');
    const remainingInvites = Math.max(0, inviteLimit - inviteCodes.length);

    return Response.json({ 
      inviteCodes, 
      inviteLimit,
      remainingInvites,
      totalCreated: inviteCodes.length 
    });
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    return Response.json({ error: 'Failed to fetch invite codes' }, { status: 500 });
  }
}

// Create a new invite code
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the current invite limit
    const [setting] = await sql(`
      SELECT setting_value FROM system_settings 
      WHERE setting_key = 'invite_limit_per_user'
    `, []);
    
    const inviteLimit = parseInt(setting?.setting_value || '20');

    // Check how many invites the user has already created
    const [userInviteCount] = await sql(`
      SELECT COUNT(*) as count 
      FROM invite_codes 
      WHERE created_by_user_id = $1
    `, [session.user.id]);

    if (parseInt(userInviteCount.count) >= inviteLimit) {
      return Response.json({ 
        error: `You have reached the maximum limit of ${inviteLimit} invites per user.` 
      }, { status: 400 });
    }

    // Generate a unique invite code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let code;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Try to generate a unique code
    do {
      code = generateCode();
      const [existing] = await sql(`
        SELECT id FROM invite_codes WHERE code = $1
      `, [code]);
      
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return Response.json({ error: 'Failed to generate unique invite code' }, { status: 500 });
    }

    // Set expiration to 30 days from now (optional)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create the invite code
    const [newInviteCode] = await sql(`
      INSERT INTO invite_codes (code, created_by_user_id, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [code, session.user.id, expiresAt]);

    return Response.json({ 
      inviteCode: newInviteCode,
      remainingInvites: inviteLimit - parseInt(userInviteCount.count) - 1
    });
  } catch (error) {
    console.error('Error creating invite code:', error);
    return Response.json({ error: 'Failed to create invite code' }, { status: 500 });
  }
}