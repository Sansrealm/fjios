import sql from '@/app/api/utils/sql';

export async function POST(request) {
  try {
    const { userId, milestone } = await request.json();
    
    if (!userId || !milestone) {
      return Response.json({ error: 'userId and milestone are required' }, { status: 400 });
    }

    // Get current milestone flags
    const user = await sql`
      SELECT milestone_flags 
      FROM auth_users 
      WHERE id = ${userId}
    `;

    if (!user.length) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const currentFlags = user[0].milestone_flags || {};
    
    // Only update if milestone hasn't been completed yet
    if (currentFlags[milestone] === true) {
      return Response.json({ 
        success: true, 
        alreadyCompleted: true,
        milestoneFlags: currentFlags 
      });
    }

    // Update the milestone flag
    const updatedFlags = {
      ...currentFlags,
      [milestone]: true
    };

    await sql`
      UPDATE auth_users 
      SET milestone_flags = ${JSON.stringify(updatedFlags)}
      WHERE id = ${userId}
    `;

    return Response.json({ 
      success: true, 
      alreadyCompleted: false,
      milestoneFlags: updatedFlags 
    });

  } catch (error) {
    console.error('Milestone update error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}