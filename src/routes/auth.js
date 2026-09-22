const express = require('express');
const bcrypt = require('bcryptjs');
const { OTP } = require('otplib');
const { User, SiteConfig } = require('../models');
const { auth, signUser } = require('../middleware');
const { audit } = require('../audit');
const { getLock, recordLoginFailure, resetLoginFailures } = require('../security');
const { validate } = require('../validators');
const logger = require('../logger');
const twofa = require('../twofa');

const publicUser = (user) => ({
  name: user.name,
  email: user.email,
  role: user.role,
  rut: user.rut || '',
  phone: user.phone || '',
  address: user.address || '',
  otpEnabled: Boolean(user.otpEnabled)
});

const router = express.Router();
const otp = new OTP();

router.post('/api/auth/register', validate('register'), async (req, res) => {
  const { name, email, password, rut, phone, address } = req.body;
  if (await User.exists({ email })) return res.status(409).json({ error: 'El email ya está registrado' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), rut, phone, address });
  res.status(201).json({ token: signUser(user), user: publicUser(user) });
});

router.post('/api/auth/login', validate('login'), async (req, res) => {
  const { email, password } = req.body;
  const lock = getLock(email);
  if (lock) return res.status(429).json({ error: 'Cuenta temporalmente bloqueada por muchos intentos. Espera 15 minutos.' });
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const result = recordLoginFailure(email);
    if (result.locked) return res.status(429).json({ error: 'Cuenta temporalmente bloqueada por muchos intentos.' });
    return res.status(401).json({ error: 'Credenciales incorrectas', remaining: result.remaining });
  }

  if (user.otpEnabled) {
    const otpKey = twofa.startPendingLogin(user._id);
    return res.json({ needs2fa: true, otpKey });
  }

  resetLoginFailures(email);
  if (user.role === 'admin') await audit({ user, headers: req.headers, ip: req.ip }, 'admin.login', { targetType: 'user', targetId: user._id });
  res.json({ token: signUser(user), user: publicUser(user) });
});

router.post('/api/auth/login/2fa', validate('login2fa'), async (req, res) => {
  const { otpKey, code } = req.body;
  const pending = twofa.getPendingLogin(otpKey);
  if (!pending) return res.status(401).json({ error: 'La sesión 2FA expiró. Vuelve a iniciar sesión.' });
  const user = await User.findById(pending.userId);
  if (!user || !user.otpEnabled) return res.status(401).json({ error: 'Sesión inválida' });

  let backupUsed = false;
  const okTotp = await twofa.verifyTotpCode(user, code);
  if (!okTotp) backupUsed = await twofa.redeemRecoveryCode(user, code);
  if (!okTotp && !backupUsed) return res.status(401).json({ error: 'Código incorrecto' });

  twofa.pendingLogins.delete(otpKey);
  resetLoginFailures(user.email);
  if (user.role === 'admin') await audit({ user, headers: req.headers, ip: req.ip }, 'admin.login', { targetType: 'user', targetId: user._id });
  res.json({
    token: signUser(user),
    user: publicUser(user),
    backupUsed,
    recoveryCodesRemaining: backupUsed ? (user.recoveryCodes || []).length : undefined
  });
});

// Paso 1: genera el secreto y la URI para la app autenticadora.
router.post('/api/auth/2fa/setup', auth, validate('twofaPassword'), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  if (!(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ error: 'Contraseña incorrecta' });
  if (!user.otpSecret) user.otpSecret = otp.generateSecret();
  await user.save();
  res.json({ secret: user.otpSecret, otpauthUrl: otp.generateURI({ issuer: 'AutopartesPro', label: user.email, secret: user.otpSecret }) });
});

// Paso 2: verifica un código y activa 2FA, entregando códigos de respaldo (una sola vez).
router.post('/api/auth/2fa/enable', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  if (!user.otpSecret) return res.status(400).json({ error: 'Primero genera el secreto con /setup' });
  if (!(await twofa.verifyTotpCode(user, req.body.code))) return res.status(401).json({ error: 'Código incorrecto' });
  user.otpEnabled = true;
  const recoveryCodes = await twofa.setRecoveryCodes(user, 10);
  if (user.role === 'admin') await audit(req, 'admin.2fa.enable', { targetType: 'user', targetId: user._id });
  res.json({ otpEnabled: true, recoveryCodes });
});

router.post('/api/auth/2fa/disable', auth, validate('twofaPassword'), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!(await bcrypt.compare(req.body.password, user.password))) return res.status(401).json({ error: 'Contraseña incorrecta' });
  user.otpEnabled = false;
  user.otpSecret = undefined;
  user.recoveryCodes = [];
  await user.save();
  if (user.role === 'admin') await audit(req, 'admin.2fa.disable', { targetType: 'user', targetId: user._id });
  res.json({ otpEnabled: false });
});

router.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ...publicUser(user), recoveryCodesCount: (user.recoveryCodes || []).length });
});

// Baja de comunicaciones de marketing (un clic, también vía enlace GET en emails).
router.get('/api/auth/unsubscribe', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  const list = config.unsubscribedEmails || [];
  if (!list.includes(email)) {
    config.unsubscribedEmails = [...list, email];
    await config.save();
  }
  res.type('html').send('<h2 style="font-family:sans-serif;">Te has dado de baja correctamente.</h2><p style="font-family:sans-serif;color:#555;">Si fue un error, puedes volver a suscribirte contactándonos.</p>');
});

router.post('/api/auth/unsubscribe', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  const list = config.unsubscribedEmails || [];
  if (!list.includes(email)) {
    config.unsubscribedEmails = [...list, email];
    await config.save();
  }
  res.json({ ok: true });
});

module.exports = router;
