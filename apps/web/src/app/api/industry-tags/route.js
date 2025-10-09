import sql from "@/app/api/utils/sql";

// Get all industry tags
export async function GET() {
  try {
    const tags = await sql('SELECT * FROM industry_tags ORDER BY name ASC');
    return Response.json({ tags });
  } catch (error) {
    console.error('Error fetching industry tags:', error);
    return Response.json({ error: 'Failed to fetch industry tags' }, { status: 500 });
  }
}