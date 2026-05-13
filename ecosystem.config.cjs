/**
 * PM2 process definition — BaigDentPro API (Express + Prisma).
 * Secrets stay in server/.env (loaded by the app via bootstrap-env).
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 reload ecosystem.config.cjs --only baigdentpro-api --update-env
 */
const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'baigdentpro-api',
      cwd: path.join(root, 'server'),
      script: 'dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 25,
      min_uptime: '10s',
      exp_backoff_restart_delay: 150,
      listen_timeout: 15000,
      kill_timeout: 8000,
      /** Restart if RSS grows without bound (tune for VPS RAM). Set 0 to disable. */
      max_memory_restart: process.env.PM2_MAX_MEMORY || '512M',
      /** Graceful reload (zero-ish downtime) when using `pm2 reload` */
      wait_ready: false,
      merge_logs: true,
      error_file: path.join(root, 'logs', 'pm2-baigdentpro-api-error.log'),
      out_file: path.join(root, 'logs', 'pm2-baigdentpro-api-out.log'),
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        /** Bind API to loopback; NGINX terminates TLS and proxies /api → Node */
        HOST: '127.0.0.1',
      },
    },
  ],
};
