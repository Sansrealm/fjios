import sql from "@/app/api/utils/sql";
import { getToken } from "@auth/core/jwt";
import { createHmac } from "node:crypto";

// Resolve current user id from Authorization: Bearer <jwt> (mobile) or cookie session (web)
async function resolveUserId(request) {
  // 1) Bearer token from mobile
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const raw = authHeader.slice(7).trim();
      if (raw) {
        // Try Auth.js parse first
        try {
          const jwt = await getToken({ token: raw, secret: process.env.AUTH_SECRET });
          if (jwt?.sub) return String(jwt.sub);
        } catch (_) {
          // fall through
        }
        // Manual HS256 verify
        try {
          const [headerB64, payloadB64, signature] = raw.split(".");
          if (headerB64 && payloadB64 && signature) {
            const data = `${headerB64}.${payloadB64}`;
            const hmac = createHmac("sha256", process.env.AUTH_SECRET || "");
            hmac.update(data);
            const expected = hmac
              .digest("base64")
              .replace(/=/g, "")
              .replace(/\+/g, "-")
              .replace(/\//g, "_");
            if (expected === signature) {
              const json = JSON.parse(
                Buffer.from(
                  payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
                  "base64",
                ).toString("utf8"),
              );
              if (json?.sub) return String(json.sub);
            }
          }
        } catch (_) {
          // ignore
        }
      }
    }
  } catch (_e) {
    // no-op
  }

  // 2) Cookie-based (web)
  try {
    const jwt = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith("https"),
    });
    if (jwt?.sub) return String(jwt.sub);
  } catch (_e) {
    // no-op
  }

  return null;
}

export async function DELETE(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // Ensure user exists
    const [user] = await sql("SELECT id FROM auth_users WHERE id = $1", [userId]);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Deleting the user cascades to related tables via FK constraints
    const [deleted] = await sql(
      "DELETE FROM auth_users WHERE id = $1 RETURNING id",
      [userId]
    );

    if (!deleted) {
      return Response.json({ error: "Could not delete account" }, { status: 500 });
    }

    // Best-effort: clear auth cookie for web (if any); name depends on upstream auth.
    const headers = new Headers({ "Content-Type": "application/json" });
    // Attempt to clear common cookie names used by this app
    headers.append(
      "Set-Cookie",
      `next-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );
    headers.append(
      "Set-Cookie",
      `__Secure-next-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
