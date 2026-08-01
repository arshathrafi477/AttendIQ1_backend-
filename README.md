# AttendIQ Backend

Node.js + Express + PostgreSQL REST API for the AttendIQ Dashboard.
Clean MVC architecture, JWT auth, role-based access control, and input validation.

This is a rebuild of the original delivery with two categories of fixes:
1. A real syntax bug (unquoted numeric object keys) that was only caught during
   testing last time — this version was syntax-checked file-by-file **before**
   each layer was tested, so nothing shipped without `node -c` passing first.
2. Deployment hardening for hosted platforms like **Render**: SSL support for
   managed Postgres, and a `GET /` handler so the root URL doesn't just 404.

Every endpoint below was executed against a live PostgreSQL database as part of
building this — the sample responses are real captured output, not hand-written.

## Folder structure

```
attendiq-backend/
├── config/
│   ├── config.js        # env var loader (fails fast if JWT_SECRET missing)
│   └── db.js              # pg Pool + SSL support + query/getClient/testConnection
├── controllers/           # one file per feature — thin, calls models
├── models/                 # all SQL lives here
├── routes/                  # express-validator rules + route wiring
├── middleware/
│   ├── authMiddleware.js    # protect() verifies JWT, authorize(...roles) checks role
│   ├── validateMiddleware.js
│   └── errorMiddleware.js   # notFound + centralized errorHandler
├── utils/
│   ├── asyncHandler.js       # wraps async controllers, forwards errors to next()
│   ├── ApiError.js
│   └── ApiResponse.js
├── sql/
│   └── schema.sql             # CREATE TABLE + triggers + seed data
├── server.js
├── package.json
└── .env.example
```

## Setup (local)

```bash
npm install
cp .env.example .env        # then edit PGHOST/PGUSER/PGPASSWORD/JWT_SECRET
createdb attendiq
psql -d attendiq -f sql/schema.sql
npm run dev                 # nodemon, or `npm start` for production
```

Server boots on `http://localhost:5000` (or `PORT` from `.env`) and prints:
```
PostgreSQL connected — server time: ...
AttendIQ backend listening on port 5000 [development]
```

**Seed login:** `username: admin` / `password: Admin@123`

## Deploying (e.g. Render)

1. Push this repo, create a **Web Service** pointing at it. Build command
   `npm install`, start command `npm start`.
2. Create a **Render Postgres** instance (or use any managed Postgres) and run
   `sql/schema.sql` against it once (e.g. `psql "<external connection string>" -f sql/schema.sql`).
3. In the Web Service's environment variables, set:
   - `DATABASE_URL` — the connection string Render gives you for the database
   - `DB_SSL=true` — **required**, managed Postgres rejects unencrypted connections
   - `JWT_SECRET` — a long random string
   - `NODE_ENV=production`
   - `CORS_ORIGIN` — your frontend's origin (or `*` while testing)
4. `PORT` is set automatically by Render — no need to set it yourself.
5. Once deployed, `GET https://<your-service>.onrender.com/` returns a JSON
   status message, and `/health` gives a lighter-weight check.

## Authentication

Every route except `POST /api/auth/login` requires:
```
Authorization: Bearer <jwt>
```
Roles are `admin`, `staff`, `student`.

| Feature | Read | Write | Delete |
|---|---|---|---|
| Students | any logged-in user | admin, staff | admin |
| Attendance | any | admin, staff | admin, staff |
| Marks | any | admin, staff | admin, staff |
| Fees | any | admin, staff | admin |
| Timetable | any | admin, staff | admin, staff |
| Notes | any | admin, staff | admin, staff |
| Dashboard | any | — | — |
| Register new user | — | admin only | — |

## API reference & real sample responses

### `GET /`
```json
{ "success": true, "message": "AttendIQ backend is running",
  "docs": "/health for a lightweight status check, /api/* for the REST API" }
```

### `POST /api/auth/login`
Request: `{"username":"admin","password":"Admin@123"}`
```json
{
  "success": true, "statusCode": 200, "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e0012ef5-74dd-4214-95f4-79532556ba73",
      "username": "admin", "email": "admin@attendiq.local",
      "full_name": "Dr. R. Subramaniam", "role": "admin",
      "student_id": null, "is_active": true
    }
  }
}
```
Wrong password → `401 {"success":false,"message":"Invalid username or password"}`
Missing fields → `422 {"success":false,"message":"Validation failed","errors":[{"field":"username","message":"username is required"}]}`
Malformed JSON body → `400 {"success":false,"message":"Malformed JSON in request body"}`

### `GET /api/auth/me`
```json
{ "success": true, "statusCode": 200, "message": "Success",
  "data": { "id": "...", "username": "admin", "role": "admin", "created_at": "2026-08-01T04:43:05.226Z" } }
```

### `GET /api/students` (no token)
```json
{ "success": false, "message": "Not authorized — no token provided" }
```

### `POST /api/students`
Request: `{"classId":1,"admissionNo":"21CS999","rollNo":"21CS999","fullName":"Test Student","email":"test@mail.com"}`
```json
{
  "success": true, "statusCode": 201, "message": "Student created successfully",
  "data": { "id": 1, "admission_no": "21CS999", "full_name": "Test Student",
            "class_id": 1, "class_name": "2nd CSE A", "email": "test@mail.com" }
}
```

### `POST /api/attendance` (mark one student)
Request: `{"studentId":1,"classId":1,"subjectId":1,"attendanceDate":"2026-07-20","period":1,"status":"P"}`
→ `201`, returns the marked record with `student_name`/`subject_name` joined in.

### `POST /api/attendance/bulk` (mark a whole class)
Request: `{"classId":1,"subjectId":1,"attendanceDate":"2026-07-21","period":1,"records":[{"studentId":1,"status":"A"}]}`
→ `201`, `data` is an array of the marked records for that class/date.

### `GET /api/attendance/student/:id/percentage`
```json
{ "success": true, "data": { "present": 1, "total": 2, "percentage": 50 } }
```

### `POST /api/marks` (upsert)
Request: `{"studentId":1,"subjectId":1,"term":"Sem 3","marksObtained":88,"maxMarks":100}`
```json
{ "success": true, "statusCode": 201, "message": "Marks saved successfully",
  "data": { "id": 1, "term": "Sem 3", "marks_obtained": "88.00", "max_marks": "100.00" } }
```

### `POST /api/fees` then `POST /api/fees/:id/pay`
Create: `{"studentId":1,"term":"Semester 3","amount":42000,"dueDate":"2026-08-31"}` → `status: "due"`
Pay ₹21,000 → **`status` auto-flips to `"partial"`** (DB trigger, not app code)
Pay remaining ₹21,000 → **`status` auto-flips to `"paid"`**
Overpay → `400 {"success":false,"message":"Payment exceeds the remaining due amount"}`

### `GET /api/dashboard/summary`
```json
{
  "success": true, "data": {
    "totalStudents": 1, "totalClasses": 3, "avgAttendancePercentage": "50.0",
    "fees": { "totalAmount": "42000.00", "totalPaid": "42000.00", "totalDue": 0 },
    "lowAttendanceAlerts": [ { "id": 1, "full_name": "Test Student", "class_name": "2nd CSE A", "percentage": "50.0" } ]
  }
}
```

### `GET /api/dashboard/attendance-by-class`
```json
{ "success": true, "data": [ { "class_id": 1, "class_name": "2nd CSE A", "percentage": "50.0" } ] }
```

### `GET /api/dashboard/top-performers?term=Sem%203`
```json
{ "success": true, "data": [ { "id": 1, "full_name": "Test Student", "avg_percentage": "88.00" } ] }
```

### `GET /api/nonexistent-route`
```json
{ "success": false, "message": "Route not found — GET /api/nonexistent-route" }
```

## Design notes

- **Every list endpoint is paginated** (`?page=1&pageSize=20`, capped at 100–200 per request).
- **Fee `status` is DB-derived**, never set directly by the app — a trigger recomputes it from `amount`/`paid` on every write.
- **Attendance/marks use `ON CONFLICT ... DO UPDATE` (upsert)** on their unique constraints.
- **`errorMiddleware.js` maps common Postgres error codes** and malformed-JSON errors to friendly HTTP responses automatically.
- **`DB_SSL=true`** must be set when connecting to any managed Postgres (Render, Railway, Heroku, Supabase) — without it the connection will be rejected.
- **Stack traces only appear in responses when `NODE_ENV=development`** — set `NODE_ENV=production` before deploying.
