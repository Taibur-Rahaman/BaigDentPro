# Deploy BaigDentPro on Hostinger VPS (production-oriented)

This guide assumes **Ubuntu 22.04/24.04** on a VPS, **Node.js ≥ 20**, **PostgreSQL**, **NGINX**, and **PM2**.  
Architecture: **NGINX** serves the static **Vite `dist/`** and proxies **`/api`** to **Express** on **127.0.0.1:5000**. RBAC, capability gates, and route prefixes are unchanged — only networking and process supervision are added.

## 1. Server preparation

```bash
sudo apt update && sudo apt install -y nginx git ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
sudo npm i -g pm2
```

Configure firewall (adjust SSH port if needed):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Create PostgreSQL database and user (or use managed Postgres — update `DATABASE_URL` accordingly).

## 2. Clone application

```bash
sudo mkdir -p /var/www && sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone <YOUR_REPO_URL> baigdentpro
cd baigdentpro
```

## 3. Environment files

1. **Backend** — copy template and edit secrets:

   ```bash
   cp deploy/production.env.example server/.env
   nano server/.env
   ```

   Required: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL=https://YOUR_DOMAIN`, `HOST=127.0.0.1`, `PORT=5000`.

2. **Frontend build** — Vite bakes API URL into the bundle:

   ```bash
   cp deploy/production.env.example .env.production
   # Set VITE_API_BASE_URL=https://YOUR_DOMAIN/api (same-origin)
   nano .env.production
   ```

   **Important:** This project requires `VITE_API_BASE_URL` to be a full `https://…/api` URL (see `src/config/api.ts`). A relative `/api` path alone is **not** supported without code changes.

## 4. First deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

This runs `npm ci`, `prisma migrate deploy`, `npm run build:production`, and **PM2 reload**.

Enable PM2 on boot:

```bash
pm2 startup systemd -u "$USER" --hp "$HOME"
pm2 save
```

## 5. NGINX

1. Edit paths and domain in `deploy/nginx/baigdentpro.conf.example`:

   - `YOUR_DOMAIN` → e.g. `app.example.com`
   - `FRONTEND_ROOT` → `/var/www/baigdentpro/dist`

2. Install site:

   ```bash
   sudo cp deploy/nginx/baigdentpro.conf.example /etc/nginx/sites-available/baigdentpro.conf
   sudo nano /etc/nginx/sites-available/baigdentpro.conf
   sudo ln -sf /etc/nginx/sites-available/baigdentpro.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

Sanity checks:

```bash
curl -fsS http://127.0.0.1:5000/api/health
curl -fsSI https://YOUR_DOMAIN/api/health
```

## 6. TLS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

Certbot usually injects SSL server blocks; keep `proxy_pass` and SPA `try_files` as in the example.

Renewal test:

```bash
sudo certbot renew --dry-run
```

## 7. Logs & operations

| Task | Command |
|------|---------|
| API logs | `pm2 logs baigdentpro-api` |
| Restart API | `pm2 reload baigdentpro-api` |
| Status | `pm2 status` |
| NGINX error log | `sudo tail -f /var/log/nginx/error.log` |

PM2 write paths are under `./logs/` from repo root (see `ecosystem.config.cjs`).

## 8. Zero-downtime-ish reload

`./deploy.sh` uses **`pm2 reload`** when the process already exists, which restarts the Node process with minimal gap for a single fork app.

## 9. Rollback

```bash
cd /var/www/baigdentpro
git log --oneline -10
git checkout <good_commit_sha>
SKIP_GIT=1 ./deploy.sh
```

If a migration was already applied, **do not** delete migration files; restore DB from backup if needed.

## 10. Security checklist

- Node listens on **127.0.0.1** only (`HOST` in `server/.env` + `ecosystem.config.cjs`).
- **JWT_SECRET** is strong and private.
- **FRONTEND_URL** lists every browser origin that must call the API (CORS).
- HTTPS via NGINX + Certbot; HSTS is enabled by Helmet in production.
- Keep PostgreSQL bound to localhost or private network unless required otherwise.

## 11. Troubleshooting

| Symptom | Check |
|---------|--------|
| CORS errors | `FRONTEND_URL` includes exact `https://` origin |
| 502 on `/api` | `pm2 status`, `curl http://127.0.0.1:5000/api/health`, NGINX `error.log` |
| SPA 404 on refresh | `try_files … /index.html` in NGINX |
| Prisma migrate fails | `DATABASE_URL`, DB user grants, network to Postgres |
