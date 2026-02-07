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

## Demo-Logins
- User: `user` / `user123`
- Admin: `admin` / `admin123`

## Deployment
- Frontend: Netlify (oder Vercel)
- Backend: Render/Fly/VM

Weitere Details findest du in `docs/`.
