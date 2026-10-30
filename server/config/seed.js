const bcrypt = require('bcryptjs');
const prisma = require('./prisma');
const config = require('./config');

const DEFAULT_DEPARTMENTS = ['Development', 'Human Resources', 'Marketing', 'Sales', 'Finance', 'Operations'];

const DEFAULT_LOCATIONS = [
  { name: 'Chennai Office', city: 'Chennai', address: '' },
  { name: 'Hosur Office', city: 'Hosur', address: '' },
  { name: 'Bangalore Office', city: 'Bangalore', address: '' },
];

const DEFAULT_DESIGNATIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Team Lead',
  'Project Manager',
  'HR Executive',
  'Marketing Specialist',
  'Sales Executive',
  'Accountant',
  'Operations Analyst',
  'Intern',
];

async function seedDefaultDepartments() {
  const count = await prisma.department.count();
  if (count === 0) {
    await prisma.department.createMany({
      data: DEFAULT_DEPARTMENTS.map((name) => ({ name, description: '', active: true })),
    });
    console.log('[Seed] Default departments created');
  }
}

async function seedDefaultLocations() {
  const count = await prisma.location.count();
  if (count === 0) {
    await prisma.location.createMany({
      data: DEFAULT_LOCATIONS.map((l) => ({ ...l, active: true })),
    });
    console.log('[Seed] Default locations created');
  }
}

async function seedDefaultDesignations() {
  const count = await prisma.designation.count();
  if (count === 0) {
    await prisma.designation.createMany({
      data: DEFAULT_DESIGNATIONS.map((name) => ({ name, description: '' })),
    });
    console.log('[Seed] Default designations created');
  }
}

async function seedAdmin() {
  const exists = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!exists) {
    const hashed = await bcrypt.hash(config.adminPassword, 10);
    await prisma.user.create({
      data: {
        name: config.adminName,
        email: config.adminEmail,
        password: hashed,
        role: 'admin',
        active: true,
      },
    });
    console.log(`[Seed] Default admin created: ${config.adminEmail}`);
  }
}

async function seedSettings() {
  // Seed defaults only when the key does NOT exist yet, so values an admin
  // changes in the UI survive redeploys/restarts.
  const ensure = async (key, value) => {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (!existing) await prisma.setting.create({ data: { key, value } });
  };
  await ensure('officeStartTime', config.officeStartTime);
  await ensure('halfDayThresholdHours', config.halfDayThresholdHours);
}

module.exports = { seedDefaultDepartments, seedDefaultLocations, seedDefaultDesignations, seedAdmin, seedSettings };
