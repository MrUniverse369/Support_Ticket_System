const express  = require('express');
const cors     = require('cors');
const pg       = require('pg');
const path     = require('path');

require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ───────────────────────────────────────────── */
app.use(cors());
app.use(express.json());                              // body-parser is built into Express 4.16+
app.use(express.static(path.join(__dirname, '../client')));

/* ── Database ─────────────────────────────────────────────── */
const db = new pg.Client({
  user:     process.env.DBUSER,
  host:     process.env.DBHOST,
  password: process.env.DBPASSWORD,
  database: process.env.DB,
  port:     process.env.DBPORT,
});

db.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);                                  // no point running without a DB
  });

/* ── Helpers ──────────────────────────────────────────────── */

// Wraps every route so we don't repeat try/catch everywhere
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Validates that required body fields are present and non-empty
function requireFields(fields, body) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === '');
  return missing.length ? missing : null;
}

/* ── Routes ───────────────────────────────────────────────── */

// Serve frontend
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '../client/index.html'))
);

/* ── GET /tickets ─────────────────────────────────────────── */
app.get('/tickets', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT
      t.ticket_id,
      t.title,
      t.description,
      t.priority,
      t.status,
      t.created_at,
      u1.name AS created_by,
      u2.name AS assigned_to
    FROM tickets t
    LEFT JOIN users u1 ON t.created_by  = u1.user_id
    LEFT JOIN users u2 ON t.assigned_to = u2.user_id
    ORDER BY t.created_at DESC
  `);
  res.json(result.rows);
}));

/* ── POST /tickets ────────────────────────────────────────── */
app.post('/tickets', asyncHandler(async (req, res) => {
  const { title, description, priority, created_by } = req.body;

  const missing = requireFields(['title', 'description', 'priority', 'created_by'], req.body);
  if (missing) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

  const VALID_PRIORITIES = ['low', 'medium', 'high'];
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const result = await db.query(
    `INSERT INTO tickets (title, description, priority, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, priority, created_by]
  );
  res.status(201).json(result.rows[0]);
}));

/* ── PATCH /tickets/:id/assign ────────────────────────────── */
app.patch('/tickets/:id/assign', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  if (!assigned_to) return res.status(400).json({ error: 'assigned_to is required' });

  const result = await db.query(
    `UPDATE tickets
     SET assigned_to = $1, updated_at = NOW()
     WHERE ticket_id = $2
     RETURNING *`,
    [assigned_to, id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Ticket not found' });
  res.json(result.rows[0]);
}));

/* ── PATCH /tickets/:id/status ────────────────────────────── */
app.patch('/tickets/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const VALID_STATUSES = ['open', 'in_progress', 'completed'];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const result = await db.query(
    `UPDATE tickets
     SET status = $1, updated_at = NOW()
     WHERE ticket_id = $2
     RETURNING *`,
    [status, id]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Ticket not found' });
  res.json(result.rows[0]);
}));

/* ── POST /tickets/:id/comments ───────────────────────────── */
app.post('/tickets/:id/comments', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user_id, comment } = req.body;

  const missing = requireFields(['user_id', 'comment'], req.body);
  if (missing) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

  const result = await db.query(
    `INSERT INTO comments (ticket_id, user_id, comment)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, user_id, comment]
  );
  res.status(201).json(result.rows[0]);
}));

/* ── GET /tickets/:id/comments ────────────────────────────── */
app.get('/tickets/:id/comments', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT
       c.comment_id,
       c.comment,
       c.created_at,
       u.name
     FROM comments c
     JOIN users u ON c.user_id = u.user_id
     WHERE c.ticket_id = $1
     ORDER BY c.created_at ASC`,
    [id]
  );
  res.json(result.rows);
}));

/* ── GET /dashboard ───────────────────────────────────────── */
app.get('/dashboard', asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM tickets
     GROUP BY status`
  );
  res.json(result.rows);
}));

/* ── Global error handler ─────────────────────────────────── */
// Catches anything thrown inside asyncHandler routes
app.use((err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/* ── Start ────────────────────────────────────────────────── */
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);