// models/userModel.js
// Data-access layer for the `users` table (authentication).

const { query } = require('../config/db');

const findByUsername = async (username) => {
  const { rows } = await query(
    `SELECT id, username, email, password_hash, full_name, role, student_id, is_active
       FROM users
      WHERE username = $1`,
    [username]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await query(
    `SELECT id, username, email, full_name, role, student_id, phone, is_active, created_at
       FROM users
      WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

const updateLastLogin = async (id) => {
  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [id]);
};

const create = async ({ username, email, passwordHash, fullName, role, studentId, phone }) => {
  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, full_name, role, student_id, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, username, email, full_name, role, student_id, phone, created_at`,
    [username, email, passwordHash, fullName, role, studentId || null, phone || null]
  );
  return rows[0];
};

module.exports = { findByUsername, findById, updateLastLogin, create };
