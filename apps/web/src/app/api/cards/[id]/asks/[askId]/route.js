import sql from "@/app/api/utils/sql";
import { jwtVerify } from "jose";
import { getToken } from "@auth/core/jwt"; // ADD cookie-based auth fallback without '@/auth'

// Enhance session lookup to support both mobile JWT (Authorization header)
// and cookie sessions via getToken()
async function getSession(request) {
  // 1) Try Bearer JWT from mobile first
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
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
      console.error("JWT verification failed on asks/[askId] route:", e);
      // fall through to cookie auth
    }
  }

  // 2) Fallback to cookie/session auth
  try {
    const jwt = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith("https"),
    });
    if (jwt?.sub) {
      return {
        user: {
          id: parseInt(jwt.sub),
          email: jwt.email,
          name: jwt.name,
        },
      };
    }
  } catch (e) {
    console.error("Cookie auth fallback failed on asks/[askId] route:", e);
  }

  return null;
}

async function assertOwnership(cardId, askId, userId) {
  // Verify the ask belongs to the card and the card belongs to the user
  const [row] = await sql(
    `SELECT c.user_id, a.card_id
     FROM card_asks a
     JOIN cards c ON c.id = a.card_id
     WHERE a.id = $1`,
    [askId],
  );
  if (!row) {
    return { status: 404, error: "Ask not found" };
  }
  // Normalize types to strings to avoid strict type mismatches from the driver
  if (String(row.card_id) !== String(cardId)) {
    return { status: 400, error: "Ask does not belong to this card" };
  }
  if (String(row.user_id) !== String(userId)) {
    return { status: 403, error: "Unauthorized" };
  }
  return null;
}

export async function GET(request, { params }) {
  try {
    const { id, askId } = params;
    const [ask] = await sql(
      `SELECT id, title, description, video_url, button_order, card_id
       FROM card_asks WHERE id = $1 AND card_id = $2`,
      [askId, id],
    );
    if (!ask) return Response.json({ error: "Ask not found" }, { status: 404 });
    return Response.json({ ask });
  } catch (e) {
    console.error("Error fetching ask:", e);
    return Response.json({ error: "Failed to fetch ask" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const { id, askId } = params;
    const body = await request.json();
    const { title, description, video_url, button_order } = body;

    const ownershipErr = await assertOwnership(id, askId, session.user.id);
    if (ownershipErr)
      return Response.json(
        { error: ownershipErr.error },
        { status: ownershipErr.status },
      );

    // Build dynamic update
    const sets = [];
    const vals = [];
    let idx = 0;
    if (title !== undefined) {
      idx++;
      sets.push(`title = $${idx}`);
      vals.push(title);
    }
    if (description !== undefined) {
      idx++;
      sets.push(`description = $${idx}`);
      vals.push(description);
    }
    if (video_url !== undefined) {
      idx++;
      sets.push(`video_url = $${idx}`);
      vals.push(video_url);
    }
    if (button_order !== undefined) {
      idx++;
      sets.push(`button_order = $${idx}`);
      vals.push(button_order);
    }

    if (sets.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    idx++;
    vals.push(askId);
    const [updated] = await sql(
      `UPDATE card_asks SET ${sets.join(", ")} WHERE id = $${idx} RETURNING id, title, description, video_url, button_order, card_id`,
      vals,
    );

    return Response.json({ ask: updated });
  } catch (e) {
    console.error("Error updating ask:", e);
    return Response.json({ error: "Failed to update ask" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const { id, askId } = params;

    const ownershipErr = await assertOwnership(id, askId, session.user.id);
    if (ownershipErr)
      return Response.json(
        { error: ownershipErr.error },
        { status: ownershipErr.status },
      );

    await sql(`DELETE FROM card_asks WHERE id = $1`, [askId]);
    return Response.json({ success: true });
  } catch (e) {
    console.error("Error deleting ask:", e, { params });
    return Response.json({ error: "Failed to delete ask" }, { status: 500 });
  }
}
