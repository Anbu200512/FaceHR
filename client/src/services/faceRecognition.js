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
const MODELS_URL = `${import.meta.env.BASE_URL}models`;

let faceapiPromise;
let modelsLoaded = false;
let modelError = null;
let lastDescriptor = null;
let detectionRunning = false;

const getFaceapi = () => (faceapiPromise ||= import('face-api.js'));
const getDefaultOptions = (faceapi) =>
  new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

/** Load the face-api models exactly once. Resolves true/false. */
export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (modelError) return false;
  try {
    const faceapi = await getFaceapi();
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
    const faceapi = await getFaceapi();
    const result = await faceapi
      .detectSingleFace(videoEl, getDefaultOptions(faceapi))
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
    const faceapi = await getFaceapi();
    const dets = await faceapi.detectAllFaces(videoEl, getDefaultOptions(faceapi));
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
export function guidanceFromFace(mapped, guideRect, aim, score = 0) {
  if (!mapped) return { message: 'No face detected. Position your face inside the frame.', tone: 'warn' };

  const minWidth = guideRect.width * 0.32;
  const maxWidth = guideRect.width * 0.92;
  const centerTol = guideRect.width * 0.16;
  const verticalTol = guideRect.height * 0.18;

  if (score > 0 && score < 0.55) {
    return { message: 'Face not clear. Improve lighting and face the camera.', tone: 'warn' };
  }
  if (mapped.width < minWidth) {
    return { message: 'Move closer to the camera.', tone: 'warn' };
  }
  if (mapped.width > maxWidth) {
    return { message: 'Move slightly back from the camera.', tone: 'warn' };
  }
  if (mapped.centerX < guideRect.cx - centerTol) {
    return { message: 'Move slightly right.', tone: 'warn' };
  }
  if (mapped.centerX > guideRect.cx + centerTol) {
    return { message: 'Move slightly left.', tone: 'warn' };
  }
  if (mapped.centerY < guideRect.cy - verticalTol) {
    return { message: 'Move slightly down.', tone: 'warn' };
  }
  if (mapped.centerY > guideRect.cy + verticalTol) {
    return { message: 'Move slightly up.', tone: 'warn' };
  }
  if (aim === 'register') {
    return { message: 'Face detected clearly. Hold still to capture.', tone: 'good' };
  }
  return { message: 'Face detected clearly. Hold still for verification.', tone: 'good' };
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
  const faceapi = await getFaceapi();
  const result = await faceapi
    .detectSingleFace(canvas, getDefaultOptions(faceapi))
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