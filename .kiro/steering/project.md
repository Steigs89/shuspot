# Shuspot Project

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Hosting: Alibaba Cloud ECS (nginx), server IP `47.76.248.16`
- Live URL: https://shuspot.com

## Deployment
To deploy the latest frontend changes, run from the project root:

```bash
./deploy-frontend.sh "your commit message"
```

This will:
1. `git add .` + commit + push to GitHub
2. SSH into the ECS server, pull, `npm run build`, copy dist to `/var/www/shuspot/`, reload nginx

For a build-only local deploy (no git):
```bash
./deploy-quick.sh
```

## Environment Variables
- `.env` — local dev
- `.env.production` — production build values
- Key vars: `VITE_IFLYTEK_APP_ID/KEY/SECRET`, `VITE_LIBRETRANSLATE_URL`

## Dev Server
```bash
npm run dev   # runs on port 5174
```
LibreTranslate (for EN/ZH toggle) must be running separately:
```bash
libretranslate --load-only en,zh
```
