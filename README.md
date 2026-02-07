# Ticketing-System (Praxisarbeit WEVE.TA1A.PA)

Monorepo mit React SPA (Frontend) und Node/Express API (Backend) inkl. Prisma/SQLite für lokale Entwicklung.

## Voraussetzungen
- Node.js 20 (siehe `.nvmrc`)

## Lokales Setup
```bash
npm install
```

### Alles starten (Backend + Frontend)
```bash
npm run dev
```

### Einzelservices (optional)
```bash
npm -w backend run dev
npm -w frontend run dev
```

## Tests
```bash
npm test
```

## Submission ZIP
```bash
npm run package:submission
```
Erzeugt ein ZIP unter `dist-submission/` ohne `node_modules` und `.git`.

## Demo-Logins
- User: `user` / `user123`
- Admin: `admin` / `admin123`

## Deployment
- Frontend: Netlify (oder Vercel)
- Backend: Render/Fly/VM
- GitHub Actions Secrets:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`
  - `VITE_API_URL`
  - `RENDER_DEPLOY_HOOK_URL`

Weitere Details findest du in `docs/`.
