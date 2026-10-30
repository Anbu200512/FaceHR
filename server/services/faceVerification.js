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
      message: 'Face not registered for this employee. Please contact HR to register your face.',
    };
  }

  const resolved = await resolveDescriptor(buffer, clientDescriptor);
  if (!resolved) {
    return {
      ok: false,
      code: 'NO_DESCRIPTOR',
      message: 'Could not detect your face clearly. Please retake the photo with better lighting.',
    };
  }

  const distance = faceService.euclideanDistance(resolved.descriptor, profile.descriptor);
  const threshold = config.faceMatchThreshold;
  const matched = distance <= threshold;

  return {
    ok: matched,
    code: matched ? 'MATCHED' : 'NO_MATCH',
    distance,
    threshold,
    source: resolved.source,
    faceCount: resolved.faceCount ?? null,
    message: matched
      ? 'Face verified'
      : 'Face not recognized. Please try again or contact HR.',
  };
}

module.exports = { verifyAgainstProfile, resolveDescriptor, parseDescriptor };
