const express = require('express');
const cors    = require('cors');
const pg      = require('pg');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ───────────────────────────────────────────── */
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

/* ── Database ─────────────────────────────────────────────── */
const dbConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.DBUSER,
      host: process.env.DBHOST,
      password: process.env.DBPASSWORD,
      database: process.env.DB,
      port: process.env.DBPORT,
    };

const db = new pg.Client(dbConfig);
db.connect().then(() => console.log('✅ Connected to PostgreSQL')).catch(err => {
  console.error('❌ DB connection failed:', err.message);
  process.exit(1);
});

/* ── Helpers ──────────────────────────────────────────────── */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireFields(fields, body) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === '');
  return missing.length ? missing : null;
}

/* ── Routes ───────────────────────────────────────────────── */
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '../client/index.html'))
);

/* ── GET all tickets ─────────────────────────────────────── */
app.get('/tickets', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT t.ticket_id, t.title, t.description, t.priority, t.status, t.created_at,
           u1.name AS created_by, u2.name AS assigned_to
    FROM Tickets t
    LEFT JOIN Users u1 ON t.created_by  = u1.user_id
    LEFT JOIN Users u2 ON t.assigned_to = u2.user_id
    ORDER BY t.created_at DESC
  `);
  res.json(result.rows);
}));

/* ── POST create a ticket ────────────────────────────────── */
app.post('/tickets', asyncHandler(async (req, res) => {
  const missing = requireFields(['title', 'description', 'priority', 'created_by'], req.body);
  if (missing) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

  const { title, description, priority, created_by } = req.body;

  const result = await db.query(`
    INSERT INTO Tickets (title, description, priority, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [title, description, priority, created_by]);

  res.status(201).json(result.rows[0]);
}));

/* ── PATCH update ticket status ─────────────────────────── */
app.patch('/tickets/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id }     = req.params;
  if (!status) return res.status(400).json({ error: 'Missing status' });

  const result = await db.query(`
    UPDATE Tickets SET status=$1, updated_at=NOW()
    WHERE ticket_id=$2
    RETURNING *
  `, [status, id]);

  if (!result.rows.length) return res.status(404).json({ error: 'Ticket not found' });
  res.json(result.rows[0]);
}));

/* ── PATCH assign ticket ────────────────────────────────── */
app.patch('/tickets/:id/assign', asyncHandler(async (req, res) => {
  const { assigned_to } = req.body;
  const { id } = req.params;

  if (!assigned_to) return res.status(400).json({ error: 'Missing assigned_to user ID' });

  const result = await db.query(`
    UPDATE Tickets SET assigned_to=$1, updated_at=NOW()
    WHERE ticket_id=$2
    RETURNING *
  `, [assigned_to, id]);

  if (!result.rows.length) return res.status(404).json({ error: 'Ticket not found' });
  res.json(result.rows[0]);
}));

/* ── Global error handler ─────────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/* ── Start Server ─────────────────────────────────────────── */
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);