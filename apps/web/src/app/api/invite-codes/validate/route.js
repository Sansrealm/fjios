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

// Validate invite code
export async function POST(request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return Response.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    const [inviteCode] = await sql(
      `
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      [code],
    );

    if (!inviteCode) {
      return Response.json(
        { error: "Invalid or expired invite code" },
        { status: 400 },
      );
    }

    return Response.json({ valid: true, message: "Invite code is valid" });
  } catch (error) {
    console.error("Error validating invite code:", error);
    return Response.json(
      { error: "Failed to validate invite code" },
      { status: 500 },
    );
  }
}

// Use invite code (mark as used)
export async function PUT(request) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return Response.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    // Check if code is valid and unused
    const [inviteCode] = await sql(
      `
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      [code],
    );

    if (!inviteCode) {
      return Response.json(
        { error: "Invalid or expired invite code" },
        { status: 400 },
      );
    }

    // Mark as used
    await sql(
      `
      UPDATE invite_codes 
      SET is_used = true, used_by_user_id = $1 
      WHERE code = $2
    `,
      [session.user.id, code],
    );

    return Response.json({ message: "Invite code used successfully" });
  } catch (error) {
    console.error("Error using invite code:", error);
    return Response.json(
      { error: "Failed to use invite code" },
      { status: 500 },
    );
  }
}
