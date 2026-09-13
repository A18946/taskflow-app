const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/init');
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
// Δημιουργία νέου χρήστη: username, email, password
router.post('/register', (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Χρειάζονται username, email και password.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Υπάρχει ήδη χρήστης με αυτό το username ή email.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  // Ο πρώτος χρήστης που δημιουργείται γίνεται αυτόματα admin
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const finalRole = userCount === 0 ? 'admin' : (role === 'admin' ? 'member' : (role || 'member'));
  // Σημείωση: δεν επιτρέπουμε στον client να ορίσει τον εαυτό του admin εκτός του πρώτου χρήστη

  const stmt = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const info = stmt.run(username, email, password_hash, finalRole);

  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
    .get(info.lastInsertRowid);

  const token = signToken(user);
  res.status(201).json({ user, token });
});

// --- POST /api/auth/login ---
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Χρειάζονται email και password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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
});

// --- GET /api/auth/me ---
// Επιστρέφει τα στοιχεία του συνδεδεμένου χρήστη
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Ο χρήστης δεν βρέθηκε.' });
  res.json({ user });
});

module.exports = router;
