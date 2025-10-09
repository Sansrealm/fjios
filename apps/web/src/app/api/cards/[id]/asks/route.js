import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get asks for a card
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const asks = await sql(`
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `, [id]);
    
    return Response.json({ asks });
  } catch (error) {
    console.error('Error fetching asks:', error);
    return Response.json({ error: 'Failed to fetch asks' }, { status: 500 });
  }
}

// Create new ask for a card
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    const { title, description, video_url, button_order } = body;
    
    if (!title || !video_url) {
      return Response.json({ error: 'Title and video URL are required' }, { status: 400 });
    }
    
    // Verify card ownership
    const [card] = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (card.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Create the ask
    const [ask] = await sql(`
      INSERT INTO card_asks (card_id, title, description, video_url, button_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, title, description, video_url, button_order || 0]);
    
    return Response.json({ ask });
  } catch (error) {
    console.error('Error creating ask:', error);
    return Response.json({ error: 'Failed to create ask' }, { status: 500 });
  }
}