import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Code, CheckCircle, Clock, Cpu, TrendingUp, ArrowLeft, Brain, Lightbulb, Zap, ShieldCheck } from "lucide-react";
import codingService from "../api/codingService";
import assessmentService from "../api/assessmentService";
import { toast } from "react-hot-toast";
import AnimatedBackground from "../components/AnimatedBackground";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/EmptyState";
import { ANIMATION_VARIANTS, TRANSITION_DEFAULTS } from "../utils/constants";

const CodingResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resultState, setResultState] = useState<any>(location.state || null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [aiFeedback, setAiFeedback] = useState<any>(location.state?.aiFeedback || location.state?.ai_feedback || null);
  const [isPollingFeedback, setIsPollingFeedback] = useState(false);

  useEffect(() => {
    // Try to get state from location first, then from sessionStorage as fallback
    let state = location.state;
    
    if (!state) {
      try {
        const storedState = sessionStorage.getItem("codingResultsState");
        if (storedState) {
          state = JSON.parse(storedState);
          sessionStorage.removeItem("codingResultsState"); // Clean up after use
          console.log("📦 [RESULTS] Loaded state from sessionStorage");
          setResultState(state);
          
          // Update location state for consistency
          window.history.replaceState({ ...window.history.state, state }, '', window.location.pathname);
        }
      } catch (storageError) {
        console.error("Failed to load state from sessionStorage:", storageError);
      }
    } else {
      setResultState(state);
    }
    
    if (!state) {
      console.log("❌ No state found, redirecting to dashboard");
      navigate('/dashboard');
      return;
    }

    // If we have an ID but no code/testResults, fetch the full submission
    if (state.id && (!state.code || !state.testResults)) {
      fetchFullSubmission(state.id);
    } else {
      setResultState(state);
    }
    
    // Set AI feedback from state if available
    if (state.aiFeedback || state.ai_feedback) {
      setAiFeedback(state.aiFeedback || state.ai_feedback);
    } else if (state.id) {
      // Start polling if we have a submission ID but no feedback yet
      startPollingFeedback(state.id, !!state.assessmentId);
    }
  }, [location.state, navigate]);

  const fetchFullSubmission = async (id: string) => {
    try {
      console.log("🔄 [RESULTS] Fetching full submission details for:", id);
      const response = await codingService.getSubmission(id);
      if (response.success && response.submission) {
        const sub = response.submission;
        
        // Map backend fields to frontend names if they differ
        const mappedState = {
          ...sub,
          code: sub.code,
          language: sub.language,
          testResults: sub.test_results || [], // Map test_results -> testResults
          passedTests: sub.test_results?.filter((t: any) => t.passed).length || 0,
          totalTests: sub.test_results?.length || 0,
          executionTime: sub.execution_time,
          memoryUsed: sub.memory_used,
          problemTitle: sub.problem_title,
          problem: {
            description: sub.problem_description,
            problem_statement: sub.problem_description,
            reference_solution: sub.reference_solution
          }
        };
        
        setResultState(mappedState);
        if (sub.ai_feedback) setAiFeedback(sub.ai_feedback);
      }
    } catch (error) {
      console.error("Error fetching full submission:", error);
      toast.error("Failed to load submission details");
    }
  };

  const startPollingFeedback = async (id: string, isTeacherAssessment: boolean) => {
    if (isPollingFeedback) return;
    
    setIsPollingFeedback(true);
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 3000; // 3 seconds

    const poll = async () => {
      attempts++;
      try {
        let response;
        if (isTeacherAssessment) {
          response = await assessmentService.getAssessmentResult(id);
        } else {
          response = await codingService.getSubmission(id);
        }

        const feedback = response.data?.result?.ai_feedback || response.data?.submission?.ai_feedback;
        
        if (feedback) {
          setAiFeedback(feedback);
          setIsPollingFeedback(false);
          toast.success("AI feedback generated!");
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          setIsPollingFeedback(false);
          console.log("Stopped polling for feedback after max attempts");
        }
      } catch (error) {
        console.error("Error polling for feedback:", error);
        setIsPollingFeedback(false);
      }
    };

    setTimeout(poll, interval);
  };

  // Extract data from resultState
  const { 
    code,
    language, 
    testResults, 
    executionTime, 
    memoryUsed, 
    passedTests, 
    totalTests, 
    timeTaken 
  } = resultState || {};
  
  // Handle both assessment and standalone problem
  const title = resultState?.assessmentTitle || resultState?.problemTitle || "Coding Challenge";
  const problemData = resultState?.question || resultState?.problem;

  const toggleTestExpansion = (index: number) => {
    setExpandedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatMemory = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!resultState) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen pt-20 px-4 relative z-10 flex items-center justify-center">
          <EmptyState
            title="No Results Found"
            message="No coding assessment results were found. Please complete a coding assessment first."
            actionText="Back to Dashboard"
            onAction={() => navigate("/dashboard")}
            icon={<Code className="w-16 h-16 mx-auto mb-4" />}
          />
        </div>
      </>
    );
  }

  const percentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : "0";
  const allPassed = passedTests === totalTests && totalTests > 0;

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
            Coding Assessment Results
          </h2>
          <p className="text-purple-200 text-xl">{title}</p>
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
              <div className={`w-48 h-48 rounded-full bg-gradient-to-r flex items-center justify-center mx-auto mb-6 shadow-2xl ${
                allPassed 
                  ? "from-green-500 to-emerald-500 shadow-green-500/50" 
                  : "from-yellow-500 to-orange-500 shadow-orange-500/50"
              }`}>
                <span className="text-5xl font-bold text-white">{percentage}%</span>
              </div>
              
              {/* Result Message */}
              <div className="flex items-center justify-center space-x-2 mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {allPassed ? "🎉 All Tests Passed!" : `${passedTests}/${totalTests} Tests Passed`}
                </h3>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-full bg-purple-900/50 rounded-full h-4 mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${parseFloat(percentage)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className={`h-4 rounded-full shadow-lg ${
                  allPassed 
                    ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                    : "bg-gradient-to-r from-yellow-500 to-orange-500"
                }`}
              />
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: "Tests Passed", 
                  value: `${passedTests}/${totalTests}`, 
                  icon: <CheckCircle className="w-6 h-6" />
                },
                { 
                  label: "Execution Time", 
                  value: executionTime ? `${executionTime}ms` : 'N/A', 
                  icon: <Clock className="w-6 h-6" />
                },
                { 
                  label: "Memory Used", 
                  value: formatMemory(memoryUsed), 
                  icon: <Cpu className="w-6 h-6" />
                },
                { 
                  label: "Time Taken", 
                  value: formatTime(timeTaken), 
                  icon: <TrendingUp className="w-6 h-6" />
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

        {/* Problem Statement */}
        {problemData && (
          <motion.div
            variants={ANIMATION_VARIANTS.slideUp}
            className="max-w-4xl mx-auto mb-8"
          >
            <Card className="p-6">
              <h3 className="text-2xl font-bold text-purple-200 mb-4">Problem Statement</h3>
              <p className="text-purple-100 text-lg leading-relaxed whitespace-pre-line">
                {problemData.problem_statement || problemData.description || ""}
              </p>
            </Card>
          </motion.div>
        )}

        {/* Test Results */}
        {testResults && testResults.length > 0 && (
          <motion.div
            variants={ANIMATION_VARIANTS.slideUp}
            className="max-w-4xl mx-auto mb-8"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-purple-200">Test Results</h3>
                <div className="flex items-center space-x-4">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      allPassed
                        ? "bg-green-900/30 text-green-300 border border-green-500/30"
                        : "bg-red-900/30 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {passedTests}/{totalTests} passed
                  </div>
                  <button
                    onClick={() => setExpandedTests(new Set(testResults.map((_: any, i: number) => i)))}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {expandedTests.size === testResults.length ? "Collapse All" : "Expand All"}
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {testResults.map((result: any, index: number) => {
                  const isExpanded = expandedTests.has(index);
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        result.passed
                          ? "bg-green-900/20 border-green-500/30 hover:bg-green-900/30"
                          : "bg-red-900/20 border-red-500/30 hover:bg-red-900/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => toggleTestExpansion(index)}
                          className="font-medium flex items-center space-x-3 hover:opacity-80 transition-opacity group"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-purple-300">Test {index + 1}:</span>
                            <span
                              className={`font-semibold ${result.passed ? "text-green-400" : "text-red-400"}`}
                            >
                              {result.passed ? "✅ Passed" : "❌ Failed"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {result.execution_time && (
                              <span className="text-xs text-purple-400">{result.execution_time}ms</span>
                            )}
                            <span className="text-lg group-hover:scale-110 transition-transform">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Expandable Test Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 mt-4 pt-4 border-t border-purple-500/20"
                          >
                            {/* Test Case Input */}
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-purple-300">Input:</span>
                              </div>
                              <div className="p-3 bg-black/30 rounded-lg border border-purple-500/20 font-mono text-sm">
                                {result.input ? (
                                  typeof result.input === "string" ? (
                                    result.input
                                  ) : (
                                    JSON.stringify(result.input, null, 2)
                                  )
                                ) : (
                                  <span className="text-purple-400 opacity-75">No input data</span>
                                )}
                              </div>
                            </div>

                            {!result.passed && (
                              <div className="space-y-4">
                                {/* Error Message */}
                                {result.error && (
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-sm font-medium text-red-300">Error:</span>
                                    </div>
                                    <div className="p-3 bg-red-900/30 rounded-lg border border-red-500/30 text-red-200 text-sm font-mono">
                                      {typeof result.error === "string"
                                        ? result.error
                                        : JSON.stringify(result.error)}
                                    </div>
                                  </div>
                                )}

                                {/* Expected vs Actual Output */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-sm font-medium text-green-300">Expected Output:</span>
                                    </div>
                                    <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/30 text-green-200 text-sm font-mono">
                                      {result.expected !== undefined && result.expected !== null ? (
                                        typeof result.expected === "string"
                                          ? result.expected
                                          : JSON.stringify(result.expected, null, 2)
                                      ) : (
                                        <span className="text-green-400 opacity-75">No expected output</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className="text-sm font-medium text-red-300">Your Output:</span>
                                    </div>
                                    <div className="p-3 bg-red-900/20 rounded-lg border border-red-500/30 text-red-200 text-sm font-mono">
                                      {result.output ? (
                                        typeof result.output === "string"
                                          ? result.output
                                          : JSON.stringify(result.output, null, 2)
                                      ) : (
                                        <span className="text-red-400 opacity-75">No output</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Success Message */}
                            {result.passed && (
                              <div className="flex items-center space-x-2 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                                <span className="text-green-400">✅</span>
                                <span className="text-green-300 text-sm font-medium">
                                  Output matches expected result
                                </span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* AI Feedback Section */}
        {(aiFeedback || isPollingFeedback) && (
          <motion.div
            variants={ANIMATION_VARIANTS.slideUp}
            className="max-w-4xl mx-auto mb-8"
          >
            <Card className={`p-6 border-2 transition-all duration-500 ${isPollingFeedback ? 'border-blue-500/30 bg-blue-900/10' : 'border-purple-500/30'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isPollingFeedback ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    <Brain className={`w-6 h-6 ${isPollingFeedback ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">AI Code Insights</h3>
                    <p className="text-purple-300/70 text-sm">
                      {isPollingFeedback ? "Analyzing your solution..." : "Neural analysis of your code"}
                    </p>
                  </div>
                </div>
                {!isPollingFeedback && aiFeedback?.overall_score && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {aiFeedback.overall_score}/100
                    </div>
                    <div className="text-xs text-purple-400 px-2">Quality Score</div>
                  </div>
                )}
              </div>

              {isPollingFeedback ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          scale: [1, 1.5, 1],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{ 
                          duration: 1, 
                          repeat: Infinity, 
                          delay: i * 0.2 
                        }}
                        className="w-3 h-3 bg-blue-400 rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-blue-300 font-medium animate-pulse">Consulting the AI brain...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Correctness & Performance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiFeedback.correctness && (
                      <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center space-x-2 mb-3 text-green-400">
                          <ShieldCheck className="w-5 h-5" />
                          <h4 className="font-bold">Correctness</h4>
                        </div>
                        <ul className="space-y-2">
                          {aiFeedback.correctness.issues?.map((issue: string, i: number) => (
                            <li key={i} className="text-sm text-purple-100 flex items-start space-x-2">
                              <span className="text-red-400 mt-1">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                          {aiFeedback.correctness.suggestions?.map((suggestion: string, i: number) => (
                            <li key={i} className="text-sm text-green-100 flex items-start space-x-2">
                              <span className="text-green-400 mt-1">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiFeedback.performance && (
                      <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center space-x-2 mb-3 text-blue-400">
                          <Zap className="w-5 h-5" />
                          <h4 className="font-bold">Performance</h4>
                        </div>
                        <div className="mb-3 space-y-1">
                          <div className="text-xs text-purple-400 uppercase tracking-wider">Complexity</div>
                          <div className="flex space-x-4">
                            <span className="text-sm bg-purple-500/10 px-2 py-0.5 rounded text-purple-200">Time: {aiFeedback.performance.time_complexity}</span>
                            <span className="text-sm bg-purple-500/10 px-2 py-0.5 rounded text-purple-200">Space: {aiFeedback.performance.space_complexity}</span>
                          </div>
                        </div>
                        <ul className="space-y-2">
                          {aiFeedback.performance.optimizations?.map((opt: string, i: number) => (
                            <li key={i} className="text-sm text-purple-100 flex items-start space-x-2">
                              <span className="text-blue-400 mt-1">•</span>
                              <span>{opt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Best Practices */}
                  {aiFeedback.code_quality && (
                    <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
                      <div className="flex items-center space-x-2 mb-3 text-yellow-400">
                        <Lightbulb className="w-5 h-5" />
                        <h4 className="font-bold">Best Practices & Quality</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">Techniques</div>
                          <div className="flex flex-wrap gap-2">
                            {aiFeedback.code_quality.best_practices?.map((practice: string, i: number) => (
                              <span key={i} className="text-xs bg-green-500/10 text-green-300 px-2 py-1 rounded border border-green-500/20">
                                {practice}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-400 uppercase tracking-wider mb-2">Code Smells</div>
                          <div className="flex flex-wrap gap-2">
                            {aiFeedback.code_quality.code_smells?.map((smell: string, i: number) => (
                              <span key={i} className="text-xs bg-red-500/10 text-red-300 px-2 py-1 rounded border border-red-500/20">
                                {smell}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alternative Approach */}
                  {aiFeedback.alternative_approaches && aiFeedback.alternative_approaches.length > 0 && (
                    <div className="bg-indigo-900/20 rounded-xl p-4 border border-indigo-500/20">
                      <h4 className="font-bold text-indigo-300 mb-3">Alternative Approach: {aiFeedback.alternative_approaches[0].approach}</h4>
                      <p className="text-sm text-purple-100 mb-3">{aiFeedback.alternative_approaches[0].description}</p>
                      <div className="flex space-x-4">
                        <span className="text-xs bg-indigo-500/10 px-2 py-1 rounded text-indigo-200">Complexity: {aiFeedback.alternative_approaches[0].complexity}</span>
                      </div>
                    </div>
                  )}

                  {/* Learning Points */}
                  {aiFeedback.learning_points && (
                    <div className="flex flex-wrap gap-2">
                      {aiFeedback.learning_points.map((point: string, i: number) => (
                        <span key={i} className="text-xs bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full border border-purple-500/20 italic">
                          # {point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Submitted Code */}
        {code && (
          <motion.div
            variants={ANIMATION_VARIANTS.slideUp}
            className="max-w-4xl mx-auto mb-8"
          >
            <Card className="p-6">
              <h3 className="text-2xl font-bold text-purple-200 mb-4">Your Solution</h3>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Language: {language}</span>
                </div>
                <pre className="text-sm text-gray-100 overflow-x-auto">
                  <code>{code}</code>
                </pre>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actual Answer (Reference Solution) */}
        {problemData?.reference_solution && (
          <motion.div
            variants={ANIMATION_VARIANTS.slideUp}
            className="max-w-4xl mx-auto mb-8"
          >
            <Card className="p-6 border-2 border-green-500/30 bg-green-900/10 shadow-lg shadow-green-500/10">
              <h3 className="text-2xl font-bold text-green-300 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Actual Answer
              </h3>
              <div className="bg-black/40 rounded-lg p-4 border border-green-500/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Reference Implementation</span>
                </div>
                <pre className="text-sm text-green-50/90 font-mono overflow-x-auto">
                  <code>{problemData.reference_solution}</code>
                </pre>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          variants={ANIMATION_VARIANTS.slideUp}
          className="text-center mb-8 space-x-4"
        >
          <Link to="/dashboard">
            <Button variant="primary" size="lg">
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
};

export default CodingResults;

