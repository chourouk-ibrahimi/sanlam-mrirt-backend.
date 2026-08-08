// db/init.js
// Ouvre (ou crée) la base SQLite et s'assure que les tables existent.
// Utilise better-sqlite3 (API synchrone, .prepare().run()/.get()/.all()).

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

const db = new Database(DB_PATH);

// NB: le mode WAL a été retiré volontairement — certains hébergeurs
// conteneurisés ont un système de fichiers qui ne le supporte pas
// correctement (erreur "disk I/O error" au démarrage). Le mode par
// défaut (rollback journal) est plus lent en forte concurrence mais
// beaucoup plus compatible.
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'agent',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    client_name TEXT,
    client_email TEXT,
    assigned_agent_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`);

module.exports = db;
