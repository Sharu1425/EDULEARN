"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { JaaSMeeting } from '@jitsi/react-sdk';
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

    // Content State
    const [pendingContent, setPendingContent] = useState<any>(null) // Loaded from AI
    const [activeAction, setActiveAction] = useState<'QUIZ' | 'POLL' | 'MATERIAL' | null>(null)
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

    // Mock Data for Phase 3 scaffolding (since AI endpoint exists but we need to fetch)
    const [loadingContent, setLoadingContent] = useState(false)

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

    const handleGenerateAIContent = async () => {
        setLoadingContent(true)
        try {
            const response = await api.post(`/api/sessions/content/${batchId}/generate`)
            const content = response.data

            if (content.quizzes.length === 0 && content.polls.length === 0) {
                showError("Info", "AI generated empty content. Please try again.")
                setPendingContent(null)
            } else {
                setPendingContent(content)
                success("Loaded", "AI Content generated successfully!")
            }
        } catch (e) {
            showError("Error", "Failed to generate content")
            console.error(e)
        } finally {
            setLoadingContent(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await api.post(`/api/sessions/upload/${batchId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            // Push Immediately
            pushContent('MATERIAL', {
                url: response.data.url,
                type: response.data.type,
                name: response.data.name
            })

        } catch (e) {
            showError("Upload Error", "Failed to upload material")
        }
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
                    <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" size="sm" onClick={endClass}>End Class</Button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* LEFT: Jitsi Video (30%) */}
                <div className="w-[30%] bg-black border-r border-gray-800 relative flex flex-col">
                    <JaaSMeeting
                        appId="vpaas-magic-cookie-c8a22146480e4905b6b6eac514a04cdc"
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

                                {/* Action Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-6 bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/30 hover:border-blue-500/50 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                            </div>
                                            <Button size="sm" onClick={handleGenerateAIContent} disabled={loadingContent}>
                                                {loadingContent ? "Generating..." : "Load AI Quiz"}
                                            </Button>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">Quick Quiz</h3>
                                        <p className="text-sm text-gray-400 mb-4">Push a 5-question MCQ set generated by AI.</p>

                                        {pendingContent?.quizzes?.length > 0 && (
                                            <div className="space-y-2">
                                                {pendingContent.quizzes[0].questions.map((q: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded">
                                                        <span className="truncate flex-1 mr-2">{i + 1}. {q.text || q.question}</span>
                                                        <Button size="sm" className="h-6 text-xs px-2 py-0" onClick={() => pushContent('QUIZ', q)}>Push</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>

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

                                {/* Material Push */}
                                <Card className="p-6 border-white/10">
                                    <h3 className="text-lg font-bold mb-4">Share Materials</h3>
                                    <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileUpload}
                                            accept="image/*,application/pdf"
                                        />
                                        <p className="text-gray-400">Drag & Drop PDF/Image here or Click to Upload</p>
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
