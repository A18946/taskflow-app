const express = require('express');
const { pool } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// --- GET /api/tasks ---
router.get('/', requireAuth, async (req, res) => {
  try {
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
    let idx = 1;

    if (status) {
      query += ` AND t.status = $${idx++}`;
      params.push(status);
    }
    if (assigned_to) {
      query += ` AND t.assigned_to = $${idx++}`;
      params.push(assigned_to);
    }
    if (from) {
      query += ` AND t.due_date >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND t.due_date <= $${idx++}`;
      params.push(to);
    }

    query += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC';

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση εργασιών.' });
  }
});

// --- GET /api/tasks/:id ---
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    const task = result.rows[0];
    if (!task) return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });
    res.json({ task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά.' });
  }
});

// --- POST /api/tasks ---
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, due_date, status, priority, assigned_to } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Ο τίτλος είναι υποχρεωτικός.' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, due_date, status, priority, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        description || null,
        due_date || null,
        status || 'pending',
        priority || 'normal',
        req.user.id,
        assigned_to || null,
      ]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά τη δημιουργία εργασίας.' });
  }
});

// --- PUT /api/tasks/:id ---
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existingResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });

    const {
      title = existing.title,
      description = existing.description,
      due_date = existing.due_date,
      status = existing.status,
      priority = existing.priority,
      assigned_to = existing.assigned_to,
    } = req.body;

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, due_date = $3, status = $4, priority = $5,
           assigned_to = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, description, due_date, status, priority, assigned_to, req.params.id]
    );

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ενημέρωση εργασίας.' });
  }
});

// --- DELETE /api/tasks/:id ---
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existingResult = await pool.query('SELECT id FROM tasks WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά τη διαγραφή εργασίας.' });
  }
});

module.exports = router;
