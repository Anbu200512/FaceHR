/**
 * FaceRecognitionService
 * ----------------------
 * Best-effort server-side face recognition built on top of face-api.js.
 *
 * When a native TensorFlow backend (@tensorflow/tfjs-node) plus
 * @vladmandic/face-api can be installed and the model weights are present, the
 * server can re-compute face descriptors from uploaded images (more secure).
 *
 * If the optional native dependency is unavailable (slow/no build tools), the
 * service degrades gracefully: comparison still happens server-side using the
 * descriptor submitted by the authenticated client, and a health flag reports
 * the mode. This keeps face attendance fully functional in either case.
 *
 * No raw video is ever stored — only single face still images.
 */

const path = require('path');
const config = require('../config/config');

let faceapi = null;
let tf = null;
const state = {
  initStarted: false,
  initDone: false,
  error: null,
  backend: 'none', // 'tfjs-node' | 'tfjs-js' | 'none'
};

const modelDir = path.resolve(__dirname, '..', config.faceModelsPath);

function euclideanDistance(a, b) {
  if (!Array.isArray(a) && !(a instanceof Float32Array)) return Infinity;
  if (!Array.isArray(b) && !(b instanceof Float32Array)) return Infinity;
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) * (a[i] - b[i]);
  return Math.sqrt(sum);
}

function descriptorIsValid(descriptor) {
  return (
    descriptor &&
    (Array.isArray(descriptor) || descriptor instanceof Float32Array) &&
    descriptor.length === 128 &&
    descriptor.every((v) => typeof v === 'number' && Number.isFinite(v))
  );
}

function normalizeDescriptor(descriptor) {
  return Array.from(descriptor);
}

async function loadMLBackend() {
  try {
    // Native backend (fast). Optional dependency — may fail to compile.
    tf = require('@tensorflow/tfjs-node');
    await tf.ready();
    faceapi = require('@vladmandic/face-api');
    if (faceapi && faceapi.tf) {
      try { faceapi.tf = tf; } catch (e) { /* noop */ }
    }
    state.backend = 'tfjs-node';
    return true;
  } catch (err) {
    tf = null;
    faceapi = null;
    state.error = err.message;
    state.backend = 'none';
    return false;
  }
}

async function loadModels() {
  if (state.initDone) return state;
  if (state.initStarted) {
    // wait for in-flight init (simple polling)
    while (!state.initDone) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return state;
  }
  state.initStarted = true;

  const ok = await loadMLBackend();
  if (ok && faceapi) {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelDir);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir);
      state.initDone = true;
      console.log(
        `[FaceService] Server-side face recognition enabled (${state.backend}). Models loaded from ${modelDir}`
      );
    } catch (err) {
      state.error = `Model load failed: ${err.message}`;
      state.initDone = true;
      state.backend = 'none';
      console.warn(`[FaceService] ${state.error}. Falling back to client-side descriptor matching.`);
    }
  } else {
    state.initDone = true;
    console.warn(
      `[FaceService] Native TF backend unavailable (${state.error || 'unknown'}). ` +
        'Using client-computed descriptors for matching. Install @tensorflow/tfjs-node to enable server-side verification.'
    );
  }
  return state;
}

async function init() {
  return loadModels();
}

async function decode(buffer) {
  if (!tf) return null;
  try {
    const tensor = tf.node.decodeImage(buffer, 3);
    const info = { width: tensor.shape[1], height: tensor.shape[0] };
    return { tensor, info };
  } catch (err) {
    state.error = `Image decode failed: ${err.message}`;
    return null;
  }
}

async function dispose(img) {
  try { img.tensor && img.tensor.dispose(); } catch (e) { /* noop */ }
}

/**
 * Extracts a 128-dim descriptor from an image buffer (server-side).
 * Returns null when server ML is unavailable or no single face found.
 */
async function extractDescriptorFromBuffer(buffer) {
  await loadModels();
  if (!faceapi || state.backend === 'none' || !tf) return null;

  const img = await decode(buffer);
  if (!img) return null;
  try {
    const det = await faceapi
      .detectSingleFace(img.tensor, new faceapi.TinyFaceDetectorOptions({ inputSize: 640 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det) return null;
    return {
      descriptor: normalizeDescriptor(det.descriptor),
      faceCount: 1,
      score: det.detection ? det.detection.score : 0,
    };
  } catch (err) {
    state.error = `Detection failed: ${err.message}`;
    return null;
  } finally {
    dispose(img);
  }
}

async function countFaces(buffer) {
  await loadModels();
  if (!faceapi || state.backend === 'none' || !tf) return null;
  const img = await decode(buffer);
  if (!img) return null;
  try {
    const detections = await faceapi.detectAllFaces(img.tensor, new faceapi.TinyFaceDetectorOptions({ inputSize: 640 }));
    return detections.length;
  } catch (err) {
    return null;
  } finally {
    dispose(img);
  }
}

function status() {
  return {
    available: !!faceapi && state.backend !== 'none' && state.initDone,
    backend: state.backend,
    error: state.error,
    modelDir,
    threshold: config.faceMatchThreshold,
  };
}

module.exports = {
  init,
  euclideanDistance,
  descriptorIsValid,
  normalizeDescriptor,
  extractDescriptorFromBuffer,
  countFaces,
  status,
};