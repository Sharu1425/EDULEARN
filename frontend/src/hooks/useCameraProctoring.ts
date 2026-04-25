import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import Webcam from 'react-webcam';
import type { CalibrationData } from '../components/ui/ProctoringCalibration';

// --- Geometric Utilities ---

const distance = (p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }) =>
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow((p1.z || 0) - (p2.z || 0), 2));

// Calculate Mouth Aspect Ratio (MAR)
const calculateMAR = (keypoints: faceLandmarksDetection.Keypoint[]) => {
    const topOuter = keypoints[13];
    const bottomOuter = keypoints[14];
    const leftCorner = keypoints[78];
    const rightCorner = keypoints[308];
    if (!topOuter || !bottomOuter || !leftCorner || !rightCorner) return 0;
    const hDist = distance(leftCorner, rightCorner);
    return hDist === 0 ? 0 : distance(topOuter, bottomOuter) / hDist;
};

// Calculate head ratio (nose to ear distances)
const calculateHeadRatio = (keypoints: faceLandmarksDetection.Keypoint[]) => {
    const noseTip = keypoints[1];
    const leftEar = keypoints[234];
    const rightEar = keypoints[454];
    if (!noseTip || !leftEar || !rightEar) return null;
    const dLeft = distance(noseTip, leftEar);
    const dRight = distance(noseTip, rightEar);
    return dRight === 0 ? null : dLeft / dRight;
};

export interface CameraProctoringOptions {
    enabled: boolean;
    webcamRef: React.RefObject<Webcam>;
    calibration?: CalibrationData | null;
    onViolation: (type: string, detail: string) => void;
}

export const useCameraProctoring = ({ enabled, webcamRef, calibration, onViolation }: CameraProctoringOptions) => {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);
    const [warningState, setWarningState] = useState<{ type: string | null; countdown: number | null; message: string | null }>({ type: null, countdown: null, message: null });

    const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
    const requestRef = useRef<number>();
    const lastWarningRef = useRef<{ type: string | null; countdown: number | null }>({ type: null, countdown: null });
    // Keep calibration in a ref so analyzeFrame always reads latest without re-creating
    const calibrationRef = useRef<CalibrationData | null | undefined>(calibration);
    useEffect(() => { calibrationRef.current = calibration; }, [calibration]);

    // State Tracking for Continuous Behavior (Grace Periods)
    const stateRef = useRef({
        lastProcessedTime: 0,
        noFaceStartTime: null as number | null,
        multipleFaceStartTime: null as number | null,
        talkingStartTime: null as number | null,
        lookingAwayStartTime: null as number | null,
    });

    const THRESHOLDS = {
        // Fallback static threshold if no calibration available
        STATIC_TALKING_MAR: 0.18,
        // Personalized offset ABOVE the user's resting MAR
        DYNAMIC_TALKING_MAR_OFFSET: 0.10,
        // Personalized offset OUTSIDE the user's resting head ratio
        DYNAMIC_HEAD_RATIO_TOLERANCE: 0.35,
        // Static fallback for head ratio
        STATIC_HEAD_RATIO_HIGH: 1.5,
        STATIC_HEAD_RATIO_LOW: 0.65,
        // Grace periods
        GRACE_PERIOD_MS: 5000,
        MULTIPLE_FACES_GRACE_PERIOD_MS: 1000,
        PROCESS_INTERVAL_MS: 200,
    };

    // Initialize Model
    useEffect(() => {
        let isMounted = true;
        const initModel = async () => {
            if (!enabled) return;
            try {
                await tf.setBackend('webgl');
                await tf.ready();
                const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
                const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
                    runtime: 'mediapipe',
                    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
                    maxFaces: 3,
                };
                const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
                if (isMounted) {
                    detectorRef.current = detector;
                    setIsModelLoaded(true);
                }
            } catch (err) {
                console.error('Camera Proctoring Initialization Error:', err);
                if (isMounted) setModelError('Failed to initialize proctoring AI.');
            }
        };
        if (enabled && !isModelLoaded) initModel();
        return () => { isMounted = false; };
    }, [enabled, isModelLoaded]);

    // Inference Loop
    const analyzeFrame = useCallback(async (time: number) => {
        const state = stateRef.current;

        if (time - state.lastProcessedTime < THRESHOLDS.PROCESS_INTERVAL_MS) {
            requestRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }
        state.lastProcessedTime = time;

        const video = webcamRef.current?.video;
        const detector = detectorRef.current;
        const cal = calibrationRef.current;

        if (video && video.readyState >= 2 && detector) {
            try {
                const faces = await detector.estimateFaces(video, { flipHorizontal: false });
                const now = Date.now();

                // --- Rule 1: Multiple Faces — triggers after just 1s ---
                if (faces.length > 1) {
                    state.talkingStartTime = null;
                    state.lookingAwayStartTime = null;
                    state.noFaceStartTime = null;
                    if (!state.multipleFaceStartTime) state.multipleFaceStartTime = now;
                    if (now - state.multipleFaceStartTime > THRESHOLDS.MULTIPLE_FACES_GRACE_PERIOD_MS) {
                        console.log('🚨 [PROCTORING] Multiple faces detected!');
                        onViolation('multiple_faces', `Detected ${faces.length} people in camera frame`);
                        state.multipleFaceStartTime = null;
                    }
                } else {
                    state.multipleFaceStartTime = null;
                }

                // --- Rule 2: No Face ---
                if (faces.length === 0) {
                    state.talkingStartTime = null;
                    state.lookingAwayStartTime = null;
                    state.multipleFaceStartTime = null;
                    if (!state.noFaceStartTime) state.noFaceStartTime = now;
                    if (now - state.noFaceStartTime > THRESHOLDS.GRACE_PERIOD_MS) {
                        console.log('🚨 [PROCTORING] No face detected!');
                        onViolation('no_face', 'No face detected in camera frame');
                        state.noFaceStartTime = null;
                    }
                } else {
                    state.noFaceStartTime = null;
                }

                // --- Rules for Primary Face ---
                if (faces.length === 1) {
                    const keypoints = faces[0].keypoints;

                    // Personalized Talking detection
                    const mar = calculateMAR(keypoints);
                    const talkingThreshold = cal
                        ? cal.baselineMAR + THRESHOLDS.DYNAMIC_TALKING_MAR_OFFSET
                        : THRESHOLDS.STATIC_TALKING_MAR;

                    if (mar > talkingThreshold) {
                        if (!state.talkingStartTime) state.talkingStartTime = now;
                        if (now - state.talkingStartTime > THRESHOLDS.GRACE_PERIOD_MS) {
                            console.log(`🚨 [PROCTORING] Talking detected! MAR=${mar.toFixed(3)}, threshold=${talkingThreshold.toFixed(3)}`);
                            onViolation('talking', 'Continuous talking or whispering detected');
                            state.talkingStartTime = null;
                        }
                    } else {
                        state.talkingStartTime = null;
                    }

                    // Personalized Looking Away detection
                    const headRatio = calculateHeadRatio(keypoints);
                    if (headRatio !== null) {
                        let isAway: boolean;
                        if (cal) {
                            const tol = THRESHOLDS.DYNAMIC_HEAD_RATIO_TOLERANCE;
                            isAway = headRatio > cal.baselineHeadRatio + tol || headRatio < cal.baselineHeadRatio - tol;
                        } else {
                            isAway = headRatio > THRESHOLDS.STATIC_HEAD_RATIO_HIGH || headRatio < THRESHOLDS.STATIC_HEAD_RATIO_LOW;
                        }

                        if (isAway) {
                            if (!state.lookingAwayStartTime) state.lookingAwayStartTime = now;
                            if (now - state.lookingAwayStartTime > THRESHOLDS.GRACE_PERIOD_MS) {
                                console.log(`🚨 [PROCTORING] Looking away! Ratio=${headRatio.toFixed(3)}, baseline=${cal?.baselineHeadRatio?.toFixed(3) ?? 'static'}`);
                                onViolation('looking_away', 'Looking away from screen detected');
                                state.lookingAwayStartTime = null;
                            }
                        } else {
                            state.lookingAwayStartTime = null;
                        }
                    }
                }

            } catch (error) {
                console.error('Frame analysis error:', error);
            }
        }

        // Calculate visual warning overlay state
        const nowMs = Date.now();
        let oldestStartTime: number | null = null;
        let activeType: string | null = null;
        let activeMessage: string | null = null;
        let activeGrace = THRESHOLDS.GRACE_PERIOD_MS;

        const pick = (t: number | null, type: string, msg: string, grace = THRESHOLDS.GRACE_PERIOD_MS) => {
            if (t && (!oldestStartTime || t < oldestStartTime)) {
                oldestStartTime = t; activeType = type; activeMessage = msg; activeGrace = grace;
            }
        };

        pick(stateRef.current.multipleFaceStartTime, 'multiple_faces', '⚠ Multiple People Detected', THRESHOLDS.MULTIPLE_FACES_GRACE_PERIOD_MS);
        pick(stateRef.current.noFaceStartTime, 'no_face', '⚠ Face Not Visible');
        pick(stateRef.current.talkingStartTime, 'talking', '⚠ Talking Detected');
        pick(stateRef.current.lookingAwayStartTime, 'looking_away', '⚠ Looking Away');

        if (oldestStartTime && activeType && activeMessage) {
            const elapsed = nowMs - oldestStartTime;
            if (elapsed > 2000) {
                const remaining = Math.max(0, Math.ceil((activeGrace - elapsed) / 1000));
                if (lastWarningRef.current.countdown !== remaining || lastWarningRef.current.type !== activeType) {
                    lastWarningRef.current = { type: activeType, countdown: remaining };
                    setWarningState({ type: activeType, countdown: remaining, message: activeMessage });
                }
            } else {
                if (lastWarningRef.current.type !== null) {
                    lastWarningRef.current = { type: null, countdown: null };
                    setWarningState({ type: null, countdown: null, message: null });
                }
            }
        } else {
            if (lastWarningRef.current.type !== null) {
                lastWarningRef.current = { type: null, countdown: null };
                setWarningState({ type: null, countdown: null, message: null });
            }
        }

        requestRef.current = requestAnimationFrame(analyzeFrame);
    }, [webcamRef, onViolation]);


    // Start/Stop Loop
    useEffect(() => {
        if (enabled && isModelLoaded) {
            requestRef.current = requestAnimationFrame(analyzeFrame);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [enabled, isModelLoaded, analyzeFrame]);

    return { isModelLoaded, modelError, warningState };
};
