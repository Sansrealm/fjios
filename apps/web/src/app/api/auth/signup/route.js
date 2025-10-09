import sql from "@/app/api/utils/sql";
import { hash } from "argon2";
import { SignJWT } from "jose";

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return Response.json(
        { error: "Name, email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const [existingUser] = await sql(
      `
      SELECT id FROM auth_users WHERE email = $1
    `,
      [email.toLowerCase()],
    );

    if (existingUser) {
      return Response.json({ error: "User already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await hash(password);

    // Create new user
    const [newUser] = await sql(
      `
      INSERT INTO auth_users (name, email, "emailVerified")
      VALUES ($1, $2, NOW())
      RETURNING *
    `,
      [name, email.toLowerCase()],
    );

    // Create auth account with hashed password
    await sql(
      `
      INSERT INTO auth_accounts ("userId", type, provider, "providerAccountId", password)
      VALUES ($1, 'credentials', 'credentials', $2, $3)
    `,
      [newUser.id, email.toLowerCase(), hashedPassword],
    );

    // Generate JWT token
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const token = await new SignJWT({
      sub: newUser.id.toString(),
      email: newUser.email,
      name: newUser.name,
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
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
