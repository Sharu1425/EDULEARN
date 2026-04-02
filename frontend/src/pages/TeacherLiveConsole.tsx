"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { JitsiMeeting } from '@jitsi/react-sdk';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import api from '../utils/api'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

// Types
interface Student {
    id: string
    name: string
    avatar?: string
    isFocused?: boolean
}

interface AnalyticsData {
    questionId: string
    options: { label: string; count: number }[]
}

const TeacherLiveConsole: React.FC = () => {
    const { batchId } = useParams<{ batchId: string }>()
    const { user } = useAuth()
    const { success, error: showError } = useToast()
    const navigate = useNavigate()

    // State
    const [sessionCode, setSessionCode] = useState<string>("")
    const [activeStudents, setActiveStudents] = useState<Student[]>([])
    const [showQR, setShowQR] = useState(false)
    const [socket, setSocket] = useState<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isPublished, setIsPublished] = useState(false)

    // Content State
    const [activeAction, setActiveAction] = useState<'QUIZ' | 'POLL' | 'MATERIAL' | null>(null)
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // LiveSession State
    const [lsRawContent, setLsRawContent] = useState<string | null>(null)
    const [lsSummary, setLsSummary] = useState<any>(null)
    const [lsGeneratedQuestions, setLsGeneratedQuestions] = useState<{[level: number]: any[]}>({})
    const [lsIsGenerating, setLsIsGenerating] = useState(false)
    const [lsSubjectArea, setLsSubjectArea] = useState("General Education")
    const [lsMcqCount, setLsMcqCount] = useState(2)
    const [lsShortCount, setLsShortCount] = useState(1)
    const [lsCodingCount, setLsCodingCount] = useState(0)
    const [lsLevels, setLsLevels] = useState<number[]>([0, 1, 2, 3])

    useEffect(() => {
        // Initialize Session
        if (batchId && user) {
            startSession()
            connectWebSocket()
            fetchSessionDetails()
        }
        return () => {
            if (socket) socket.close()
        }
    }, [batchId, user])

    const startSession = async () => {
        try {
            await api.post('/api/sessions/start', { batch_id: batchId })
            console.log("✅ [SESSION] Started")
        } catch (e) {
            console.error("Failed to start session", e)
        }
    }

    const connectWebSocket = () => {
        // In real app, get token from auth context or storage
        const token = localStorage.getItem('access_token')
        if (!token) {
            showError("Auth Error", "No token found")
            return
        }

        const wsUrl = `ws://localhost:5001/ws/live/${batchId}/${user?.id}?token=${token}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
            console.log("✅ [WS] Connected")
            setIsConnected(true)
        }

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data)
                handleWebSocketMessage(message)
            } catch (e) {
                console.error("❌ [WS] Parse error", e)
            }
        }

        ws.onclose = () => {
            console.log("⚠️ [WS] Disconnected")
            setIsConnected(false)
            // Reconnect logic would go here
        }

        setSocket(ws)
    }

    const handleWebSocketMessage = (message: any) => {
        switch (message.type) {
            case 'USER_JOIN':
                setActiveStudents(prev => {
                    if (prev.find(s => s.id === message.user_id)) return prev;
                    return [...prev, { id: message.user_id, name: message.name || 'Student', isFocused: true }]
                })
                success("Student Joined", `${message.name || 'A student'} has joined.`)
                break
            case 'FOCUS_CHANGE':
                setActiveStudents(prev => prev.map(s =>
                    s.id === message.user_id ? { ...s, isFocused: message.isFocused } : s
                ))
                break
            case 'USER_LEFT':
                // Optional: don't remove immediately to show "was here" or gray out
                // setActiveStudents(prev => prev.filter(s => s.id !== message.user_id))
                break
            case 'RESPONSE_RECEIVED':
                // Update analytics chart
                updateAnalytics(message.payload)
                break
            case 'RAISE_HAND':
                success("✋ Doubt Raised", `Student ${message.user_id} raised a hand!`)
                break
            default:
                break
        }
    }

    const updateAnalytics = (payload: any) => {
        if (!analytics) return

        const newOptions = analytics.options.map(opt => {
            if (opt.label === payload.answer) {
                return { ...opt, count: opt.count + 1 }
            }
            return opt
        })

        setAnalytics({ ...analytics, options: newOptions })
    }

    const fetchSessionDetails = async () => {
        // Fetch session code etc.
        setSessionCode(Math.random().toString(36).substring(2, 8).toUpperCase())
    }


    const pushContent = (type: 'QUIZ' | 'POLL' | 'MATERIAL', content: any) => {
        if (!socket) return

        socket.send(JSON.stringify({
            type: `PUSH_${type}`,
            payload: content
        }))

        setActiveAction(type)
        success("Content Pushed", `Students can now see the ${type.toLowerCase()}.`)

        // Reset analytics for new question
        if (type === 'QUIZ' || type === 'POLL') {
            setAnalytics({
                questionId: 'current',
                options: content.options?.map((opt: string) => ({ label: opt, count: 0 })) || []
            })
        }
    }

    const endClass = async () => {
        if (confirm("End live session? This will mark attendance.")) {
            try {
                await api.post('/api/sessions/end', { batch_id: batchId })
                success("Class Ended", "Attendance has been saved.")
                navigate('/teacher-dashboard')
            } catch (e) {
                showError("Error", "Failed to end session properly")
            }
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const formData = new FormData()
        formData.append("file", file)
        formData.append("subject_area", lsSubjectArea)

        setIsUploading(true)
        setLsSummary(null)
        setLsRawContent(null)
        setLsGeneratedQuestions({})

        try {
            const res = await api.post(`/api/livesession/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            if (res.data.error) {
                showError("Upload Warning", res.data.message || "Not enough content")
                return
            }

            setLsRawContent(res.data.raw_content)
            setLsSummary(res.data.summary)
            success("Content Analyzed", `Topic: ${res.data.summary?.detected_topic || 'Detected'}. Ready to generate questions!`)
        } catch (e) {
            showError("Upload Failed", "Could not process file.")
            console.error(e)
        } finally {
            setIsUploading(false)
        }
    }

    const handleGenerateLevelQuestions = async () => {
        if (!lsRawContent) return
        setLsIsGenerating(true)
        setLsGeneratedQuestions({})
        try {
            const results: {[level: number]: any[]} = {}
            // Generate for all selected levels in parallel
            await Promise.all(
                lsLevels.map(async (lvl) => {
                    try {
                        const res = await api.post('/api/livesession/generate', {
                            content: lsRawContent,
                            level: lvl,
                            subject_area: lsSubjectArea,
                            topic: lsSummary?.detected_topic || 'General',
                            mcq_count: lsMcqCount,
                            short_count: lsShortCount,
                            coding_count: lsCodingCount
                        })
                        results[lvl] = res.data.questions || []
                    } catch (e) {
                        console.error(`Failed to generate for level ${lvl}`, e)
                        results[lvl] = []
                    }
                })
            )
            setLsGeneratedQuestions(results)
            success("Generated!", "Level-differentiated questions ready to broadcast.")
        } catch (e) {
            showError("Error", "Failed to generate questions")
            console.error(e)
        } finally {
            setLsIsGenerating(false)
        }
    }

    const broadcastLevelQuestions = (questionIndex: number) => {
        if (!socket) return
        const levelMap: {[key: string]: any} = {}
        Object.entries(lsGeneratedQuestions).forEach(([lvl, questions]) => {
            if (questions && questions[questionIndex]) {
                levelMap[lvl] = questions[questionIndex]
            }
        })
        socket.send(JSON.stringify({
            type: 'PUSH_LEVEL_QUESTIONS',
            payload: levelMap
        }))
        setActiveAction('QUIZ')
        success("Question Broadcast!", "Each student received their level-calibrated question.")
    }

    const handlePublish = async () => {
        if (confirm("Publish this session? Students will be able to join now.")) {
            try {
                await api.post(`/api/sessions/publish/${batchId}`)
                setIsPublished(true)
                success("Session Published", "Students can now join the session.")
            } catch (e) {
                showError("Error", "Failed to publish session")
            }
        }
    }

    if (!user) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans overflow-hidden flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Live Class <span className="text-gray-500 text-sm font-normal">| {batchId}</span>
                    </h1>
                    <div className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono text-blue-300 flex items-center gap-2">
                        <span>CODE: {sessionCode}</span>
                        <button onClick={() => setShowQR(!showQR)} className="hover:text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6v4h6v-4zm-6 0H2v4h6v-4zm18-7h-2M12 2v2m-6 0H4M2 2h2m-2 4h2M2 8v2m4-2v2m6-6h2m-2 4h2m4-6h2m-2 2h2m-2 0h-2m-4 2h2m-2 2h2m-2 2h2m-2 2h2" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        {isConnected ? 'LIVE' : 'OFFLINE'}
                    </div>
                    {!isPublished ? (
                        <Button variant="primary" className="bg-green-600 hover:bg-green-700 border-green-600 animate-pulse" size="sm" onClick={handlePublish}>
                            Publish Class
                        </Button>
                    ) : (
                        <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30 flex items-center font-bold">
                            PUBLISHED
                        </div>
                    )}
                    <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" size="sm" onClick={endClass}>End Class</Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* LEFT: Jitsi Video (30%) */}
                <div className="w-[30%] bg-black border-r border-gray-800 relative flex flex-col">
                    <JitsiMeeting
                        domain="meet.jit.si"
                        roomName={`edulearn-live-${batchId}`}
                        configOverwrite={{
                            startWithAudioMuted: true,
                            disableModeratorIndicator: true,
                            startScreenSharing: false,
                            enableEmailInStats: false,
                            prejoinPageEnabled: false
                        }}
                        interfaceConfigOverwrite={{
                            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                            TOOLBAR_BUTTONS: [
                                'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                                'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
                                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                                'security'
                            ]
                        }}
                        userInfo={{
                            displayName: user.username || 'Teacher',
                            email: user.email
                        }}
                        getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; }}
                    />
                </div>

                {/* RIGHT: Control Deck (70%) */}
                <div className="w-[70%] flex flex-col overflow-hidden">
                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Attendance */}
                        <aside className="w-56 border-r border-gray-800 bg-gray-900/95 flex flex-col shrink-0">
                            <div className="p-4 border-b border-gray-800">
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Attendance</h2>
                                <p className="text-2xl font-bold text-white mt-1">{activeStudents.length} <span className="text-sm text-gray-500 font-normal">Present</span></p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {activeStudents.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold relative">
                                            {s.name.charAt(0)}
                                            {s.isFocused === false && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-gray-900 rounded-full" title="Student Away"></span>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-300 truncate">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </aside>

                        {/* Center: Actions */}
                        <section className="flex-1 overflow-y-auto p-6 relative">
                            {/* QR Overlay */}
                            <AnimatePresence>
                                {showQR && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                                        onClick={() => setShowQR(false)}
                                    >
                                        <div className="bg-white p-6 rounded-2xl shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                                            <h3 className="text-black text-lg font-bold mb-4">Join Session</h3>
                                            <QRCodeSVG value={`edulearn://join/${sessionCode}`} size={256} />
                                            <p className="text-gray-500 mt-4 text-sm font-mono tracking-widest text-3xl font-bold">{sessionCode}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="max-w-3xl mx-auto space-y-6">

                                {/* === Phase 1: Upload === */}
                                <Card className="p-1 border-dashed border-2 border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 transition-colors group relative overflow-hidden">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        onChange={handleFileUpload}
                                        accept=".pdf,.ppt,.pptx,.txt"
                                        disabled={isUploading}
                                    />
                                    <div className="p-8 text-center relative z-10">
                                        {isUploading ? (
                                            <div className="flex flex-col items-center animate-pulse">
                                                <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4"></div>
                                                <h3 className="text-xl font-bold text-blue-400">Analyzing Content...</h3>
                                                <p className="text-gray-400">Gemini AI is summarizing and extracting key concepts</p>
                                            </div>
                                        ) : lsSummary ? (
                                            <div className="text-left space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-bold text-green-400">✅ Content Analyzed</h3>
                                                    <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">{lsSummary?.estimated_difficulty}</span>
                                                </div>
                                                <p className="text-sm text-blue-300 font-bold">📚 Topic: {lsSummary?.detected_topic}</p>
                                                <p className="text-sm text-gray-300">{lsSummary?.summary_for_teacher}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {lsSummary?.key_concepts?.map((c: string, i: number) => (
                                                        <span key={i} className="px-2 py-1 bg-blue-900/40 text-blue-300 text-xs rounded-full border border-blue-500/30">{c}</span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">Click to upload a different file</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all text-gray-400">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">Step 1 — Drop Course Material</h3>
                                                <p className="text-gray-400">Upload PDF or PPTX to generate level-differentiated questions</p>
                                            </>
                                        )}
                                    </div>
                                </Card>

                                {/* === Phase 2: Configure & Generate === */}
                                {lsRawContent && (
                                    <Card className="p-6 bg-gray-800/60 border-gray-700 space-y-5">
                                        <h3 className="text-base font-bold text-white">Step 2 — Configure & Generate</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Subject Area</label>
                                                <input
                                                    value={lsSubjectArea}
                                                    onChange={(e) => setLsSubjectArea(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                                    placeholder="e.g. Computer Science"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">MCQs per level</label>
                                                <input type="number" min={0} max={5} value={lsMcqCount} onChange={(e) => setLsMcqCount(+e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Short Answers per level</label>
                                                <input type="number" min={0} max={3} value={lsShortCount} onChange={(e) => setLsShortCount(+e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Coding Qs per level</label>
                                                <input type="number" min={0} max={2} value={lsCodingCount} onChange={(e) => setLsCodingCount(+e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-2">Generate for Levels (toggle)</label>
                                            <div className="flex flex-wrap gap-2">
                                                {[0,1,2,3,4,5].map(lvl => (
                                                    <button
                                                        key={lvl}
                                                        onClick={() => setLsLevels(prev => prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl])}
                                                        className={`px-3 py-1 rounded-full text-sm font-bold border transition-all ${lsLevels.includes(lvl) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                                                    >
                                                        L{lvl}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            variant="primary"
                                            onClick={handleGenerateLevelQuestions}
                                            disabled={lsIsGenerating || lsLevels.length === 0}
                                            className="w-full bg-purple-600 hover:bg-purple-700"
                                        >
                                            {lsIsGenerating ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    Generating for {lsLevels.length} levels...
                                                </span>
                                            ) : '⚡ Generate Level Questions'}
                                        </Button>
                                    </Card>
                                )}

                                {/* === Phase 3: Question Broadcast === */}
                                {Object.keys(lsGeneratedQuestions).length > 0 && (() => {
                                    const firstLevelQuestions = lsGeneratedQuestions[lsLevels[0]] || []
                                    return (
                                        <Card className="p-6 bg-gray-800/60 border-gray-700 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-base font-bold text-white">Step 3 — Broadcast Questions</h3>
                                                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">{firstLevelQuestions.length} questions ready</span>
                                            </div>
                                            <p className="text-sm text-gray-400">Each student receives their level-calibrated variant. Click a question to broadcast it to the whole class at once.</p>
                                            <div className="space-y-3">
                                                {firstLevelQuestions.map((q: any, i: number) => (
                                                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-900/60 rounded-xl border border-gray-700 hover:border-purple-500/40 transition-all">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${q.type === 'mcq' ? 'bg-blue-800 text-blue-300' : q.type === 'short_ans' ? 'bg-green-800 text-green-300' : 'bg-orange-800 text-orange-300'}`}>{q.type}</span>
                                                        </div>
                                                        <p className="flex-1 text-sm text-gray-200 truncate">{q.question}</p>
                                                        <Button
                                                            size="sm"
                                                            className="shrink-0 text-xs bg-purple-700 hover:bg-purple-600 border-none"
                                                            onClick={() => broadcastLevelQuestions(i)}
                                                        >
                                                            Push
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )
                                })()}

                                {/* Pulse Check */}
                                <Card className="p-6 bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-500/30 hover:border-purple-500/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Pulse Check</h3>
                                    <p className="text-sm text-gray-400 mb-4">Ask a quick "Yes/No" or "Understanding" status.</p>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1" onClick={() => pushContent('POLL', { text: "Are you following along?", options: ["Yes", "No", "Somewhat"] })}>
                                            Understanding?
                                        </Button>
                                    </div>
                                </Card>

                            </div>
                        </section>

                        {/* Right: Analytics */}
                        <aside className="w-80 border-l border-gray-800 bg-gray-900/95 p-6 flex flex-col shrink-0">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Live Analytics</h2>

                            {activeAction ? (
                                <div className="flex-1">
                                    <h3 className="font-medium text-white mb-4">
                                        {activeAction === 'QUIZ' ? "Current Question" : "Active Poll"}
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics?.options || [{ label: 'A', count: 0 }, { label: 'B', count: 0 }, { label: 'C', count: 0 }, { label: 'D', count: 0 }]}>
                                                <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                                                <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                                                    itemStyle={{ color: '#F3F4F6' }}
                                                />
                                                <Bar dataKey="count" fill="#60A5FA" radius={[4, 4, 0, 0]}>
                                                    {
                                                        (analytics?.options || []).map((_entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#60A5FA', '#34D399', '#FBBF24', '#F87171'][index % 4]} />
                                                        ))
                                                    }
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-6 text-center">
                                        <p className="text-3xl font-bold">{(analytics?.options || []).reduce((acc, curr) => acc + curr.count, 0) || 0}</p>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest">Responses</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                                    <p>No active question.<br />Push content to see live stats.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default TeacherLiveConsole

