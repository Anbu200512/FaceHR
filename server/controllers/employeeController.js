const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/config');
const { saveBuffer, extFromName, uploadsDir } = require('../middleware/upload');
const { createNotification } = require('../services/notificationService');
const { sendWelcomeMail } = require('../services/mailService');
const { normalizeDescriptor, descriptorIsValid } = require('../services/faceService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeId(value) {
  return value && UUID_RE.test(String(value)) ? String(value) : null;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

const STRING_FIELDS = [
  'firstName', 'middleName', 'lastName', 'phone', 'address', 'state',
  'subDepartment', 'subDepartment1', 'subDepartment2', 'category', 'subCategory',
  'grade', 'reportingManager', 'reportingManager2', 'probation', 'totalExperience',
  'employmentType', 'status',
];
const BOOLEAN_FIELDS = ['probationManage', 'exEmployee'];

const toBool = (v) => v === true || v === 'true';

/** Basic scalar employee fields. Relation ids (department/office/designation) are handled separately. */
const pickFields = (b) => {
  const data = {};
  for (const k of STRING_FIELDS) {
    if (b[k] === undefined || b[k] === null) continue;
    data[k] = String(b[k]).trim();
  }
  for (const k of BOOLEAN_FIELDS) {
    if (b[k] !== undefined && b[k] !== null) data[k] = toBool(b[k]);
  }
  if (b.dateOfBirth !== undefined) data.dateOfBirth = b.dateOfBirth ? new Date(b.dateOfBirth) : null;
  if (b.joiningDate !== undefined && b.joiningDate !== null && b.joiningDate !== '') {
    data.joiningDate = new Date(b.joiningDate);
  }
  return data;
};

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

const LIST_INCLUDE = {
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  office: { select: { id: true, name: true } },
  face: { select: { id: true, faceId: true, active: true } },
};

const EMPLOYEE_INCLUDE = {
  department: true,
  designation: true,
  office: true,
  face: {
    select: {
      id: true,
      faceId: true,
      faceImage: true,
      quality: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  documents: true,
};

// @route  GET /api/employees
const getEmployees = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const search = String(req.query.search || '').trim();
  const status = req.query.status;
  const noFace = req.query.noFace === 'true';
  const sortBy = String(req.query.sortBy || 'createdAt');
  const order = req.query.order === 'asc' ? 'asc' : 'desc';

  const where = {};
  const department = sanitizeId(req.query.department);
  const designation = sanitizeId(req.query.designation);
  const branch = sanitizeId(req.query.branch || req.query.office);

  if (department) where.departmentId = department;
  if (designation) where.designationId = designation;
  if (status) where.status = status;
  if (branch) where.officeId = branch;

  if (noFace) {
    const faces = await prisma.faceProfile.findMany({ select: { employeeRefId: true } });
    where.id = { notIn: faces.map((f) => f.employeeRefId) };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const SORTABLE = ['createdAt', 'joiningDate', 'firstName', 'lastName', 'employeeId', 'email', 'status'];
  const sortField = SORTABLE.includes(sortBy) ? sortBy : 'createdAt';

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: { [sortField]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
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
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: EMPLOYEE_INCLUDE,
  });
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
    prisma.employee.findUnique({ where: { employeeId } }),
    prisma.employee.findUnique({ where: { email } }),
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

  const employeeData = stripUndefined({
    ...pickFields(b),
    employeeId,
    email,
    profilePhoto,
    departmentId: department,
    officeId: office,
    designationId: designation,
    joiningDate: b.joiningDate ? new Date(b.joiningDate) : new Date(),
  });

  const extra = cleanSections(b);
  if (extra) {
    Object.assign(employeeData, extra.sections);
    if (!employeeData.address && extra.address) employeeData.address = extra.address;
  }

  const { employee } = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({ data: employeeData });
    await tx.user.create({
      data: {
        employeeId,
        name: `${b.firstName} ${b.lastName}`.trim(),
        email,
        password: hashed,
        role: 'employee',
        employeeRefId: created.id,
        active: created.status !== 'Inactive',
      },
    });
    return { employee: created };
  });

  const admins = await prisma.user.findMany({ where: { role: 'admin', active: true }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a.id,
        title: 'New employee added',
        message: `${employee.firstName} ${employee.lastName} (${employeeId}) was added to the team.`,
        type: 'employee',
        link: `/admin/employees/${employee.id}`,
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
    data: await prisma.employee.findUnique({ where: { id: employee.id }, include: EMPLOYEE_INCLUDE }),
    generatedPassword: b.password ? undefined : givenPassword,
    emailSent,
  });
});

// @route  PUT /api/employees/:id
const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const b = req.body;
  const update = pickFields(b);

  if (b.employeeId) update.employeeId = String(b.employeeId).trim().toUpperCase();
  if (b.email) update.email = String(b.email).trim().toLowerCase();
  if (b.department !== undefined) update.departmentId = sanitizeId(b.department) || null;
  if (b.office !== undefined) update.officeId = sanitizeId(b.office) || null;
  if (b.designation !== undefined) update.designationId = sanitizeId(b.designation) || null;

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
    const dup = await prisma.employee.findUnique({ where: { employeeId } });
    if (dup) return res.status(409).json({ success: false, message: `Employee ID ${employeeId} already exists` });
  }
  if (update.email && update.email !== employee.email) {
    const dup = await prisma.employee.findUnique({ where: { email: update.email } });
    if (dup) return res.status(409).json({ success: false, message: 'An employee with this email already exists' });
  }

  const updated = Object.keys(update).length
    ? await prisma.employee.update({ where: { id: employee.id }, data: update })
    : employee;

  const user = await prisma.user.findFirst({ where: { employeeRefId: employee.id } });
  if (user) {
    const changed = {};
    if (update.email) changed.email = update.email;
    if (update.employeeId) changed.employeeId = update.employeeId;
    if (update.firstName || update.lastName) changed.name = `${updated.firstName} ${updated.lastName}`.trim();
    if (update.status) changed.active = update.status !== 'Inactive';
    if (Object.keys(changed).length) await prisma.user.update({ where: { id: user.id }, data: changed });

    if (b.password) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(String(b.password), 10) },
      });
    }
  }

  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: await prisma.employee.findUnique({ where: { id: employee.id }, include: EMPLOYEE_INCLUDE }),
  });
});

// @route  DELETE /api/employees/:id   (safety: soft-deactivate, keeps history)
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const wasActive = employee.status === 'Active';

  await prisma.$transaction([
    prisma.employee.update({ where: { id: employee.id }, data: { status: 'Inactive' } }),
    ...(wasActive
      ? [prisma.user.updateMany({ where: { employeeRefId: employee.id }, data: { active: false } })]
      : []),
  ]);

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
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  await prisma.$transaction([
    prisma.employee.update({ where: { id: employee.id }, data: { status } }),
    prisma.user.updateMany({ where: { employeeRefId: employee.id }, data: { active: status === 'Active' } }),
  ]);

  res.json({ success: true, message: `Employee ${status === 'Active' ? 'reactivated' : 'deactivated'} successfully` });
});

// @route  GET /api/employees/:id/attendance (admin or owner)
const getEmployeeAttendance = asyncHandler(async (req, res) => {
  if (req.user.role === 'employee' && String(req.params.id) !== String(req.user.employee)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to view this attendance' });
  }

  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const { year, month } = req.query;
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || new Date().getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);

  const [records, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeRefId: employee.id, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.leave.findMany({
      where: { employeeRefId: employee.id, status: 'Approved', startDate: { lt: end }, endDate: { gte: start } },
    }),
  ]);

  res.json({ success: true, data: { employee, records, leaves, year: y, month: m } });
});

const removeUploadFile = (fileName) => {
  if (!fileName) return;
  const full = path.join(uploadsDir, path.basename(String(fileName)));
  fs.promises.unlink(full).catch(() => {});
};

const SECTION_WHITELIST = ['contact', 'bank', 'admin', 'personal', 'family', 'emergency', 'experience', 'weekOff', 'qualification', 'workLocation', 'salary', 'pf', 'immigration'];

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
  ['personalEmail', 'alternateEmail', 'mobileNumber', 'alternatePhone', 'permanentAddress'].forEach((k) => {
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
  const weeklyOffDay = str(raw.weeklyOffDay);
  const secondWeeklyOffDay = str(raw.secondWeeklyOffDay);
  const offDays = new Set([weeklyOffDay, secondWeeklyOffDay].filter(Boolean));
  const workingDays = Array.isArray(raw.workingDays)
    ? [...new Set(raw.workingDays.map((d) => str(d)).filter(Boolean))].filter((d) => !offDays.has(d))
    : [];
  return { weeklyOffDay, secondWeeklyOffDay, workingDays };
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

  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const data = req.body.data !== undefined ? req.body.data : req.body;

  switch (section) {
    case 'contact': {
      const clean = cleanContactSection(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No contact data provided' });
      const contact = { ...(employee.contact || {}), ...clean };
      const update = { contact };
      const composed = composeAddressFromContact(clean);
      if (composed) update.address = composed;
      await prisma.employee.update({ where: { id: employee.id }, data: update });
      return res.json({ success: true, message: 'Contact details saved', data: contact });
    }
    case 'bank': {
      const clean = cleanObject(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No bank details provided' });
      delete clean.confirmAccountNumber;
      await prisma.employee.update({ where: { id: employee.id }, data: { bankDetails: clean } });
      return res.json({ success: true, message: 'Bank details saved', data: clean });
    }
    case 'personal': {
      const mapped = cleanPersonalSection(data);
      if (!mapped) return res.status(400).json({ success: false, message: 'No personal data provided' });
      const update = {};
      if (mapped.dateOfBirth) update.dateOfBirth = mapped.dateOfBirth;
      if (mapped.gender) update.gender = mapped.gender;
      const personal = { ...(employee.personal || {}), ...(mapped.personal || {}) };
      const contact = { ...(employee.contact || {}), ...(mapped.contact || {}) };
      update.personal = personal;
      update.contact = contact;
      if (mapped.address) update.address = mapped.address;
      const saved = await prisma.employee.update({ where: { id: employee.id }, data: update });
      return res.json({
        success: true,
        message: 'Personal details saved',
        data: { ...personal, dateOfBirth: saved.dateOfBirth, gender: saved.gender },
      });
    }
    case 'family': {
      const family = cleanEntryList(data, familyKeys) || [];
      await prisma.employee.update({ where: { id: employee.id }, data: { family } });
      return res.json({ success: true, message: 'Family members saved', data: family });
    }
    case 'emergency': {
      const emergencyContacts = cleanEntryList(data, emergencyKeys) || [];
      const update = { emergencyContacts };
      if (emergencyContacts.length === 1) update.emergencyContact = emergencyContacts[0];
      await prisma.employee.update({ where: { id: employee.id }, data: update });
      return res.json({ success: true, message: 'Emergency contacts saved', data: emergencyContacts });
    }
    case 'experience': {
      const experience = cleanEntryList(data, experienceKeys) || [];
      await prisma.employee.update({ where: { id: employee.id }, data: { experience } });
      return res.json({ success: true, message: 'Experience records saved', data: experience });
    }
    case 'weekOff': {
      const weekOff = cleanWeekOffSection(data);
      await prisma.employee.update({ where: { id: employee.id }, data: { weekOff } });
      return res.json({ success: true, message: 'Week off configuration saved', data: weekOff });
    }
    case 'qualification': {
      const qualifications = cleanEntryList(data, qualificationKeys) || [];
      await prisma.employee.update({ where: { id: employee.id }, data: { qualifications } });
      return res.json({ success: true, message: 'Qualifications saved', data: qualifications });
    }
    case 'workLocation': {
      const office = sanitizeId(data?.office);
      if (data?.office && !office) {
        return res.status(400).json({ success: false, message: 'Invalid location' });
      }
      if (office) {
        const locationExists = await prisma.location.findUnique({ where: { id: office } });
        if (!locationExists) return res.status(400).json({ success: false, message: 'Location not found' });
      }
      const saved = await prisma.employee.update({
        where: { id: employee.id },
        data: { officeId: office || null },
        include: { office: true },
      });
      return res.json({ success: true, message: 'Work location saved', data: saved.office || null });
    }
    case 'salary': {
      const clean = cleanObject(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No salary details provided' });
      await prisma.employee.update({ where: { id: employee.id }, data: { salary: clean } });
      return res.json({ success: true, message: 'Salary details saved', data: clean });
    }
    case 'pf': {
      const clean = cleanObject(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No PF details provided' });
      await prisma.employee.update({ where: { id: employee.id }, data: { pf: clean } });
      return res.json({ success: true, message: 'PF details saved', data: clean });
    }
    case 'admin': {
      const clean = cleanAdminSection(data);
      if (!clean) return res.status(400).json({ success: false, message: 'No administrative details provided' });
      await prisma.employee.update({ where: { id: employee.id }, data: { admin: clean } });
      return res.json({ success: true, message: 'Administrative details saved', data: clean });
    }
    case 'immigration': {
      const immigration = cleanEntryList(data, immigrationKeys) || [];
      await prisma.employee.update({ where: { id: employee.id }, data: { immigration } });
      return res.json({ success: true, message: 'Immigration details saved', data: immigration });
    }
    default:
      return res.status(400).json({ success: false, message: 'Invalid employee section' });
  }
});

// @route  POST /api/employees/:id/send-login
const sendEmployeeLoginDetails = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const email = String(employee.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'This employee has no work email. Add it in the basic employee information first.' });
  }

  const tempPassword = crypto.randomBytes(6).toString('hex');
  const hashed = await bcrypt.hash(tempPassword, 10);
  const name = [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ') || employee.firstName;
  const active = employee.status !== 'Inactive';

  const user = await prisma.user.findFirst({ where: { employeeRefId: employee.id } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, email, employeeId: employee.employeeId, name, active },
    });
  } else {
    await prisma.user.create({
      data: {
        employeeId: employee.employeeId,
        name,
        email,
        password: hashed,
        role: 'employee',
        employeeRefId: employee.id,
        active,
      },
    });
  }

  const result = await sendWelcomeMail({
    to: email,
    companyName: config.companyName,
    employeeName: name,
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
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No image file provided' });

  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const updated = await prisma.employee.update({
    where: { id: employee.id },
    data: { profilePhoto: saveBuffer(req.file.buffer, ext) },
    select: { profilePhoto: true },
  });

  res.json({ success: true, message: 'Profile photo updated', data: updated });
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
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No file provided' });

  const ext = extFromName(req.file.originalname);
  const savedPath = saveBuffer(req.file.buffer, ext);
  const doc = await prisma.employeeDocument.create({
    data: {
      employeeRefId: employee.id,
      ...docRecord({ ...req.file, path: savedPath, fileName: savedPath.split('/').pop() }, req.body.kind),
    },
  });

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: doc,
  });
});

// @route  PUT /api/employees/:id/documents/:docId  (replace file)
const replaceEmployeeDocument = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No file provided' });

  const existing = await prisma.employeeDocument.findFirst({
    where: { id: req.params.docId, employeeRefId: employee.id },
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Document not found' });

  const ext = extFromName(req.file.originalname);
  const savedPath = saveBuffer(req.file.buffer, ext);
  removeUploadFile(existing.fileName);

  const updated = await prisma.employeeDocument.update({
    where: { id: existing.id },
    data: {
      originalName: req.file.originalname,
      fileName: savedPath.split('/').pop(),
      path: savedPath,
      mimeType: req.file.mimetype,
      size: req.file.size || 0,
    },
  });

  res.json({ success: true, message: 'Document updated successfully', data: updated });
});

// @route  DELETE /api/employees/:id/documents/:docId
const deleteEmployeeDocument = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const existing = await prisma.employeeDocument.findFirst({
    where: { id: req.params.docId, employeeRefId: employee.id },
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Document not found' });

  removeUploadFile(existing.fileName);
  await prisma.employeeDocument.delete({ where: { id: existing.id } });

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
