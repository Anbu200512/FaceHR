require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const prisma = require('../config/prisma');
const {
  seedDefaultDepartments,
  seedDefaultLocations,
  seedDefaultDesignations,
  seedAdmin,
  seedSettings,
} = require('../config/seed');

(async () => {
  try {
    await seedDefaultDepartments();
    await seedDefaultLocations();
    await seedDefaultDesignations();
    await seedSettings();
    await seedAdmin();
    console.log('[Seed] Done');
  } catch (err) {
    console.error('[Seed] Failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
