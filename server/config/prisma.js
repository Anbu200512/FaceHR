const { PrismaClient } = require('@prisma/client');

// A single Prisma client instance is reused across the whole process. In dev
// nodemon restarts the process, so a global cache is only needed to survive
// hot-reloads in tooling that keeps modules alive.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
