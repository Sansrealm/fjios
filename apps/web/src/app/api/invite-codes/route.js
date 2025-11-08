import sql from "@/app/api/utils/sql";
import { getToken } from "@auth/core/jwt";
import { createHmac } from "node:crypto";

// helper to resolve user id from either cookie session or Authorization bearer
async function resolveUserId(request) {
  // 1) Prefer explicit Authorization: Bearer <jwt> sent from mobile
  try {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const raw = authHeader.slice(7).trim();
      if (raw) {
        // Try to decode via Auth.js first (works for NextAuth & compatible JWTs)
        try {
          const jwt = await getToken({
            token: raw,
            secret: process.env.AUTH_SECRET,
          });
          if (jwt?.sub) return jwt.sub;
        } catch (_) {
          // fall through to manual verify
        }
        // Manual HS256 verification for custom-issued tokens
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
    // no-op; fall back to cookie-based token
  }

  // 2) Fallback: read from cookies (web)
  try {
    const jwt = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith("https"),
    });
    if (jwt?.sub) return jwt.sub;
  } catch (_e) {
    // no-op
  }

  return null;
}

// Get invite codes for the current user
export async function GET(request) {
  try {
    // CHANGE: use resolver to accept either cookie session or bearer
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user details to check unlimited_invites flag
    const [user] = await sql(
      `SELECT unlimited_invites FROM auth_users WHERE id = $1`,
      [userId],
    );

    // Get user's invite codes
    const inviteCodes = await sql(
      `
      SELECT id, code, is_used, used_by_user_id, expires_at, created_at
      FROM invite_codes 
      WHERE created_by_user_id = $1 
      ORDER BY created_at DESC
    `,
      [userId],
    );

    // Check if user has unlimited invites
    const hasUnlimitedInvites = user?.unlimited_invites || false;

    if (hasUnlimitedInvites) {
      return Response.json({
        inviteCodes,
        inviteLimit: null, // null indicates unlimited
        remainingInvites: null, // null indicates unlimited
        totalCreated: inviteCodes.length,
        unlimited: true,
      });
    }

    // Get the current invite limit (fallback to 25 if not configured)
    const [setting] = await sql(
      `
      SELECT setting_value FROM system_settings 
      WHERE setting_key = 'invite_limit_per_user'
    `,
      [],
    );

    const inviteLimit = parseInt(setting?.setting_value || "25");
    const remainingInvites = Math.max(0, inviteLimit - inviteCodes.length);

    return Response.json({
      inviteCodes,
      inviteLimit,
      remainingInvites,
      totalCreated: inviteCodes.length,
      unlimited: false,
    });
  } catch (error) {
    console.error("Error fetching invite codes:", error);
    return Response.json(
      { error: "Failed to fetch invite codes" },
      { status: 500 },
    );
  }
}

// Create a new invite code
export async function POST(request) {
  try {
    // CHANGE: use resolver to accept either cookie session or bearer
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user details to check unlimited_invites flag
    const [user] = await sql(
      `SELECT unlimited_invites FROM auth_users WHERE id = $1`,
      [userId],
    );

    const hasUnlimitedInvites = user?.unlimited_invites || false;
    let remainingInvites = null;

    // Only check limits if user doesn't have unlimited invites
    if (!hasUnlimitedInvites) {
      // Get the current invite limit (fallback to 25 if not configured)
      const [setting] = await sql(
        `
        SELECT setting_value FROM system_settings 
        WHERE setting_key = 'invite_limit_per_user'
      `,
        [],
      );

      const inviteLimit = parseInt(setting?.setting_value || "25");

      // Check how many invites the user has already created
      const [userInviteCount] = await sql(
        `
        SELECT COUNT(*) as count 
        FROM invite_codes 
        WHERE created_by_user_id = $1
      `,
        [userId],
      );

      if (parseInt(userInviteCount.count) >= inviteLimit) {
        return Response.json(
          {
            error: `You have reached the maximum limit of ${inviteLimit} invites per user.`,
          },
          { status: 400 },
        );
      }

      remainingInvites = inviteLimit - parseInt(userInviteCount.count) - 1;
    }

    // Generate a unique invite code
    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let code;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate a unique code
    do {
      code = generateCode();
      const [existing] = await sql(
        `
        SELECT id FROM invite_codes WHERE code = $1
      `,
        [code],
      );

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return Response.json(
        { error: "Failed to generate unique invite code" },
        { status: 500 },
      );
    }

    // Set expiration to 30 days from now (optional)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create the invite code
    const [newInviteCode] = await sql(
      `
      INSERT INTO invite_codes (code, created_by_user_id, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [code, userId, expiresAt],
    );

    return Response.json({
      inviteCode: newInviteCode,
      remainingInvites,
      unlimited: hasUnlimitedInvites,
    });
  } catch (error) {
    console.error("Error creating invite code:", error);
    return Response.json(
      { error: "Failed to create invite code" },
      { status: 500 },
    );
  }
}
