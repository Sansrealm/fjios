import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { jwtVerify } from "jose";

// Helper function to get user session from either cookies or JWT token
async function getSession(request) {
  // Try cookie-based auth first (for web)
  const session = await auth();
  if (session?.user?.id) {
    return session;
  }

  // Try JWT token auth (for mobile)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);

      if (payload?.sub) {
        return {
          user: {
            id: parseInt(payload.sub),
            email: payload.email,
            name: payload.name,
          },
        };
      }
    } catch (error) {
      console.error("JWT verification failed:", error);
    }
  }

  return null;
}

// Get cards list - public endpoint for viewing cards with saved status for authenticated users
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const search = url.searchParams.get("search");
    const saved_only = url.searchParams.get("saved_only") === "true";

    const session = await getSession(request);

    let query = `
      SELECT DISTINCT c.*, u.email as user_email
      ${session?.user?.id ? `, CASE WHEN sc.id IS NOT NULL THEN true ELSE false END as is_saved` : ", false as is_saved"}
      FROM cards c 
      JOIN auth_users u ON c.user_id = u.id
      ${session?.user?.id ? `LEFT JOIN saved_cards sc ON c.id = sc.card_id AND sc.user_id = $${session.user.id ? "1" : "NULL"}` : ""}
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (session?.user?.id) {
      paramCount++;
      params.push(session.user.id);
    }

    if (userId) {
      paramCount++;
      query += ` AND c.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (saved_only && session?.user?.id) {
      query += " AND sc.id IS NOT NULL";
    }

    if (search) {
      paramCount++;
      query += ` AND (LOWER(c.name) LIKE LOWER($${paramCount}) OR LOWER(c.startup_name) LIKE LOWER($${paramCount}) OR LOWER(c.description) LIKE LOWER($${paramCount}) OR LOWER(c.role) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    query += " ORDER BY c.updated_at DESC";

    const cards = await sql(query, params);

    // Get industry tags for each card
    for (let card of cards) {
      const tags = await sql(
        `
        SELECT it.id, it.name, it.color 
        FROM industry_tags it 
        JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
        WHERE cit.card_id = $1
      `,
        [card.id],
      );
      card.industry_tags = tags;

      // Get asks for each card
      const asks = await sql(
        `
        SELECT id, title, description, video_url, button_order 
        FROM card_asks 
        WHERE card_id = $1 
        ORDER BY button_order ASC
      `,
        [card.id],
      );
      card.asks = asks;
    }

    return Response.json({ cards });
  } catch (error) {
    console.error("Error fetching cards:", error);
    return Response.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

// Create new card
export async function POST(request) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      name,
      startup_name,
      startup_website,
      role,
      description,
      profile_video_url,
      profile_image_url,
      industry_tag_ids,
    } = body;

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    if (description && description.length > 124) {
      return Response.json(
        { error: "Description must be 124 characters or less" },
        { status: 400 },
      );
    }

    // Create the card
    const [card] = await sql(
      `
      INSERT INTO cards (user_id, name, startup_name, startup_website, role, description, profile_video_url, profile_image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        session.user.id,
        name,
        startup_name,
        startup_website,
        role,
        description,
        profile_video_url,
        profile_image_url,
      ],
    );

    // Add industry tags if provided
    if (industry_tag_ids && industry_tag_ids.length > 0) {
      for (const tagId of industry_tag_ids) {
        await sql(
          `
          INSERT INTO card_industry_tags (card_id, industry_tag_id)
          VALUES ($1, $2)
        `,
          [card.id, tagId],
        );
      }
    }

    // Get the complete card with tags
    const tags = await sql(
      `
      SELECT it.id, it.name, it.color 
      FROM industry_tags it 
      JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
      WHERE cit.card_id = $1
    `,
      [card.id],
    );
    card.industry_tags = tags;
    card.asks = [];

    return Response.json({ card });
  } catch (error) {
    console.error("Error creating card:", error);
    return Response.json({ error: "Failed to create card" }, { status: 500 });
  }
}
