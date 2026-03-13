const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');          // ← Pool, not Client
const path    = require('path');

require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ───────────────────────────────────────────── */
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

/* ── Database ─────────────────────────────────────────────── *///
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user:     process.env.DBUSER,
      host:     process.env.DBHOST,
      password: process.env.DBPASSWORD,
      database: process.env.DB,
      port:     process.env.DBPORT,
    };

const db = new Pool(dbConfig);

// Test the connection once on startup
db.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  });

/* ── Helpers ──────────────────────────────────────────────── */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* ── API Routes (/api prefix to match the frontend) ──────── */

// GET all tickets
app.get('/api/tickets', asyncHandler(async (req, res) => {
  const result = await db.query(`
    SELECT t.ticket_id, t.title, t.description, t.priority, t.status, t.created_at,
           u1.name AS created_by, u2.name AS assigned_to
    FROM tickets t
    LEFT JOIN users u1 ON t.created_by  = u1.user_id
    LEFT JOIN users u2 ON t.assigned_to = u2.user_id
    ORDER BY t.created_at DESC
  `);
  res.json(result.rows);
}));

// POST create a new ticket
app.post('/api/tickets', asyncHandler(async (req, res) => {
  const { title, description, priority, created_by } = req.body;

  if (!title || !description || !priority) {
    return res.status(400).json({ error: 'title, description, and priority are required' });
  }

  const result = await db.query(
    `INSERT INTO tickets (title, description, priority, status, created_by)
     VALUES ($1, $2, $3, 'open', $4)
     RETURNING *`,
    [title, description, priority, created_by || null]
  );
  res.status(201).json(result.rows[0]);
}));

// PATCH update ticket status  (open → in_progress → completed)
app.patch('/api/tickets/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['open', 'in_progress', 'completed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const result = await db.query(
    `UPDATE tickets SET status = $1 WHERE ticket_id = $2 RETURNING *`,
    [status, id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Ticket not found' });
  res.json(result.rows[0]);
}));

// PATCH assign ticket to a user
app.patch('/api/tickets/:id/assign', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  if (!assigned_to) {
    return res.status(400).json({ error: 'assigned_to (user ID) is required' });
  }

  const result = await db.query(
    `UPDATE tickets SET assigned_to = $1 WHERE ticket_id = $2 RETURNING *`,
    [assigned_to, id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Ticket not found' });
  res.json(result.rows[0]);
}));

/* ── SPA fallback — must be AFTER all API routes ─────────── */
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '../client/index.html'))
);

/* ── Global error handler ─────────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/* ── Start Server ─────────────────────────────────────────── */
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);