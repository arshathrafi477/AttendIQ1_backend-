// config/config.js
// Central place to read & validate environment variables. Import this instead
// of using process.env directly anywhere else in the app.

require('dotenv').config();

const REQUIRED_VARS = ['JWT_SECRET'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    // Fail fast at boot rather than crashing later on first login attempt.
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const truthy = (val) => ['true', '1', 'yes'].includes(String(val).toLowerCase());

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    database: process.env.PGDATABASE || 'attendiq',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    // Managed Postgres providers (Render, Railway, Heroku, Supabase) require SSL.
    ssl: truthy(process.env.DB_SSL),
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : '*',
};
