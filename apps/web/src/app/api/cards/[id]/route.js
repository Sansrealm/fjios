import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get single card by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const [card] = await sql(`
      SELECT c.*, u.email as user_email 
      FROM cards c 
      JOIN auth_users u ON c.user_id = u.id 
      WHERE c.id = $1
    `, [id]);
    
    if (!card) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // Get industry tags
    const tags = await sql(`
      SELECT it.id, it.name, it.color 
      FROM industry_tags it 
      JOIN card_industry_tags cit ON it.id = cit.industry_tag_id 
      WHERE cit.card_id = $1
    `, [id]);
    card.industry_tags = tags;
    
    // Get asks
    const asks = await sql(`
      SELECT id, title, description, video_url, button_order 
      FROM card_asks 
      WHERE card_id = $1 
      ORDER BY button_order ASC
    `, [id]);
    card.asks = asks;
    
    return Response.json({ card });
  } catch (error) {
    console.error('Error fetching card:', error);
    return Response.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}

// Update card
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    
    // Verify card ownership
    const [existingCard] = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (!existingCard) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (existingCard.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { name, startup_name, startup_website, role, description, profile_video_url, profile_image_url, industry_tag_ids } = body;
    
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
    
    if (updateFields.length > 0) {
      paramCount++;
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);
      
      const query = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      await sql(query, updateValues);
    }
    
    // Update industry tags if provided
    if (industry_tag_ids !== undefined) {
      // Remove existing tags
      await sql('DELETE FROM card_industry_tags WHERE card_id = $1', [id]);
      
      // Add new tags
      if (industry_tag_ids.length > 0) {
        for (const tagId of industry_tag_ids) {
          await sql(`
            INSERT INTO card_industry_tags (card_id, industry_tag_id)
            VALUES ($1, $2)
          `, [id, tagId]);
        }
      }
    }
    
    // Return updated card
    const response = await GET(request, { params });
    return response;
    
  } catch (error) {
    console.error('Error updating card:', error);
    return Response.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

// Delete card
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Verify card ownership
    const [existingCard] = await sql('SELECT user_id FROM cards WHERE id = $1', [id]);
    if (!existingCard) {
      return Response.json({ error: 'Card not found' }, { status: 404 });
    }
    if (existingCard.user_id !== session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete card (cascades to related tables)
    await sql('DELETE FROM cards WHERE id = $1', [id]);
    
    return Response.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    return Response.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}