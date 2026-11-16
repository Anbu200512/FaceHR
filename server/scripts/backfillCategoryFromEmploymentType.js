require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../config/prisma');

(async () => {
  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, employmentType: true, category: true },
    });
    let updated = 0;
    for (const e of employees) {
      const et = e.employmentType || '';
      const cat = e.category || '';
      if (et && et !== cat) {
        await prisma.employee.update({
          where: { id: e.id },
          data: { category: et },
        });
        updated += 1;
      }
    }
    console.log(`Backfilled category for ${updated} employees.`);
  } catch (err) {
    console.error('Backfill failed:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
