const express = require('express');
const cors    = require('cors');
const pg      = require('pg');
const path    = require('path');

require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ───────────────────────────────────────────── */
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());           // For JSON bodies
app.use(express.urlencoded({ extended: true })); // For form submissions
app.use(express.static(path.join(__dirname, '../client')));

/* ── Database ─────────────────────────────────────────────── */
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Required for Render Postgres
    }
  : {
      user: process.env.DBUSER,
      host: process.env.DBHOST,
      password: process.env.DBPASSWORD,
      database: process.env.DB,
      port: process.env.DBPORT,
    };

const db = new pg.Client(dbConfig);

db.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => {
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

/* ── Example GET /tickets ────────────────────────────────── */
app.get('/tickets', asyncHandler(async (req, res) => {
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

/* ── Global error handler ─────────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error(`[${req.method} ${req.path}]`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/* ── Start Server ─────────────────────────────────────────── */
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);