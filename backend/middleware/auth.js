const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Απαιτείται σύνδεση (token).' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Μη έγκυρο ή ληγμένο token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Απαιτούνται δικαιώματα διαχειριστή.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
