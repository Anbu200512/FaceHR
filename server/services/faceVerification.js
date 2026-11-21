/**
 * Face verification helper used by the attendance check-in/check-out flow and
 * the standalone /api/face/verify endpoint.
 *
 * The employee identity ALWAYS comes from the JWT (never from the request body).
 * Verification compares the live face descriptor against the stored registered
 * descriptor using a configurable Euclidean-distance threshold.
 */
const config = require('../config/config');
const prisma = require('../config/prisma');
const faceService = require('./faceService');

/**
 * Resolves a trusted descriptor for an uploaded image.
 * Prefers a server-computed descriptor (when the optional TF backend is
 * available); otherwise falls back to the client-computed descriptor.
 */
async function resolveDescriptor(buffer, clientDescriptor) {
  const serverResult = await faceService.extractDescriptorFromBuffer(buffer);
  if (serverResult && serverResult.descriptor) {
    return {
      descriptor: serverResult.descriptor,
      source: 'server',
      faceCount: serverResult.faceCount,
    };
  }
  if (faceService.descriptorIsValid(clientDescriptor)) {
    return { descriptor: faceService.normalizeDescriptor(clientDescriptor), source: 'client' };
  }
  return null;
}

/**
 * Parses a descriptor that may arrive as a JSON array (application/json body)
 * or a JSON-encoded string (multipart form). Returns an array or null.
 */
function parseDescriptor(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function verifyAgainstProfile({ employeeId, buffer, clientDescriptor }) {
  const profile = await prisma.faceProfile.findFirst({
    where: { employeeRefId: employeeId, active: true },
  });
  if (!profile || !faceService.descriptorIsValid(profile.descriptor)) {
    return {
      ok: false,
      code: 'NO_FACE',
      message: 'Face not registered for your account. Please contact HR/admin to register your face before marking attendance.',
    };
  }

  const faceCount = await faceService.countFaces(buffer);
  if (faceCount === 0) {
    return {
      ok: false,
      code: 'NO_FACE_DETECTED',
      message: 'No face detected. Please face the camera clearly with good lighting and only one person in frame.',
      faceCount: 0,
    };
  }
  if (faceCount !== null && faceCount > 1) {
    return {
      ok: false,
      code: 'MULTIPLE_FACES',
      message: 'Multiple faces detected. Please ensure only your face is visible and try again.',
      faceCount,
    };
  }

  const resolved = await resolveDescriptor(buffer, clientDescriptor);
  if (!resolved) {
    return {
      ok: false,
      code: 'NO_DESCRIPTOR',
      message: 'Face not clear enough for verification. Please try again in good lighting, face the camera directly, and keep only one person in frame.',
      faceCount,
    };
  }

  const threshold = config.faceMatchThreshold;
  const targetDistance = faceService.euclideanDistance(resolved.descriptor, profile.descriptor);

  // Security: compare against all active registered faces to prevent one person
  // being matched/used for another employee account.
  const profiles = await prisma.faceProfile.findMany({
    where: { active: true },
    select: { employeeRefId: true, descriptor: true },
  });
  let best = null;
  let secondBest = null;
  for (const p of profiles) {
    if (!faceService.descriptorIsValid(p.descriptor)) continue;
    const d = faceService.euclideanDistance(resolved.descriptor, p.descriptor);
    if (!best || d < best.distance) {
      secondBest = best;
      best = { employeeRefId: p.employeeRefId, distance: d };
    } else if (!secondBest || d < secondBest.distance) {
      secondBest = { employeeRefId: p.employeeRefId, distance: d };
    }
  }

  if (!best) {
    return { ok: false, code: 'NO_FACE', message: 'No registered face profiles available for verification.' };
  }

  const targetIsBest = String(best.employeeRefId) === String(employeeId);
  const matched = targetIsBest && targetDistance <= threshold;

  // If another employee's face is a closer/better match, block it.
  if (!targetIsBest && best.distance <= threshold) {
    return {
      ok: false,
      code: 'FACE_MISMATCH',
      distance: targetDistance,
      bestDistance: best.distance,
      threshold,
      source: resolved.source,
      faceCount: faceCount ?? resolved.faceCount ?? null,
      message: 'Face does not match this employee. Only the registered employee can check in/out.',
    };
  }

  // Ambiguous match: block only when another employee is also near the
  // threshold and the gap is too small to confidently identify target.
  const AMBIGUITY_GAP = 0.08;
  if (
    matched &&
    secondBest &&
    String(secondBest.employeeRefId) !== String(employeeId) &&
    secondBest.distance <= threshold + 0.05 &&
    (secondBest.distance - targetDistance) < AMBIGUITY_GAP
  ) {
    return {
      ok: false,
      code: 'AMBIGUOUS_FACE',
      distance: targetDistance,
      secondBestDistance: secondBest.distance,
      threshold,
      source: resolved.source,
      faceCount: faceCount ?? resolved.faceCount ?? null,
      message: 'Face match is ambiguous. Please re-register this employee with a clear front-facing photo (good light, one person, no glasses/glare).',
    };
  }

  return {
    ok: matched,
    code: matched ? 'MATCHED' : 'NO_MATCH',
    distance: targetDistance,
    threshold,
    source: resolved.source,
    faceCount: faceCount ?? resolved.faceCount ?? null,
    message: matched
      ? 'Face verified'
      : 'Face not recognized for this employee. Only the registered face can be used for check-in/check-out.',
  };
}

module.exports = { verifyAgainstProfile, resolveDescriptor, parseDescriptor };
