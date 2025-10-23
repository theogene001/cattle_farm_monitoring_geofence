const fs = require('fs');
const path = require('path');
const { pool } = require('../database');

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const full = path.join(migrationsDir, file);
    console.log('Running migration', file);
    const sql = fs.readFileSync(full, 'utf8');
    try {
      await pool.query(sql);
      console.log('OK', file);
    } catch (err) {
      console.error('Migration failed', file, err.message);
      process.exit(1);
    }
  }
  console.log('Migrations completed');
  process.exit(0);
}

run();
