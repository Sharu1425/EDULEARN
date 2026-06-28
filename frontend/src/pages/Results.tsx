import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Question } from "../types";
import { FileText, CheckCircle2, Clock, Hash, Zap, Brain, Lightbulb, Check, X } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import ProgressRing from "../components/ui/ProgressRing";
import EmptyState from "../components/EmptyState";
import { ANIMATION_VARIANTS, TRANSITION_DEFAULTS } from "../utils/constants";

interface ResultsProps {
    user: User
}

interface Explanation {
    questionIndex: number
    explanation: string
}

const Results: React.FC<ResultsProps> = ({ }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { score, totalQuestions, topic, difficulty, questions, userAnswers, timeTaken, explanations: stateExplanations, questionReviews, ai_feedback: stateAiFeedback } = location.state || {
        score: 0,
        totalQuestions: 0,
        questions: [],
        userAnswers: [],
        timeTaken: 0,
        explanations: [],
        questionReviews: [],
        ai_feedback: null
    };

    const [explanations, setExplanations] = useState<Explanation[]>(stateExplanations || []);
    const [showExplanations, setShowExplanations] = useState(false);

    const percentage = ((score / totalQuestions) * 100).toFixed(2);

    useEffect(() => {
        if (!location.state) {
            navigate('/dashboard');
            return;
        }

        // Explanations are included in questions/state; build if not present
        if (questions && questions.length > 0 && (!stateExplanations || stateExplanations.length === 0)) {
            const built = questions.map((q: any, idx: number) => ({ questionIndex: idx, explanation: q.explanation || '' }));
            setExplanations(built);
        }
    }, [location.state, navigate, questions, stateExplanations]);

    const getScoreMessage = (percentage: number | string) => {
        const perc = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
        if (perc >= 90) return "Excellent! Outstanding performance!";
        if (perc >= 80) return "Great job! You're doing very well!";
        if (perc >= 70) return "Good work! Keep it up!";
        if (perc >= 60) return "Not bad! There's room for improvement!";
        return "Keep practicing! You'll get better!";
    };

    const formatTime = (seconds: number | undefined) => {
        if (!seconds) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (!location.state) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                    title="No Results Found"
                    message="No assessment results were found. Please complete an assessment first."
                    actionText="Start Assessment"
                    onAction={() => navigate("/assessconfig")}
                    icon={<FileText className="mx-auto mb-4 h-16 w-16" />}
                />
            </div>
        );
    }

    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={ANIMATION_VARIANTS.fadeIn}
            transition={TRANSITION_DEFAULTS}
            className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6"
        >
            {/* Hero */}
            <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card appearance="glass" hover={false} className="relative overflow-hidden p-7 text-center sm:p-9">
                    <div className="aurora-mesh" />
                    <div className="relative z-10">
                        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Assessment Results
                        </h2>
                        <p className="mt-2 text-muted-foreground">Here's how you performed</p>
                    </div>
                </Card>
            </motion.div>

            {/* Score + metrics */}
            <motion.div variants={ANIMATION_VARIANTS.slideUp}>
                <Card className="p-6 sm:p-8">
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
                        <ProgressRing progress={parseFloat(percentage)} size={150} />
                        <div className="text-center sm:text-left">
                            <h3 className="font-heading text-2xl font-bold text-foreground">
                                {getScoreMessage(percentage)}
                            </h3>
                            <p className="mt-1 text-muted-foreground">
                                You scored <span className="font-semibold text-foreground">{score}</span> out of{" "}
                                <span className="font-semibold text-foreground">{totalQuestions}</span>.
                            </p>
                        </div>
                    </div>

                    {/* Metric tiles */}
                    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
                        <StatTile label="Questions" value={totalQuestions} icon={<FileText className="h-4 w-4" />} accent="primary" />
                        <StatTile label="Correct" value={score} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
                        <StatTile label="Time Taken" value={formatTime(timeTaken)} icon={<Clock className="h-4 w-4" />} accent="info" />
                        <StatTile label="Topic" value={topic || "N/A"} icon={<Hash className="h-4 w-4" />} accent="secondary" />
                        <StatTile label="Difficulty" value={difficulty || "N/A"} icon={<Zap className="h-4 w-4" />} accent="accent" />
                    </div>
                </Card>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={ANIMATION_VARIANTS.slideUp} className="flex flex-wrap justify-center gap-3">
                <Link to="/assessment-choice">
                    <Button variant="primary" size="lg">Take Another Assessment</Button>
                </Link>
                <Link to="/dashboard">
                    <Button variant="secondary" size="lg">Back to Dashboard</Button>
                </Link>
                {questions && questions.length > 0 && (
                    <Button variant="outline" size="lg" onClick={() => setShowExplanations(!showExplanations)}>
                        {showExplanations ? 'Hide' : 'Show'} Question Review
                    </Button>
                )}
            </motion.div>

            {/* Question Review Section */}
            <AnimatePresence>
                {showExplanations && questions && questions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <Card className="p-6 sm:p-8">
                            <h3 className="mb-8 text-center font-heading text-2xl font-bold text-foreground">
                                Question Review
                            </h3>

                            <div className="space-y-6">
                                {questions.map((question: Question, index: number) => {
                                    // Use questionReviews data if available, otherwise fall back to manual calculation
                                    let questionReview = null;
                                    if (questionReviews && questionReviews.length > index) {
                                        questionReview = questionReviews[index];
                                    }

                                    // Get user answer - prefer questionReview, then userAnswers array
                                    let userAnswer = questionReview?.user_answer || userAnswers[index] || '';

                                    // Get correct answer - prefer questionReview, then calculate from question
                                    let correctAnswer = questionReview?.correct_answer || '';
                                    if (!correctAnswer && question.options && typeof question.correct_answer === 'number') {
                                        correctAnswer = question.options[question.correct_answer] || '';
                                    } else if (!correctAnswer && question.answer) {
                                        correctAnswer = question.answer;
                                    }

                                    // Determine if correct - prefer questionReview, otherwise calculate
                                    let isCorrect = false;
                                    if (questionReview !== null) {
                                        isCorrect = questionReview.is_correct ?? false;
                                    } else {
                                        const normalizedUserAnswer = (userAnswer || '').trim().toLowerCase();
                                        const normalizedCorrectAnswer = (correctAnswer || '').trim().toLowerCase();
                                        isCorrect = normalizedUserAnswer === normalizedCorrectAnswer && normalizedUserAnswer !== '';
                                    }

                                    const explanation = questionReview?.explanation || explanations.find(exp => exp.questionIndex === index)?.explanation || '';

                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.06 }}
                                            className={`rounded-xl border p-6 transition-colors ${isCorrect
                                                ? 'border-success/40 bg-success/5'
                                                : 'border-destructive/40 bg-destructive/5'
                                                }`}
                                        >
                                            {/* Question Header */}
                                            <div className="mb-4 flex items-center justify-between">
                                                <h4 className="font-heading text-lg font-semibold text-foreground">
                                                    Question {index + 1}
                                                </h4>
                                                <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${isCorrect
                                                    ? 'border-success/30 bg-success/10 text-success'
                                                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                                                    }`}>
                                                    {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                    <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4">
                                                <p className="leading-relaxed text-foreground">
                                                    {question.question}
                                                </p>
                                            </div>

                                            {/* Options */}
                                            <div className="mb-6 space-y-3">
                                                {question.type === 'coding' ? (
                                                    <div className="space-y-4">
                                                        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-5 font-mono text-sm text-foreground">
                                                            <div className="mb-2 font-semibold text-muted-foreground">Your Code:</div>
                                                            {userAnswer || 'No code submitted.'}
                                                        </div>

                                                        {/* Reference Solution for Coding Question */}
                                                        {question.reference_solution && (
                                                            <div className="whitespace-pre-wrap rounded-lg border border-success/20 bg-success/5 p-5 font-mono text-sm text-foreground">
                                                                <div className="mb-2 flex items-center gap-2 font-semibold text-success">
                                                                    <CheckCircle2 className="h-4 w-4" /> Reference Answer:
                                                                </div>
                                                                {question.reference_solution}
                                                            </div>
                                                        )}

                                                        {/* AI Feedback for Coding Question */}
                                                        {stateAiFeedback && (
                                                            <div className="rounded-xl border border-info/30 bg-info/10 p-5">
                                                                <div className="mb-4 flex items-center gap-2 text-info">
                                                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/15">
                                                                        <Brain className="h-5 w-5" />
                                                                    </span>
                                                                    <h4 className="text-lg font-bold">AI Code Insights</h4>
                                                                </div>

                                                                {stateAiFeedback.overall_score && (
                                                                    <div className="mb-4 flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">Quality Score:</span>
                                                                        <span className="text-xl font-bold text-info">{stateAiFeedback.overall_score}/100</span>
                                                                    </div>
                                                                )}

                                                                <div className="space-y-4">
                                                                    {stateAiFeedback.correctness && (
                                                                        <div>
                                                                            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Correctness</div>
                                                                            <ul className="space-y-1">
                                                                                {stateAiFeedback.correctness.issues?.map((issue: string, i: number) => (
                                                                                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                                        <span className="mt-1 text-destructive">•</span>
                                                                                        <span>{issue}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    )}

                                                                    {stateAiFeedback.performance && (
                                                                        <div>
                                                                            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Performance</div>
                                                                            <div className="flex gap-3">
                                                                                <span className="rounded bg-info/10 px-2 py-0.5 text-xs text-foreground">Time: {stateAiFeedback.performance.time_complexity}</span>
                                                                                <span className="rounded bg-info/10 px-2 py-0.5 text-xs text-foreground">Space: {stateAiFeedback.performance.space_complexity}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    question.options?.map((option: string, optionIndex: number) => {
                                                        const normalizedOption = (option || '').trim();
                                                        const normalizedUserAnswer = (userAnswer || '').trim();
                                                        const normalizedCorrectAnswer = (correctAnswer || '').trim();

                                                        const isUserChoice = normalizedOption.toLowerCase() === normalizedUserAnswer.toLowerCase();
                                                        const isCorrectChoice = normalizedOption.toLowerCase() === normalizedCorrectAnswer.toLowerCase();

                                                        const showAsCorrect = isCorrectChoice;
                                                        const showAsWrong = isUserChoice && !isCorrectChoice;

                                                        let optionClasses = "rounded-lg border p-4 transition-colors ";
                                                        if (showAsCorrect) {
                                                            optionClasses += "border-success/40 bg-success/10";
                                                        } else if (showAsWrong) {
                                                            optionClasses += "border-destructive/40 bg-destructive/10";
                                                        } else {
                                                            optionClasses += "border-border bg-muted/40";
                                                        }

                                                        return (
                                                            <div key={optionIndex} className={optionClasses}>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex flex-1 items-center gap-3">
                                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${showAsCorrect
                                                                            ? 'bg-success text-white'
                                                                            : showAsWrong
                                                                                ? 'bg-destructive text-white'
                                                                                : 'border border-border bg-muted text-foreground'
                                                                            }`}>
                                                                            {String.fromCharCode(65 + optionIndex)}
                                                                        </div>
                                                                        <span className="flex-1 text-base font-medium text-foreground">{option}</span>
                                                                    </div>
                                                                    {/* Icons and Labels on the right */}
                                                                    <div className="flex items-center gap-2">
                                                                        {showAsCorrect && (
                                                                            <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-semibold text-success">Correct</span>
                                                                        )}
                                                                        {isUserChoice && isCorrect && (
                                                                            <span className="rounded-full bg-success/20 px-3 py-1 text-sm font-semibold text-success">Your Choice</span>
                                                                        )}
                                                                        {showAsWrong && (
                                                                            <span className="rounded-full bg-destructive/20 px-3 py-1 text-sm font-semibold text-destructive">Your Choice</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Explanation Section */}
                                            <div className="border-t border-border pt-6">
                                                <div className="mb-3 flex items-center gap-2">
                                                    <Lightbulb className="h-5 w-5 text-warning" />
                                                    <h5 className="font-heading text-lg font-semibold text-foreground">Explanation</h5>
                                                </div>

                                                {explanation && (typeof explanation === 'string' ? explanation : explanation.explanation) ? (
                                                    <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                                                        <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                                            {typeof explanation === 'string' ? explanation : explanation.explanation}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                                                        <p className="text-sm italic leading-relaxed text-muted-foreground">
                                                            No explanation available for this question.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Results
