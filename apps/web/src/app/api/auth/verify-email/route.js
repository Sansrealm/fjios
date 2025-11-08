import sql from "@/app/api/utils/sql";

// Verify email by token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400 });
    }

    // Find token
    const [row] = await sql(
      `
      SELECT identifier, expires
      FROM auth_verification_token
      WHERE token = $1
    `,
      [token],
    );

    if (!row) {
      return Response.json({ error: "Invalid token" }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = row.expires instanceof Date ? row.expires : new Date(row.expires);
    if (expiresAt < now) {
      return Response.json({ error: "Token expired" }, { status: 400 });
    }

    // Verify the user's email
    const [user] = await sql(
      `
      UPDATE auth_users
      SET "emailVerified" = NOW()
      WHERE email = $1
      RETURNING id, email, name, "emailVerified"
    `,
      [row.identifier],
    );

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Clean up token(s) for this identifier
    await sql(
      `
      DELETE FROM auth_verification_token WHERE identifier = $1
    `,
      [row.identifier],
    );

    return Response.json({
      message: "Email verified successfully",
      user,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return Response.json({ error: "Failed to verify email" }, { status: 500 });
  }
}

// Also accept POST with JSON body { token }
export async function POST(request) {
  try {
    const body = await request.json();
    const token = body?.token;
    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400 });
    }
    // Reuse GET logic by constructing a URL with the token
    const url = new URL(request.url);
    url.searchParams.set("token", token);
    return GET({ ...request, url: url.toString() });
  } catch (error) {
    console.error("Error in verify POST:", error);
    return Response.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
