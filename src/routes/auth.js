// src/routes/auth.js
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/crew-login
// GET  /api/auth/crew-list   (public — no token needed)
// production ready 

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');

// ── helpers ──────────────────────────────────────────────────────────
function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── GET /auth/crew-list ──────────────────────────────────────────────
// Returns crew names + ids (no PINs) so the login dropdown can load.
router.get('/crew-list', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT crew_id AS id, name FROM crew ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /auth/crew-list]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── POST /auth/register ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { firstName, lastName = '', email, password } = req.body;

  if (!firstName || !email || !password) {
    return res.status(400).json({ error: 'firstName, email and password are required' });
  }
  if (firstName.length > 60 || lastName.length > 60) {
    return res.status(400).json({ error: 'Name is too long (max 60 characters)' });
  }
  if (email.length > 150) {
    return res.status(400).json({ error: 'Email is too long' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password is too long (max 128 characters)' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role)
       VALUES ($1, $2, $3, $4, 'USER')
       RETURNING id, first_name, last_name, email, role`,
      [firstName, lastName, email.toLowerCase().trim(), hash]
    );
    const u = rows[0];
    const name = `${u.first_name} ${u.last_name}`.trim();
    const token = makeToken({ id: u.id, email: u.email, role: u.role, name });
    res.status(201).json({ token, name, role: u.role, email: u.email });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('[POST /auth/register]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, email, password, role, created_at FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const name  = `${u.first_name} ${u.last_name}`.trim();
    const token = makeToken({ id: u.id, email: u.email, role: u.role, name });
    res.json({ token, name, role: u.role, email: u.email });
  } catch (err) {
    console.error('[POST /auth/login]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── POST /auth/crew-login ────────────────────────────────────────────
router.post('/crew-login', async (req, res) => {
  const { crewId, pin } = req.body;
  if (!crewId || !pin) {
    return res.status(400).json({ error: 'crewId and pin are required' });
  }
  if (!/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ error: 'Invalid PIN format' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT crew_id, name, pin_hash FROM crew WHERE crew_id = $1',
      [crewId]
    );
    const c = rows[0];
    if (!c) return res.status(401).json({ error: 'Invalid crew ID or PIN' });

    const ok = await bcrypt.compare(String(pin), c.pin_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid crew ID or PIN' });

    await pool.query('UPDATE crew SET online = TRUE WHERE crew_id = $1', [crewId]);

    const token = makeToken({ id: c.crew_id, crewId: c.crew_id, role: 'CREW', name: c.name });
    res.json({ token, name: c.name, role: 'CREW', crewId: c.crew_id });
  } catch (err) {
    console.error('[POST /auth/crew-login]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
