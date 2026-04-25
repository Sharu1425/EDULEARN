import { useEffect, useRef, useState, useCallback } from 'react';

export interface AudioProctoringOptions {
    enabled: boolean;
    baselineVolume?: number; // The personalized "quiet" volume level of this user's room
    onViolation: (type: string, detail: string) => void;
}

export const useAudioProctoring = ({ enabled, baselineVolume, onViolation }: AudioProctoringOptions) => {
    const [isListening, setIsListening] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const reqRef = useRef<number>();

    // State Tracking
    const stateRef = useRef({
        lastProcessedTime: 0,
        noiseSpikeStartTime: null as number | null,
    });

    const THRESHOLDS = {
        PROCESS_INTERVAL_MS: 300,
        NOISE_GRACE_PERIOD_MS: 2000, // 2 seconds of sustained spike is a violation
        VOLUME_TOLERANCE: 15, // Max volume allowed above baseline (on a scale usually 0-100 or 0-255 depending on RMS scaling)
    };

    // Initialize Microphone
    useEffect(() => {
        let isMounted = true;

        const initAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioContext = new AudioContextClass();
                const analyser = audioContext.createAnalyser();
                
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.8;
                
                const microphone = audioContext.createMediaStreamSource(stream);
                microphone.connect(analyser);
                
                if (isMounted) {
                    audioContextRef.current = audioContext;
                    analyserRef.current = analyser;
                    microphoneRef.current = microphone;
                    setIsListening(true);
                }
            } catch (err) {
                console.error("Audio Proctoring Error:", err);
                if (isMounted) setAudioError("Microphone access denied or unavailable.");
            }
        };

        if (enabled && !isListening) {
            initAudio();
        }

        return () => {
            isMounted = false;
            // Cleanup handles stopping tracks if unmounting
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
            }
        };
    }, [enabled, isListening]);

    const analyzeAudio = useCallback((time: number) => {
        const state = stateRef.current;

        if (time - state.lastProcessedTime < THRESHOLDS.PROCESS_INTERVAL_MS) {
            reqRef.current = requestAnimationFrame(analyzeAudio);
            return;
        }
        state.lastProcessedTime = time;

        if (analyserRef.current && baselineVolume !== undefined) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteTimeDomainData(dataArray);

            // Calculate RMS (Root Mean Square) for volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const amplitude = (dataArray[i] - 128) / 128.0; // Normalize -1 to 1
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const currentVolume = rms * 100; // Scale 0-100ish for easier math

            const nowMs = Date.now();

            if (currentVolume > baselineVolume + THRESHOLDS.VOLUME_TOLERANCE) {
                if (!state.noiseSpikeStartTime) state.noiseSpikeStartTime = nowMs;
                if (nowMs - state.noiseSpikeStartTime > THRESHOLDS.NOISE_GRACE_PERIOD_MS) {
                    console.log(`🚨 [PROCTORING] Audio Spike Detected! (Current: ${currentVolume.toFixed(2)}, Baseline: ${baselineVolume.toFixed(2)})`);
                    onViolation("abnormal_noise", "Abnormal background noise detected");
                    state.noiseSpikeStartTime = null;
                }
            } else {
                state.noiseSpikeStartTime = null;
            }
        }

        reqRef.current = requestAnimationFrame(analyzeAudio);
    }, [baselineVolume, onViolation]);

    useEffect(() => {
        if (enabled && isListening && baselineVolume !== undefined) {
            reqRef.current = requestAnimationFrame(analyzeAudio);
        }

        return () => {
            if (reqRef.current) {
                cancelAnimationFrame(reqRef.current);
            }
        };
    }, [enabled, isListening, baselineVolume, analyzeAudio]);

    return {
        isListening,
        audioError
    };
};
