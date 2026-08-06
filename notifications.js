// Couche de notifications : email (réel via SMTP si configuré) et SMS
// (réel via Twilio si configuré). Sans configuration, tout est simulé
// et journalisé dans la table notifications_log + la console, pour que
// la fonctionnalité reste démontrable sans compte payant.

const db = require('./db/init');
require('dotenv').config();

let nodemailer;
try { nodemailer = require('nodemailer'); } catch (e) { /* optionnel */ }

let transporter = null;
if (nodemailer && process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function log(channel, recipient, content, status) {
  db.prepare(`INSERT INTO notifications_log (channel, recipient, content, status) VALUES (?,?,?,?)`)
    .run(channel, recipient, content, status);
}

async function sendEmail(to, subject, body) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Sanlam Mrirt" <no-reply@sanlam-mrirt.ma>',
        to, subject, text: body,
      });
      log('email', to, `${subject} — ${body}`, 'sent');
      return { ok: true, simulated: false };
    } catch (e) {
      log('email', to, `${subject} — ${body}`, 'failed');
      return { ok: false, simulated: false, error: e.message };
    }
  }
  // Pas de SMTP configuré -> simulation (mais bien journalisée en base)
  console.log(`[EMAIL SIMULÉ] à ${to} : ${subject} — ${body}`);
  log('email', to, `${subject} — ${body}`, 'simulated');
  return { ok: true, simulated: true };
}

async function sendSMS(to, body) {
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
    try {
      // Chargement paresseux : le package 'twilio' n'est requis que si des
      // identifiants sont fournis, pour ne pas forcer sa présence sinon.
      const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      await twilio.messages.create({ from: process.env.TWILIO_FROM, to, body });
      log('sms', to, body, 'sent');
      return { ok: true, simulated: false };
    } catch (e) {
      log('sms', to, body, 'failed');
      return { ok: false, simulated: false, error: e.message };
    }
  }
  console.log(`[SMS SIMULÉ] à ${to} : ${body}`);
  log('sms', to, body, 'simulated');
  return { ok: true, simulated: true };
}

module.exports = { sendEmail, sendSMS };
