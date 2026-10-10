import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanFace, CheckCircle2, ShieldCheck, XCircle, Loader2, Sparkles } from 'lucide-react';
import Button from './ui/Button';
import {
  loadFaceModels,
  faceModelsState,
  analyzeVideo,
  countFaces,
  mapToDisplay,
  guidanceFromFace,
  getLastDescriptor,
  descriptorFromCanvas,
} from '../services/faceRecognition';

const GUIDE = { cx: 0, cy: 0, width: 280, height: 350 };

const CAMERA_MESSAGES = {
  requesting: { title: 'Starting camera…', desc: 'Please allow camera access when your browser asks.', tone: 'info' },
  denied: { title: 'Camera Permission Required', desc: 'Please allow camera access from your browser settings to use face attendance.', tone: 'error' },
  unavailable: { title: 'Camera Not Available', desc: 'Please check your device camera and try again.', tone: 'error' },
  modelsError: { title: 'Face Models Failed to Load', desc: 'The face recognition models could not be downloaded. Check your connection and retry.', tone: 'error' },
};

export default function FaceCapture({ mode, onCaptured, onClose, successExtra, failureExtra }) {
  const [cameraState, setCameraState] = useState('idle'); // idle | requesting | ready | denied | unavailable
  const [modelState, setModelState] = useState('loading'); // loading | ready | error
  const [faceStatus, setFaceStatus] = useState('Searching for your face…');
  const [faceTone, setFaceTone] = useState('warn');
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [captured, setCaptured] = useState(null); // { blob, descriptor, url }
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { ok, message, data, code }
  const [capturingAuto, setCapturingAuto] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const goodFramesRef = useRef(0);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  const isRegister = mode === 'register';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startModels = useCallback(async () => {
    setModelState('loading');
    const ok = await loadFaceModels();
    if (!mounted.current) return;
    if (ok) setModelState('ready');
    else setModelState('error');
  }, []);

  useEffect(() => {
    startModels();
  }, [startModels]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState('ready');
    } catch (err) {
      if (!mounted.current) return;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') setCameraState('denied');
      else setCameraState('unavailable');
    }
  }, []);

  // The <video> element is only rendered once the camera state is 'ready', so
  // attach the already-acquired stream whenever the video mounts (including
  // re-mounts after a retake).
  const attachVideo = useCallback((video) => {
    videoRef.current = video;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    if (video.paused) video.play().catch(() => {});
  }, []);

  // auto-start once models ready
  useEffect(() => {
    if (modelState === 'ready') startCamera();
  }, [modelState, startCamera]);

  // detection loop (runs while camera ready + not captured/submitting)
  const runDetection = useCallback(() => {
    const tick = async () => {
      if (busyRef.current) return;
      const video = videoRef.current;
      if (video && video.videoWidth) {
        busyRef.current = true;
        try {
          const result = await analyzeVideo(video);
          if (!mounted.current) return;
          if (result && result.detection) {
            const mapped = mapToDisplay(result.detection, video);
            // multi-face check (throttled by busy flag)
            let faces = 1;
            if (goodFramesRef.current % 5 === 0) {
              faces = await countFaces(video);
            }
            const guide = {
              cx: video.clientWidth / 2,
              cy: video.clientHeight / 2,
              width: Math.min(video.clientWidth, 280),
              height: Math.min(video.clientHeight, 350),
            };
            const g = guidanceFromFace(mapped, guide, isRegister ? 'register' : 'attendance');
            setFaceStatus(g.message);
            setFaceTone(g.tone);
            setMultipleFaces(faces > 1);
            if (g.tone === 'good' && faces === 1) {
              goodFramesRef.current += 1;
            } else {
              goodFramesRef.current = 0;
            }
            // overlay box
            const ov = overlayRef.current;
            if (ov) {
              const ctx = ov.getContext('2d');
              ov.width = video.clientWidth;
              ov.height = video.clientHeight;
              ctx.clearRect(0, 0, ov.width, ov.height);
              ctx.strokeStyle = g.tone === 'good' ? '#34d399' : '#fbbf24';
              ctx.lineWidth = 3;
              ctx.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height);
            }
            // auto-capture for attendance mode
            if (!isRegister && !capturingAuto && g.tone === 'good' && faces === 1 && goodFramesRef.current >= 3) {
              goodFramesRef.current = 0;
              setCapturingAuto(true);
              captureNow(video);
            }
          } else {
            setFaceStatus('No face detected. Please position your face inside the frame.');
            setFaceTone('warn');
            setMultipleFaces(false);
            goodFramesRef.current = 0;
          }
        } finally {
          busyRef.current = false;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [isRegister, capturingAuto]);

  useEffect(() => {
    if (cameraState === 'ready' && modelState === 'ready') {
      rafRef.current = requestAnimationFrame(tickWrapper);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraState, modelState]);

  const tickWrapper = () => { runDetection(); };

  const captureNow = useCallback(
    (sourceVideo) => {
      const video = sourceVideo || videoRef.current;
      if (!video || !video.videoWidth) return;
      const maxW = 900;
      const scale = Math.min(1, maxW / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      canvas.toBlob(async (blob) => {
        let descriptor = getLastDescriptor();
        if (!descriptor || descriptor.length !== 128) {
          descriptor = await descriptorFromCanvas(canvas);
        }
        const url = URL.createObjectURL(blob);
        if (descriptor && descriptor.length === 128) {
          setCaptured({ blob, descriptor, url });
          setFaceStatus('Face detected. Please keep still.');
          setFaceTone('good');
          // auto-submit for attendance mode
          if (!isRegister) {
            setSubmitting(true);
            try {
              const result = await onCaptured({ blob, descriptor });
              if (mounted.current) setSubmitResult(result);
            } catch (err) {
              if (mounted.current) setSubmitResult({ ok: false, message: err?.userMessage || err?.response?.data?.message || 'Verification failed. Please try again.', code: err?.response?.data?.code });
            } finally {
              if (mounted.current) setSubmitting(false);
            }
          }
        } else {
          goodFramesRef.current = 0;
          setCapturingAuto(false);
          setFaceStatus('Could not fully analyze your face. Please try again.');
          setFaceTone('warn');
        }
      }, 'image/jpeg', 0.9);
    },
    [isRegister, onCaptured]
  );

  const retake = () => {
    if (captured?.url) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setSubmitResult(null);
    setCapturingAuto(false);
    goodFramesRef.current = 0;
  };

  const saveFace = async () => {
    if (!captured) return;
    setSubmitting(true);
    try {
      const result = await onCaptured({ blob: captured.blob, descriptor: captured.descriptor });
      setSubmitResult(result);
    } catch (err) {
      setSubmitResult({ ok: false, message: err?.userMessage || err?.response?.data?.message || 'Saving failed. Please try again.', code: err?.response?.data?.code });
    } finally {
      setSubmitting(false);
    }
  };

  const modelReady = modelState === 'ready';

  // ----- RENDER -----
  if (submitResult) {
    const ok = submitResult.ok;
    return (
      <div className="card mx-auto max-w-lg animate-slide-up">
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          {ok ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
              <XCircle className="h-9 w-9 text-rose-600 dark:text-rose-400" />
            </div>
          )}
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {ok ? (isRegister ? 'Face Registered' : 'Face Verified') : 'Face Not Recognized'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{submitResult.message}</p>
          {ok && successExtra && <div className="mt-2">{successExtra(submitResult.data)}</div>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {!ok && (
              <Button variant="secondary" onClick={retake} disabled={submitting}>
                <RefreshCcw className="h-4 w-4" /> Try Again
              </Button>
            )}
            {ok && onClose && (
              <Button onClick={onClose}>{isRegister ? 'Done' : 'Continue'}</Button>
            )}
          </div>
          {!ok && failureExtra && (
            <div className="mt-2">{failureExtra({ code: submitResult.code, retake })}</div>
          )}
        </div>
      </div>
    );
  }

  if (captured && !isRegister) {
    return (
      <div className="card mx-auto max-w-lg animate-slide-up">
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verifying face…</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Please keep still. This only takes a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (captured) {
    return (
      <div className="card mx-auto max-w-lg animate-slide-up">
        <div className="overflow-hidden">
          <img src={captured.url} alt="Captured face preview" className="mx-auto max-h-80 w-full object-contain" />
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <ScanFace className="h-5 w-5" />
            {isRegister ? 'Review the captured face photo.' : 'Captured.'}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={retake} disabled={submitting}>
              <RefreshCcw className="h-4 w-4" /> Retake
            </Button>
            <Button onClick={saveFace} loading={submitting}>
              <SaveIcon /> {isRegister ? 'Save Face' : 'Verify'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const camMsg = CAMERA_MESSAGES[cameraState] || {};
  const cameraIssue = cameraState === 'denied' || cameraState === 'unavailable';

  return (
    <div className="card mx-auto max-w-lg animate-slide-up">
      <div className="border-b px-5 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ScanFace className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {isRegister ? 'Face Registration' : 'Face Attendance'}
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isRegister
            ? 'Please look at the camera. Your face photo and biometric data are used only for attendance.'
            : 'Please look at the camera. Your face will be verified automatically.'}
        </p>
      </div>

      <div className="p-5">
        {modelState === 'error' ? (
          <ErrorPanel msg={CAMERA_MESSAGES.modelsError} onRetry={startModels} />
        ) : cameraIssue ? (
          <ErrorPanel msg={camMsg} onRetry={startCamera} />
        ) : cameraState === 'idle' || cameraState === 'requesting' ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            {cameraState === 'requesting' ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <p className="font-medium text-slate-700 dark:text-slate-200">{camMsg.title}</p>
                <p className="text-sm text-slate-400">{camMsg.desc}</p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <Camera className="h-8 w-8" />
                </div>
                <Button onClick={startCamera} disabled={modelState !== 'ready'}>
                  <Camera className="h-4 w-4" /> Start Camera
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black sm:aspect-[4/3]">
              <video
                ref={attachVideo}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
              {/* face guide */}
              <div className="face-guide">
                <div className={`oval ${faceTone === 'good' && !multipleFaces ? 'good' : ''} ${multipleFaces ? 'border-rose-400' : ''}`} />
              </div>
              {cameraState === 'requesting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2.5">
              {faceTone === 'good' && !multipleFaces ? (
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <CameraOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${faceTone === 'good' && !multipleFaces ? 'text-emerald-600 dark:text-emerald-400' : faceTone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {multipleFaces ? 'Multiple faces detected. Please make sure only one person is visible.' : faceStatus}
                </p>
                {capturingAuto && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Capturing your face…
                  </p>
                )}
              </div>
            </div>

            {isRegister && !capturingAuto && (
              <div className="mt-4">
                <Button className="w-full" onClick={() => captureNow()} disabled={faceTone !== 'good'}>
                  <Camera className="h-4 w-4" /> Capture Face
                </Button>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  {faceTone !== 'good' ? 'Face must be centered and clear to enable capture.' : 'Center your face and tap capture.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SaveIcon() {
  return <ShieldCheck className="h-4 w-4" />;
}

function ErrorPanel({ msg, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
        <XCircle className="h-8 w-8" />
      </div>
      <div>
        <p className="font-bold text-slate-900 dark:text-slate-100">{msg.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{msg.desc}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        <RefreshCcw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

// GUIDED constant kept for lint clarity
export { GUIDE };