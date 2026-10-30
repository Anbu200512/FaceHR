const prisma = require('./prisma');

const connectDB = async () => {
  try {
    await prisma.$connect();
    const url = process.env.DATABASE_URL || '';
    const safeHost = url.replace(/\/\/[^@]*@/, '//***@');
    console.log(`PostgreSQL connected: ${safeHost}`);
    return prisma;
  } catch (err) {
    console.error(`PostgreSQL connection error: ${err.message}`);
    throw err;
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.prisma = prisma;
