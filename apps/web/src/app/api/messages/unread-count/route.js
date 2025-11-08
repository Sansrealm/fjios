import sql from '@/app/api/utils/sql';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get count of unread messages for cards owned by this user
    const result = await sql`
      SELECT COUNT(*) as unread_count
      FROM card_messages cm
      JOIN cards c ON cm.card_id = c.id
      WHERE c.user_id = ${userId}
      AND cm.is_read = false
    `;

    const unreadCount = parseInt(result[0]?.unread_count || 0);

    return Response.json({ 
      success: true, 
      unreadCount 
    });

  } catch (error) {
    console.error('Unread count fetch error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}