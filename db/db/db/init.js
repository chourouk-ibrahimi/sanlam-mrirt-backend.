// db/init.js
// Ouvre (ou crée) la base SQLite et s'assure que les tables existent.
// Utilise better-sqlite3 (API synchrone, .prepare().run()/.get()/.all()).

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

const db = new Database(DB_PATH);

// Pragmas recommandés pour un usage web (concurrence lecture/écriture correcte)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schéma -------------------------------------------------------------
// NB: les tables "tickets" et "users" ci-dessous sont une hypothèse
// raisonnable d'après le nom du projet (helpdesk/support). À confirmer
// avec le contenu réel de routes/auth.js et routes/tickets.js.

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'agent', -- 'agent' | 'admin'
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'pending' | 'closed'
    client_name TEXT,
    client_email TEXT,
    assigned_agent_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Table confirmée par server.js (utilisée telle quelle dans le WebSocket)
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    sender_type TEXT NOT NULL,   -- correspond à msg.role: 'client' | 'agent'
    sender_name TEXT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`);

module.exports = db;
