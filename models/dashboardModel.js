// models/dashboardModel.js
// Aggregate queries that power the dashboard statistics API.

const { query } = require('../config/db');

const getSummary = async () => {
  const [students, classes, avgAttendance, feesCollection, lowAttendance] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM students`),

    query(`SELECT COUNT(*)::int AS total FROM classes`),

    query(`
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'P')::numeric / NULLIF(COUNT(*), 0)) * 100, 1
      ) AS avg_percentage
      FROM attendance
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '30 days'
    `),

    query(`
      SELECT COALESCE(SUM(amount), 0)::numeric AS total_amount,
             COALESCE(SUM(paid), 0)::numeric AS total_paid
        FROM fees
    `),

    // Students whose attendance % over the last 30 days is below 75%
    query(`
      SELECT s.id, s.full_name, c.name AS class_name,
             ROUND((COUNT(*) FILTER (WHERE a.status = 'P')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS percentage
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        JOIN classes c ON c.id = s.class_id
       WHERE a.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY s.id, s.full_name, c.name
      HAVING (COUNT(*) FILTER (WHERE a.status = 'P')::numeric / NULLIF(COUNT(*), 0)) * 100 < 75
       ORDER BY percentage ASC
       LIMIT 10
    `),
  ]);

  return {
    totalStudents: students.rows[0].total,
    totalClasses: classes.rows[0].total,
    avgAttendancePercentage: avgAttendance.rows[0].avg_percentage,
    fees: {
      totalAmount: feesCollection.rows[0].total_amount,
      totalPaid: feesCollection.rows[0].total_paid,
      totalDue: feesCollection.rows[0].total_amount - feesCollection.rows[0].total_paid,
    },
    lowAttendanceAlerts: lowAttendance.rows,
  };
};

/** Attendance % grouped by class, for the last N days. */
const attendanceByClass = async (days = 30) => {
  const { rows } = await query(
    `SELECT c.id AS class_id, c.name AS class_name,
            ROUND((COUNT(*) FILTER (WHERE a.status = 'P')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS percentage
       FROM attendance a
       JOIN classes c ON c.id = a.class_id
      WHERE a.attendance_date >= CURRENT_DATE - ($1 || ' days')::interval
      GROUP BY c.id, c.name
      ORDER BY c.name`,
    [days]
  );
  return rows;
};

/** Top performing students by average marks percentage for a given term. */
const topPerformers = async (term, limit = 5) => {
  const { rows } = await query(
    `SELECT s.id, s.full_name, c.name AS class_name,
            ROUND(AVG(m.marks_obtained / NULLIF(m.max_marks,0) * 100)::numeric, 2) AS avg_percentage
       FROM marks m
       JOIN students s ON s.id = m.student_id
       JOIN classes c ON c.id = s.class_id
      WHERE m.term = $1 AND m.marks_obtained IS NOT NULL
      GROUP BY s.id, s.full_name, c.name
      ORDER BY avg_percentage DESC
      LIMIT $2`,
    [term, limit]
  );
  return rows;
};

module.exports = { getSummary, attendanceByClass, topPerformers };
