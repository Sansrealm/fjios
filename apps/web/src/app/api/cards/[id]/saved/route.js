import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Check if card is saved by current user
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ is_saved: false });
    }
    
    const { id } = params;
    
    const [savedCard] = await sql(`
      SELECT id FROM saved_cards 
      WHERE user_id = $1 AND card_id = $2
    `, [session.user.id, id]);
    
    return Response.json({ is_saved: !!savedCard });
  } catch (error) {
    console.error('Error checking saved status:', error);
    return Response.json({ is_saved: false });
  }
}

// Save card for current user
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Check if card exists
    const [card] = await sql('SELECT id FROM cards WHERE id = $1', [id]);
    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // Save the card (ignore if already saved due to unique constraint)
    await sql(`
      INSERT INTO saved_cards (user_id, card_id) 
      VALUES ($1, $2) 
      ON CONFLICT (user_id, card_id) DO NOTHING
    `, [session.user.id, id]);
    
    return Response.json({ message: 'Card saved successfully' });
  } catch (error) {
    console.error('Error saving card:', error);
    return Response.json({ error: 'Failed to save card' }, { status: 500 });
  }
}

// Unsave card for current user
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    
    await sql(`
      DELETE FROM saved_cards 
      WHERE user_id = $1 AND card_id = $2
    `, [session.user.id, id]);
    
    return Response.json({ message: 'Card unsaved successfully' });
  } catch (error) {
    console.error('Error unsaving card:', error);
    return Response.json({ error: 'Failed to unsave card' }, { status: 500 });
  }
}