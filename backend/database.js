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
  // Allow environment override for pool size; default to 1 to avoid exceeding hosted DB limits
  // Many hosted MySQL providers set very low max_user_connections (e.g. 5). Use DB_POOL_LIMIT to override.
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT, 10) || 1,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection with retry/backoff to tolerate transient max_user_connections and timeouts
// Defaults tuned for low-tier hosted DBs: more attempts, larger backoff cap.
const testConnection = async (attempts = 12, initialDelayMs = 1000, maxDelayMs = 30000) => {
  let delay = initialDelayMs;
  for (let i = 0; i < attempts; i++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
      return true;
    } catch (error) {
      const msg = error && error.message ? error.message : String(error);
      // Log a concise message
      console.warn(`Database connection attempt ${i + 1} failed: ${msg}`);

      // If we still have attempts left, wait and retry with exponential backoff
      if (i < attempts - 1) {
        // If it's a transient network timeout, increase a bit more before retrying
        const isTimeout = /ETIMEDOUT|ENETUNREACH|ECONNREFUSED/i.test(msg);
        const isMaxConn = /max_user_connections/i.test(msg) || /too many connections/i.test(msg);

        const sleepMs = Math.min(maxDelayMs, Math.floor(delay * (isTimeout ? 2 : 1.6)));
        console.log(`Waiting ${sleepMs}ms before retrying (attempt ${i + 2}/${attempts})`);
        await new Promise(res => setTimeout(res, sleepMs));
        delay = Math.min(maxDelayMs, Math.floor(delay * (isTimeout ? 2 : 1.8)));
        continue;
      }

      // Final failure, surface the most helpful message
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

    if (/ETIMEDOUT|ENETUNREACH|ECONNREFUSED/i.test(msg)) {
      console.error('Database connection timeout/error:', msg);
      return { success: false, error: msg, code: 'DB_CONNECTION_TIMEOUT' };
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