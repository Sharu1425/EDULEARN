import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Loader2, Plus, Map, ArrowRight } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { cn } from "../../lib/utils"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { staggerContainer, staggerItem } from "../../lib/motion"

interface RoadmapPreview {
    id: string
    subject: string
    completed_count: number
    total_count: number
    created_at: string
}

const MasteryPage: React.FC = () => {
    const navigate = useNavigate()
    const { addToast } = useToast()

    const [roadmaps, setRoadmaps] = useState<RoadmapPreview[]>([])
    const [loading, setLoading] = useState(true)
    const [subject, setSubject] = useState("")
    const [generating, setGenerating] = useState(false)
    const [showNew, setShowNew] = useState(false)

    useEffect(() => {
        fetchRoadmaps()
    }, [])

    const fetchRoadmaps = async () => {
        try {
            setLoading(true)
            const res = await api.get("/api/mastery/roadmaps")
            setRoadmaps(res.data)
        } catch (error: any) {
            console.error("Error fetching roadmaps", error)
            addToast({ title: "Failed to load roadmaps", type: "error" })
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!subject.trim()) return
        try {
            setGenerating(true)
            const res = await api.post("/api/mastery/generate-roadmap", { subject })
            if (res.data.id) {
                addToast({ title: "Roadmap generated!", type: "success" })
                navigate(`/mastery/${res.data.id}`)
            }
        } catch (error: any) {
            console.error("Error generating roadmap", error)
            const errMsg = error.response?.data?.detail || "Failed to generate roadmap. Please try again."
            addToast({ title: errMsg, type: "error" })
        } finally {
            setGenerating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const renderNewForm = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center"
        >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-e3 dark:shadow-e3-dark animate-float">
                <Map className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="mb-4 text-4xl font-heading font-bold text-gradient-primary md:text-5xl">
                What do you want to master?
            </h1>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
                Enter any subject and our AI will generate a personalized pathway to mastery.
            </p>

            <form onSubmit={handleGenerate} className="relative w-full max-w-md">
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Data Structures, Python, React"
                    disabled={generating}
                    className="w-full rounded-2xl border border-border bg-card/60 px-6 py-4 pr-36 text-lg text-foreground outline-none backdrop-blur-md transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                <button
                    type="submit"
                    disabled={generating || !subject.trim()}
                    className="absolute right-2 top-2 bottom-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 font-semibold text-primary-foreground transition-all hover:shadow-e2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Start <ArrowRight className="h-4 w-4" /></>}
                </button>
            </form>

            {generating && (
                <div className="mt-8 animate-pulse text-sm text-primary">Generating your custom learning roadmap…</div>
            )}

            {roadmaps.length > 0 && (
                <button onClick={() => setShowNew(false)} className="mt-8 text-sm text-muted-foreground hover:text-foreground">
                    ← Back to your paths
                </button>
            )}
        </motion.div>
    )

    if (roadmaps.length === 0 || showNew) {
        return <div className="p-6 md:p-8">{renderNewForm()}</div>
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-gradient-primary">Your Mastery Paths</h1>
                    <p className="mt-1 text-muted-foreground">Continue your learning journeys or start a new one.</p>
                </div>
                <Button variant="primary" onClick={() => setShowNew(true)}>
                    <Plus className="h-5 w-5" /> New Subject
                </Button>
            </div>

            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
                {roadmaps.map((r) => {
                    const progress = r.total_count ? Math.round((r.completed_count / r.total_count) * 100) : 0
                    return (
                        <motion.div key={r.id} variants={staggerItem}>
                            <Card onClick={() => navigate(`/mastery/${r.id}`)} glow className="h-full p-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                                    <Map className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="mb-3 text-xl font-heading font-bold text-foreground">{r.subject}</h3>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="tabular font-semibold text-primary">{r.completed_count} / {r.total_count}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </Card>
                        </motion.div>
                    )
                })}
            </motion.div>
        </div>
    )
}

export default MasteryPage
