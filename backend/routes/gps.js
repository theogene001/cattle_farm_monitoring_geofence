const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');
const gpsEmitter = require('../gpsEvents');

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

  // Upsert into current_locations so dashboard shows latest position
      try {
        const upsertSql = `INSERT INTO current_locations (animal_id, collar_id, latitude, longitude, recorded_at, battery_level, signal_quality, temperature_celsius)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            recorded_at = VALUES(recorded_at),
            battery_level = VALUES(battery_level),
            signal_quality = VALUES(signal_quality),
            temperature_celsius = VALUES(temperature_celsius)`;
        const upsertParams = [
          animal_id,
          collar_id,
          Number(latitude),
          Number(longitude),
          recorded_at ? recorded_at : new Date(),
          battery_level,
          signal_quality,
          temperature_celsius
        ];
        await executeQuery(upsertSql, upsertParams);
        // Emit live event for subscribers
        try {
          gpsEmitter.emit('location', {
            animal_id,
            collar_id,
            latitude: Number(latitude),
            longitude: Number(longitude),
            recorded_at: upsertParams[4],
            battery_level,
            signal_quality,
            temperature_celsius
          });
        } catch (emitErr) {
          console.warn('Failed to emit gps location event:', emitErr && emitErr.message ? emitErr.message : emitErr);
        }
      } catch (upErr) {
        console.warn('Failed to upsert current_locations:', upErr.message || upErr);
        // non-fatal — we already inserted the historical record
      }

      return res.json({ success: true, message: 'Animal location saved', id: result.insertId || null });
    }

    // Otherwise fall back to GPS raw table
    const sql = 'INSERT INTO gps_data (latitude, longitude) VALUES (?, ?)';
    const result = await executeQuery(sql, [Number(latitude), Number(longitude)]);
    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Database error', error: result.error });
    }
  // Also update current_locations for raw GPS points (no animal/collar)
    try {
      const upsertSql = `INSERT INTO current_locations (animal_id, collar_id, latitude, longitude, recorded_at)
        VALUES (NULL, NULL, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          recorded_at = VALUES(recorded_at)`;
      // Use the new GPS insert time
      await executeQuery(upsertSql, [Number(latitude), Number(longitude), new Date()]);
      // Emit live event for raw gps point as well
      try {
        gpsEmitter.emit('location', {
          animal_id: null,
          collar_id: null,
          latitude: Number(latitude),
          longitude: Number(longitude),
          recorded_at: new Date()
        });
      } catch (emitErr) {
        console.warn('Failed to emit gps location event (raw):', emitErr && emitErr.message ? emitErr.message : emitErr);
      }
    } catch (upErr) {
      // non-fatal
      console.warn('Failed to upsert current_locations for raw gps:', upErr.message || upErr);
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
