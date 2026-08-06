require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const db = require('./db/init');
const { router: authRouter } = require('./routes/auth');
const ticketsRouter = require('./routes/tickets');
const statsRouter = require('./routes/stats');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/agent', express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'sanlam-mrirt-backend' }));

const server = http.createServer(app);

/* ---------------------------------------------------------------------
   Live-chat : transfert vers un agent humain en temps réel.
   Chaque connexion s'annonce avec { role: 'client'|'agent', ticketId }.
   Les messages sont diffusés à tous les participants de ce ticket ET
   persistés dans la table `messages` pour garder l'historique.
--------------------------------------------------------------------- */
const wss = new WebSocketServer({ server, path: '/live' });
const rooms = new Map(); // ticketId -> Set<ws>

function broadcast(ticketId, payload, exceptWs) {
  const set = rooms.get(String(ticketId));
  if (!set) return;
  const data = JSON.stringify(payload);
  set.forEach((client) => {
    if (client !== exceptWs && client.readyState === 1) client.send(data);
  });
}

wss.on('connection', (ws) => {
  let joinedTicketId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    if (msg.type === 'join') {
      joinedTicketId = String(msg.ticketId);
      if (!rooms.has(joinedTicketId)) rooms.set(joinedTicketId, new Set());
      rooms.get(joinedTicketId).add(ws);
      broadcast(joinedTicketId, { type: 'presence', role: msg.role, event: 'joined' }, ws);
      return;
    }

    if (msg.type === 'message' && joinedTicketId) {
      const info = db.prepare(
        `INSERT INTO messages (ticket_id, sender_type, sender_name, body) VALUES (?,?,?,?)`
      ).run(joinedTicketId, msg.role, msg.senderName || msg.role, msg.body);

      broadcast(joinedTicketId, {
        type: 'message',
        id: info.lastInsertRowid,
        role: msg.role,
        senderName: msg.senderName || msg.role,
        body: msg.body,
        created_at: new Date().toISOString(),
      }); // diffusé à tout le monde y compris l'émetteur, pour un état cohérent
      return;
    }

    if (msg.type === 'typing' && joinedTicketId) {
      broadcast(joinedTicketId, { type: 'typing', role: msg.role }, ws);
    }
  });

  ws.on('close', () => {
    if (joinedTicketId && rooms.has(joinedTicketId)) {
      rooms.get(joinedTicketId).delete(ws);
      broadcast(joinedTicketId, { type: 'presence', event: 'left' }, ws);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✔ Backend Sanlam Mrirt démarré sur http://localhost:${PORT}`);
  console.log(`✔ Tableau de bord agent : http://localhost:${PORT}/agent/`);
  console.log(`✔ WebSocket live-chat : ws://localhost:${PORT}/live`);
});
