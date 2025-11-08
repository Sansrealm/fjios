import sql from "@/app/api/utils/sql";
import { randomBytes } from "node:crypto";
import { sendEmail } from "@/app/api/utils/send-email";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body?.email || "").toLowerCase();
    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const [user] = await sql(
      `
      SELECT id, email, "emailVerified" FROM auth_users WHERE email = $1
    `,
      [email],
    );

    // Always respond generically for privacy
    const genericOk = {
      message: "If this email exists, a verification link has been sent.",
    };

    if (!user) {
      return Response.json(genericOk);
    }

    if (user.emailVerified) {
      return Response.json({ message: "Email already verified" });
    }

    // Clear any existing tokens for this email
    await sql(
      `
      DELETE FROM auth_verification_token WHERE identifier = $1
    `,
      [email],
    );

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await sql(
      `
      INSERT INTO auth_verification_token (identifier, token, expires)
      VALUES ($1, $2, $3)
    `,
      [email, token, expiresAt],
    );

    const baseUrl =
      process.env.APP_URL || process.env.EXPO_PUBLIC_BASE_URL || "";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    try {
      await sendEmail({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: "Verify your email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email</h2>
            <p>Please confirm your email to activate your account.</p>
            <div style="margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #8FAEA2; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #8FAEA2;">${verifyUrl}</a></p>
          </div>
        `,
        text: `Verify your email: ${verifyUrl}`,
      });

      return Response.json(genericOk);
    } catch (emailError) {
      return Response.json(
        { error: "Failed to send verification email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error sending verification email:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
