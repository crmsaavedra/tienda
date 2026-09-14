const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';

const signUser = user => jwt.sign(
  { id: user._id, role: user.role, name: user.name, email: user.email, rut: user.rut, phone: user.phone, address: user.address },
  jwtSecret,
  { expiresIn: '7d' }
);

const extractUser = (req) => {
  try {
    const header = req.headers.authorization || '';
    return jwt.verify(header.replace(/^Bearer\s+/i, ''), jwtSecret);
  } catch {
    return null;
  }
};

// Requiere sesión válida.
const auth = (req, res, next) => {
  const user = extractUser(req);
  if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
  req.user = user;
  next();
};

// Usa sesión si existe pero no la exige (ej: checkout de invitados).
const optAuth = (req, res, next) => {
  req.user = extractUser(req);
  next();
};

// Requiere sesión de administrador.
const admin = [auth, (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Acceso restringido' })
];

module.exports = { jwtSecret, signUser, auth, optAuth, admin };