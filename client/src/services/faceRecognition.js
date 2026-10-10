/**
 * Browser face recognition built on face-api.js (classic ResNet-50 recognition
 * model + Tiny Face Detector + 68-point landmarks).
 *
 * - Real camera access via navigator.mediaDevices.getUserMedia
 * - Real face detection, landmarks and 128-dim descriptor generation
 * - Real Euclidean-distance matching happens on the backend
 *
 * Model weights are served from ./public/models (also mirrored on the server
 * for optional server-side verification).
 */
import * as faceapi from 'face-api.js';

const MODELS_URL = `${import.meta.env.BASE_URL}models`;

let modelsLoaded = false;
let modelError = null;
let lastDescriptor = null;
let detectionRunning = false;

const DEFAULT_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 });

/** Load the face-api models exactly once. Resolves true/false. */
export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (modelError) return false;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    ]);
    modelsLoaded = true;
    return true;
  } catch (err) {
    modelError = err;
    console.error('[FaceHR] Failed to load face models:', err);
    return false;
  }
}

export function faceModelsState() {
  return { loaded: modelsLoaded, error: modelError };
}

/**
 * Runs detection + landmarks + descriptor on a video element.
 * Returns { detection, landmarks, descriptor, score } or null.
 * `descriptor` is a Float32Array (128 dims).
 */
export async function analyzeVideo(videoEl) {
  if (!videoEl || !videoEl.videoWidth) return null;
  try {
    const result = await faceapi
      .detectSingleFace(videoEl, DEFAULT_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!result) return null;
    lastDescriptor = result.descriptor;
    return {
      detection: result.detection,
      landmarks: result.landmarks,
      descriptor: result.descriptor,
      score: result.detection ? result.detection.score : 0,
    };
  } catch (err) {
    console.error('[FaceHR] face analysis error:', err);
    return null;
  }
}

/** Multi-face count on the current video frame. */
export async function countFaces(videoEl) {
  if (!videoEl || !videoEl.videoWidth) return 0;
  try {
    const dets = await faceapi.detectAllFaces(videoEl, DEFAULT_OPTIONS);
    return dets.length;
  } catch (err) {
    return 0;
  }
}

/**
 * Maps a detection box (intrinsic video coordinates) into the coordinates of
 * the displayed element, accounting for `object-fit: cover` cropping.
 */
export function mapToDisplay(detection, videoEl) {
  const iw = videoEl.videoWidth;
  const ih = videoEl.videoHeight;
  const cw = videoEl.clientWidth;
  const ch = videoEl.clientHeight;
  if (!iw || !ih || !cw || !ch) return null;

  const scale = Math.max(cw / iw, ch / ih);
  const offsetX = (cw - iw * scale) / 2;
  const offsetY = (ch - ih * scale) / 2;
  const box = detection.box;

  return {
    x: box.x * scale + offsetX,
    y: box.y * scale + offsetY,
    width: box.width * scale,
    height: box.height * scale,
    centerX: box.x * scale + offsetX + (box.width * scale) / 2,
    centerY: box.y * scale + offsetY + (box.height * scale) / 2,
  };
}

/**
 * Produces a face guidance message based on where the mapped face sits inside
 * the face guide oval on screen. `guideRect` should be the CSS rect of the
 * guide oval area (center + size).
 */
export function guidanceFromFace(mapped, guideRect, aim) {
  if (!mapped) return { message: 'No face detected', tone: 'warn' };

  const minWidth = guideRect.width * 0.38;
  const centerTol = guideRect.width * 0.18;

  if (mapped.width < minWidth) {
    return { message: 'Move closer', tone: 'warn' };
  }
  if (mapped.centerX < guideRect.cx - centerTol) {
    return { message: 'Move slightly right', tone: 'warn' };
  }
  if (mapped.centerX > guideRect.cx + centerTol) {
    return { message: 'Move slightly left', tone: 'warn' };
  }
  if (Math.abs(mapped.centerY - guideRect.cy) > centerTol * 1.6) {
    return { message: 'Keep your face in the frame', tone: 'warn' };
  }
  if (aim === 'register') {
    return { message: 'Face ready to capture', tone: 'good' };
  }
  return { message: 'Keeping your face straight', tone: 'good' };
}

/** Draw the detection box onto a canvas for a live overlay (cover-crop aware). */
export function drawOverlay(canvas, videoEl, result) {
  if (!result) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const mapped = mapToDisplay(result.detection, videoEl);
  if (!mapped) return;
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  ctx.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height);
  ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
  ctx.fillRect(mapped.x, mapped.y, mapped.width, mapped.height);
}

export function getLastDescriptor() {
  return lastDescriptor;
}

/** Refresh descriptor derived from a captured canvas image (for re-verification). */
export async function descriptorFromCanvas(canvas) {
  const result = await faceapi
    .detectSingleFace(canvas, DEFAULT_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? result.descriptor : null;
}

/** Start/stop internal detection flag helper for components that throttle frames. */
export function startDetectionLoop() {
  detectionRunning = true;
}
export function stopDetectionLoop() {
  detectionRunning = false;
}
export function isDetectionRunning() {
  return detectionRunning;
}

export default {
  loadFaceModels,
  analyzeVideo,
  countFaces,
  mapToDisplay,
  guidanceFromFace,
  drawOverlay,
  getLastDescriptor,
  descriptorFromCanvas,
};