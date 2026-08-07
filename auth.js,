// routes/auth.js
// Authentification des agents (JWT). Un agent doit d'abord être créé via
// /api/auth/register (à protéger ou désactiver une fois vos premiers
// comptes créés), puis se connecte via /api/auth/login pour obtenir un
// token à envoyer dans l'en-tête Authorization: Bearer <token>.

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/init');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'changez-moi-en-production';
const TOKEN_EXPIRY = '12h';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

// Middleware à utiliser dans les autres routes pour protéger un endpoint.
// Usage: const { requireAuth } = require('../routes/auth');
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// POST /api/auth/register
// Crée un nouvel agent. En production, pensez à protéger ou retirer cette
// route une fois vos comptes agents créés (ou ajoutez requireAuth + rôle admin).
router.post('/register', (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email et password sont requis' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)')
    .run(email, password_hash, name || null, role || 'agent');

  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ user, token });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email et password sont requis' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token = signToken(safeUser);
  res.json({ user: safeUser, token });
});

// GET /api/auth/me — vérifie le token et renvoie l'utilisateur courant
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = { router, requireAuth };
