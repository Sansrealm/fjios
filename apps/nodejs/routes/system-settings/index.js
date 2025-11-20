import express from 'express';
import { getSession } from '../../middleware/auth.js';
import { sql } from '../../utils/database.js';

const router = express.Router();

// Get system settings
router.get('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const settings = await sql(`
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      ORDER BY setting_key
    `);

    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description,
      };
    });

    return res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system settings (admin only for now - in production you'd want proper admin checks)
router.put('/', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { setting_key, setting_value } = req.body;

    if (!setting_key || setting_value === undefined) {
      return res
        .status(400)
        .json({ error: 'setting_key and setting_value are required' });
    }

    // Validate specific settings
    if (setting_key === 'invite_limit_per_user') {
      const limit = parseInt(setting_value);
      if (isNaN(limit) || limit < 0 || limit > 1000) {
        return res.status(400).json({
          error: 'invite_limit_per_user must be a number between 0 and 1000',
        });
      }
    }

    // Update the setting
    await sql(
      `
      UPDATE system_settings 
      SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = $2
    `,
      [setting_value.toString(), setting_key]
    );

    // Get the updated setting
    const updatedSettings = await sql(
      `
      SELECT setting_key, setting_value, description 
      FROM system_settings 
      WHERE setting_key = $1
    `,
      [setting_key]
    );

    if (updatedSettings.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    return res.json({
      setting: {
        key: updatedSettings[0].setting_key,
        value: updatedSettings[0].setting_value,
        description: updatedSettings[0].description,
      },
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    return res.status(500).json({ error: 'Failed to update system setting' });
  }
});

export default router;

