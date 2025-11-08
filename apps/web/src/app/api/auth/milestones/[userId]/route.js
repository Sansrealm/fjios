import sql from '@/app/api/utils/sql';

export async function GET(request, { params }) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await sql`
      SELECT milestone_flags 
      FROM auth_users 
      WHERE id = ${userId}
    `;

    if (!user.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const milestoneFlags = user[0].milestone_flags || {
      card_created: false,
      first_ask: false,
      profile_video: false,
      profile_complete: false
    };

    return Response.json({ 
      success: true, 
      milestoneFlags 
    });

  } catch (error) {
    console.error('Milestone fetch error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}