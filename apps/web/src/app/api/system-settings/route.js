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

// Get system settings
export async function GET(request) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const settings = await sql(`
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      ORDER BY setting_key
    `);

    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description,
      };
    });

    return Response.json({ settings: settingsMap });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return Response.json(
      { error: "Failed to fetch system settings" },
      { status: 500 },
    );
  }
}

// Update system settings (admin only for now - in production you'd want proper admin checks)
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
    const { setting_key, setting_value } = body;

    if (!setting_key || setting_value === undefined) {
      return Response.json(
        { error: "setting_key and setting_value are required" },
        { status: 400 },
      );
    }

    // Validate specific settings
    if (setting_key === "invite_limit_per_user") {
      const limit = parseInt(setting_value);
      if (isNaN(limit) || limit < 0 || limit > 1000) {
        return Response.json(
          {
            error: "invite_limit_per_user must be a number between 0 and 1000",
          },
          { status: 400 },
        );
      }
    }

    // Update the setting
    await sql(
      `
      UPDATE system_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = $2
    `,
      [setting_value.toString(), setting_key],
    );

    // Get the updated setting
    const [updatedSetting] = await sql(
      `
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      WHERE setting_key = $1
    `,
      [setting_key],
    );

    if (!updatedSetting) {
      return Response.json({ error: "Setting not found" }, { status: 404 });
    }

    return Response.json({
      setting: {
        key: updatedSetting.setting_key,
        value: updatedSetting.setting_value,
        description: updatedSetting.description,
      },
    });
  } catch (error) {
    console.error("Error updating system setting:", error);
    return Response.json(
      { error: "Failed to update system setting" },
      { status: 500 },
    );
  }
}
