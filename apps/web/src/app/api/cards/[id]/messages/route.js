import sql from "@/app/api/utils/sql";
import { jwtVerify } from "jose";
import { sendEmail } from "@/app/api/utils/send-email"; // ADD: send email notifications

// Helper to get session from mobile/web Bearer token
async function getSession(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      if (payload?.sub) {
        return {
          user: {
            id: parseInt(payload.sub),
            email: payload.email,
            name: payload.name,
          },
        };
      }
    } catch (e) {
      console.error("JWT verify failed on messages route:", e);
    }
  }
  return null;
}

// Get messages for a card
export async function GET(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = params;

    // Verify card ownership
    const [card] = await sql("SELECT user_id FROM cards WHERE id = $1", [id]);
    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }
    if (card.user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const messages = await sql(
      `
      SELECT cm.*, ca.title as ask_title
      FROM card_messages cm
      LEFT JOIN card_asks ca ON cm.ask_id = ca.id
      WHERE cm.card_id = $1
      ORDER BY cm.created_at DESC
    `,
      [id],
    );

    return Response.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

// Send message to card owner (public)
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { ask_id, sender_email, sender_name, message } = body;

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Verify card exists
    const [card] = await sql("SELECT id, user_id FROM cards WHERE id = $1", [
      id,
    ]);
    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    // Create the message
    const [newMessage] = await sql(
      `
      INSERT INTO card_messages (card_id, ask_id, sender_email, sender_name, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [id, ask_id || null, sender_email, sender_name, message],
    );

    // Get card owner's email for notification
    const [cardOwner] = await sql(
      `
      SELECT u.email, u.name, c.name as card_name
      FROM auth_users u 
      JOIN cards c ON u.id = c.user_id 
      WHERE c.id = $1
    `,
      [id],
    );

    // Fetch ask title if provided
    let askTitle = null;
    if (ask_id) {
      const [ask] = await sql("SELECT title FROM card_asks WHERE id = $1", [
        ask_id,
      ]);
      askTitle = ask?.title || null;
    }

    if (cardOwner?.email) {
      const subject = `${askTitle ? `New message about "${askTitle}"` : "New message"} on ${cardOwner.card_name}`;
      const safeSender = sender_name || sender_email || "Someone";
      const text = `Hi ${cardOwner.name || "there"},\n\nYou have a new message on your card "${cardOwner.card_name}":\n\nFrom: ${safeSender}${sender_email ? ` <${sender_email}>` : ""}\n${askTitle ? `Regarding: ${askTitle}\n` : ""}\nMessage:\n${message}\n\nYou can reply directly to the sender by responding to this email.`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; font-size: 14px; color: #111">
          <p>Hi ${cardOwner.name || "there"},</p>
          <p>You have a new message on your card <strong>${cardOwner.card_name}</strong>.</p>
          <p><strong>From:</strong> ${safeSender}${sender_email ? ` &lt;${sender_email}&gt;` : ""}</p>
          ${askTitle ? `<p><strong>Regarding:</strong> ${askTitle}</p>` : ""}
          <p><strong>Message:</strong></p>
          <blockquote style="margin: 0; padding: 12px; background: #f6f6f6; border-left: 3px solid #8FAEA2; white-space: pre-wrap;">${message.replace(
            /</g,
            "&lt;",
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
          // ADD: set Reply-To so replies go to the original sender when available
          replyTo: sender_email || undefined,
        });
      } catch (emailErr) {
        // Log but don't fail the API; message has been stored
        console.error("Failed to send notification email:", emailErr);
      }
    }

    return Response.json({ message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// Mark messages as read
export async function PUT(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = params;
    const body = await request.json();
    const { message_ids } = body;

    // Verify card ownership
    const [card] = await sql("SELECT user_id FROM cards WHERE id = $1", [id]);
    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }
    if (card.user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (message_ids && message_ids.length > 0) {
      // Mark specific messages as read
      const placeholders = message_ids.map((_, i) => `$${i + 2}`).join(",");
      await sql(
        `
        UPDATE card_messages 
        SET is_read = true 
        WHERE card_id = $1 AND id IN (${placeholders})
      `,
        [id, ...message_ids],
      );
    } else {
      // Mark all messages as read
      await sql(
        `
        UPDATE card_messages 
        SET is_read = true 
        WHERE card_id = $1
      `,
        [id],
      );
    }

    return Response.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return Response.json(
      { error: "Failed to mark messages as read" },
      { status: 500 },
    );
  }
}
