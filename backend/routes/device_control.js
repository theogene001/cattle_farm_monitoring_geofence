const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');

// GET /device/control - returns { success: true, state: 'on'|'off' }
router.get('/control', async (req, res) => {
  try {
    // Try to read from a device_controls table (key,value). Fallback to in-memory default.
    const r = await executeQuery(`SELECT control_value FROM device_controls WHERE control_key = 'system_enabled' LIMIT 1`);
    if (r.success && Array.isArray(r.data) && r.data.length > 0) {
      const val = r.data[0].control_value;
      const state = (String(val).toLowerCase() === 'off') ? 'off' : 'on';
      return res.json({ success: true, state });
    }

    // If the query failed due to missing columns (legacy schema mismatch), try the alternate schema
    if (!r.success && /Unknown column/i.test(String(r.error || ''))) {
      try {
        // Look for the most recent command-style row that indicates system state
        const alt = await executeQuery(`SELECT command, params, status, result FROM device_controls ORDER BY created_at DESC LIMIT 1`);
        if (alt.success && Array.isArray(alt.data) && alt.data.length > 0) {
          const row = alt.data[0];
          // Interpret the command or params. Support simple values like 'on'/'off' in command,
          // or params JSON like {"state":"off"}.
          let state = 'on';
          if (row.command && /off/i.test(String(row.command))) state = 'off';
          else if (row.command && /on/i.test(String(row.command))) state = 'on';
          else if (row.params) {
            try {
              const p = typeof row.params === 'string' ? JSON.parse(row.params) : row.params;
              if (p && p.state && String(p.state).toLowerCase() === 'off') state = 'off';
            } catch (e) { /* ignore JSON parse errors */ }
          }
          return res.json({ success: true, state });
        }
      } catch (innerErr) {
        console.warn('Device control GET alternate schema check failed:', innerErr && innerErr.message ? innerErr.message : innerErr);
      }
    }

    // fallback default: on
    return res.json({ success: true, state: 'on' });
  } catch (err) {
    console.error('Device control GET error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /device/control - body { state: 'on'|'off' }
router.post('/control', async (req, res) => {
  try {
    const state = (req.body && req.body.state && String(req.body.state).toLowerCase() === 'off') ? 'off' : 'on';
    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS device_controls (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        control_key VARCHAR(128) UNIQUE NOT NULL,
        control_value VARCHAR(64) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    // Upsert
    const upsert = await executeQuery(`
      INSERT INTO device_controls (control_key, control_value) VALUES ('system_enabled', ?)
      ON DUPLICATE KEY UPDATE control_value = VALUES(control_value)
    `, [state]);
    if (upsert.success) {
      return res.json({ success: true, state });
    }

    // If the upsert failed due to schema mismatch (e.g., table uses command/params schema),
    // fallback to inserting a command-style row that indicates desired state.
    if (/Unknown column/i.test(String(upsert.error || '')) || /column .* does not exist/i.test(String(upsert.error || ''))) {
      try {
        const params = JSON.stringify({ state });
        const insertAlt = await executeQuery(`
          INSERT INTO device_controls (command, params, status) VALUES ('system_enabled', ?, 'pending')
        `, [params]);
        if (insertAlt.success) {
          return res.json({ success: true, state });
        }
      } catch (altErr) {
        console.warn('Device control POST alternate insert failed:', altErr && altErr.message ? altErr.message : altErr);
      }
    }

    // Generic failure
    return res.status(500).json({ success: false, message: 'Failed to set control state', error: upsert.error });
  } catch (err) {
    console.error('Device control POST error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
