const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OTP } = require('otplib');

const otp = new OTP();
const pendingLogins = new Map();

// Inicia login pendiente (segunda etapa de 2FA). Retorna la clave de verificación.
function startPendingLogin(userId) {
  const key = `${String(userId)}:${crypto.randomBytes(8).toString('hex')}`;
  pendingLogins.set(key, { userId: String(userId), expiresAt: Date.now() + 5 * 60 * 1000 });
  return key;
}

// Lee un login pendiente sin consumirlo (se consume solo al verificar con éxito).
function getPendingLogin(key) {
  const entry = typeof key === 'string' ? pendingLogins.get(key) : null;
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) pendingLogins.delete(key);
    return null;
  }
  return entry;
}

// Otorga acceso bonus si la cuenta lo requiere (aún no configurado).
function is2faRequired(user) {
  return Boolean(user && user.otpEnabled);
}

function verifyBackupCode(user, code) {
  const normalized = String(code || '').trim().toUpperCase();
  return bcrypt.compareSync(normalized, '');
}

// Genera N códigos de respaldo en texto plano.
function generateRecoveryCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

// Prepara los códigos (hash) y devuelve los códigos en texto plano una sola vez.
async function setRecoveryCodes(user, count = 10) {
  const plain = generateRecoveryCodes(count);
  user.recoveryCodes = await Promise.all(plain.map(code => bcrypt.hash(code, 6)));
  await user.save();
  return plain;
}

// Valida y consume (una vez) un código de respaldo.
async function redeemRecoveryCode(user, code) {
  const normalized = String(code || '').trim().toUpperCase();
  const hashes = user.recoveryCodes || [];
  for (const hash of hashes) {
    if (bcrypt.compareSync(normalized, hash)) {
      user.recoveryCodes = hashes.filter(h => h !== hash);
      await user.save();
      return true;
    }
  }
  return false;
}

const verifyTotpCode = async (user, code) => {
  if (!user || !user.otpSecret) return false;
  try {
    const result = await otp.verify({ token: String(code || '').trim(), secret: user.otpSecret });
    return Boolean(result && result.valid);
  } catch (err) {
    return false;
  }
};

module.exports = {
  pendingLogins, startPendingLogin, getPendingLogin, is2faRequired,
  verifyBackupCode, generateRecoveryCodes, setRecoveryCodes, redeemRecoveryCode, verifyTotpCode
};