const prisma = require('./prisma');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async ({ retries = 5, delayMs = 3000 } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await prisma.$connect();
      const url = process.env.DATABASE_URL || '';
      const safeHost = url.replace(/\/\/[^@]*@/, '//***@');
      console.log(`PostgreSQL connected: ${safeHost}`);
      return prisma;
    } catch (err) {
      lastError = err;
      console.error(`PostgreSQL connection error (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${Math.round(delayMs / 1000)}s (Neon may be waking up)...`);
        await sleep(delayMs);
      }
    }
  }
  console.error(
    'PostgreSQL connection failed after retries. Check DATABASE_URL and that your network allows ' +
      'connections to Neon (WebSocket/443). If the compute is disabled, enable it in the Neon console.'
  );
  throw lastError;
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.prisma = prisma;
