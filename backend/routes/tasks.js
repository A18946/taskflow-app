const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/tasks ---
// Προαιρετικά φίλτρα: ?status=pending&assigned_to=3&from=2026-09-01&to=2026-09-30
router.get('/', requireAuth, (req, res) => {
  const { status, assigned_to, from, to } = req.query;
  let query = `
    SELECT t.*, 
           creator.username as created_by_name, 
           assignee.username as assigned_to_name
    FROM tasks t
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }
  if (from) {
    query += ' AND t.due_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND t.due_date <= ?';
    params.push(to);
  }

  query += ' ORDER BY t.due_date ASC, t.priority DESC';

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// --- GET /api/tasks/:id ---
router.get('/:id', requireAuth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });
  res.json({ task });
});

// --- POST /api/tasks ---
router.post('/', requireAuth, (req, res) => {
  const { title, description, due_date, status, priority, assigned_to } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Ο τίτλος είναι υποχρεωτικός.' });
  }

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, due_date, status, priority, created_by, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    title,
    description || null,
    due_date || null,
    status || 'pending',
    priority || 'normal',
    req.user.id,
    assigned_to || null
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ task });
});

// --- PUT /api/tasks/:id ---
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });

  const {
    title = existing.title,
    description = existing.description,
    due_date = existing.due_date,
    status = existing.status,
    priority = existing.priority,
    assigned_to = existing.assigned_to,
  } = req.body;

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, due_date = ?, status = ?, priority = ?, assigned_to = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(title, description, due_date, status, priority, assigned_to, req.params.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ task });
});

// --- DELETE /api/tasks/:id ---
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
