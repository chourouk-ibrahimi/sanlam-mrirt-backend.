# Backend — Chatbot Sanlam Mrirt

Backend réel (Node.js + Express + SQLite) qui couvre les 5 points identifiés
comme manquants dans le prototype front-end (`chatbot_sanlam_mrirt.html`).

| Manque identifié | Comment ce backend le résout |
|---|---|
| Backend + base de données persistante | Base **SQLite** (`better-sqlite3`), fichier `db/sanlam_mrirt.db`, créée automatiquement au premier démarrage |
| Authentification client | Inscription/connexion par téléphone + mot de passe, tokens **JWT** (`/api/auth/clients/...`) |
| Statistiques pour le responsable d'agence | Route `/api/stats` : total tickets, répartition par statut/catégorie, temps moyen de résolution, activité des 7 derniers jours |
| SMS / email réels | Module `notifications.js` : envoie de vrais SMS (Twilio) / emails (SMTP) si configurés dans `.env`, sinon **simulation journalisée** en base (aucun compte payant requis pour démontrer le projet) |
| Transfert vers un agent humain en direct | **WebSocket** (`/live`) : chat en temps réel entre le client et un agent, avec tableau de bord agent inclus |

## Installation

```bash
npm install
cp .env.example .env   # optionnel : à remplir seulement si vous voulez de vrais SMS/emails
npm start
```

Le serveur démarre sur **http://localhost:4000**.

Un compte agent de démonstration est créé automatiquement au premier lancement :
- Email : `agent@sanlam-mrirt.ma`
- Mot de passe : `agent123`

## Tableau de bord agent

Ouvrez **http://localhost:4000/agent/** dans un navigateur : connexion, statistiques
en direct, liste des tickets avec changement de statut, et chat en temps réel par ticket.

## Principales routes API

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/clients/register` | Inscription d'un client |
| POST | `/api/auth/clients/login` | Connexion client → JWT |
| POST | `/api/auth/agents/login` | Connexion agent → JWT |
| POST | `/api/tickets` | Créer un ticket (client connecté ou invité) |
| GET | `/api/tickets/code/:code` | Consulter un ticket par son code (ex. `TCK-4911`) |
| GET | `/api/tickets` | Lister tous les tickets *(agent uniquement)* |
| PATCH | `/api/tickets/:id/status` | Changer le statut d'un ticket *(agent uniquement)* |
| POST | `/api/tickets/:id/messages` | Ajouter un message à un ticket |
| GET | `/api/stats` | Statistiques agrégées *(agent uniquement)* |
| WS | `/live` | Chat en temps réel (`{type:'join', ticketId, role}` puis `{type:'message', ...}`) |

## Relier le chatbot front-end à ce backend

Le fichier `chatbot_sanlam_mrirt.html` fonctionne aujourd'hui en simulation pure
(`TICKETS` en mémoire JavaScript). Pour le connecter à ce vrai backend, il suffit
de remplacer les lectures/écritures dans l'objet `TICKETS` par des appels `fetch()`
vers `http://localhost:4000/api/tickets`, par exemple :

```js
// Création d'un ticket (remplace TICKETS[id] = {...})
const res = await fetch('http://localhost:4000/api/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ category: 'reclamation', description: text, client_name: '...', client_phone: '...' })
});
const { ticket } = await res.json();
// ticket.code correspond à l'ancien "TCK-xxxx" généré côté client
```

C'est une évolution volontairement **non incluse par défaut** dans le fichier HTML :
elle nécessite que ce backend soit réellement hébergé (Render, Railway, VPS...) avec
une URL publique, sinon le chatbot ne fonctionnerait plus du tout en local.

## Stack technique

Node.js · Express · better-sqlite3 · JWT (`jsonwebtoken`) · `bcryptjs` · `ws`
(WebSocket) · `nodemailer` (email optionnel) · Twilio (SMS optionnel, chargé
uniquement si configuré).
