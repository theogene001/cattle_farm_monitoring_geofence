const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');

// POST /gps - save a GPS point
router.post('/', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      animal_id = null,
      collar_id = null,
      altitude_meters = null,
      accuracy_meters = null,
      speed_kmh = null,
      heading_degrees = null,
      recorded_at = null,
      battery_level = null,
      signal_quality = null,
      temperature_celsius = null
    } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'Missing coordinates' });
    }

    // If device includes an animal_id or collar_id, store in the high-frequency animal_locations table
    if (animal_id || collar_id) {
      const sql = `INSERT INTO animal_locations (
        animal_id, collar_id, latitude, longitude, altitude_meters, accuracy_meters,
        speed_kmh, heading_degrees, recorded_at, battery_level, signal_quality, temperature_celsius
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = [
        animal_id,
        collar_id,
        Number(latitude),
        Number(longitude),
        altitude_meters,
        accuracy_meters,
        speed_kmh,
        heading_degrees,
        recorded_at ? recorded_at : new Date(),
        battery_level,
        signal_quality,
        temperature_celsius
      ];

      const result = await executeQuery(sql, params);
      if (!result.success) {
        return res.status(500).json({ success: false, message: 'Database error', error: result.error });
      }

      return res.json({ success: true, message: 'Animal location saved', id: result.insertId || null });
    }

    // Otherwise fall back to GPS raw table
    const sql = 'INSERT INTO gps_data (latitude, longitude) VALUES (?, ?)';
    const result = await executeQuery(sql, [Number(latitude), Number(longitude)]);
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Database error', error: result.error });
    }
    return res.json({ success: true, message: 'GPS coordinates saved successfully!' });
  } catch (err) {
    console.error('GPS route error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /gps - fetch recent GPS points (optional ?limit=100)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const sql = 'SELECT id, latitude, longitude, created_at FROM gps_data ORDER BY created_at DESC LIMIT ?';
    const result = await executeQuery(sql, [limit]);
    if (!result.success) return res.status(500).json({ success: false, message: 'Database error', error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (err) {
    console.error('GPS fetch error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
