const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Location = require('../models/Location');
const Setting = require('../models/Setting');
const config = require('../config/config');

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
  const count = await Department.countDocuments();
  if (count === 0) {
    await Department.insertMany(DEFAULT_DEPARTMENTS.map((name) => ({ name, description: '', active: true })));
    console.log('[Seed] Default departments created');
  }
}

async function seedDefaultLocations() {
  const count = await Location.countDocuments();
  if (count === 0) {
    await Location.insertMany(DEFAULT_LOCATIONS.map((l) => ({ ...l, active: true })));
    console.log('[Seed] Default locations created');
  }
}

async function seedDefaultDesignations() {
  const count = await Designation.countDocuments();
  if (count === 0) {
    await Designation.insertMany(DEFAULT_DESIGNATIONS.map((name) => ({ name, description: '' })));
    console.log('[Seed] Default designations created');
  }
}

async function seedAdmin() {
  const exists = await User.findOne({ role: 'admin' });
  if (!exists) {
    const hashed = await bcrypt.hash(config.adminPassword, 10);
    await User.create({
      name: config.adminName,
      email: config.adminEmail,
      password: hashed,
      role: 'admin',
      active: true,
    });
    console.log(`[Seed] Default admin created: ${config.adminEmail}`);
  }
}

async function seedSettings() {
  await Setting.updateOne(
    { key: 'officeStartTime' },
    { $set: { value: config.officeStartTime } },
    { upsert: true }
  );
  await Setting.updateOne(
    { key: 'halfDayThresholdHours' },
    { $set: { value: config.halfDayThresholdHours } },
    { upsert: true }
  );
}

module.exports = { seedDefaultDepartments, seedDefaultLocations, seedDefaultDesignations, seedAdmin, seedSettings };