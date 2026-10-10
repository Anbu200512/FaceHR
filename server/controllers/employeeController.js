const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const FaceProfile = require('../models/FaceProfile');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/config');
const { saveBuffer, extFromName, uploadsDir } = require('../middleware/upload');
const { createNotification } = require('../services/notificationService');
const { sendWelcomeMail } = require('../services/mailService');
const { normalizeDescriptor, descriptorIsValid } = require('../services/faceService');

const pickFields = (b) => ({
  firstName: b.firstName,
  middleName: b.middleName,
  lastName: b.lastName,
  phone: b.phone,
  dateOfBirth: b.dateOfBirth || null,
  gender: b.gender,
  address: b.address,
  state: b.state,
  subDepartment: b.subDepartment,
  subDepartment1: b.subDepartment1,
  subDepartment2: b.subDepartment2,
  category: b.category,
  subCategory: b.subCategory,
  grade: b.grade,
  reportingManager: b.reportingManager,
  reportingManager2: b.reportingManager2,
  probation: b.probation,
  probationManage: b.probationManage,
  totalExperience: b.totalExperience,
  exEmployee: b.exEmployee,
  employmentType: b.employmentType,
  status: b.status,
  joiningDate: b.joiningDate,
  department: b.department || null,
  office: null,
  designation: b.designation || null,
});

function sanitizeId(value) {
  return value && /^[0-9a-fA-F]{24}$/.test(String(value)) ? value : null;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

const cleanObject = (obj) => {
  if (!obj || typeof obj !== 'object') return undefined;
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'string') {
      const t = v.trim();
      if (t !== '') out[k] = t;
    } else if (typeof v === 'boolean' || typeof v === 'number' || v instanceof Date) {
      out[k] = v;
    } else {
      out[k] = v;
    }
  });
  return Object.keys(out).length ? out : undefined;
};

const hasAnyValue = (obj) => obj && typeof obj === 'object' && Object.values(obj).some((v) => v !== '' && v !== undefined && v !== null);

const stripUndefined = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined) delete obj[k];
  });
  return obj;
};

const cleanArray = (arr) => {
  if (!Array.isArray(arr)) return undefined;
  return arr.map(cleanObject).filter(Boolean).filter(hasAnyValue);
};

/** Parse the optional `sections` JSON body field into a fresh object (or {}) */
const parseSections = (b) => {
  if (typeof b.sections !== 'string' || !b.sections.trim()) return {};
  try {
    const s = JSON.parse(b.sections);
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
};

/**
 * Normalise the 9 profile sections into their persisted shape.
 * Scalar sections keep provided keys (including empty strings, so edits can clear
 * a value); list sections drop empty entries. Returns { sections, address } where
 * address is the composed legacy address string.
 */
const cleanSections = (b) => {
  const s = parseSections(b);
  const out = {};

  const scalar = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return undefined;
    const res = {};
    keys.forEach((k) => {
      if (obj[k] !== undefined && obj[k] !== null) res[k] = typeof obj[k] === 'string' ? obj[k].trim() : obj[k];
    });
    return Object.keys(res).length ? res : undefined;
  };

  const cRaw = s?.contact;
  const cScalar = scalar(cRaw, ['personalEmail', 'alternateEmail', 'mobileNumber', 'alternatePhone', 'sameAsCurrent', 'permanentAddress']);
  const cAddr = scalar(cRaw?.address, ['line1', 'line2', 'city', 'state', 'country', 'pincode']);
  if (cRaw && typeof cRaw === 'object') {
    out.contact = { ...(cScalar || {}), ...(cAddr ? { address: cAddr } : {}) };
  }

  const weekOffRaw = s?.weekOff;
  if (weekOffRaw && typeof weekOffRaw === 'object') {
    const weeks = { weeklyOffDay: weekOffRaw.weeklyOffDay, secondWeeklyOffDay: weekOffRaw.secondWeeklyOffDay };
    const workingDays = Array.isArray(weekOffRaw.workingDays) ? weekOffRaw.workingDays.map((d) => str(d)).filter(Boolean) : [];
    out.weekOff = { ...scalar(weeks, ['weeklyOffDay', 'secondWeeklyOffDay']), workingDays };
  }

  const emergencyContacts = cleanArray(s?.emergencyContacts);
  if (emergencyContacts !== undefined) out.emergencyContacts = emergencyContacts;

  const sectionKeys = [
    ['bankDetails', ['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'branchName', 'accountType']],
    ['personal', ['maritalStatus', 'bloodGroup', 'nationality']],
    ['emergencyContact', ['fullName', 'relationship', 'primaryPhone', 'alternatePhone', 'email', 'address']],
  ];
  for (const [key, keys] of sectionKeys) {
    if (s?.[key] && typeof s[key] === 'object') out[key] = scalar(s[key], keys) || {};
  }

  const family = cleanArray(s?.family);
  if (family !== undefined) out.family = family;

  const experience = cleanArray(s?.experience);
  if (experience !== undefined) out.experience = experience;

  const qualifications = cleanArray(s?.qualifications);
  if (qualifications !== undefined) out.qualifications = qualifications;

  const certifications = cleanArray(s?.certifications);
  if (certifications !== undefined) out.certifications = certifications;

  let address;
  if (cAddr) {
    const parts = [cAddr.line1, cAddr.line2, cAddr.city, cAddr.state, cAddr.country, cAddr.pincode].filter(Boolean);
    if (parts.length) address = parts.join(', ');
  }

  return Object.keys(out).length ? { sections: out, address } : null;
};

// @route  GET /api/employees
const getEmployees = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const search = String(req.query.search || '').trim();
  const department = req.query.department;
  const designation = req.query.designation;
  const status = req.query.status;
  const noFace = req.query.noFace === 'true';
  const sortBy = String(req.query.sortBy || 'createdAt');
  const order = req.query.order === 'asc' ? 1 : -1;

  const filter = {};
  if (department) filter.department = sanitizeId(department);
  if (designation) filter.designation = sanitizeId(designation);
  if (status) filter.status = status;
  const branch = req.query.branch || req.query.office;
  if (branch) filter.office = sanitizeId(branch);

  if (noFace) {
    const faceIds = await FaceProfile.find({}).select('employee').lean();
    filter._id = { $nin: faceIds.map((f) => f.employee) };
  }

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { firstName: re },
      { lastName: re },
      { email: re },
      { employeeId: re },
      { phone: re },
    ];
  }

  const sort = {};
  sort[sortBy] = order;

  const [total, employees] = await Promise.all([
    Employee.countDocuments(filter),
    Employee.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('department designation office')
      .populate({ path: 'face', select: 'faceId active' })
      .lean(),
  ]);

  res.json({
    success: true,
    data: employees,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// @route  GET /api/employees/:id
const getEmployee = asyncHandler(async (req, res) => {
  // Employees may only view their own profile record.
  if (req.user.role === 'employee' && String(req.params.id) !== String(req.user.employee)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to view this employee' });
  }
  const employee = await Employee.findById(req.params.id)
    .populate('department designation office')
    .populate({ path: 'face', select: '-descriptor' })
    .lean();
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  res.json({ success: true, data: employee });
});

// @route  POST /api/employees
const createEmployee = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.employeeId || !b.firstName || !b.lastName || !b.email) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID, name and email are required',
    });
  }

  const employeeId = String(b.employeeId).trim().toUpperCase();
  const email = String(b.email).trim().toLowerCase();

  const [idExists, emailExists] = await Promise.all([
    Employee.findOne({ employeeId }),
    Employee.findOne({ email }),
  ]);
  if (idExists) return res.status(409).json({ success: false, message: `Employee ID ${employeeId} already exists` });
  if (emailExists) return res.status(409).json({ success: false, message: 'An employee with this email already exists' });

  const department = sanitizeId(b.department);
  const office = sanitizeId(b.office);
  const designation = sanitizeId(b.designation);
  if (b.department && !department) return res.status(400).json({ success: false, message: 'Invalid department' });
  if (b.office && !office) return res.status(400).json({ success: false, message: 'Invalid location' });
  if (b.designation && !designation) return res.status(400).json({ success: false, message: 'Invalid designation' });

  let profilePhoto = null;
  if (req.file && req.file.buffer) {
    const ext = (req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg');
    profilePhoto = saveBuffer(req.file.buffer, ext);
  }

  const givenPassword = b.password || crypto.randomBytes(6).toString('hex');
  const hashed = await bcrypt.hash(String(givenPassword), 10);

  const employeeData = {
    ...pickFields(b),
    employeeId,
    email,
    profilePhoto,
    department,
    office,
    designation,
joiningDate: b.joiningDate || new Date(),
  };

  const extra = cleanSections(b);
  if (extra) {
    Object.assign(employeeData, extra.sections);
    if (!employeeData.address && extra.address) employeeData.address = extra.address;
  }

  const employee = await Employee.create(employeeData);

  const user = await User.create({
    employeeId,
    name: `${b.firstName} ${b.lastName}`.trim(),
    email,
    password: hashed,
    role: 'employee',
    employee: employee._id,
    active: employee.status !== 'Inactive',
  });

  const admins = await User.find({ role: 'admin', active: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a._id,
        title: 'New employee added',
        message: `${employee.firstName} ${employee.lastName} (${employeeId}) was added to the team.`,
        type: 'employee',
        link: `/admin/employees/${employee._id}`,
      })
    )
  );

  let emailSent = false;
  try {
    const result = await sendWelcomeMail({
      to: email,
      companyName: config.companyName,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      employeeId,
      loginEmail: email,
      temporaryPassword: givenPassword,
      loginUrl: config.loginUrl,
    });
    emailSent = result.sent;
  } catch (err) {
    console.error('[mail] sendWelcomeMail failed:', err.message);
  }

  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: await Employee.findById(employee._id).populate('department designation office').lean(),
    generatedPassword: b.password ? undefined : givenPassword,
    emailSent,
  });
});

// @route  PUT /api/employees/:id
const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const b = req.body;
  const update = stripUndefined(pickFields(b));
  if (b.office === undefined) delete update.office;

  for (const key of ['firstName', 'lastName', 'email']) {
    if (b[key] !== undefined && b[key] !== null) update[key] = String(b[key]).trim();
  }
  if (b.employeeId) update.employeeId = String(b.employeeId).trim().toUpperCase();
  if (b.department !== undefined) update.department = sanitizeId(b.department) || null;
  if (b.office !== undefined) update.office = sanitizeId(b.office) || null;
  if (b.designation !== undefined) update.designation = sanitizeId(b.designation) || null;

  const extra = cleanSections(b);
  if (extra) {
    Object.assign(update, extra.sections);
    if (extra.sections.contact?.address !== undefined) update.address = extra.address || '';
    else if (extra.address) update.address = extra.address;
  }

  if (req.file && req.file.buffer) {
    const ext = (req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg');
    update.profilePhoto = saveBuffer(req.file.buffer, ext);
  }

  // uniqueness checks (excluding self)
  const employeeId = update.employeeId;
  if (employeeId && employeeId !== employee.employeeId) {
    const dup = await Employee.findOne({ employeeId });
    if (dup) return res.status(409).json({ success: false, message: `Employee ID ${employeeId} already exists` });
  }
  if (update.email && update.email !== employee.email) {
    const dup = await Employee.findOne({ email: update.email });
    if (dup) return res.status(409).json({ success: false, message: 'An employee with this email already exists' });
  }

  Object.assign(employee, update);
  await employee.save();

  const user = await User.findOne({ employee: employee._id });
  if (user) {
    const changed = {};
    if (update.email) changed.email = update.email;
    if (update.employeeId) changed.employeeId = update.employeeId;
    if (update.firstName || update.lastName) changed.name = `${employee.firstName} ${employee.lastName}`.trim();
    if (update.status) changed.active = update.status !== 'Inactive';
    if (Object.keys(changed).length) await User.updateOne({ _id: user._id }, { $set: changed });

    if (b.password) {
      user.password = await bcrypt.hash(String(b.password), 10);
      await user.save({ validateBeforeSave: false });
    }
  }

  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: await Employee.findById(employee._id).populate('department designation office').populate({ path: 'face', select: '-descriptor' }).lean(),
  });
});

// @route  DELETE /api/employees/:id   (safety: soft-deactivate, keeps history)
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const wasActive = employee.status === 'Active';
  employee.status = 'Inactive';
  await employee.save();

  if (wasActive) {
    const user = await User.findOne({ employee: employee._id });
    if (user) await User.updateOne({ _id: user._id }, { $set: { active: false } });
  }

  res.json({
    success: true,
    message: 'Employee deactivated. Attendance and profile history are preserved.',
  });
});

// @route  PATCH /api/employees/:id/status  (reactivate)
const setEmployeeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Inactive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  employee.status = status;
  await employee.save();
  const user = await User.findOne({ employee: employee._id });
  if (user) await User.updateOne({ _id: user._id }, { $set: { active: status === 'Active' } });

  res.json({ success: true, message: `Employee ${status === 'Active' ? 'reactivated' : 'deactivated'} successfully` });
});

// @route  GET /api/employees/:id/attendance (admin or owner)
const getEmployeeAttendance = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const { year, month } = req.query;
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || new Date().getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);

  const [records, leaves] = await Promise.all([
    Attendance.find({ employee: employee._id, date: { $gte: start, $lt: end } }).sort({ date: 1 }),
    Leave.find({ employee: employee._id, status: 'Approved', startDate: { $lt: end }, endDate: { $gte: start } }),
  ]);

  res.json({ success: true, data: { employee, records, leaves, year: y, month: m } });
});

const removeUploadFile = (fileName) => {
  if (!fileName) return;
  const full = path.join(uploadsDir, path.basename(String(fileName)));
  fs.promises.unlink(full).catch(() => {});
};

const SECTION_WHITELIST = ['contact', 'bank', 'admin', 'personal', 'family', 'emergency', 'experience', 'weekOff', 'qualification', 'workLocation', 'salary', 'pf', 'immigration'];

const toBool = (v) => v === true || v === 'true';

const ADMIN_STRING_KEYS = ['salaryOn', 'otApplicable', 'attendancePolicy', 'workshift', 'paymentMode', 'esiNo', 'pfNo', 'uan', 'gratuityNo', 'aadhaarCardNo', 'rfidCardNo', 'fingerprintId'];
const ADMIN_BOOL_KEYS = ['ptApplicable', 'esicApplicable', 'pfAsPerGovernment', 'pfOnTotalBasic', 'employerPfAsPerGovernment', 'employerPfOnTotalBasic', 'pensionNotApplicable', 'tdsApplicable', 'compensatoryOffApplicable', 'employerEsicApplicable', 'gratuityApplicable'];

const cleanAdminSection = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = {};
  ADMIN_STRING_KEYS.forEach((k) => {
    if (raw[k] !== undefined && raw[k] !== null) {
      const t = str(raw[k]);
      if (t !== '') out[k] = t;
    }
  });
  ADMIN_BOOL_KEYS.forEach((k) => {
    if (raw[k] !== undefined && raw[k] !== null) out[k] = toBool(raw[k]);
  });
  if (raw.vpfPercentage !== undefined && raw.vpfPercentage !== null && raw.vpfPercentage !== '') {
    const n = Number(raw.vpfPercentage);
    if (Number.isFinite(n)) out.vpfPercentage = n;
  }
  return Object.keys(out).length ? out : undefined;
};

const cleanContactSection = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = {};
  ['personalEmail', 'alternateEmail', 'personalEmail', 'alternateEmail', 'mobileNumber', 'alternatePhone', 'permanentAddress'].forEach((k) => {
    if (raw[k] !== undefined && raw[k] !== null) out[k] = str(raw[k]);
  });
  if (raw.sameAsCurrent !== undefined && raw.sameAsCurrent !== null) out.sameAsCurrent = toBool(raw.sameAsCurrent);
  if (raw.address && typeof raw.address === 'object') {
    const a = {};
    ['line1', 'line2', 'city', 'state', 'country', 'pincode'].forEach((k) => {
      if (raw.address[k] !== undefined && raw.address[k] !== null) a[k] = str(raw.address[k]);
    });
    if (Object.keys(a).length) out.address = a;
  }
  return Object.keys(out).length ? out : undefined;
};

const composeAddressFromContact = (contact) => {
  if (!contact?.address || typeof contact.address !== 'object') return '';
  return [contact.address.line1, contact.address.line2, contact.address.city, contact.address.state, contact.address.country, contact.address.pincode]
    .filter(Boolean)
    .join(', ');
};

const cleanPersonalSection = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const personal = cleanObject({ maritalStatus: raw.maritalStatus, bloodGroup: raw.bloodGroup, nationality: raw.nationality });
  const contact = cleanObject({ personalEmail: raw.personalEmail, mobileNumber: raw.mobileNumber });
  return { personal, contact, dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth) : null, gender: raw.gender || '', address: str(raw.address) };
};

const cleanWeekOffSection = (raw) => {
  if (!raw || typeof raw !== 'object') return undefined;
  const workingDays = Array.isArray(raw.workingDays) ? [...new Set(raw.workingDays.map((d) => str(d)).filter(Boolean))] : [];
  const out = {
    weeklyOffDay: str(raw.weeklyOffDay),
    secondWeeklyOffDay: str(raw.secondWeeklyOffDay),
    workingDays,
  };
  if (out.weeklyOffDay) workingDays.splice(workingDays.indexOf(out.weeklyOffDay), 1);
  if (out.secondWeeklyOffDay) workingDays.splice(workingDays.indexOf(out.secondWeeklyOffDay), 1);
  return out;
};

const familyKeys = ['fullName', 'relationship', 'dateOfBirth', 'phoneNumber', 'occupation', 'address'];
const experienceKeys = ['company', 'jobTitle', 'employmentType', 'startDate', 'endDate', 'currentlyWorking', 'location', 'description'];
const qualificationKeys = ['degree', 'institution', 'fieldOfStudy', 'startYear', 'endYear', 'grade', 'specialization', 'description'];
const emergencyKeys = ['fullName', 'relationship', 'primaryPhone', 'alternatePhone', 'email', 'address'];
const immigrationKeys = ['documentType', 'documentNumber', 'issuingCountry', 'issueDate', 'expiryDate', 'remarks'];

const cleanEntryList = (raw, keys) => {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((e) => {
      const obj = {};
      keys.forEach((k) => {
        if (e[k] !== undefined && e[k] !== null) obj[k] = typeof e[k] === 'string' ? str(e[k]) : e[k];
      });
      if (e.file && typeof e.file === 'object') {
        const f = {};
        ['name', 'path', 'mimeType', 'size', 'docId'].forEach((k) => {
          if (e.file[k] !== undefined && e.file[k] !== null) f[k] = e.file[k];
        });
        if (Object.keys(f).length) obj.file = f;
      }
      return obj;
    })
    .filter((e) => Object.keys(e).length && Object.values(e).some((v) => v !== '' && v !== undefined && v !== null));
};

// @route  PATCH /api/employees/:id/sections/:section
const updateEmployeeSection = asyncHandler(async (req, res) => {
  const section = String(req.params.section || '').trim();
  if (!SECTION_WHITELIST.includes(section)) {
    return res.status(400).json({ success: false, message: 'Invalid employee section' });
  }

  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const data = req.body.data !== undefined ? req.body.data : req.body;

  switch (section) {
    case 'contact': {
      const clean = cleanContactSection(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No contact data provided' });
      employee.contact = { ...(employee.contact || {}), ...clean };
      const composed = composeAddressFromContact(clean);
      if (composed) employee.address = composed;
      await employee.save();
      return res.json({ success: true, message: 'Contact details saved', data: employee.contact });
    }
    case 'bank': {
      const clean = cleanObject(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No bank details provided' });
      delete clean.confirmAccountNumber;
      employee.bankDetails = clean;
      await employee.save();
      return res.json({ success: true, message: 'Bank details saved', data: employee.bankDetails });
    }
    case 'personal': {
      const mapped = cleanPersonalSection(data);
      if (!mapped) return res.status(400).json({ success: false, message: 'No personal data provided' });
      if (mapped.dateOfBirth) employee.dateOfBirth = mapped.dateOfBirth;
      if (mapped.gender) employee.gender = mapped.gender;
      employee.personal = { ...(employee.personal || {}), ...(mapped.personal || {}) };
      employee.contact = { ...(employee.contact || {}), ...(mapped.contact || {}) };
      if (mapped.address) employee.address = mapped.address;
      await employee.save();
      return res.json({
        success: true,
        message: 'Personal details saved',
        data: { ...employee.personal, dateOfBirth: employee.dateOfBirth, gender: employee.gender },
      });
    }
    case 'family':
      employee.family = cleanEntryList(data, familyKeys) || [];
      await employee.save();
      return res.json({ success: true, message: 'Family members saved', data: employee.family });
    case 'emergency':
      employee.emergencyContacts = cleanEntryList(data, emergencyKeys) || [];
      if (employee.emergencyContacts.length === 1) employee.emergencyContact = employee.emergencyContacts[0];
      await employee.save();
      return res.json({ success: true, message: 'Emergency contacts saved', data: employee.emergencyContacts });
    case 'experience':
      employee.experience = cleanEntryList(data, experienceKeys) || [];
      await employee.save();
      return res.json({ success: true, message: 'Experience records saved', data: employee.experience });
    case 'weekOff': {
      const clean = cleanWeekOffSection(data);
      employee.weekOff = clean;
      await employee.save();
      return res.json({ success: true, message: 'Week off configuration saved', data: employee.weekOff });
    }
    case 'qualification':
      employee.qualifications = cleanEntryList(data, qualificationKeys) || [];
      await employee.save();
      return res.json({ success: true, message: 'Qualifications saved', data: employee.qualifications });
    case 'workLocation': {
      const office = sanitizeId(data?.office);
      if (data?.office && !office) {
        return res.status(400).json({ success: false, message: 'Invalid location' });
      }
      if (office) {
        const locationExists = await Location.findById(office);
        if (!locationExists) return res.status(400).json({ success: false, message: 'Location not found' });
      }
      employee.office = office || null;
      await employee.save();
      const saved = await Employee.findById(employee._id).populate('office').lean();
      return res.json({ success: true, message: 'Work location saved', data: saved.office || null });
    }
    case 'salary': {
      const clean = cleanObject(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No salary details provided' });
      employee.salary = clean;
      await employee.save();
      return res.json({ success: true, message: 'Salary details saved', data: employee.salary });
    }
    case 'pf': {
      const clean = cleanObject(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No PF details provided' });
      employee.pf = clean;
      await employee.save();
      return res.json({ success: true, message: 'PF details saved', data: employee.pf });
    }
    case 'admin': {
      const clean = cleanAdminSection(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No administrative details provided' });
      employee.admin = clean;
      await employee.save();
      return res.json({ success: true, message: 'Administrative details saved', data: employee.admin });
    }
    case 'immigration':
      employee.immigration = cleanEntryList(data, immigrationKeys) || [];
      await employee.save();
      return res.json({ success: true, message: 'Immigration details saved', data: employee.immigration });
    default:
      return res.status(400).json({ success: false, message: 'Invalid employee section' });
  }
});

// @route  POST /api/employees/:id/send-login
const sendEmployeeLoginDetails = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const email = String(employee.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'This employee has no work email. Add it in the basic employee information first.' });
  }

  const tempPassword = crypto.randomBytes(6).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 10);

  let user = await User.findOne({ employee: employee._id });
  if (user) {
    user.password = hashed;
    user.email = email;
    user.employeeId = employee.employeeId;
    user.name = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ') || employee.firstName;
    user.active = employee.status !== 'Inactive';
    await user.save({ validateBeforeSave: false });
  } else {
    user = await User.create({
      employeeId: employee.employeeId,
      name: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ') || employee.firstName,
      email,
      password: hashed,
      role: 'employee',
      employee: employee._id,
      active: employee.status !== 'Inactive',
    });
  }

  const result = await sendWelcomeMail({
    to: email,
    companyName: config.companyName,
    employeeName: user.name,
    employeeId: employee.employeeId,
    loginEmail: email,
    temporaryPassword: tempPassword,
    loginUrl: config.loginUrl,
  });

  res.json({
    success: true,
    message: result.sent
      ? `Login credentials sent to ${email}`
      : 'Email service is not configured — the temporary password is shown below. Share it securely.',
    emailSent: result.sent,
    generatedPassword: result.sent ? undefined : tempPassword,
  });
});

// @route  POST /api/employees/:id/photo  (replace profile photo only)
const uploadEmployeePhoto = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No image file provided' });

  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  employee.profilePhoto = saveBuffer(req.file.buffer, ext);
  await employee.save();

  res.json({ success: true, message: 'Profile photo updated', data: { profilePhoto: employee.profilePhoto } });
});

const docRecord = (file, kind) => ({
  kind: str(kind) || 'other',
  originalName: file?.originalname || '',
  fileName: file ? path.basename(file.path) : '',
  path: file?.path || '',
  mimeType: file?.mimetype || '',
  size: file?.size || 0,
});

// @route  POST /api/employees/:id/documents
const uploadEmployeeDocument = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No file provided' });

  const ext = extFromName(req.file.originalname);
  const savedPath = saveBuffer(req.file.buffer, ext);
  const doc = {
    ...docRecord({ ...req.file, path: savedPath, fileName: savedPath.split('/').pop() }, req.body.kind),
  };

  employee.documents.push(doc);
  await employee.save();
  const saved = employee.documents[employee.documents.length - 1];

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: saved.toObject ? saved.toObject() : saved,
  });
});

// @route  PUT /api/employees/:id/documents/:docId  (replace file)
const replaceEmployeeDocument = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No file provided' });

  const idx = employee.documents.findIndex((d) => String(d._id) === String(req.params.docId));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Document not found' });

  const ext = extFromName(req.file.originalname);
  const savedPath = saveBuffer(req.file.buffer, ext);
  const existing = employee.documents[idx];
  removeUploadFile(existing.fileName);

  existing.originalName = req.file.originalname;
  existing.fileName = savedPath.split('/').pop();
  existing.path = savedPath;
  existing.mimeType = req.file.mimetype;
  existing.size = req.file.size;

  await employee.save();
  res.json({ success: true, message: 'Document updated successfully', data: employee.documents[idx] });
});

// @route  DELETE /api/employees/:id/documents/:docId
const deleteEmployeeDocument = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const idx = employee.documents.findIndex((d) => String(d._id) === String(req.params.docId));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Document not found' });

  const [removed] = employee.documents.splice(idx, 1);
  removeUploadFile(removed?.fileName);
  await employee.save();

  res.json({ success: true, message: 'Document deleted successfully' });
});

// helper: descriptor normalization shared by face controller
const normalizeFaceDescriptor = (d) => {
  if (descriptorIsValid(d)) return normalizeDescriptor(d);
  return null;
};

module.exports = {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  setEmployeeStatus,
  getEmployeeAttendance,
  uploadEmployeeDocument,
  replaceEmployeeDocument,
  deleteEmployeeDocument,
  updateEmployeeSection,
  sendEmployeeLoginDetails,
  uploadEmployeePhoto,
  normalizeFaceDescriptor,
};