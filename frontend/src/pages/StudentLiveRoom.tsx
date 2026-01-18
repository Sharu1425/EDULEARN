"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { JaaSMeeting } from '@jitsi/react-sdk';
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import api from '../utils/api'
import AnimatedBackground from '../components/AnimatedBackground'

const StudentLiveRoom: React.FC = () => {
    const { batchId } = useParams<{ batchId: string }>()
    const { user } = useAuth()
    const { success } = useToast()

    const [ws, setWs] = useState<WebSocket | null>(null)
    const [status, setStatus] = useState<'CONNECTING' | 'WAITING' | 'QUIZ' | 'POLL' | 'MATERIAL'>('CONNECTING')
    const [payload, setPayload] = useState<any>(null)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [answerSubmitted, setAnswerSubmitted] = useState(false)

    // Phase 4 State
    const [sessionContent, setSessionContent] = useState<any>(null)
    const [timeLeft, setTimeLeft] = useState(30)

    // Timer Logic
    useEffect(() => {
        if (status === 'QUIZ') {
            setTimeLeft(30)
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [status, payload])

    // Fetch Content Logic
    useEffect(() => {
        if (batchId) {
            api.get(`/api/sessions/content/${batchId}`)
                .then(res => setSessionContent(res.data))
                .catch(err => console.error("Failed to fetch session content", err))
        }
    }, [batchId])

    useEffect(() => {
        if (!user || !batchId) return

        let socket: WebSocket | null = null;
        let retryCount = 0;
        const MAX_RETRIES = 3;

        const connect = () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.error("No access token found");
                return;
            }

            // Close existing socket if any
            if (socket) {
                socket.close();
            }

            const wsUrl = `ws://localhost:5001/ws/live/${batchId}/${user.id}?token=${token}`;
            console.log(`Connecting to WebSocket: ${wsUrl}`);
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("Connected to Live Class");
                setStatus('WAITING');
                retryCount = 0;
            };

            socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log("Received WS message:", msg);
                    handleMessage(msg);
                } catch (e) {
                    console.error("Error parsing WS message:", e);
                }
            };

            socket.onerror = (e) => {
                console.error("WS Error:", e);
            };

            socket.onclose = (e) => {
                console.log("WS Closed:", e.code, e.reason);
                if (!e.wasClean && retryCount < MAX_RETRIES) {
                    retryCount++;
                    console.log(`Reconnecting attempt ${retryCount}...`);
                    setTimeout(connect, 2000);
                }
            };

            setWs(socket);
        };

        connect();

        return () => {
            console.log("Cleaning up WebSocket connection");
            if (socket) {
                // Remove listeners to prevent logic from running during close
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;
                socket.close();
            }
        };
    }, [user, batchId]);

    // Focus Tracking
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!ws) return
            const isFocused = !document.hidden
            ws.send(JSON.stringify({
                type: 'FOCUS_CHANGE',
                payload: { isFocused }
            }))
        }

        const handleBlur = () => {
            if (!ws) return
            ws.send(JSON.stringify({
                type: 'FOCUS_CHANGE',
                payload: { isFocused: false }
            }))
        }

        const handleFocus = () => {
            if (!ws) return
            ws.send(JSON.stringify({
                type: 'FOCUS_CHANGE',
                payload: { isFocused: true }
            }))
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("blur", handleBlur)
        window.addEventListener("focus", handleFocus)

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("blur", handleBlur)
            window.removeEventListener("focus", handleFocus)
        }
    }, [ws])

    const handleMessage = (msg: any) => {
        switch (msg.type) {
            case 'PUSH_QUIZ':
                setStatus('QUIZ')
                setPayload(msg.payload)
                setAnswerSubmitted(false)
                setSelectedOption(null)
                success("Quiz Started!", "Teacher has started a quiz")
                break
            case 'PUSH_POLL':
                setStatus('POLL')
                setPayload(msg.payload)
                setAnswerSubmitted(false)
                setSelectedOption(null)
                break
            case 'PUSH_MATERIAL':
                setStatus('MATERIAL')
                setPayload(msg.payload)
                break
            case 'STATE_RESTORE':
                console.log("🔄 Restoring Session State:", msg.payload)
                const { current_state, active_content } = msg.payload

                if (current_state) {
                    setStatus(current_state)
                }

                if (active_content) {
                    setPayload(active_content)
                }

                if (current_state === 'QUIZ' || current_state === 'POLL') {
                    setAnswerSubmitted(false) // Reset simple state, ideally backend sends this too
                }
                break
            default:
                break
        }
    }

    const submitAnswer = (optionIndex: number, optionLabel: string) => {
        if (!ws || answerSubmitted) return

        ws.send(JSON.stringify({
            type: status === 'QUIZ' ? 'SUBMIT_ANSWER' : 'SUBMIT_POLL',
            payload: {
                questionId: 'current', // In real app, payload would have ID
                answer: optionLabel
            }
        }))

        setSelectedOption(optionIndex)
        setAnswerSubmitted(true)
        success("Submitted", "Your answer has been recorded")
    }

    if (!user) return <div className="p-8 text-white">Loading...</div>

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-30">
                <AnimatedBackground />
            </div>

            {/* Teacher Video Feed (Floating) */}
            <div className="absolute top-4 right-4 w-72 h-48 bg-black rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-700/50 backdrop-blur-sm">
                <JaaSMeeting
                    appId="vpaas-magic-cookie-c8a22146480e4905b6b6eac514a04cdc"
                    roomName={`edulearn-live-${batchId}`}
                    configOverwrite={{
                        startWithAudioMuted: true,
                        startWithVideoMuted: true,
                        disableDeepLinking: true,
                        prejoinPageEnabled: false,
                        toolbarButtons: ['raisehand', 'chat', 'tileview', 'fullscreen']
                    }}
                    interfaceConfigOverwrite={{
                        TOOLBAR_BUTTONS: ['raisehand', 'chat', 'tileview', 'fullscreen', 'hangup'],
                        fileRecordingsEnabled: false,
                        videoQualityLabelDisabled: true,
                        MOBILE_APP_PROMO: false
                    }}
                    userInfo={{
                        displayName: user.username || 'Student',
                        email: user.email
                    }}
                    getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; }}
                />
            </div>

            <div className="z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <span className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold tracking-widest border border-red-500/30 animate-pulse">
                        🔴 LIVE
                    </span>
                    <h1 className="text-2xl font-bold mt-2">{status === 'WAITING' ? "Waiting for Teacher..." : "Live Session"}</h1>
                </div>

                <AnimatePresence mode="wait">
                    {status === 'WAITING' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full"
                        >
                            {sessionContent?.summary || sessionContent?.flashcards?.length > 0 ? (
                                <div className="space-y-6">
                                    {sessionContent?.summary && (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Today's Topic</h3>
                                            <p className="text-lg text-blue-100 leading-relaxed font-light">
                                                {sessionContent.summary}
                                            </p>
                                        </div>
                                    )}

                                    {sessionContent?.flashcards?.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-bold text-center mb-4">Quick Revision</h3>
                                            <div className="flex overflow-x-auto gap-4 py-4 px-2 snap-x hide-scrollbar">
                                                {sessionContent.flashcards.map((fc: string, i: number) => (
                                                    <div key={i} className="min-w-[250px] bg-gray-800/80 backdrop-blur border border-white/10 p-6 rounded-2xl snap-center flex flex-col justify-center text-center shadow-xl">
                                                        <p className="text-lg font-medium text-blue-200">{fc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-center text-xs text-gray-500 animate-pulse">Waiting for teacher...</p>
                                </div>
                            ) : (
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/10">
                                    <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-10 h-10 text-blue-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">You're In!</h3>
                                    <p className="text-gray-400">Sit tight. The class activity will appear here automatically.</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {(status === 'QUIZ' || status === 'POLL') && payload && (
                        <motion.div
                            key="interaction"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                            style={{ position: 'relative', zIndex: 10 }} // Ensure visibility
                        >
                            {status === 'QUIZ' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-gray-700">
                                    <motion.div
                                        className="h-full bg-blue-500"
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: 30, ease: "linear" }}
                                    />
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-6">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{status}</span>
                                {status === 'QUIZ' && (
                                    <span className={`text-sm font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                                        00:{timeLeft.toString().padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-white mb-6 leading-relaxed">{payload.text || payload.question}</h2>

                            <div className="space-y-3">
                                {payload.options && payload.options.map((opt: string, idx: number) => (
                                    <button
                                        key={idx}
                                        disabled={answerSubmitted || (status === 'QUIZ' && timeLeft === 0)}
                                        onClick={() => submitAnswer(idx, opt)}
                                        className={`w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center justify-between border-2
                                                ${selectedOption === idx
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                                                : 'bg-gray-800 border-transparent text-gray-300 hover:bg-gray-700'
                                            }
                                                ${(answerSubmitted || (status === 'QUIZ' && timeLeft === 0)) && selectedOption !== idx ? 'opacity-50' : ''}
                                            `}
                                    >
                                        <span className="font-medium text-lg">{opt}</span>
                                        {selectedOption === idx && (
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {answerSubmitted && (
                                <div className="mt-6 text-center text-green-400 text-sm font-medium animate-pulse">
                                    Answer Submitted! Waiting for results...
                                </div>
                            )}

                            {status === 'QUIZ' && timeLeft === 0 && !answerSubmitted && (
                                <div className="mt-6 text-center text-red-400 text-sm font-medium">
                                    Time's Up!
                                </div>
                            )}
                        </motion.div>
                    )}

                    {status === 'MATERIAL' && payload && (
                        <motion.div
                            key="material"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl text-center"
                            style={{ position: 'relative', zIndex: 10 }} // Ensure visibility
                        >
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">New Material Shared</h2>
                            <p className="text-gray-400 mb-6">{payload.name || "Teacher shared a file"}</p>

                            <a
                                href={payload.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/20 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Open / Save
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => ws?.send(JSON.stringify({ type: 'RAISE_HAND' }))}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                    >
                        <span>✋</span> Raise Hand
                    </button>
                </div>
            </div>
        </div>
    )
}

export default StudentLiveRoom
