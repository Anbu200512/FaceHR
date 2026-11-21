const crypto = require('crypto');
const config = require('../config/config');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { saveBuffer } = require('../middleware/upload');
const faceService = require('../services/faceService');
const { verifyAgainstProfile, parseDescriptor } = require('../services/faceVerification');
const { normalizeFaceDescriptor } = require('../controllers/employeeController');
const { createNotification } = require('../services/notificationService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// @route  POST /api/face/register  (admin + profile photo upload)
const registerFace = asyncHandler(async (req, res) => {
  const { employeeId, force } = req.body;
  const descriptor = parseDescriptor(req.body.descriptor);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, message: 'A face photo is required' });
  }

  const existing = await prisma.faceProfile.findFirst({ where: { employeeRefId: employee.id } });
  if (existing && existing.active && force !== 'true' && force !== true) {
    return res.status(409).json({
      success: false,
      message: 'Face already registered for this employee. Use "Re-register" to replace it.',
      data: { faceId: existing.faceId },
    });
  }

  // 1. Try to extract the descriptor server-side (trusted).
  const serverResult = await faceService.extractDescriptorFromBuffer(req.file.buffer);
  let finalDescriptor = null;
  let source = 'client';

  if (serverResult && serverResult.descriptor) {
    finalDescriptor = serverResult.descriptor;
    source = 'server';
  } else {
    finalDescriptor = normalizeFaceDescriptor(descriptor);
  }

  if (!finalDescriptor) {
    return res.status(400).json({
      success: false,
      message:
        'No clear face was detected. Please retake with one person, good lighting, and a front-facing view.',
    });
  }

  const faceCount = await faceService.countFaces(req.file.buffer);
  if (faceCount === 0) {
    return res.status(400).json({
      success: false,
      message: 'No face detected in the photo. Please retake and make sure your face is clearly visible.',
    });
  }
  if (faceCount !== null && faceCount > 1) {
    return res.status(400).json({
      success: false,
      message: 'Multiple faces detected. Please register with only one person in frame.',
    });
  }

  // Prevent registering a face that already belongs to another active employee.
  const otherProfiles = await prisma.faceProfile.findMany({
    where: { active: true, employeeRefId: { not: employee.id } },
    select: { employeeRefId: true, descriptor: true, employee: { select: { employeeId: true, firstName: true, lastName: true } } },
  });
  const duplicateThreshold = Math.min(Number(config.faceMatchThreshold) || 0.45, 0.4);
  let conflict = null;
  for (const p of otherProfiles) {
    if (!faceService.descriptorIsValid(p.descriptor)) continue;
    const d = faceService.euclideanDistance(finalDescriptor, p.descriptor);
    if (d <= duplicateThreshold && (!conflict || d < conflict.distance)) {
      conflict = {
        distance: d,
        employeeId: p.employee?.employeeId,
        name: [p.employee?.firstName, p.employee?.lastName].filter(Boolean).join(' ').trim(),
      };
    }
  }
  if (conflict) {
    return res.status(409).json({
      success: false,
      code: 'FACE_ALREADY_REGISTERED',
      message: conflict.name
        ? `This face closely matches another registered employee (${conflict.name} - ${conflict.employeeId}). Register only that employee's own face, or remove/re-register the conflicting face if it was registered incorrectly.`
        : 'This face matches another registered employee. A face can only be registered to one employee.',
      data: conflict,
    });
  }

  // 2. Store the face still image (no video is ever stored).
  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const faceImage = saveBuffer(req.file.buffer, ext);

  const payload = {
    employeeRefId: employee.id,
    faceId: crypto.randomUUID(),
    descriptor: finalDescriptor,
    faceImage,
    quality: serverResult ? serverResult.score : 0,
    registeredById: req.user.id,
    active: true,
  };

  let profile;
  if (existing) {
    profile = await prisma.faceProfile.update({ where: { id: existing.id }, data: payload });
  } else {
    profile = await prisma.faceProfile.create({ data: payload });
  }

  const user = await prisma.user.findFirst({ where: { employeeRefId: employee.id } });
  if (user) {
    await createNotification({
      user: user.id,
      title: 'Face registered',
      message: 'Your face has been registered. You can now check in with face attendance.',
      type: 'success',
      link: '/employee',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Face registered successfully',
    data: {
      faceId: profile.faceId,
      faceImage: profile.faceImage,
      descriptorSource: source,
      quality: profile.quality,
    },
  });
});

// @route  POST /api/face/verify
const verifyFace = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, message: 'A face photo is required' });
  }

  let employeeId = req.user.employee;
  if (req.user.role === 'admin') {
    if (!req.body.employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required for admin verification' });
    }
    if (!UUID_RE.test(String(req.body.employeeId))) {
      return res.status(400).json({ success: false, message: 'Invalid employee reference' });
    }
    employeeId = req.body.employeeId;
  }
  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'No employee identity available. Please sign in first.' });
  }

  const result = await verifyAgainstProfile({
    employeeId,
    buffer: req.file.buffer,
    clientDescriptor: parseDescriptor(req.body.descriptor),
  });

  res.json({ success: result.ok, message: result.message, data: result });
});

// @route  GET /api/face/:employeeId  (admin)
const getFaceStatus = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.employeeId } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  const profile = await prisma.faceProfile.findFirst({
    where: { employeeRefId: employee.id },
    select: {
      id: true,
      faceId: true,
      faceImage: true,
      quality: true,
      active: true,
      updatedAt: true,
    },
  });
  res.json({
    success: true,
    data: {
      registered: !!profile && profile.active,
      faceId: profile ? profile.faceId : null,
      faceImage: profile ? profile.faceImage : null,
      quality: profile ? profile.quality : 0,
      updatedAt: profile ? profile.updatedAt : null,
    },
  });
});

// @route  DELETE /api/face/:employeeId  (admin)
const deleteFace = asyncHandler(async (req, res) => {
  const employee = await prisma.employee.findUnique({ where: { id: req.params.employeeId } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

  const profile = await prisma.faceProfile.findFirst({ where: { employeeRefId: employee.id } });
  if (!profile) return res.status(404).json({ success: false, message: 'No face profile found for this employee' });
  await prisma.faceProfile.delete({ where: { id: profile.id } });

  const user = await prisma.user.findFirst({ where: { employeeRefId: employee.id } });
  if (user) {
    await createNotification({
      user: user.id,
      title: 'Face profile removed',
      message: 'Your registered face profile was removed by HR. Re-register to use face attendance.',
      type: 'warning',
      link: '/employee',
    });
  }

  res.json({ success: true, message: 'Face profile removed. The employee must re-register to use face attendance.' });
});

module.exports = { registerFace, verifyFace, getFaceStatus, deleteFace };
