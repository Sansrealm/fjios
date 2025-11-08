import sql from "@/app/api/utils/sql";
import { hash } from "argon2";

// Reset password with token
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return Response.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    // Verify token is valid and not expired
    const [resetToken] = await sql(
      `
      SELECT * FROM password_reset_tokens 
      WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP
    `,
      [token],
    );

    if (!resetToken) {
      return Response.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await hash(password);

    // Update user's password in auth_accounts table
    const [existingAccount] = await sql(
      `
      SELECT id FROM auth_accounts 
      WHERE "userId" = $1 AND provider = 'credentials'
    `,
      [resetToken.user_id],
    );

    if (existingAccount) {
      // Update existing credentials account
      await sql(
        `
        UPDATE auth_accounts 
        SET password = $1 
        WHERE "userId" = $2 AND provider = 'credentials'
      `,
        [hashedPassword, resetToken.user_id],
      );
    } else {
      // Create new credentials account
      await sql(
        `
        INSERT INTO auth_accounts ("userId", type, provider, "providerAccountId", password)
        VALUES ($1, 'credentials', 'credentials', $2, $3)
      `,
        [resetToken.user_id, resetToken.user_id.toString(), hashedPassword],
      );
    }

    // Mark token as used
    await sql(
      `
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE token = $1
    `,
      [token],
    );

    return Response.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return Response.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
