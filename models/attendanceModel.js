// models/attendanceModel.js
// Data-access layer for the `attendance` table.

const { query, getClient } = require('../config/db');

const BASE_SELECT = `
  SELECT a.id, a.student_id, s.full_name AS student_name, a.class_id,
         a.subject_id, sub.name AS subject_name, a.attendance_date,
         a.period, a.status, a.marked_by, a.created_at
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN subjects sub ON sub.id = a.subject_id
`;

const findAll = async ({ classId, studentId, date, from, to, limit = 100, offset = 0 }) => {
  const conditions = [];
  const params = [];

  if (classId) { params.push(classId); conditions.push(`a.class_id = $${params.length}`); }
  if (studentId) { params.push(studentId); conditions.push(`a.student_id = $${params.length}`); }
  if (date) { params.push(date); conditions.push(`a.attendance_date = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`a.attendance_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`a.attendance_date <= $${params.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `${BASE_SELECT} ${whereClause} ORDER BY a.attendance_date DESC, a.period ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(`${BASE_SELECT} WHERE a.id = $1`, [id]);
  return rows[0] || null;
};

/** Mark attendance for one student/date/period. Upserts on the unique constraint. */
const markOne = async ({ studentId, classId, subjectId, attendanceDate, period, status, markedBy }) => {
  const { rows } = await query(
    `INSERT INTO attendance (student_id, class_id, subject_id, attendance_date, period, status, marked_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (student_id, attendance_date, period)
     DO UPDATE SET status = EXCLUDED.status, subject_id = EXCLUDED.subject_id, marked_by = EXCLUDED.marked_by
     RETURNING id`,
    [studentId, classId, subjectId || null, attendanceDate, period, status, markedBy]
  );
  return findById(rows[0].id);
};

/** Bulk mark an entire class for one date/period in a single transaction. */
const markBulk = async ({ classId, subjectId, attendanceDate, period, markedBy, records }) => {
  // records: [{ studentId, status }]
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (student_id, class_id, subject_id, attendance_date, period, status, marked_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (student_id, attendance_date, period)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [r.studentId, classId, subjectId || null, attendanceDate, period, r.status, markedBy]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return findAll({ classId, date: attendanceDate });
};

const remove = async (id) => {
  const { rowCount } = await query(`DELETE FROM attendance WHERE id = $1`, [id]);
  return rowCount > 0;
};

/** Attendance % for one student across an optional date range. */
const studentPercentage = async (studentId, { from, to } = {}) => {
  const conditions = ['student_id = $1'];
  const params = [studentId];
  if (from) { params.push(from); conditions.push(`attendance_date >= $${params.length}`); }
  if (to) { params.push(to); conditions.push(`attendance_date <= $${params.length}`); }

  const { rows } = await query(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'P')::int AS present,
        COUNT(*)::int AS total
       FROM attendance
      WHERE ${conditions.join(' AND ')}`,
    params
  );
  const { present, total } = rows[0];
  return { present, total, percentage: total ? Math.round((present / total) * 100) : null };
};

module.exports = { findAll, findById, markOne, markBulk, remove, studentPercentage };
