// models/noteModel.js
// Data-access layer for the `notes` (notices) table.

const { query } = require('../config/db');

const BASE_SELECT = `
  SELECT n.id, n.title, n.body, n.subject_id, sub.name AS subject_name,
         n.class_id, c.name AS class_name, n.author_id, u.full_name AS author_name,
         n.color, n.created_at
    FROM notes n
    LEFT JOIN subjects sub ON sub.id = n.subject_id
    LEFT JOIN classes c ON c.id = n.class_id
    LEFT JOIN users u ON u.id = n.author_id
`;

const findAll = async ({ classId, limit = 50, offset = 0 }) => {
  const conditions = [];
  const params = [];
  if (classId) {
    // include notes targeted at this class AND general notes (class_id IS NULL)
    params.push(classId);
    conditions.push(`(n.class_id = $${params.length} OR n.class_id IS NULL)`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `${BASE_SELECT} ${whereClause} ORDER BY n.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(`${BASE_SELECT} WHERE n.id = $1`, [id]);
  return rows[0] || null;
};

const create = async ({ title, body, subjectId, classId, authorId, color }) => {
  const { rows } = await query(
    `INSERT INTO notes (title, body, subject_id, class_id, author_id, color)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [title, body, subjectId || null, classId || null, authorId, color || 0]
  );
  return findById(rows[0].id);
};

const update = async (id, fields) => {
  const allowed = ['title', 'body', 'subject_id', 'class_id', 'color'];
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
  await query(`UPDATE notes SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return findById(id);
};

const remove = async (id) => {
  const { rowCount } = await query(`DELETE FROM notes WHERE id = $1`, [id]);
  return rowCount > 0;
};

module.exports = { findAll, findById, create, update, remove };
