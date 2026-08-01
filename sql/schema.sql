-- ============================================================================
-- AttendIQ Backend — PostgreSQL Schema
-- Single-tenant version scoped to: Login, Dashboard, Students, Attendance,
-- Marks, Fees, Timetable, Notes.
-- (For a full multi-tenant SaaS schema with OTP/billing/RLS, see the earlier
--  AttendIQ_Database_Design deliverable — this is the lean version that
--  matches exactly what this Express backend implements.)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive username/email

CREATE TYPE user_role           AS ENUM ('admin', 'staff', 'student');
CREATE TYPE attendance_status_t AS ENUM ('P', 'A', 'L');   -- Present / Absent / Late
CREATE TYPE fee_status_t        AS ENUM ('paid', 'partial', 'due', 'overdue');

-- ── Classes ─────────────────────────────────────────────────────────────
CREATE TABLE classes (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,          -- '2nd CSE A'
    section       TEXT,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, academic_year)
);

-- ── Subjects ────────────────────────────────────────────────────────────
CREATE TABLE subjects (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    code       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Class ↔ Subject mapping ─────────────────────────────────────────────
CREATE TABLE class_subjects (
    id         SERIAL PRIMARY KEY,
    class_id   INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE (class_id, subject_id)
);

-- ── Students (created first without user_id FK; users references it) ───
CREATE TABLE students (
    id             SERIAL PRIMARY KEY,
    class_id       INT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    admission_no   TEXT NOT NULL UNIQUE,      -- '21CS001'
    roll_no        TEXT,
    full_name      TEXT NOT NULL,
    dob            DATE,
    gender         TEXT,
    phone          TEXT,
    email          CITEXT,
    address        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_class ON students(class_id);

-- ── Users (auth) ────────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      CITEXT NOT NULL UNIQUE,
    email         CITEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'student',
    student_id    INT UNIQUE REFERENCES students(id) ON DELETE SET NULL, -- only set when role='student'
    phone         TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ( (role = 'student' AND student_id IS NOT NULL) OR (role <> 'student') )
);
CREATE INDEX idx_users_role ON users(role);

-- ── Timetable ───────────────────────────────────────────────────────────
CREATE TABLE timetable (
    id          SERIAL PRIMARY KEY,
    class_id    INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Mon .. 6=Sun
    period      SMALLINT NOT NULL CHECK (period BETWEEN 1 AND 10),
    subject_id  INT REFERENCES subjects(id) ON DELETE SET NULL,          -- NULL = Break/Free
    staff_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, day_of_week, period)
);
CREATE INDEX idx_timetable_class_day ON timetable(class_id, day_of_week);

-- ── Attendance ──────────────────────────────────────────────────────────
CREATE TABLE attendance (
    id               BIGSERIAL PRIMARY KEY,
    student_id       INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id         INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id       INT REFERENCES subjects(id) ON DELETE SET NULL,
    attendance_date  DATE NOT NULL,
    period           SMALLINT NOT NULL CHECK (period BETWEEN 1 AND 10),
    status           attendance_status_t NOT NULL,
    marked_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, attendance_date, period)
);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, attendance_date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date);

-- ── Marks ───────────────────────────────────────────────────────────────
CREATE TABLE marks (
    id              SERIAL PRIMARY KEY,
    student_id      INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id      INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    term            TEXT NOT NULL,        -- 'Sem 3', 'Term 1'
    exam_name       TEXT NOT NULL DEFAULT 'Final',   -- 'Internal 1', 'Final'
    marks_obtained  NUMERIC(6,2),
    max_marks       NUMERIC(6,2) NOT NULL DEFAULT 100,
    grade           TEXT,                 -- 'A+', 'O', etc. (optional, grade-mode institutions)
    entered_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, subject_id, term, exam_name),
    CHECK (marks_obtained IS NOT NULL OR grade IS NOT NULL)
);
CREATE INDEX idx_marks_student_term ON marks(student_id, term);

-- ── Fees ────────────────────────────────────────────────────────────────
CREATE TABLE fees (
    id          SERIAL PRIMARY KEY,
    student_id  INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    term        TEXT NOT NULL,
    amount      NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    paid        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
    due_date    DATE,
    status      fee_status_t NOT NULL DEFAULT 'due',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (paid <= amount)
);
CREATE INDEX idx_fees_student ON fees(student_id);
CREATE INDEX idx_fees_status ON fees(status);

-- Auto-derive fee status from amount/paid whenever a row is inserted/updated.
CREATE OR REPLACE FUNCTION fn_set_fee_status() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.paid >= NEW.amount THEN
        NEW.status := 'paid';
    ELSIF NEW.paid > 0 THEN
        NEW.status := 'partial';
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE THEN
        NEW.status := 'overdue';
    ELSE
        NEW.status := 'due';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fees_status
BEFORE INSERT OR UPDATE OF amount, paid, due_date ON fees
FOR EACH ROW EXECUTE FUNCTION fn_set_fee_status();

-- ── Notes / Notices ─────────────────────────────────────────────────────
CREATE TABLE notes (
    id         SERIAL PRIMARY KEY,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
    class_id   INT REFERENCES classes(id) ON DELETE CASCADE,   -- NULL = visible to all classes
    author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    color      SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_class ON notes(class_id, created_at DESC);

-- ── generic updated_at maintenance for tables that need it ─────────────
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_touch BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_users_touch BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_marks_touch BEFORE UPDATE ON marks
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ============================================================================
-- Seed data (matches the frontend's demo dataset — safe to remove in prod)
-- ============================================================================
INSERT INTO classes (name, section, academic_year) VALUES
  ('2nd CSE A', 'A', '2025-2026'),
  ('2nd CSE B', 'B', '2025-2026'),
  ('3rd CSE A', 'A', '2025-2026');

INSERT INTO subjects (name, code) VALUES
  ('Mathematics III', 'MA301'),
  ('Data Structures', 'CS301'),
  ('Computer Networks', 'CS302'),
  ('Operating Systems', 'CS303'),
  ('Database Management', 'CS304');

-- Default admin login: username=admin / password=Admin@123
-- (hash generated with bcryptjs, cost factor 10 — see controllers/authController.js)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
  ('admin', 'admin@attendiq.local',
   '$2a$10$0MvBzvbb6vo3gKDVpCuANe44xBwrEbotMAurBP43E0q83Zio/Y.oq',  -- Admin@123
   'Dr. R. Subramaniam', 'admin');
