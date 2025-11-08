import sql from "@/app/api/utils/sql";
import { verify } from "argon2";
import { createHmac, timingSafeEqual } from "node:crypto";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signToken(payloadObj) {
  // REQUIRE a configured AUTH_SECRET; never fallback in production
  const secret = process.env.AUTH_SECRET; // removed insecure default
  if (!secret) {
    throw new Error("AUTH_SECRET not configured");
  }
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payloadObj));
  const data = `${headerB64}.${payloadB64}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(data);
  const signature = base64url(hmac.digest());
  return `${data}.${signature}`;
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Find user by email
    const [user] = await sql(
      `
      SELECT u.*, a.password 
      FROM auth_users u 
      JOIN auth_accounts a ON u.id = a."userId" 
      WHERE u.email = $1 AND a.type = 'credentials'
    `,
      [email.toLowerCase()],
    );

    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password using argon2 if it looks like an argon2 hash; otherwise fallback to legacy plain text
    let isPasswordValid = false;
    try {
      if (
        typeof user.password === "string" &&
        user.password.startsWith("$argon2")
      ) {
        isPasswordValid = await verify(user.password, password);
      } else {
        isPasswordValid = user.password === password;
      }
    } catch (e) {
      isPasswordValid = user.password === password;
    }

    if (!isPasswordValid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate HMAC-signed token (JWT-compatible structure without external libs)
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      sub: String(user.id),
      email: user.email,
      name: user.name,
      iat: nowSec,
      exp: nowSec + 60 * 60 * 24, // 24h
    };
    const token = signToken(payload);

    // Return user data and token
    return Response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
