import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get messages for a card
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Verify card ownership
    const [card] = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (card.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const messages = await sql(`
      SELECT cm.*, ca.title as ask_title
      FROM card_messages cm
      LEFT JOIN card_asks ca ON cm.ask_id = ca.id
      WHERE cm.card_id = $1
      ORDER BY cm.created_at DESC
    `, [id]);
    
    return Response.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Send message to card owner
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { ask_id, sender_email, sender_name, message } = body;
    
    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Verify card exists
    const [card] = await sql('SELECT id, user_id FROM cards WHERE id = $1', [id]);
    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // Create the message
    const [newMessage] = await sql(`
      INSERT INTO card_messages (card_id, ask_id, sender_email, sender_name, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, ask_id || null, sender_email, sender_name, message]);
    
    // Get card owner's email for notification
    const [cardOwner] = await sql(`
      SELECT u.email, u.name, c.name as card_name
      FROM auth_users u 
      JOIN cards c ON u.id = c.user_id 
      WHERE c.id = $1
    `, [id]);
    
    if (cardOwner?.email) {
      // Here you would send an email notification
      // For now, we'll just log it
      console.log(`Email notification would be sent to ${cardOwner.email} about new message on card "${cardOwner.card_name}"`);
    }
    
    return Response.json({ message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// Mark messages as read
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    const { message_ids } = body;
    
    // Verify card ownership
    const [card] = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (card.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    if (message_ids && message_ids.length > 0) {
      // Mark specific messages as read
      const placeholders = message_ids.map((_, i) => `$${i + 2}`).join(',');
      await sql(`
        UPDATE card_messages 
        SET is_read = true 
        WHERE card_id = $1 AND id IN (${placeholders})
      `, [id, ...message_ids]);
    } else {
      // Mark all messages as read
      await sql(`
        UPDATE card_messages 
        SET is_read = true 
        WHERE card_id = $1
      `, [id]);
    }
    
    return Response.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return Response.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}