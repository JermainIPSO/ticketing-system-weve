import { app } from './app';
import { env } from './lib/env';
import { ensureSchema, prisma } from './db/prisma';

const start = async () => {
  await ensureSchema();

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
