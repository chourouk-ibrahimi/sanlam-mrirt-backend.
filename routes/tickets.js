// routes/tickets.js
// Gestion des tickets de support.
// - Création: publique (un client peut ouvrir un ticket sans compte).
// - Lecture/liste/mise à jour: réservées aux agents connectés (JWT).

const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('./auth');

const router = express.Router();

// POST /api/tickets — un client crée un nouveau ticket (pas d'auth requise)
router.post('/', (req, res) => {
  const { subject, client_name, client_email, message } = req.body || {};
  if (!subject) {
    return res.status(400).json({ error: 'subject est requis' });
  }
  const info = db
    .prepare(
      `INSERT INTO tickets (subject, client_name, client_email) VALUES (?,?,?)`
    )
    .run(subject, client_name || null, client_email || null);

  const ticketId = info.lastInsertRowid;

  // Si un message initial est fourni, on le stocke aussi dans l'historique
  if (message) {
    db.prepare(
      `INSERT INTO messages (ticket_id, sender_type, sender_name, body) VALUES (?,?,?,?)`
    ).run(ticketId, 'client', client_name || 'client', message);
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  res.status(201).json({ ticket });
});

// GET /api/tickets/lookup/:id — suivi public d'un ticket par son numéro
// (accessible sans compte, pour que les clients suivent leur réclamation
// depuis le chatbot ; ne renvoie que des infos limitées, pas les messages
// ni les coordonnées du client)
router.get('/lookup/:id', (req, res) => {
  const ticket = db
    .prepare('SELECT id, subject, status, created_at, updated_at FROM tickets WHERE id = ?')
    .get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });
  res.json({ ticket });
});

// GET /api/tickets — liste des tickets (agents uniquement)
// Filtre optionnel: ?status=open|pending|closed
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db
      .prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC')
      .all(status);
  } else {
    rows = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
  }
  res.json({ tickets: rows });
});

// GET /api/tickets/:id — détail d'un ticket + ses messages (agents uniquement)
router.get('/:id', requireAuth, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

  const messages = db
    .prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(req.params.id);

  res.json({ ticket, messages });
});

// PATCH /api/tickets/:id — mise à jour (statut, agent assigné) — agents uniquement
router.patch('/:id', requireAuth, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

  const { status, assigned_agent_id } = req.body || {};
  const next = {
    status: status !== undefined ? status : ticket.status,
    assigned_agent_id:
      assigned_agent_id !== undefined ? assigned_agent_id : ticket.assigned_agent_id,
  };

  db.prepare(
    `UPDATE tickets SET status = ?, assigned_agent_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(next.status, next.assigned_agent_id, req.params.id);

  const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  res.json({ ticket: updated });
});

module.exports = router;
