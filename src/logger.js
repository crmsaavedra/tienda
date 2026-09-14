const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'autopartes-pro' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: 'pino/file',
    options: { destination: 1 }
  }
});

module.exports = logger;