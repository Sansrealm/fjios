import sql from "@/app/api/utils/sql";
import { createHmac, timingSafeEqual } from "node:crypto";

// Inline auth helper
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
    const payload = JSON.parse(b64urlDecode(p).toString("utf8"));
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

// Check if card is saved by current user
export async function GET(request, { params }) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json({ is_saved: false });
    }

    const { id } = params;

    const [savedCard] = await sql(
      `
      SELECT id FROM saved_cards 
      WHERE user_id = $1 AND card_id = $2
    `,
      [session.user.id, id],
    );

    return Response.json({ is_saved: !!savedCard });
  } catch (error) {
    console.error("Error checking saved status:", error);
    return Response.json({ is_saved: false });
  }
}

// Save card for current user
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

    // Check if card exists
    const [card] = await sql("SELECT id FROM cards WHERE id = $1", [id]);
    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    // Save the card (ignore if already saved due to unique constraint)
    await sql(
      `
      INSERT INTO saved_cards (user_id, card_id) 
      VALUES ($1, $2) 
      ON CONFLICT (user_id, card_id) DO NOTHING
    `,
      [session.user.id, id],
    );

    return Response.json({ message: "Card saved successfully" });
  } catch (error) {
    console.error("Error saving card:", error);
    return Response.json({ error: "Failed to save card" }, { status: 500 });
  }
}

// Unsave card for current user
export async function DELETE(request, { params }) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = params;

    await sql(
      `
      DELETE FROM saved_cards 
      WHERE user_id = $1 AND card_id = $2
    `,
      [session.user.id, id],
    );

    return Response.json({ message: "Card unsaved successfully" });
  } catch (error) {
    console.error("Error unsaving card:", error);
    return Response.json({ error: "Failed to unsave card" }, { status: 500 });
  }
}
