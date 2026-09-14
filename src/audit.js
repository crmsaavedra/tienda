const { AuditLog } = require('./models');
const logger = require('./logger');

async function audit(req, action, opts = {}) {
  try {
    await AuditLog.create({
      user: req.user?._id || req.user?.id,
      email: req.user?.email,
      action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      details: opts.details ? JSON.parse(JSON.stringify(opts.details)) : undefined,
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
    });
  } catch (e) {
    logger.warn({ err: e.message }, 'audit: no se pudo registrar la acción');
  }
}

module.exports = { audit };