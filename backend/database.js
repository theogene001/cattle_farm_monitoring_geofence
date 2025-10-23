const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cattle_farm_monitoring',
  waitForConnections: true,
  // Allow environment override for pool size; default to 2 to avoid exceeding hosted DB limits
  // Many hosted MySQL users have low limits; override with DB_POOL_LIMIT env var if needed.
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT, 10) || 2,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection with retry/backoff to tolerate transient max_user_connections
const testConnection = async (attempts = 5, initialDelayMs = 500) => {
  let delay = initialDelayMs;
  for (let i = 0; i < attempts; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
      return true;
    } catch (error) {
      const msg = error && error.message ? error.message : String(error);
      console.warn(`Database connection attempt ${i + 1} failed: ${msg}`);
      // If it's a max connections error, wait and retry
      if (i < attempts - 1) {
        await new Promise(res => setTimeout(res, delay));
        delay = Math.min(5000, Math.floor(delay * 1.8));
        continue;
      }
      console.error('❌ Database connection failed:', msg);
      return false;
    }
  }
  return false;
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return { success: true, data: rows };
  } catch (error) {
    // Detect common 'max connections' error and surface a machine-readable code
    const msg = error && error.message ? error.message : String(error);
    if (/max_user_connections/i.test(msg) || /too many connections/i.test(msg)) {
      console.error('Database max connections error:', msg);
      return { success: false, error: msg, code: 'MAX_USER_CONNECTIONS' };
    }

    console.error('Database query error:', msg);
    return { success: false, error: msg };
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery
};