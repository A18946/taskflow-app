const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/users ---
// Λίστα όλων των χρηστών της ομάδας (χωρίς password), χρήσιμο για
// ανάθεση tasks και εμφάνιση στο chat
router.get('/', requireAuth, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, role, created_at FROM users ORDER BY username'
  ).all();
  res.json({ users });
});

module.exports = router;
