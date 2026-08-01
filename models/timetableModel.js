// models/timetableModel.js
// Data-access layer for the `timetable` table.

const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT t.id, t.class_id, c.name AS class_name, t.day_of_week, t.period,
         t.subject_id, sub.name AS subject_name, t.staff_id, u.full_name AS staff_name,
         t.created_at
    FROM timetable t
    JOIN classes c ON c.id = t.class_id
    LEFT JOIN subjects sub ON sub.id = t.subject_id
    LEFT JOIN users u ON u.id = t.staff_id
`;

const findByClass = async (classId) => {
  const { rows } = await query(
    `${BASE_SELECT} WHERE t.class_id = $1 ORDER BY t.day_of_week ASC, t.period ASC`,
    [classId]
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] || null;
};

/** Create or replace the subject/staff assigned to a class/day/period slot. */
const upsertSlot = async ({ classId, dayOfWeek, period, subjectId, staffId }) => {
  const { rows } = await query(
    `INSERT INTO timetable (class_id, day_of_week, period, subject_id, staff_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (class_id, day_of_week, period)
     DO UPDATE SET subject_id = EXCLUDED.subject_id, staff_id = EXCLUDED.staff_id
     RETURNING id`,
    [classId, dayOfWeek, period, subjectId || null, staffId || null]
  );
  return findById(rows[0].id);
};

const remove = async (id) => {
  const { rowCount } = await query(`DELETE FROM timetable WHERE id = $1`, [id]);
  return rowCount > 0;
};

module.exports = { findByClass, findById, upsertSlot, remove };
