import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const ensureSchema = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Ticket (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      createdBy TEXT NOT NULL,
      assignedTo TEXT,
      resolutionNote TEXT,
      closedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Keep local SQLite schema compatible when the table already exists.
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Ticket ADD COLUMN resolutionNote TEXT;`);
  } catch {
    // Column already exists.
  }
};
