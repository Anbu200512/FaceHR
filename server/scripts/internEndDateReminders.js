require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../config/prisma');
const { createNotification } = require('../services/notificationService');

const N_DAYS = Math.max(1, parseInt(process.env.N_DAYS, 10) || 7);

(async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const until = new Date(today);
    until.setDate(until.getDate() + N_DAYS);

    const interns = await prisma.employee.findMany({
      where: {
        status: 'Active',
        employmentType: 'Intern',
        internEndDate: { gte: today, lte: until },
      },
      select: { id: true, firstName: true, lastName: true, employeeId: true, internEndDate: true },
    });

    if (!interns.length) {
      console.log('No interns ending within the next', N_DAYS, 'days.');
      return;
    }

    const admins = await prisma.user.findMany({
      where: { role: 'admin', active: true },
      select: { id: true },
    });
    if (!admins.length) {
      console.log('No active admins to notify.');
      return;
    }

    const cutoff = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    let created = 0;
    for (const emp of interns) {
      const name = `${emp.firstName} ${emp.lastName}`.trim();
      const endStr = new Date(emp.internEndDate).toLocaleDateString();
      const recent = await prisma.notification.findFirst({
        where: {
          link: `/admin/employees/${emp.id}`,
          type: 'employee',
          createdAt: { gte: cutoff },
          message: { contains: 'Intern end date' },
        },
      });
      if (recent) continue;
      await Promise.all(
        admins.map((a) =>
          createNotification({
            user: a.id,
            title: 'Intern ending soon',
            message: `${name} (${emp.employeeId}) intern end date is ${endStr}.`,
            type: 'employee',
            link: `/admin/employees/${emp.id}`,
          })
        )
      );
      created += 1;
    }
    console.log(`Created reminders for ${created} intern(s).`);
  } catch (err) {
    console.error('internEndDateReminders failed:', err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
