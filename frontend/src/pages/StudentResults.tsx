"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import type { TestResult } from "../types"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import PageShell from "../components/ui/PageShell"
import ErrorState from "../components/ErrorState"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"
import { Award, Target, BookOpen, Clock } from "lucide-react"

const StudentResults: React.FC = () => {
    const { user } = useAuth()
    const [testHistory, setTestHistory] = useState<TestResult[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState({
        averageScore: 0,
        totalAttempts: 0,
        topicsStudied: 0,
        bestScore: 0,
    })

    useEffect(() => {
        if (user?._id || user?.id) {
            fetchTestHistory()
        }
    }, [user?._id, user?.id])

    const fetchTestHistory = async () => {
        try {
            const userId = user?._id || user?.id
            if (!userId) return

            setLoading(true)
            setError(null)
            const response = await api.get(`/api/results/user/${userId}`)

            if (response.data.success) {
                const results = response.data.results || []
                setTestHistory(results)

                if (results.length > 0) {
                    const totalScore = results.reduce(
                        (sum: number, result: TestResult) => sum + (result.score / result.total_questions) * 100,
                        0,
                    )
                    const uniqueTopics = new Set(results.map((result: TestResult) => result.topic))
                    const bestScore = Math.max(
                        ...results.map((result: TestResult) => (result.score / result.total_questions) * 100),
                    )

                    setStats({
                        averageScore: Math.round(totalScore / results.length),
                        totalAttempts: results.length,
                        topicsStudied: uniqueTopics.size,
                        bestScore: Math.round(bestScore),
                    })
                }
            } else {
                throw new Error(response.data.error || "Failed to fetch test history")
            }
        } catch (err: any) {
            console.error("Error fetching test history:", err)
            setError(err.response?.data?.detail || err.message || "Failed to fetch test history")
        } finally {
            setLoading(false)
        }
    }

    const statCards = [
        { title: "Total Attempts", value: stats.totalAttempts, icon: <BookOpen className="w-6 h-6" />, color: "from-blue-500 to-indigo-500" },
        { title: "Average Score", value: `${stats.averageScore}%`, icon: <Target className="w-6 h-6" />, color: "from-primary to-accent" },
        { title: "Best Score", value: `${stats.bestScore}%`, icon: <Award className="w-6 h-6" />, color: "from-amber-400 to-orange-500" },
        { title: "Topics Studied", value: stats.topicsStudied, icon: <Clock className="w-6 h-6" />, color: "from-emerald-400 to-teal-500" },
    ]

    if (loading) {
        return (
            <PageShell title="My Results" subtitle="Analyzing your performance...">
                <div className="flex justify-center py-20">
                    <LoadingSpinner size="lg" text="Loading test history..." />
                </div>
            </PageShell>
        )
    }

    if (error) {
        return (
            <PageShell title="My Results" subtitle="View your assessment history">
                <ErrorState
                    title="Failed to Load Results"
                    message={error}
                    onRetry={fetchTestHistory}
                    retryText="Retry"
                />
            </PageShell>
        )
    }

    return (
        <PageShell title="My Results" subtitle="Track your assessment progress and review past performances">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Stats Grid */}
                <motion.div
                    variants={ANIMATION_VARIANTS.stagger}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                >
                    {statCards.map((stat, index) => (
                        <motion.div key={stat.title} variants={ANIMATION_VARIANTS.slideUp} transition={{ delay: index * 0.1 }}>
                            <Card className="p-6 text-center group h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                                <div
                                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}
                                >
                                    {stat.icon}
                                </div>
                                <h3 className="text-3xl font-bold font-heading text-foreground mb-1">{stat.value}</h3>
                                <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Results List */}
                <motion.div
                    variants={ANIMATION_VARIANTS.slideUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: 0.3 }}
                >
                    <Card className="p-6">
                        <h3 className="text-xl font-bold font-heading text-foreground mb-6 flex items-center gap-2">
                            <Award className="w-6 h-6 text-primary" />
                            Assessment History
                        </h3>

                        {testHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                                    📚
                                </div>
                                <h4 className="text-lg font-semibold text-foreground mb-2">No tests completed yet</h4>
                                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                    When you complete assessments, your results and detailed performance reviews will appear here.
                                </p>
                                <Link to="/assessment-choice">
                                    <Button variant="primary">Start Your First Assessment</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {testHistory.map((test, index) => {
                                    const percentage = test.percentage || (test.score / test.total_questions) * 100;
                                    const scoreColor = percentage >= 80 ? "text-green-500 bg-green-500/10 border-green-500/20"
                                        : percentage >= 60 ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                                            : "text-red-500 bg-red-500/10 border-red-500/20";
                                    const scoreTextColor = percentage >= 80 ? "text-green-500" : percentage >= 60 ? "text-amber-500" : "text-red-500";

                                    return (
                                        <Link key={test.id} to={`/test-result/${test.id}`} className="block">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="p-5 rounded-xl bg-card border border-border/50 hover:bg-muted/30 hover:shadow-md transition-all duration-300 group flex items-center justify-between"
                                            >
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <h4 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {test.topic}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {new Date(test.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span className="capitalize">{test.difficulty || "Standard"}</span>
                                                        {test.time_taken && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                                <span>
                                                                    {Math.floor(test.time_taken / 60)}:{(test.time_taken % 60).toString().padStart(2, "0")}s
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-sm font-medium text-foreground">{test.score} / {test.total_questions}</p>
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Correct</p>
                                                    </div>
                                                    <div className={`flex items-center justify-center w-16 h-16 rounded-xl border ${scoreColor}`}>
                                                        <span className={`text-xl font-bold ${scoreTextColor}`}>
                                                            {Math.round(percentage)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </motion.div>
            </div>
        </PageShell>
    )
}

export default StudentResults
