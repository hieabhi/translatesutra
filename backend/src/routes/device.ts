import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { DeviceCreateInput } from '../models/user';

const router = Router();

/**
 * POST /device/register
 * Register a device for a user (protected route)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Note: This route needs authentication middleware
    // For now, we'll implement a basic version
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Authorization header with Bearer token is required'
      });
    }

    // Verify token and get user info
    const { verifyAccessToken } = await import('../utils/jwt');
    
    let tokenPayload;
    try {
      tokenPayload = verifyAccessToken(token);
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Access token is invalid or expired'
      });
    }

    const { deviceUuid, platform, appVersion }: DeviceCreateInput = req.body;

    // Validate input
    if (!deviceUuid || !platform) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'deviceUuid and platform are required'
      });
    }

    // Validate platform
    const validPlatforms = ['windows', 'macos', 'linux'];
    if (!validPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid platform',
        message: 'Platform must be one of: windows, macos, linux'
      });
    }

    // Check if device already exists for this user
    const existingDevice = await query(
      'SELECT id FROM devices WHERE user_id = $1 AND device_uuid = $2',
      [tokenPayload.userId, deviceUuid]
    );

    if (existingDevice.rows.length > 0) {
      // Update existing device
      const result = await query(
        `UPDATE devices 
         SET platform = $1, app_version = $2, last_seen = NOW() 
         WHERE user_id = $3 AND device_uuid = $4 
         RETURNING id, device_uuid, platform, app_version, last_seen, created_at`,
        [platform.toLowerCase(), appVersion || null, tokenPayload.userId, deviceUuid]
      );

      const device = result.rows[0];
      return res.json({
        message: 'Device updated successfully',
        device: {
          id: device.id,
          deviceUuid: device.device_uuid,
          platform: device.platform,
          appVersion: device.app_version,
          lastSeen: device.last_seen.toISOString(),
          createdAt: device.created_at.toISOString(),
        }
      });
    }

    // Create new device registration
    const deviceId = uuidv4();
    const result = await query(
      `INSERT INTO devices (id, user_id, device_uuid, platform, app_version, last_seen) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, device_uuid, platform, app_version, last_seen, created_at`,
      [deviceId, tokenPayload.userId, deviceUuid, platform.toLowerCase(), appVersion || null]
    );

    const device = result.rows[0];

    res.status(201).json({
      message: 'Device registered successfully',
      device: {
        id: device.id,
        deviceUuid: device.device_uuid,
        platform: device.platform,
        appVersion: device.app_version,
        lastSeen: device.last_seen.toISOString(),
        createdAt: device.created_at.toISOString(),
      }
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to register device at this time'
    });
  }
});

/**
 * GET /device/list
 * Get all devices for the authenticated user
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    // Note: This route needs authentication middleware
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Authorization header with Bearer token is required'
      });
    }

    // Verify token and get user info
    const { verifyAccessToken } = await import('../utils/jwt');
    
    let tokenPayload;
    try {
      tokenPayload = verifyAccessToken(token);
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Access token is invalid or expired'
      });
    }

    // Get all devices for the user
    const result = await query(
      `SELECT id, device_uuid, platform, app_version, last_seen, created_at 
       FROM devices 
       WHERE user_id = $1 
       ORDER BY last_seen DESC`,
      [tokenPayload.userId]
    );

    const devices = result.rows.map((device) => ({
      id: device.id,
      deviceUuid: device.device_uuid,
      platform: device.platform,
      appVersion: device.app_version,
      lastSeen: device.last_seen.toISOString(),
      createdAt: device.created_at.toISOString(),
    }));

    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to retrieve devices at this time'
    });
  }
});

/**
 * DELETE /device/:deviceId
 * Remove a device registration
 */
router.delete('/:deviceId', async (req: Request, res: Response) => {
  try {
    // Note: This route needs authentication middleware
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Authorization header with Bearer token is required'
      });
    }

    // Verify token and get user info
    const { verifyAccessToken } = await import('../utils/jwt');
    
    let tokenPayload;
    try {
      tokenPayload = verifyAccessToken(token);
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Access token is invalid or expired'
      });
    }

    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        error: 'Device ID required',
        message: 'Device ID parameter is required'
      });
    }

    // Delete device (only if it belongs to the authenticated user)
    const result = await query(
      'DELETE FROM devices WHERE id = $1 AND user_id = $2 RETURNING id',
      [deviceId, tokenPayload.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Device not found',
        message: 'Device not found or does not belong to this user'
      });
    }

    res.json({ message: 'Device removed successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to remove device at this time'
    });
  }
});

export { router as deviceRouter };