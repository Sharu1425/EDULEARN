import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Loader2, ArrowLeft, Check, Lock, Flame, ShieldAlert, Trophy } from "lucide-react"
import api from "../../utils/api"
import { useToast } from "../../contexts/ToastContext"
import { useAuth } from "../../hooks/useAuth"
import { useHeaderTitle } from "../../contexts/HeaderTitleContext"
import { cn } from "../../lib/utils"
import { spring } from "../../lib/motion"
import TopicDetailModal from "../../components/mastery/TopicDetailModal"
import CertificateModal from "../../components/mastery/CertificateModal"
import FinalExamModal from "../../components/mastery/FinalExamModal"

export interface TopicNode {
    id: string
    title: string
    difficulty: number
    reading_time_minutes: number
    prerequisites: string[]
    status: "locked" | "available" | "completed"
    quiz_score?: number
    attempts?: number
    locked_until?: string | null
    progress_id?: string
}

export interface MasteryCluster {
    cluster_id: string
    cluster_title: string
    subtopics: TopicNode[]
}

interface RoadmapDetails {
    id: string
    subject: string
    roadmap_title?: string
    topics: MasteryCluster[]
    streak_count: number
}

// ── Path geometry (responsive width, wide serpentine) ─────────────────────────
const NODE = 84
const ROW = 134
const WAVE = [0, 0.82, 0, -0.82]
const ampFor = (w: number) => Math.min(160, w / 2 - NODE / 2 - 14)
const centerX = (i: number, w: number) => w / 2 + WAVE[i % WAVE.length] * ampFor(w)
const centerY = (i: number) => NODE / 2 + i * ROW
const clusterHeight = (n: number) => (n - 1) * ROW + NODE + 44

const cooldownMinutes = (lockedUntil?: string | null): number => {
    if (!lockedUntil) return 0
    const diff = new Date(lockedUntil).getTime() - Date.now()
    return diff > 0 ? Math.ceil(diff / 60000) : 0
}

// ── One cluster's serpentine path (module scope = stable identity) ────────────
const ClusterPath: React.FC<{
    subtopics: TopicNode[]
    width: number
    prefersReduced: boolean
    hasProgress: boolean
    onSelect: (t: TopicNode) => void
    onCooldown: (mins: number) => void
}> = ({ subtopics, width, prefersReduced, hasProgress, onSelect, onCooldown }) => {
    const height = clusterHeight(subtopics.length)

    return (
        <div className="relative mx-auto" style={{ width, height }}>
            <svg className="absolute inset-0" width={width} height={height} fill="none" aria-hidden="true">
                {subtopics.slice(0, -1).map((t, i) => {
                    const x0 = centerX(i, width), y0 = centerY(i)
                    const x1 = centerX(i + 1, width), y1 = centerY(i + 1)
                    const cy = (y0 + y1) / 2
                    const lit = t.status === "completed"
                    return (
                        <path
                            key={t.id}
                            d={`M ${x0} ${y0} C ${x0} ${cy}, ${x1} ${cy}, ${x1} ${y1}`}
                            stroke={lit ? "hsl(var(--success))" : "hsl(var(--muted-foreground) / 0.22)"}
                            strokeWidth={10}
                            strokeLinecap="round"
                            strokeDasharray={lit ? undefined : "1 16"}
                        />
                    )
                })}
            </svg>

            {subtopics.map((topic, index) => {
                const isCompleted = topic.status === "completed"
                const cool = cooldownMinutes(topic.locked_until)
                const isCooldown = cool > 0
                const isAvailable = topic.status === "available" && !isCooldown
                const isLocked = topic.status === "locked" && !isCooldown
                const x = centerX(index, width)
                const y = centerY(index)

                const bg = isCompleted ? "hsl(var(--success))"
                    : isCooldown ? "hsl(var(--destructive))"
                        : isAvailable ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))"
                            : "hsl(var(--muted))"
                const chunk = isCompleted ? "0 7px 0 0 hsl(var(--success) / 0.4)"
                    : isCooldown ? "0 7px 0 0 hsl(var(--destructive) / 0.4)"
                        : isAvailable ? "0 7px 0 0 hsl(var(--primary) / 0.45)"
                            : "0 6px 0 0 hsl(var(--muted-foreground) / 0.18)"

                return (
                    <React.Fragment key={topic.id}>
                        {/* START / CONTINUE pill above the current node */}
                        {isAvailable && (
                            <motion.div
                                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute z-20 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-e2"
                                style={{ left: x, top: y - NODE / 2 - 26 }}
                            >
                                {hasProgress ? "Continue" : "Start"}
                            </motion.div>
                        )}

                        <motion.button
                            initial={prefersReduced ? false : { opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ ...spring.snappy, delay: prefersReduced ? 0 : index * 0.04 }}
                            whileHover={isAvailable || isCompleted ? { scale: 1.06, y: -2 } : {}}
                            whileTap={isAvailable || isCompleted ? { scale: 0.95 } : {}}
                            onClick={() => {
                                if (isCooldown) onCooldown(cool)
                                else if (isAvailable || isCompleted) onSelect(topic)
                            }}
                            disabled={isLocked}
                            aria-label={topic.title}
                            className={cn(
                                "absolute z-10 flex items-center justify-center overflow-hidden rounded-full font-bold",
                                isLocked ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer text-white"
                            )}
                            style={{ width: NODE, height: NODE, left: x - NODE / 2, top: y - NODE / 2, background: bg, boxShadow: chunk }}
                        >
                            {/* glossy top sheen */}
                            {!isLocked && (
                                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
                            )}
                            {/* pulse ring on the current node */}
                            {isAvailable && !prefersReduced && (
                                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" style={{ animationDuration: "2s" }} />
                            )}

                            {isCompleted && <Check className="relative h-9 w-9" strokeWidth={3} />}
                            {isCooldown && <ShieldAlert className="relative h-8 w-8" />}
                            {isAvailable && <span className="relative text-2xl">{topic.difficulty}</span>}
                            {isLocked && <Lock className="relative h-7 w-7" />}

                            {/* difficulty chip */}
                            <span className="absolute -bottom-1.5 -right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-card text-[10px] font-bold text-foreground shadow-e1">
                                L{topic.difficulty}
                            </span>
                        </motion.button>

                        <div
                            className={cn(
                                "absolute z-10 text-center text-sm font-medium leading-tight",
                                isCompleted ? "text-success" : isCooldown ? "text-destructive" : isAvailable ? "font-semibold text-foreground" : "text-muted-foreground"
                            )}
                            style={{ left: x - 80, top: y + NODE / 2 + 8, width: 160 }}
                        >
                            {topic.title}
                            {isCooldown && <div className="mt-0.5 text-xs text-destructive/80">Cooldown {cool}m</div>}
                        </div>
                    </React.Fragment>
                )
            })}
        </div>
    )
}

const MasteryNodeMap: React.FC = () => {
    const { roadmapId } = useParams()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { user } = useAuth()
    const prefersReduced = useReducedMotion() ?? false

    const [roadmap, setRoadmap] = useState<RoadmapDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null)
    const [showCertificate, setShowCertificate] = useState(false)
    const [showFinalExam, setShowFinalExam] = useState(false)

    // Responsive path width (clamped) so the serpentine spreads wide on desktop.
    const containerRef = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(520)
    useEffect(() => {
        const el = containerRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(entries => {
            const w = entries[0].contentRect.width
            setWidth(Math.max(280, Math.min(560, w)))
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        if (roadmapId) fetchRoadmapDetails()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roadmapId])

    useHeaderTitle(roadmap ? (roadmap.roadmap_title || roadmap.subject) : undefined)

    const fetchRoadmapDetails = async () => {
        try {
            const res = await api.get(`/api/mastery/roadmaps/${roadmapId}`)
            setRoadmap(res.data)
        } catch (error: any) {
            console.error(error)
            addToast({ title: "Failed to load roadmap", type: "error" })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex h-full items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    if (!roadmap) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <h2 className="mb-4 text-2xl font-heading font-bold text-foreground">Roadmap not found</h2>
                <button onClick={() => navigate("/mastery")} className="text-primary hover:underline">Back to Mastery Paths</button>
            </div>
        )
    }

    const allTopics = roadmap.topics.flatMap(c => c.subtopics)
    const completedCount = allTopics.filter(t => t.status === "completed").length
    const totalCount = allTopics.length
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
    const isAllCompleted = completedCount === totalCount && totalCount > 0
    const hasProgress = completedCount > 0

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-24 pt-4">
            {/* Progress + streak bar */}
            <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex w-full items-center gap-4 sm:w-auto">
                    <button
                        onClick={() => navigate("/mastery")}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
                        aria-label="Back to mastery paths"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="tabular font-semibold text-primary">{completedCount} / {totalCount} Mastered</span>
                            <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-muted sm:block">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-lg font-bold text-amber-500 shadow-e1 dark:shadow-e1-dark dark:text-amber-300">
                    <Flame className={cn("h-6 w-6", roadmap.streak_count > 0 && "fill-amber-500 text-amber-500")} />
                    <span className="tabular">{roadmap.streak_count}</span>
                </div>
            </div>

            {/* Cluster zones */}
            <div ref={containerRef} className="flex w-full flex-col items-center">
                {roadmap.topics.map((cluster, ci) => (
                    <div key={cluster.cluster_id} className="mb-8 w-full rounded-3xl border border-border/40 bg-muted/[0.06] py-6">
                        <div className="mb-5 flex items-center justify-center gap-3">
                            <span className="h-px w-8 bg-border" />
                            <span className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                                {cluster.cluster_title || `Zone ${ci + 1}`}
                            </span>
                            <span className="h-px w-8 bg-border" />
                        </div>
                        <ClusterPath
                            subtopics={cluster.subtopics}
                            width={width}
                            prefersReduced={prefersReduced}
                            hasProgress={hasProgress}
                            onSelect={setSelectedTopic}
                            onCooldown={(m) => addToast({ title: `Topic in cooldown for ${m}m`, type: "warning" })}
                        />
                    </div>
                ))}

                {/* Boss / Final Exam node */}
                {allTopics.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="mb-3 h-10 w-1.5 rounded-full" style={{ background: isAllCompleted ? "hsl(var(--success))" : "hsl(var(--muted-foreground) / 0.22)" }} />
                        <motion.button
                            initial={prefersReduced ? false : { opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={spring.snappy}
                            whileHover={isAllCompleted ? { scale: 1.05, y: -2 } : {}}
                            whileTap={isAllCompleted ? { scale: 0.95 } : {}}
                            onClick={() => { if (isAllCompleted) setShowFinalExam(true) }}
                            disabled={!isAllCompleted}
                            className={cn(
                                "relative flex h-28 w-36 flex-col items-center justify-center gap-1 overflow-hidden rounded-3xl font-bold",
                                isAllCompleted ? "cursor-pointer text-white" : "cursor-not-allowed text-muted-foreground"
                            )}
                            style={{
                                background: isAllCompleted ? "linear-gradient(135deg, #fbbf24, #d97706)" : "hsl(var(--muted))",
                                boxShadow: isAllCompleted ? "0 9px 0 0 rgba(180,83,9,0.55)" : "0 7px 0 0 hsl(var(--muted-foreground) / 0.18)",
                            }}
                        >
                            {isAllCompleted && (
                                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
                            )}
                            {isAllCompleted && !prefersReduced && (
                                <span className="absolute inset-0 rounded-3xl bg-amber-400/40 animate-ping" style={{ animationDuration: "3s" }} />
                            )}
                            <Trophy className="relative h-9 w-9" />
                            <span className="relative text-xs uppercase tracking-wider">Final Exam</span>
                        </motion.button>
                    </div>
                )}
                <div className="h-8" />
            </div>

            <TopicDetailModal
                isOpen={!!selectedTopic}
                onClose={() => setSelectedTopic(null)}
                topic={selectedTopic}
                roadmapId={roadmap.id}
                onComplete={(updatedProgress?: any[]) => {
                    if (updatedProgress) fetchRoadmapDetails()
                    setSelectedTopic(null)
                }}
            />

            {showFinalExam && (
                <FinalExamModal
                    isOpen={showFinalExam}
                    onClose={() => setShowFinalExam(false)}
                    roadmapId={roadmap.id}
                    onComplete={() => { setShowFinalExam(false); setShowCertificate(true) }}
                />
            )}

            {showCertificate && roadmap && (
                <CertificateModal
                    isOpen={showCertificate}
                    onClose={() => setShowCertificate(false)}
                    studentName={user?.name || user?.username || "Student"}
                    topicName={roadmap.roadmap_title || roadmap.subject}
                    date={new Date()}
                />
            )}
        </div>
    )
}

export default MasteryNodeMap
