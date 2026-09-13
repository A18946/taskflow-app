const express = require('express');
const { pool } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/users ---
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY username'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση χρηστών.' });
  }
});

module.exports = router;
