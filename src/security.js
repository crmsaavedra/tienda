const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_GLOBAL) || 900,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' }
});

const accountLocks = new Map();

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

function getLock(email) {
  const key = String(email || '').toLowerCase();
  const lock = accountLocks.get(key);
  if (lock && lock.lockUntil > Date.now()) return lock;
  if (lock && lock.lockUntil <= Date.now()) accountLocks.delete(key);
  return null;
}

function recordLoginFailure(email) {
  const key = String(email || '').toLowerCase();
  const now = Date.now();
  const existing = accountLocks.get(key);
  const failures = (existing && existing.failures) || 0;
  if (failures + 1 >= MAX_FAILURES) {
    const lock = { failures: failures + 1, lockUntil: now + LOCK_MS };
    accountLocks.set(key, lock);
    return { locked: true, lockUntil: lock.lockUntil };
  }
  accountLocks.set(key, { failures: failures + 1 });
  return { locked: false, remaining: MAX_FAILURES - (failures + 1) };
}

function resetLoginFailures(email) {
  accountLocks.delete(String(email || '').toLowerCase());
}

module.exports = { globalLimiter, authLimiter, getLock, recordLoginFailure, resetLoginFailures, MAX_FAILURES };