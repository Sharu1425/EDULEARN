import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Question } from "../types";
import AnimatedBackground from "../components/AnimatedBackground";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
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
    const { score, totalQuestions, topic, difficulty, questions, userAnswers, timeTaken, explanations: stateExplanations, questionReviews } = location.state || {
        score: 0,
        totalQuestions: 0,
        questions: [],
        userAnswers: [],
        timeTaken: 0,
        explanations: [],
        questionReviews: []
    };

    const [explanations, setExplanations] = useState<Explanation[]>(stateExplanations || []);
    const [showExplanations, setShowExplanations] = useState(false);

    const percentage = ((score / totalQuestions) * 100).toFixed(2);

    useEffect(() => {
        console.log("📊 Results page state:", location.state);
        console.log("📊 User answers received:", userAnswers);
        console.log("📊 Questions received:", questions?.length);

        if (!location.state) {
            console.log("❌ No state found, redirecting to dashboard");
            navigate('/dashboard');
            return;
        }

        // Explanations are included in questions/state; build if not present
        if (questions && questions.length > 0 && (!stateExplanations || stateExplanations.length === 0)) {
            const built = questions.map((q: any, idx: number) => ({ questionIndex: idx, explanation: q.explanation || '' }));
            setExplanations(built);
        }
    }, [location.state, navigate, questions, stateExplanations]);

    const getScoreColor = (percentage: number | string) => {
        const perc = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
        if (perc >= 80) return "from-green-500 to-emerald-500";
        if (perc >= 60) return "from-yellow-500 to-orange-500";
        return "from-red-500 to-pink-500";
    };

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
            <>
                <AnimatedBackground />
                <div className="min-h-screen pt-20 px-4 relative z-10 flex items-center justify-center">
                    <EmptyState
                        title="No Results Found"
                        message="No assessment results were found. Please complete an assessment first."
                        actionText="Start Assessment"
                        onAction={() => navigate("/assessconfig")}
                        icon={
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <AnimatedBackground />
            <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={ANIMATION_VARIANTS.fadeIn}
                transition={TRANSITION_DEFAULTS}
                className="container mx-auto px-4 pt-24 py-8 relative z-10"
            >
                <motion.div
                    variants={ANIMATION_VARIANTS.slideDown}
                    className="text-center mb-12"
                >
                    <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
                        Assessment Results
                    </h2>
                    <p className="text-purple-200 text-xl">Here's how you performed</p>
                </motion.div>

                {/* Score Card */}
                <motion.div
                    variants={ANIMATION_VARIANTS.slideUp}
                    className="max-w-4xl mx-auto mb-8"
                >
                    <Card className="p-8 text-center bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500/30">
                        {/* Circular Score */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                            className="mb-6"
                        >
                            <div className="w-48 h-48 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/50">
                                <span className="text-5xl font-bold text-white">{percentage}%</span>
                            </div>

                            {/* Motivational Message */}
                            <div className="flex items-center justify-center space-x-2 mb-6">
                                <h3 className="text-2xl font-bold text-white">
                                    {getScoreMessage(percentage)}
                                </h3>
                                <div className="flex space-x-1">
                                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Progress Bar */}
                        <div className="w-full bg-purple-900/50 rounded-full h-4 mb-8">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${parseFloat(percentage)}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                                className="bg-gradient-to-r from-yellow-500 to-orange-500 h-4 rounded-full shadow-lg"
                            />
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                {
                                    label: "Total Questions",
                                    value: totalQuestions,
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )
                                },
                                {
                                    label: "Correct Answers",
                                    value: score,
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )
                                },
                                {
                                    label: "Time Taken",
                                    value: formatTime(timeTaken),
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )
                                },
                                {
                                    label: "Topic",
                                    value: topic || "N/A",
                                    icon: (
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-green-500 rounded"></div>
                                            <div className="w-2 h-2 bg-red-500 rounded"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded"></div>
                                        </div>
                                    )
                                },
                                {
                                    label: "Difficulty",
                                    value: difficulty || "N/A",
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    )
                                }
                            ].map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 + index * 0.1 }}
                                    className="p-5 rounded-lg bg-purple-900/30 border border-purple-500/30 text-center"
                                >
                                    <div className="flex justify-center mb-3 text-white">
                                        {stat.icon}
                                    </div>
                                    <p className="text-white font-bold text-xl mb-1">
                                        {stat.value}
                                    </p>
                                    <p className="text-white/80 text-sm">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    variants={ANIMATION_VARIANTS.slideUp}
                    className="text-center mb-8 space-x-4"
                >
                    <Link to="/assessment-choice">
                        <Button variant="primary" size="lg">
                            Take Another Assessment
                        </Button>
                    </Link>
                    <Link to="/dashboard">
                        <Button variant="secondary" size="lg">
                            Back to Dashboard
                        </Button>
                    </Link>
                    {questions && questions.length > 0 && (
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => setShowExplanations(!showExplanations)}
                        >
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
                            className="max-w-4xl mx-auto"
                        >
                            <Card className="p-8">
                                <div className="text-center mb-8">
                                    <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
                                        Question Review
                                    </h3>
                                    {/* Explanations available instantly */}
                                </div>

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
                                            // Fallback: compare user answer with correct answer
                                            const normalizedUserAnswer = (userAnswer || '').trim().toLowerCase();
                                            const normalizedCorrectAnswer = (correctAnswer || '').trim().toLowerCase();
                                            isCorrect = normalizedUserAnswer === normalizedCorrectAnswer && normalizedUserAnswer !== '';
                                        }

                                        const explanation = questionReview?.explanation || explanations.find(exp => exp.questionIndex === index)?.explanation || '';

                                        console.log(`🔍 [RESULTS] Question ${index + 1}:`, {
                                            userAnswer,
                                            correctAnswer,
                                            isCorrect,
                                            hasQuestionReview: !!questionReview,
                                            userAnswersArray: userAnswers[index]
                                        });

                                        return (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`border rounded-xl p-6 transition-all duration-300 ${isCorrect
                                                        ? 'border-green-500/50 bg-green-500/5'
                                                        : 'border-red-500/50 bg-red-500/5'
                                                    }`}
                                            >
                                                {/* Question Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-lg font-semibold text-purple-200">
                                                        Question {index + 1}
                                                    </h4>
                                                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${isCorrect
                                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                        }`}>
                                                        <span>{isCorrect ? '✓' : '✗'}</span>
                                                        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                                    </div>
                                                </div>

                                                {/* Question Text */}
                                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
                                                    <p className="text-purple-100 text-lg leading-relaxed">
                                                        {question.question}
                                                    </p>
                                                </div>

                                                {/* Options */}
                                                <div className="space-y-3 mb-6">
                                                    {question.options.map((option, optionIndex) => {
                                                        // Use normalized comparison for better matching
                                                        const normalizedOption = (option || '').trim();
                                                        const normalizedUserAnswer = (userAnswer || '').trim();
                                                        const normalizedCorrectAnswer = (correctAnswer || '').trim();

                                                        // Check if this option matches user answer or correct answer
                                                        const isUserChoice = normalizedOption.toLowerCase() === normalizedUserAnswer.toLowerCase();
                                                        const isCorrectChoice = normalizedOption.toLowerCase() === normalizedCorrectAnswer.toLowerCase();

                                                        // Priority: Correct answer always shows in green, wrong user answer shows in red (if not correct)
                                                        const showAsCorrect = isCorrectChoice;
                                                        const showAsWrong = isUserChoice && !isCorrectChoice;

                                                        let optionClasses = "p-5 rounded-lg border transition-all duration-200 ";

                                                        if (showAsCorrect) {
                                                            optionClasses += "bg-green-600 border-2 border-green-500";
                                                        } else if (showAsWrong) {
                                                            optionClasses += "bg-red-600 border-2 border-red-500";
                                                        } else {
                                                            optionClasses += "bg-purple-900/30 border border-purple-500/30";
                                                        }

                                                        return (
                                                            <div key={optionIndex} className={optionClasses}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center space-x-3 flex-1">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${showAsCorrect
                                                                                ? 'bg-green-700 text-white'
                                                                                : showAsWrong
                                                                                    ? 'bg-red-700 text-white'
                                                                                    : 'bg-purple-500/20 border border-purple-500/50 text-white'
                                                                            }`}>
                                                                            {String.fromCharCode(65 + optionIndex)}
                                                                        </div>
                                                                        <span className={`flex-1 font-medium text-base ${showAsCorrect || showAsWrong ? 'text-white font-semibold' : 'text-white'}`}>{option}</span>
                                                                    </div>
                                                                    {/* Icons and Labels on the right */}
                                                                    <div className="flex items-center space-x-2">
                                                                        {showAsCorrect && (
                                                                            <>
                                                                                <span className="text-green-200 text-xl font-bold">✓</span>
                                                                                <span className="px-3 py-1 rounded-full bg-green-700/50 text-white text-sm font-semibold">
                                                                                    Correct
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {isUserChoice && isCorrect && (
                                                                            <span className="px-3 py-1 rounded-full bg-green-700/50 text-white text-sm font-semibold">
                                                                                Your Choice
                                                                            </span>
                                                                        )}
                                                                        {showAsWrong && (
                                                                            <>
                                                                                <span className="text-red-200 text-xl font-bold">✗</span>
                                                                                <span className="px-3 py-1 rounded-full bg-red-700/50 text-white text-sm font-semibold">
                                                                                    Your Choice
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Explanation Section */}
                                                <div className="border-t border-purple-500/20 pt-6">
                                                    <div className="flex items-center space-x-2 mb-3">
                                                        <span className="text-yellow-400 text-xl">💡</span>
                                                        <h5 className="text-white font-semibold text-lg">Explanation</h5>
                                                    </div>

                                                    {explanation && (typeof explanation === 'string' ? explanation : explanation.explanation) ? (
                                                        <div className="bg-blue-900/40 rounded-lg p-4 border border-blue-500/50">
                                                            <p className="text-blue-100 text-base leading-relaxed whitespace-pre-wrap">
                                                                {typeof explanation === 'string' ? explanation : explanation.explanation}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/30">
                                                            <p className="text-gray-400 text-sm leading-relaxed italic">
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
        </>
    );
};

export default Results
