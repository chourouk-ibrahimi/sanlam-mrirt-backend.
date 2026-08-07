// routes/stats.js
// Statistiques simples pour le tableau de bord agent (réservé aux agents connectés).

const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('./auth');

const router = express.Router();

// GET /api/stats — vue d'ensemble
router.get('/', requireAuth, (req, res) => {
  const byStatus = db
    .prepare('SELECT status, COUNT(*) as count FROM tickets GROUP BY status')
    .all();

  const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;

  const messagesToday = db
    .prepare(
      `SELECT COUNT(*) as count FROM messages WHERE date(created_at) = date('now')`
    )
    .get().count;

  const openTickets = db
    .prepare(`SELECT COUNT(*) as count FROM tickets WHERE status = 'open'`)
    .get().count;

  res.json({
    total_tickets: totalTickets,
    open_tickets: openTickets,
    messages_today: messagesToday,
    by_status: byStatus,
  });
});

module.exports = router;
