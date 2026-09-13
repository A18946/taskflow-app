const express = require('express');
const { pool } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/chat/messages ---
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.content, m.created_at, u.id as user_id, u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.id DESC
      LIMIT 100
    `);
    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση μηνυμάτων.' });
  }
});

module.exports = router;
