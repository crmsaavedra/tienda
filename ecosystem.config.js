module.exports = {
  apps: [
    {
      name: 'autopartes-pro',
      script: './src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'backup-cron',
      script: './scripts/backup.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 3 * * *',
      autorestart: false
    }
  ]
};
