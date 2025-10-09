import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Get system settings
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const settings = await sql(`
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      ORDER BY setting_key
    `);

    const settingsMap = {};
    settings.forEach(setting => {
      settingsMap[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });

    return Response.json({ settings: settingsMap });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return Response.json({ error: 'Failed to fetch system settings' }, { status: 500 });
  }
}

// Update system settings (admin only for now - in production you'd want proper admin checks)
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { setting_key, setting_value } = body;

    if (!setting_key || setting_value === undefined) {
      return Response.json({ error: 'setting_key and setting_value are required' }, { status: 400 });
    }

    // Validate specific settings
    if (setting_key === 'invite_limit_per_user') {
      const limit = parseInt(setting_value);
      if (isNaN(limit) || limit < 0 || limit > 1000) {
        return Response.json({ 
          error: 'invite_limit_per_user must be a number between 0 and 1000' 
        }, { status: 400 });
      }
    }

    // Update the setting
    await sql(`
      UPDATE system_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = $2
    `, [setting_value.toString(), setting_key]);

    // Get the updated setting
    const [updatedSetting] = await sql(`
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      WHERE setting_key = $1
    `, [setting_key]);

    if (!updatedSetting) {
      return Response.json({ error: 'Setting not found' }, { status: 404 });
    }

    return Response.json({ 
      setting: {
        key: updatedSetting.setting_key,
        value: updatedSetting.setting_value,
        description: updatedSetting.description
      }
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    return Response.json({ error: 'Failed to update system setting' }, { status: 500 });
  }
}