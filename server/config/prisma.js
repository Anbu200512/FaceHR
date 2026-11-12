const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { neonConfig } = require('@neondatabase/serverless');
const { NeonWebSocket } = require('./neonSocket');

// Neon's serverless driver talks to the database over WebSocket (port 443)
// instead of raw TCP (5432). This keeps the app working on networks that block
// outbound 5432 and handles Neon's scale-to-zero wake-ups better. The custom
// lookup resolves Neon hosts over DNS-over-HTTPS when the local DNS refuses them.
neonConfig.webSocketConstructor = NeonWebSocket;

// A single Prisma client instance is reused across the whole process. In dev
// nodemon restarts the process, so a global cache is only needed to survive
// hot-reloads in tooling that keeps modules alive.
const globalForPrisma = globalThis;

const createClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to server/.env or the host environment.');
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
};

const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
