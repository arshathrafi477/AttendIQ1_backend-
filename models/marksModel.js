// models/marksModel.js
// Data-access layer for the `marks` table.

const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT m.id, m.student_id, s.full_name AS student_name, m.subject_id,
         sub.name AS subject_name, m.term, m.exam_name, m.marks_obtained,
         m.max_marks, m.grade, m.entered_by, m.created_at, m.updated_at
    FROM marks m
    JOIN students s ON s.id = m.student_id
    JOIN subjects sub ON sub.id = m.subject_id
`;

const findAll = async ({ studentId, subjectId, term, limit = 100, offset = 0 }) => {
  const conditions = [];
  const params = [];
  if (studentId) { params.push(studentId); conditions.push(`m.student_id = $${params.length}`); }
  if (subjectId) { params.push(subjectId); conditions.push(`m.subject_id = $${params.length}`); }
  if (term) { params.push(term); conditions.push(`m.term = $${params.length}`); }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `${BASE_SELECT} ${whereClause} ORDER BY m.term DESC, sub.name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(`${BASE_SELECT} WHERE m.id = $1`, [id]);
  return rows[0] || null;
};

const upsert = async ({ studentId, subjectId, term, examName, marksObtained, maxMarks, grade, enteredBy }) => {
  const { rows } = await query(
    `INSERT INTO marks (student_id, subject_id, term, exam_name, marks_obtained, max_marks, grade, entered_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (student_id, subject_id, term, exam_name)
     DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained,
                   max_marks = EXCLUDED.max_marks,
                   grade = EXCLUDED.grade,
                   entered_by = EXCLUDED.entered_by
     RETURNING id`,
    [studentId, subjectId, term, examName || 'Final', marksObtained || null, maxMarks || 100, grade || null, enteredBy]
  );
  return findById(rows[0].id);
};

const update = async (id, fields) => {
  const allowed = ['marks_obtained', 'max_marks', 'grade', 'term', 'exam_name'];
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
  await query(`UPDATE marks SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
};

const remove = async (id) => {
  const { rowCount } = await query(`DELETE FROM marks WHERE id = $1`, [id]);
  return rowCount > 0;
};

/** Average marks/percentage for a student in a given term. */
const studentTermSummary = async (studentId, term) => {
  const { rows } = await query(
    `SELECT ROUND(AVG(marks_obtained / NULLIF(max_marks,0) * 100)::numeric, 2) AS avg_percentage,
            COUNT(*)::int AS subjects_count
       FROM marks
      WHERE student_id = $1 AND term = $2 AND marks_obtained IS NOT NULL`,
    [studentId, term]
  );
  return rows[0];
};

module.exports = { findAll, findById, upsert, update, remove, studentTermSummary };
