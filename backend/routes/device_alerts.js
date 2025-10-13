const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Simple helper to send email using SMTP creds from env
const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
    secure: (process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  });
  return info;
};

// Endpoint for devices to report alerts.
// Accepts GET or POST. Query params: alert, distance, motion, lat, lon
router.all('/alert', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const { alert = 'device alert', distance = null, motion = null, lat = null, lon = null } = payload;

    // Insert into alerts table
    const sql = `INSERT INTO alerts (farm_id, alert_type, severity, title, message, location_latitude, location_longitude) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [1, 'device', 'medium', alert, `distance=${distance} motion=${motion}`, lat || null, lon || null];
    const result = await executeQuery(sql, params);
    if (!result.success) return res.status(500).json({ success: false, message: 'Failed to insert alert', error: result.error });

    // Send email notification if SMTP configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ALERT_EMAIL_TO) {
      const to = process.env.ALERT_EMAIL_TO;
      const subject = `Cattle Farm Alert: ${alert}`;
      const text = `Alert message: ${alert}\nDistance: ${distance}\nMotion: ${motion}\nLocation: ${lat}, ${lon}`;
      try {
        await sendEmail({ to, subject, text });
      } catch (mailErr) {
        console.warn('Failed to send alert email:', mailErr && mailErr.message ? mailErr.message : mailErr);
      }
    }

    return res.json({ success: true, message: 'Alert recorded' });
  } catch (err) {
    console.error('Device alert route error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
