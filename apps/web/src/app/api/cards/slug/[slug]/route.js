import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    if (!slug) {
      return Response.json({ error: "Slug is required" }, { status: 400 });
    }

    const [card] = await sql(
      `SELECT c.*, u.email as user_email FROM cards c JOIN auth_users u ON c.user_id = u.id WHERE c.slug = $1`,
      [slug]
    );

    if (!card) {
      return Response.json({ error: "Card not found" }, { status: 404 });
    }

    const tags = await sql(
      `SELECT it.id, it.name, it.color FROM industry_tags it JOIN card_industry_tags cit ON it.id = cit.industry_tag_id WHERE cit.card_id = $1`,
      [card.id]
    );
    const asks = await sql(
      `SELECT id, title, description, video_url, button_order FROM card_asks WHERE card_id = $1 ORDER BY button_order ASC`,
      [card.id]
    );

    card.industry_tags = tags;
    card.asks = asks;

    return Response.json({ card });
  } catch (e) {
    console.error("Error fetching card by slug:", e);
    return Response.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}