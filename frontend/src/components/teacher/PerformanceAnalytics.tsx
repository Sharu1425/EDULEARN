"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useToast } from "../../contexts/ToastContext"
import Card from "../ui/Card"
import api from "../../utils/api"
import { ANIMATION_VARIANTS } from "../../utils/constants"

interface PerformanceAnalyticsProps {
  studentId?: string
  assessmentId?: string
  timeRange?: "week" | "month" | "semester" | "all"
}

interface AnalyticsData {
  student_performance: {
    total_assessments: number
    average_score: number
    improvement_trend: number
    subject_breakdown: Record<string, {
      count: number
      average: number
      trend: number
    }>
    recent_scores: Array<{
      date: string
      score: number
      assessment_title: string
    }>
  }
  class_comparison: {
    class_average: number
    percentile_rank: number
    top_performers_count: number
    struggling_students_count: number
  }
  insights: Array<{
    type: "strength" | "weakness" | "improvement" | "concern"
    title: string
    description: string
    recommendation: string
  }>
}

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ 
  studentId, 
  assessmentId, 
  timeRange = "all" 
}) => {
  const { error: showError } = useToast()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "insights">("overview")

  useEffect(() => {
    fetchAnalytics()
  }, [studentId, assessmentId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      let endpoint = "/api/assessments/teacher/class-performance"
      
      if (studentId) {
        endpoint = `/api/assessments/teacher/student-results/${studentId}`
      } else if (assessmentId) {
        endpoint = `/api/assessments/teacher/assessment-analytics/${assessmentId}`
      }
      
      const response = await api.get(endpoint)
      
      if (response.data.success) {
        // Transform the data into analytics format
        const analyticsData = transformToAnalyticsData(response.data)
        setData(analyticsData)
        console.log("✅ [ANALYTICS] Performance analytics loaded")
      } else {
        showError("Error", "Failed to load performance analytics")
      }
    } catch (err) {
      console.error("❌ [ANALYTICS] Failed to fetch analytics:", err)
      showError("Error", "Failed to load performance analytics")
    } finally {
      setLoading(false)
    }
  }

  const transformToAnalyticsData = (rawData: any): AnalyticsData => {
    // This function transforms the raw API data into the analytics format
    // Implementation depends on the actual API response structure
    
    if (studentId && rawData.results) {
      // Student-specific analytics
      const results = rawData.results
      const totalAssessments = results.length
      const averageScore = results.reduce((sum: number, r: any) => sum + r.percentage, 0) / totalAssessments
      
      // Calculate subject breakdown
      const subjectBreakdown: Record<string, any> = {}
      results.forEach((result: any) => {
        const subject = result.subject || "General"
        if (!subjectBreakdown[subject]) {
          subjectBreakdown[subject] = { count: 0, total: 0, scores: [] }
        }
        subjectBreakdown[subject].count++
        subjectBreakdown[subject].total += result.percentage
        subjectBreakdown[subject].scores.push(result.percentage)
      })
      
      // Calculate averages and trends
      Object.keys(subjectBreakdown).forEach(subject => {
        const data = subjectBreakdown[subject]
        data.average = data.total / data.count
        // Simple trend calculation (comparing first half vs second half)
        const midPoint = Math.floor(data.scores.length / 2)
        const firstHalf = data.scores.slice(0, midPoint)
        const secondHalf = data.scores.slice(midPoint)
        const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length
        data.trend = secondAvg - firstAvg
      })
      
      // Recent scores
      const recentScores = results.slice(0, 10).map((result: any) => ({
        date: new Date(result.submitted_at).toLocaleDateString(),
        score: result.percentage,
        assessment_title: result.assessment_title
      }))
      
      // Calculate improvement trend
      const improvementTrend = recentScores.length > 1 
        ? recentScores[0].score - recentScores[recentScores.length - 1].score
        : 0
      
      return {
        student_performance: {
          total_assessments: totalAssessments,
          average_score: averageScore,
          improvement_trend: improvementTrend,
          subject_breakdown: subjectBreakdown,
          recent_scores: recentScores
        },
        class_comparison: {
          class_average: 75, // This would come from class data
          percentile_rank: 85, // This would be calculated
          top_performers_count: 5,
          struggling_students_count: 3
        },
        insights: generateInsights(averageScore, improvementTrend, subjectBreakdown)
      }
    }
    
    // Default analytics data
    return {
      student_performance: {
        total_assessments: 0,
        average_score: 0,
        improvement_trend: 0,
        subject_breakdown: {},
        recent_scores: []
      },
      class_comparison: {
        class_average: 0,
        percentile_rank: 0,
        top_performers_count: 0,
        struggling_students_count: 0
      },
      insights: []
    }
  }

  const generateInsights = (averageScore: number, trend: number, subjects: Record<string, any>) => {
    const insights = []
    
    // Performance level insight
    if (averageScore >= 90) {
      insights.push({
        type: "strength" as const,
        title: "Excellent Performance",
        description: `Maintaining an average score of ${averageScore.toFixed(1)}%`,
        recommendation: "Continue the excellent work and consider mentoring other students"
      })
    } else if (averageScore >= 80) {
      insights.push({
        type: "strength" as const,
        title: "Good Performance",
        description: `Consistently scoring above 80% with an average of ${averageScore.toFixed(1)}%`,
        recommendation: "Focus on areas with lower scores to reach excellence"
      })
    } else if (averageScore >= 60) {
      insights.push({
        type: "improvement" as const,
        title: "Room for Improvement",
        description: `Current average of ${averageScore.toFixed(1)}% shows potential for growth`,
        recommendation: "Identify weak subjects and seek additional help"
      })
    } else {
      insights.push({
        type: "concern" as const,
        title: "Needs Support",
        description: `Average score of ${averageScore.toFixed(1)}% indicates need for intervention`,
        recommendation: "Schedule one-on-one sessions and provide additional resources"
      })
    }
    
    // Trend insight
    if (trend > 5) {
      insights.push({
        type: "strength" as const,
        title: "Improving Performance",
        description: `Recent scores show an upward trend of ${trend.toFixed(1)}%`,
        recommendation: "Continue current study strategies"
      })
    } else if (trend < -5) {
      insights.push({
        type: "concern" as const,
        title: "Declining Performance",
        description: `Recent scores show a downward trend of ${Math.abs(trend).toFixed(1)}%`,
        recommendation: "Review study habits and seek additional support"
      })
    }
    
    // Subject-specific insights
    Object.entries(subjects).forEach(([subject, data]) => {
      if (data.average < 60) {
        insights.push({
          type: "weakness" as const,
          title: `${subject} Needs Attention`,
          description: `Average score of ${data.average.toFixed(1)}% in ${subject}`,
          recommendation: `Focus on ${subject} fundamentals and practice more problems`
        })
      } else if (data.average >= 90) {
        insights.push({
          type: "strength" as const,
          title: `${subject} Strength`,
          description: `Excellent performance in ${subject} with ${data.average.toFixed(1)}%`,
          recommendation: `Consider advanced topics in ${subject}`
        })
      }
    })
    
    return insights
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "strength":
        return "💪"
      case "weakness":
        return "⚠️"
      case "improvement":
        return "📈"
      case "concern":
        return "🚨"
      default:
        return "ℹ️"
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case "strength":
        return "border-green-500/30 bg-green-500/10 dark:bg-green-900/20"
      case "weakness":
        return "border-yellow-500/30 bg-amber-500/10 dark:bg-amber-900/20"
      case "improvement":
        return "border-border bg-muted"
      case "concern":
        return "border-red-500/30 bg-rose-500/10 dark:bg-rose-900/20"
      default:
        return "border-border bg-muted"
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading performance analytics...</p>
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-rose-600 dark:text-rose-400 mb-2">Error</h3>
          <p className="text-muted-foreground">Failed to load performance analytics.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">Performance Analytics</h3>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-muted rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "trends"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "insights"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            Insights
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <motion.div
          variants={ANIMATION_VARIANTS.slideUp}
          initial="initial"
          animate="animate"
        >
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-border rounded-lg p-4">
              <p className="text-muted-foreground text-sm font-medium">Total Assessments</p>
              <p className="text-2xl font-bold text-foreground">
                {data.student_performance.total_assessments}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-muted-foreground text-sm font-medium">Average Score</p>
              <p className="text-2xl font-bold text-foreground">
                {data.student_performance.average_score.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-muted-foreground text-sm font-medium">Improvement Trend</p>
              <p className={`text-2xl font-bold ${data.student_performance.improvement_trend >= 0 ? 'text-foreground' : 'text-red-200'}`}>
                {data.student_performance.improvement_trend >= 0 ? '+' : ''}{data.student_performance.improvement_trend.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
              <p className="text-muted-foreground text-sm font-medium">Class Rank</p>
              <p className="text-2xl font-bold text-foreground">
                {data.class_comparison.percentile_rank}th
              </p>
            </div>
          </div>

          {/* Subject Breakdown */}
          {Object.keys(data.student_performance.subject_breakdown).length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">Subject Performance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(data.student_performance.subject_breakdown).map(([subject, data]) => (
                  <div key={subject} className="bg-muted border border-border rounded-lg p-4">
                    <h5 className="font-semibold text-foreground mb-2">{subject}</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average</span>
                        <span className="text-foreground font-medium">{data.average.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Assessments</span>
                        <span className="text-foreground font-medium">{data.count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Trend</span>
                        <span className={`font-medium ${data.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-400'}`}>
                          {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <motion.div
          variants={ANIMATION_VARIANTS.slideUp}
          initial="initial"
          animate="animate"
        >
          <h4 className="text-lg font-semibold text-foreground mb-4">Recent Performance</h4>
          <div className="space-y-4">
            {data.student_performance.recent_scores.map((score, index) => (
              <div key={index} className="bg-muted border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-semibold text-foreground">{score.assessment_title}</h5>
                  <span className="text-muted-foreground text-sm">{score.date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-emerald-400 h-2 rounded-full"
                      style={{ width: `${score.score}%` }}
                    ></div>
                  </div>
                  <span className="text-foreground font-semibold">{score.score.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <motion.div
          variants={ANIMATION_VARIANTS.slideUp}
          initial="initial"
          animate="animate"
        >
          <h4 className="text-lg font-semibold text-foreground mb-4">Performance Insights</h4>
          <div className="space-y-4">
            {data.insights.map((insight, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-foreground mb-2">{insight.title}</h5>
                    <p className="text-muted-foreground text-sm mb-3">{insight.description}</p>
                    <div className="bg-muted border border-border rounded-md p-3">
                      <p className="text-foreground text-sm">
                        <span className="font-medium">Recommendation:</span> {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </Card>
  )
}

export default PerformanceAnalytics
