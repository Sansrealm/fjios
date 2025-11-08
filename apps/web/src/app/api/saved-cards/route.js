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

// Get saved cards for current user
export async function GET(request) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const savedCards = await sql(
      `
      SELECT c.*, u.email as user_email, sc.created_at as saved_at
      FROM saved_cards sc
      JOIN cards c ON sc.card_id = c.id
      JOIN auth_users u ON c.user_id = u.id
      WHERE sc.user_id = $1
      ORDER BY sc.created_at DESC
    `,
      [session.user.id],
    );

    // Get industry tags and asks for each saved card
    for (let card of savedCards) {
      const tags = await sql(
        `
        SELECT it.id, it.name, it.color 
        FROM industry_tags it 
        JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
        WHERE cit.card_id = $1
      `,
        [card.id],
      );
      card.industry_tags = tags;

      const asks = await sql(
        `
        SELECT id, title, description, video_url, button_order 
        FROM card_asks 
        WHERE card_id = $1 
        ORDER BY button_order ASC
      `,
        [card.id],
      );
      card.asks = asks;
    }

    return Response.json({ saved_cards: savedCards });
  } catch (error) {
    console.error("Error fetching saved cards:", error);
    return Response.json(
      { error: "Failed to fetch saved cards" },
      { status: 500 },
    );
  }
}
