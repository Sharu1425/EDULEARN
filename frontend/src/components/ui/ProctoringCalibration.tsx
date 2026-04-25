import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Mic, Activity, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import Button from './Button';

export interface CalibrationData {
    baselineHeadRatio: number;
    baselineMAR: number;
    baselineVolume: number;
}

interface ProctoringCalibrationProps {
    onComplete: (data: CalibrationData) => void;
}

const SCAN_DURATION_MS = 5000;

const ProctoringCalibration: React.FC<ProctoringCalibrationProps> = ({ onComplete }) => {
    const [step, setStep] = useState<'intro' | 'permission' | 'loading' | 'calibrating' | 'complete'>('intro');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const webcamRef = useRef<Webcam>(null);
    const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Accumulation buffers — stored in refs so they survive re-renders without triggering effects
    const metricsRef = useRef({ headRatios: [] as number[], mars: [] as number[], volumes: [] as number[], samples: 0 });
    // Store startTime in ref so it isn't reset across re-renders
    const startTimeRef = useRef<number | null>(null);
    // Pin onComplete in a ref so it never becomes a dependency
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    const distance = (p1: any, p2: any) =>
        Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow((p1.z || 0) - (p2.z || 0), 2));

    // ── Step 1: Request Permissions ───────────────────────────────────────
    const startPermissions = async () => {
        setStep('permission');
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            loadAI();
        } catch {
            setError('Camera or Microphone access was denied. You cannot start this assessment without both permissions.');
        }
    };

    // ── Step 2: Load AI Model ─────────────────────────────────────────────
    const loadAI = useCallback(async () => {
        setStep('loading');
        try {
            // Audio setup
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
            const audioContext = new AudioCtx();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            audioContext.createMediaStreamSource(stream).connect(analyser);
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Face Mesh setup
            await tf.setBackend('webgl');
            await tf.ready();
            const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
            const config: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
                maxFaces: 1,
            };
            detectorRef.current = await faceLandmarksDetection.createDetector(model, config);

            // Give webcam stream a moment to stabilize before scanning
            setTimeout(() => {
                metricsRef.current = { headRatios: [], mars: [], volumes: [], samples: 0 };
                startTimeRef.current = null;
                setStep('calibrating');
            }, 800);

        } catch (err) {
            console.error('AI Load Error', err);
            setError('Failed to load AI models. Please check your connection and refresh the page.');
        }
    }, []);

    // ── Step 3: Calibration Scan Loop ─────────────────────────────────────
    // Uses setInterval for deterministic progress tracking + requestAnimationFrame for face sampling
    useEffect(() => {
        if (step !== 'calibrating') return;

        // Initialize startTime only once when this effect fires
        if (!startTimeRef.current) {
            startTimeRef.current = Date.now();
        }

        let rafHandle: number;
        let stopped = false;

        // Progress ticker — runs independently and never resets startTime
        const progressInterval = setInterval(() => {
            if (!startTimeRef.current || stopped) return;
            const elapsed = Date.now() - startTimeRef.current;
            const pct = Math.min((elapsed / SCAN_DURATION_MS) * 100, 100);
            setProgress(pct);
        }, 80);

        // Face + audio sampling loop
        const sample = async () => {
            if (stopped) return;
            if (!startTimeRef.current) { rafHandle = requestAnimationFrame(sample); return; }

            const elapsed = Date.now() - startTimeRef.current;

            if (elapsed >= SCAN_DURATION_MS) {
                // Done collecting — compute averages
                stopped = true;
                clearInterval(progressInterval);
                setProgress(100);

                const m = metricsRef.current;
                if (m.samples < 3) {
                    setError('Could not collect enough data — make sure your face is clearly visible and try again.');
                    return;
                }

                const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
                const data: CalibrationData = {
                    baselineHeadRatio: m.headRatios.length > 0 ? avg(m.headRatios) : 1.0,
                    baselineMAR: m.mars.length > 0 ? avg(m.mars) : 0.08,
                    baselineVolume: m.volumes.length > 0 ? avg(m.volumes) : 0,
                };

                console.log('✅ [CALIBRATION] Baseline captured:', data);
                setStep('complete');
                setTimeout(() => onCompleteRef.current(data), 1800);
                return;
            }

            // Collect audio sample
            const analyser = analyserRef.current;
            if (analyser) {
                const buf = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) {
                    const a = (buf[i] - 128) / 128.0;
                    sum += a * a;
                }
                metricsRef.current.volumes.push(Math.sqrt(sum / buf.length) * 100);
            }

            // Collect face sample
            const video = webcamRef.current?.video;
            const detector = detectorRef.current;
            if (video && video.readyState >= 2 && detector) {
                try {
                    const faces = await detector.estimateFaces(video, { flipHorizontal: false });
                    if (faces.length === 1) {
                        const kp = faces[0].keypoints;
                        // MAR
                        if (kp[13] && kp[14] && kp[78] && kp[308]) {
                            const vd = distance(kp[13], kp[14]);
                            const hd = distance(kp[78], kp[308]);
                            if (hd > 0) metricsRef.current.mars.push(vd / hd);
                        }
                        // Head ratio
                        if (kp[1] && kp[234] && kp[454]) {
                            const dL = distance(kp[1], kp[234]);
                            const dR = distance(kp[1], kp[454]);
                            if (dR > 0) metricsRef.current.headRatios.push(dL / dR);
                        }
                        metricsRef.current.samples++;
                    }
                } catch { /* skip failed frame */ }
            }

            rafHandle = requestAnimationFrame(sample);
        };

        rafHandle = requestAnimationFrame(sample);

        return () => {
            stopped = true;
            clearInterval(progressInterval);
            cancelAnimationFrame(rafHandle);
        };
    // Only re-run when step changes — intentionally exclude onComplete (it's in a ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // ── UI ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-700">

                <div className="flex items-center justify-center gap-3 mb-6">
                    <ShieldCheck className="w-8 h-8 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Proctoring Setup</h2>
                </div>

                {error ? (
                    <div className="text-center py-10">
                        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Setup Failed</h3>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <Button onClick={() => { setError(null); setStep('intro'); }} variant="primary">Try Again</Button>
                    </div>
                ) : step === 'intro' ? (
                    <div className="text-center">
                        <div className="flex justify-center space-x-6 mb-8 text-blue-400">
                            <Camera className="w-14 h-14" />
                            <Mic className="w-14 h-14" />
                        </div>
                        <p className="text-gray-200 mb-3 text-lg font-medium">
                            This assessment uses AI-powered proctoring.
                        </p>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            A quick 5-second environment scan will capture your natural seating position and ambient noise level to set fair, personalised thresholds. No data leaves your browser.
                        </p>
                        <Button onClick={startPermissions} variant="primary" size="lg" className="w-full sm:w-auto px-10">
                            Begin Setup
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Live Camera Preview */}
                        <div className="w-full md:w-5/12 rounded-xl overflow-hidden border-2 border-gray-600 bg-black aspect-video relative flex-shrink-0">
                            {(step === 'loading' || step === 'calibrating' || step === 'complete') && (
                                <Webcam ref={webcamRef} muted={true} className="w-full h-full object-cover" />
                            )}
                            {step === 'loading' && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <Activity className="w-8 h-8 text-blue-400 animate-pulse" />
                                </div>
                            )}
                            {step === 'calibrating' && (
                                <div className="absolute bottom-2 left-2 right-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-none"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                            {step === 'complete' && (
                                <div className="absolute inset-0 bg-green-900/80 flex items-center justify-center">
                                    <CheckCircle className="w-14 h-14 text-green-300" />
                                </div>
                            )}
                        </div>

                        {/* Right Panel */}
                        <div className="flex-1 w-full">
                            {step === 'loading' && (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-2">Loading AI Models…</h3>
                                    <p className="text-gray-400">Downloading facial landmark detection to your browser. This should take just a few seconds.</p>
                                </>
                            )}
                            {step === 'calibrating' && (
                                <>
                                    <h3 className="text-xl font-bold text-blue-400 mb-3 animate-pulse">Scanning Environment</h3>
                                    <p className="text-gray-200 font-semibold text-lg mb-6 leading-snug">
                                        Look directly at your screen and remain completely quiet.
                                    </p>
                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden mb-1">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${progress}%`, transition: 'width 80ms linear' }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 font-mono">
                                        <span>Collecting baseline…</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                </>
                            )}
                            {step === 'complete' && (
                                <>
                                    <h3 className="text-xl font-bold text-green-400 mb-2">All Set!</h3>
                                    <p className="text-gray-400">Your environment has been calibrated. Your personalised proctoring thresholds are ready. The assessment will begin momentarily.</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProctoringCalibration;
