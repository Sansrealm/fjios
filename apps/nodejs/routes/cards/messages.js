import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';
import { sendEmail } from '../../utils/send-email.js';

const router = express.Router({ mergeParams: true });

// Get messages for a card
router.get('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Verify card ownership
    const cards = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (cards[0].user_id !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const messages = await sql(
      `
      SELECT cm.*, ca.title as ask_title
      FROM card_messages cm
      LEFT JOIN card_asks ca ON cm.ask_id = ca.id
      WHERE cm.card_id = $1
      ORDER BY cm.created_at DESC
    `,
      [id]
    );

    return res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message to card owner (public)
router.post('/', async (req, res) => {
  try {
    const { id } = req.params;
    const { ask_id, sender_email, sender_name, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify card exists
    const cards = await sql('SELECT id, user_id FROM cards WHERE id = $1', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Create the message
    const newMessages = await sql(
      `
      INSERT INTO card_messages (card_id, ask_id, sender_email, sender_name, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [id, ask_id || null, sender_email, sender_name, message]
    );

    const newMessage = newMessages[0];

    // Get card owner's email for notification
    const cardOwners = await sql(
      `
      SELECT u.email, u.name, c.name as card_name
      FROM auth_users u 
      JOIN cards c ON u.id = c.user_id 
      WHERE c.id = $1
    `,
      [id]
    );

    const cardOwner = cardOwners[0];

    // Fetch ask title if provided
    let askTitle = null;
    if (ask_id) {
      const asks = await sql('SELECT title FROM card_asks WHERE id = $1', [
        ask_id,
      ]);
      askTitle = asks[0]?.title || null;
    }

    if (cardOwner?.email) {
      const subject = `${askTitle ? `New message about "${askTitle}"` : 'New message'} on ${cardOwner.card_name}`;
      const safeSender = sender_name || sender_email || 'Someone';
      const text = `Hi ${cardOwner.name || 'there'},\n\nYou have a new message on your card "${cardOwner.card_name}":\n\nFrom: ${safeSender}${sender_email ? ` <${sender_email}>` : ''}\n${askTitle ? `Regarding: ${askTitle}\n` : ''}\nMessage:\n${message}\n\nYou can reply directly to the sender by responding to this email.`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; font-size: 14px; color: #111">
          <p>Hi ${cardOwner.name || 'there'},</p>
          <p>You have a new message on your card <strong>${cardOwner.card_name}</strong>.</p>
          <p><strong>From:</strong> ${safeSender}${sender_email ? ` &lt;${sender_email}&gt;` : ''}</p>
          ${askTitle ? `<p><strong>Regarding:</strong> ${askTitle}</p>` : ''}
          <p><strong>Message:</strong></p>
          <blockquote style="margin: 0; padding: 12px; background: #f6f6f6; border-left: 3px solid #8FAEA2; white-space: pre-wrap;">${message.replace(
            /</g,
            '&lt;'
          )}</blockquote>
          <p style="color:#555;">Reply directly to continue the conversation.</p>
        </div>
      `;

      try {
        await sendEmail({
          to: cardOwner.email,
          subject,
          html,
          text,
          replyTo: sender_email || undefined,
        });
      } catch (emailErr) {
        console.error('Failed to send notification email:', emailErr);
      }
    }

    return res.json({ message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { message_ids } = req.body;

    // Verify card ownership
    const cards = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (cards.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    if (cards[0].user_id !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (message_ids && message_ids.length > 0) {
      // Mark specific messages as read
      const placeholders = message_ids.map((_, i) => `$${i + 2}`).join(',');
      await sql(
        `
        UPDATE card_messages 
        SET is_read = true 
        WHERE card_id = $1 AND id IN (${placeholders})
      `,
        [id, ...message_ids]
      );
    } else {
      // Mark all messages as read
      await sql(
        `
        UPDATE card_messages 
        SET is_read = true 
        WHERE card_id = $1
      `,
        [id]
      );
    }

    return res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

export default router;

