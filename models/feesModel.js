// models/feesModel.js
// Data-access layer for the `fees` table.

const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT f.id, f.student_id, s.full_name AS student_name, f.term, f.amount,
         f.paid, (f.amount - f.paid) AS due, f.due_date, f.status,
         f.created_at, f.updated_at
    FROM fees f
    JOIN students s ON s.id = f.student_id
`;

const findAll = async ({ studentId, status, limit = 100, offset = 0 }) => {
  const conditions = [];
  const params = [];
  if (studentId) { params.push(studentId); conditions.push(`f.student_id = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`f.status = $${params.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `${BASE_SELECT} ${whereClause} ORDER BY f.due_date ASC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(`${BASE_SELECT} WHERE f.id = $1`, [id]);
  return rows[0] || null;
};

const create = async ({ studentId, term, amount, paid, dueDate }) => {
  const { rows } = await query(
    `INSERT INTO fees (student_id, term, amount, paid, due_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [studentId, term, amount, paid || 0, dueDate || null]
  );
  return findById(rows[0].id);
};

const update = async (id, fields) => {
  const allowed = ['term', 'amount', 'paid', 'due_date'];
  const sets = [];
  const params = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (allowed.includes(key) && value !== undefined) {
      params.push(value);
      sets.push(`${key} = $${params.length}`);
    }
  });
  if (!sets.length) return findById(id);
  params.push(id);
  await query(`UPDATE fees SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
};

/** Record an additional payment against an existing fee invoice. */
const addPayment = async (id, amount) => {
  await query(`UPDATE fees SET paid = paid + $1 WHERE id = $2`, [amount, id]);
  return findById(id);
};

const remove = async (id) => {
  const { rowCount } = await query(`DELETE FROM fees WHERE id = $1`, [id]);
  return rowCount > 0;
};

module.exports = { findAll, findById, create, update, addPayment, remove };
