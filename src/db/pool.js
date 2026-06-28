// src/db/pool.js
// PostgreSQL connection pool — dotenv is loaded in index.js, not here.

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:      parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
    ? { rejectUnauthorized: false }   // Neon requires this
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

module.exports = pool;
