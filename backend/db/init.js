const { Pool } = require('pg');
require('dotenv').config();

// Το DATABASE_URL δίνεται από το Neon (ή οποιονδήποτε πάροχο PostgreSQL).
// Μορφή: postgresql://user:password@host/dbname?sslmode=require
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ΛΑΘΟΣ: Δεν έχει οριστεί η μεταβλητή περιβάλλοντος DATABASE_URL.');
  console.error('Πρόσθεσέ την στο .env (τοπικά) ή στα Environment Variables του Render.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Το Neon απαιτεί SSL
});

// --- Δημιουργία πινάκων αν δεν υπάρχουν ήδη ---
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATE,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Οι πίνακες της βάσης είναι έτοιμοι.');
}

module.exports = { pool, initDb };
