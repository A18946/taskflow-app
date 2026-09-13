require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

const { pool, initDb } = require('./db/init');
const { JWT_SECRET } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }, // Σε production, περιόρισέ το στο domain του frontend σου
});

app.use(cors());
app.use(express.json());

// Σερβίρει το frontend (στατικά αρχεία) - βολικό για τοπική χρήση/απλό deploy
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- Socket.io: real-time team chat ---
// Ο client στέλνει το JWT token στο handshake για επαλήθευση
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Δεν δόθηκε token.'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Μη έγκυρο token.'));
  }
});

io.on('connection', (socket) => {
  console.log(`Συνδέθηκε: ${socket.user.username}`);

  socket.on('chat:send', async (data) => {
    const content = (data?.content || '').trim();
    if (!content) return;

    try {
      const result = await pool.query(
        `INSERT INTO messages (user_id, content) VALUES ($1, $2)
         RETURNING id, created_at`,
        [socket.user.id, content]
      );

      const message = {
        id: result.rows[0].id,
        content,
        created_at: result.rows[0].created_at,
        user_id: socket.user.id,
        username: socket.user.username,
      };

      io.emit('chat:message', message); // broadcast σε όλους (και στον αποστολέα)
    } catch (err) {
      console.error('Σφάλμα αποθήκευσης μηνύματος:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Αποσυνδέθηκε: ${socket.user.username}`);
  });
});

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server up: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Αποτυχία σύνδεσης/αρχικοποίησης βάσης δεδομένων:', err);
    process.exit(1);
  });
