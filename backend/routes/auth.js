const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/init');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// --- POST /api/auth/register ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Χρειάζονται username, email και password.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Υπάρχει ήδη χρήστης με αυτό το username ή email.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);

    // Ο πρώτος χρήστης που δημιουργείται γίνεται αυτόματα admin
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(countResult.rows[0].count, 10);
    const role = userCount === 0 ? 'admin' : 'member';

    const insertResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, created_at`,
      [username, email, password_hash, role]
    );

    const user = insertResult.rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την εγγραφή.' });
  }
});

// --- POST /api/auth/login ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Χρειάζονται email και password.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Λάθος email ή κωδικός.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Λάθος email ή κωδικός.' });
    }

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά τη σύνδεση.' });
  }
});

// --- GET /api/auth/me ---
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Ο χρήστης δεν βρέθηκε.' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά.' });
  }
});

module.exports = router;
