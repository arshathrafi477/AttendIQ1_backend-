// models/studentModel.js
// Data-access layer for the `students` table.

const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT s.id, s.admission_no, s.roll_no, s.full_name, s.dob, s.gender,
         s.phone, s.email, s.address, s.class_id, c.name AS class_name,
         s.created_at, s.updated_at
    FROM students s
    JOIN classes c ON c.id = s.class_id
`;

const findAll = async ({ classId, search, limit = 50, offset = 0 }) => {
  const conditions = [];
  const params = [];

  if (classId) {
    params.push(classId);
    conditions.push(`s.class_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(s.full_name ILIKE $${params.length} OR s.admission_no ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `${BASE_SELECT} ${whereClause} ORDER BY s.full_name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const count = async ({ classId, search }) => {
  const conditions = [];
  const params = [];
  if (classId) {
    params.push(classId);
    conditions.push(`class_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(full_name ILIKE $${params.length} OR admission_no ILIKE $${params.length})`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM students ${whereClause}`, params);
  return rows[0].total;
};

const findById = async (id) => {
  const { rows } = await query(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  return rows[0] || null;
};

const create = async ({ classId, admissionNo, rollNo, fullName, dob, gender, phone, email, address }) => {
  const { rows } = await query(
    `INSERT INTO students (class_id, admission_no, roll_no, full_name, dob, gender, phone, email, address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [classId, admissionNo, rollNo, fullName, dob || null, gender || null, phone || null, email || null, address || null]
  );
  return findById(rows[0].id);
};

const update = async (id, fields) => {
  const allowed = ['class_id', 'admission_no', 'roll_no', 'full_name', 'dob', 'gender', 'phone', 'email', 'address'];
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
  await query(`UPDATE students SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
};

const remove = async (id) => {
  const { rowCount } = await query(`DELETE FROM students WHERE id = $1`, [id]);
  return rowCount > 0;
};

module.exports = { findAll, count, findById, create, update, remove };
