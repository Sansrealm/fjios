import sql from "@/app/api/utils/sql";
import { jwtVerify } from "jose";
import { getToken } from "@auth/core/jwt"; // ADD cookie-based auth fallback to match other routes

// Helper to get session from mobile JWT (or cookie session as fallback)
async function getSession(request) {
  // 1) Try Bearer JWT from mobile first
  // Accept multiple header names in case some proxies strip/rename Authorization
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    request.headers.get("x-authorization") ||
    request.headers.get("X-Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
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
    } catch (e) {
      console.error("JWT verify failed on /api/cards/[id] route:", e);
      // fall through to cookie auth
    }
  }

  // 2) Fallback to cookie/session auth (useful when Authorization header is stripped in native dev proxy)
  try {
    const jwt = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith("https"),
    });
    if (jwt?.sub) {
      return {
        user: {
          id: parseInt(jwt.sub),
          email: jwt.email,
          name: jwt.name,
        },
      };
    }
  } catch (e) {
    console.error("Cookie auth fallback failed on /api/cards/[id] route:", e);
  }

  return null;
}

// Get single card by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const [card] = await sql(
      `
      SELECT c.*, u.email as user_email 
      FROM cards c 
      JOIN auth_users u ON c.user_id = u.id 
      WHERE c.id = $1
    `,
      [id],
    );

    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    // Get industry tags
    const tags = await sql(
      `
      SELECT it.id, it.name, it.color 
      FROM industry_tags it 
      JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
      WHERE cit.card_id = $1
    `,
      [id],
    );
    card.industry_tags = tags;

    // Get asks
    const asks = await sql(
      `
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `,
      [id],
    );
    card.asks = asks;

    return Response.json({ card });
  } catch (error) {
    console.error("Error fetching card:", error);
    return Response.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

// Update card
export async function PUT(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = params;
    const body = await request.json();

    // Verify card ownership
    const [existingCard] = await sql(
      "SELECT user_id, slug FROM cards WHERE id = $1",
      [id],
    );
    if (!existingCard) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }
    if (existingCard.user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      name,
      startup_name,
      startup_website,
      role,
      description,
      profile_video_url,
      profile_image_url,
      industry_tag_ids,
      // NEW optional location fields
      location_city,
      location_state,
      location_country,
    } = body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
    }
    if (startup_name !== undefined) {
      paramCount++;
      updateFields.push(`startup_name = $${paramCount}`);
      updateValues.push(startup_name);
    }
    if (startup_website !== undefined) {
      paramCount++;
      updateFields.push(`startup_website = $${paramCount}`);
      updateValues.push(startup_website);
    }
    if (role !== undefined) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateValues.push(role);
    }
    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
    }
    if (profile_video_url !== undefined) {
      paramCount++;
      updateFields.push(`profile_video_url = $${paramCount}`);
      updateValues.push(profile_video_url);
    }
    if (profile_image_url !== undefined) {
      paramCount++;
      updateFields.push(`profile_image_url = $${paramCount}`);
      updateValues.push(profile_image_url);
    }
    // NEW: optional location fields
    if (location_city !== undefined) {
      paramCount++;
      updateFields.push(`location_city = $${paramCount}`);
      updateValues.push(location_city);
    }
    if (location_state !== undefined) {
      paramCount++;
      updateFields.push(`location_state = $${paramCount}`);
      updateValues.push(location_state);
    }
    if (location_country !== undefined) {
      paramCount++;
      updateFields.push(`location_country = $${paramCount}`);
      updateValues.push(location_country);
    }

    // NEW: If the card has no slug yet and a new name is provided, generate a slug once
    if (!existingCard.slug && name) {
      // Create base slug from name
      const baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      let slug = baseSlug || `user-${session.user.id}`;
      let suffix = 1;
      // Ensure uniqueness
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const [conflict] = await sql(
          `SELECT 1 AS exists FROM cards WHERE slug = $1 AND id <> $2 LIMIT 1`,
          [slug, id],
        );
        if (!conflict) break;
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
        if (suffix > 1000) break;
      }
      paramCount++;
      updateFields.push(`slug = $${paramCount}`);
      updateValues.push(slug);
    }

    if (updateFields.length > 0) {
      // always update timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      paramCount++;
      updateValues.push(id);
      const query = `UPDATE cards SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *`;
      await sql(query, updateValues);
    }

    // Update industry tags if provided
    if (industry_tag_ids !== undefined) {
      await sql("DELETE FROM card_industry_tags WHERE card_id = $1", [id]);
      if (industry_tag_ids.length > 0) {
        for (const tagId of industry_tag_ids) {
          await sql(
            `
            INSERT INTO card_industry_tags (card_id, industry_tag_id)
            VALUES ($1, $2)
          `,
            [id, tagId],
          );
        }
      }
    }

    // Return updated card
    const response = await GET(request, { params });
    return response;
  } catch (error) {
    console.error("Error updating card:", error);
    return Response.json({ error: "Failed to update card" }, { status: 500 });
  }
}

// Delete card
export async function DELETE(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = params;

    // Verify card ownership
    const [existingCard] = await sql(
      "SELECT user_id FROM cards WHERE id = $1",
      [id],
    );
    if (!existingCard) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }
    if (existingCard.user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete card (cascades to related tables)
    await sql("DELETE FROM cards WHERE id = $1", [id]);

    return Response.json({ message: "Card deleted successfully" });
  } catch (error) {
    console.error("Error deleting card:", error);
    return Response.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
