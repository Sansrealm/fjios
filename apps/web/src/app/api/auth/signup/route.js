import sql from "@/app/api/utils/sql";
import { hash } from "argon2";
import { SignJWT } from "jose";
import { randomBytes } from "node:crypto";
import { sendEmail } from "@/app/api/utils/send-email";

export async function POST(request) {
  try {
    // ADD: accept inviteCode for invite-only signup
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password || !name) {
      return Response.json(
        { error: "Name, email and password are required" },
        { status: 400 },
      );
    }

    // Enforce invite-only: require a valid, unused invite code
    if (!inviteCode) {
      return Response.json(
        { error: "Invite code is required" },
        { status: 400 },
      );
    }

    // Validate invite code (unused and not expired)
    const [invite] = await sql(
      `
      SELECT * FROM invite_codes 
      WHERE code = $1 AND is_used = false 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `,
      [inviteCode],
    );

    if (!invite) {
      return Response.json(
        { error: "Invalid or expired invite code" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    // Check if user already exists (ensure single account per email)
    const normalizedEmail = email.toLowerCase();
    const [existingUser] = await sql(
      `
      SELECT id FROM auth_users WHERE email = $1
    `,
      [normalizedEmail],
    );

    if (existingUser) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await hash(password);

    // Create new user with email verification pending
    const [newUser] = await sql(
      `
      INSERT INTO auth_users (name, email, "emailVerified")
      VALUES ($1, $2, NULL)
      RETURNING *
    `,
      [name, normalizedEmail],
    );

    // Create auth account with hashed password
    await sql(
      `
      INSERT INTO auth_accounts ("userId", type, provider, "providerAccountId", password)
      VALUES ($1, 'credentials', 'credentials', $2, $3)
    `,
      [newUser.id, normalizedEmail, hashedPassword],
    );

    // Mark invite as used by this user
    await sql(
      `
      UPDATE invite_codes
      SET is_used = true, used_by_user_id = $1
      WHERE code = $2
    `,
      [newUser.id, inviteCode],
    );

    // Generate email verification token
    const verifyToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // token valid for 7 days

    await sql(
      `
      INSERT INTO auth_verification_token (identifier, token, expires)
      VALUES ($1, $2, $3)
    `,
      [normalizedEmail, verifyToken, expiresAt],
    );

    // Build verification URL
    const baseUrl =
      process.env.APP_URL || process.env.EXPO_PUBLIC_BASE_URL || "";
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}`;

    // Attempt to send verification email
    try {
      await sendEmail({
        to: normalizedEmail,
        from: process.env.FROM_EMAIL,
        subject: "Verify your email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email</h2>
            <p>Welcome${name ? `, ${name}` : ""}! Please confirm your email to activate your account.</p>
            <div style="margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #8FAEA2; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #8FAEA2;">${verifyUrl}</a></p>
          </div>
        `,
        text: `Verify your email: ${verifyUrl}`,
      });
    } catch (emailErr) {
      // Do not fail signup if email provider is misconfigured; user can request resend later
    }

    // Generate JWT token for immediate client session (limited until verified)
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const token = await new SignJWT({
      sub: newUser.id.toString(),
      email: newUser.email,
      name: newUser.name,
      emailVerified: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    // Return user data and token
    return Response.json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        image: newUser.image,
        emailVerified: null,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
