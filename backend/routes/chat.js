const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/chat/messages ---
// Επιστρέφει τα τελευταία 100 μηνύματα (ιστορικό). Το real-time γίνεται μέσω Socket.io
router.get('/messages', requireAuth, (req, res) => {
  const messages = db.prepare(`
    SELECT m.id, m.content, m.created_at, u.id as user_id, u.username
    FROM messages m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.id DESC
    LIMIT 100
  `).all().reverse();

  res.json({ messages });
});

module.exports = router;
