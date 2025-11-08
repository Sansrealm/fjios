import sql from "@/app/api/utils/sql";
import { createHmac, timingSafeEqual } from "node:crypto";

// Inline auth helper to verify Bearer JWT from headers
function b64urlDecode(input) {
  try {
    const pad = 4 - (input.length % 4 || 4);
    const normalized =
      input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad % 4);
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}
function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function signHS256(data, secret) {
  const h = createHmac("sha256", secret);
  h.update(data);
  return h.digest();
}
function parseBearer(v) {
  if (!v) return null;
  const p = v.split(" ");
  return p.length === 2 && /^Bearer$/i.test(p[0]) ? p[1] : null;
}
async function auth(request) {
  try {
    if (!request?.headers?.get) return null;
    const secret = process.env.AUTH_SECRET || "secret";
    const header =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      request.headers.get("x-authorization") ||
      request.headers.get("X-Authorization");
    const token = parseBearer(header);
    if (!token) return null;
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const expected = b64urlEncode(signHS256(`${h}.${p}`, secret));
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
    const payloadBuf = b64urlDecode(p);
    if (!payloadBuf) return null;
    const payload = JSON.parse(payloadBuf.toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && now >= payload.exp) return null;
    const idNum = Number(payload.sub);
    return {
      user: {
        id: Number.isNaN(idNum) ? payload.sub : idNum,
        email: payload.email || null,
        name: payload.name || null,
      },
    };
  } catch (e) {
    console.error("auth() error:", e);
    return null;
  }
}

// Get asks for a card
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const asks = await sql(
      `
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `,
      [id],
    );

    return Response.json({ asks });
  } catch (error) {
    console.error("Error fetching asks:", error);
    return Response.json({ error: "Failed to fetch asks" }, { status: 500 });
  }
}

// Create new ask for a card
export async function POST(request, { params }) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = params;
    const body = await request.json();
    const { title, description, video_url, button_order } = body;

    if (!title || !video_url) {
      return Response.json(
        { error: "Title and video URL are required" },
        { status: 400 },
      );
    }

    // Verify card ownership
    const [card] = await sql("SELECT user_id FROM cards WHERE id = $1", [id]);
    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }
    if (card.user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create the ask
    const [ask] = await sql(
      `
      INSERT INTO card_asks (card_id, title, description, video_url, button_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [id, title, description, video_url, button_order || 0],
    );

    return Response.json({ ask });
  } catch (error) {
    console.error("Error creating ask:", error);
    return Response.json({ error: "Failed to create ask" }, { status: 500 });
  }
}
