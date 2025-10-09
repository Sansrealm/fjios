import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Validate invite code
export async function POST(request) {
  try {
    const body = await request.json();
    const { code } = body;
    
    if (!code) {
      return Response.json({ error: 'Invite code is required' }, { status: 400 });
    }
    
    const [inviteCode] = await sql(`
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [code]);
    
    if (!inviteCode) {
      return Response.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }
    
    return Response.json({ valid: true, message: 'Invite code is valid' });
  } catch (error) {
    console.error('Error validating invite code:', error);
    return Response.json({ error: 'Failed to validate invite code' }, { status: 500 });
  }
}

// Use invite code (mark as used)
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await request.json();
    const { code } = body;
    
    if (!code) {
      return Response.json({ error: 'Invite code is required' }, { status: 400 });
    }
    
    // Check if code is valid and unused
    const [inviteCode] = await sql(`
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [code]);
    
    if (!inviteCode) {
      return Response.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }
    
    // Mark as used
    await sql(`
      UPDATE invite_codes 
      SET is_used = true, used_by_user_id = $1 
      WHERE code = $2
    `, [session.user.id, code]);
    
    return Response.json({ message: 'Invite code used successfully' });
  } catch (error) {
    console.error('Error using invite code:', error);
    return Response.json({ error: 'Failed to use invite code' }, { status: 500 });
  }
}