// config/db.js
// Single shared PostgreSQL connection pool used across the whole app.

const { Pool } = require('pg');
const config = require('./config');

const sslOption = config.db.ssl ? { rejectUnauthorized: false } : false;

const pool = new Pool(
  config.db.connectionString
    ? { connectionString: config.db.connectionString, ssl: sslOption }
    : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        ssl: sslOption,
      }
);

pool.on('error', (err) => {
  // Unexpected error on an idle client — log and let the process supervisor restart if needed.
  // eslint-disable-next-line no-console
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Run a query against the pool.
 * @param {string} text - SQL text with $1, $2... placeholders
 * @param {Array} params - query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client from the pool (used for multi-statement transactions).
 * Caller MUST call client.release() when done.
 */
const getClient = () => pool.connect();

/** Quick connectivity check used at server boot. */
const testConnection = async () => {
  const result = await pool.query('SELECT NOW() AS now');
  return result.rows[0].now;
};

module.exports = { pool, query, getClient, testConnection };
