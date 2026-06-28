import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Code, CheckCircle, Clock, Cpu, TrendingUp, ArrowLeft, Brain, Lightbulb, Zap, ShieldCheck, ChevronDown } from "lucide-react";
import codingService from "../api/codingService";
import assessmentService from "../api/assessmentService";
import { toast } from "react-hot-toast";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import ProgressRing from "../components/ui/ProgressRing";
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
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="No Results Found"
          message="No coding assessment results were found. Please complete a coding assessment first."
          actionText="Back to Dashboard"
          onAction={() => navigate("/dashboard")}
          icon={<Code className="mx-auto mb-4 h-16 w-16" />}
        />
      </div>
    );
  }

  const percentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : "0";
  const allPassed = passedTests === totalTests && totalTests > 0;

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
              Coding Assessment Results
            </h2>
            <p className="mt-2 text-muted-foreground">{title}</p>
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
                {allPassed ? "All Tests Passed! 🎉" : `${passedTests}/${totalTests} Tests Passed`}
              </h3>
              <p className="mt-1 max-w-sm text-muted-foreground">
                {allPassed ? "Flawless run across every test case." : "Review the failing cases below to refine your solution."}
              </p>
            </div>
          </div>

          {/* Metric tiles */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Tests Passed" value={`${passedTests}/${totalTests}`} icon={<CheckCircle className="h-4 w-4" />} accent={allPassed ? "success" : "warning"} />
            <StatTile label="Execution" value={executionTime ? `${executionTime}ms` : "N/A"} icon={<Clock className="h-4 w-4" />} accent="info" />
            <StatTile label="Memory" value={formatMemory(memoryUsed)} icon={<Cpu className="h-4 w-4" />} accent="secondary" />
            <StatTile label="Time Taken" value={formatTime(timeTaken)} icon={<TrendingUp className="h-4 w-4" />} accent="primary" />
          </div>
        </Card>
      </motion.div>

      {/* Problem Statement */}
      {problemData && (
        <motion.div variants={ANIMATION_VARIANTS.slideUp}>
          <Card className="p-6">
            <h3 className="mb-4 font-heading text-xl font-bold text-foreground">Problem Statement</h3>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {problemData.problem_statement || problemData.description || ""}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Test Results */}
      {testResults && testResults.length > 0 && (
        <motion.div variants={ANIMATION_VARIANTS.slideUp}>
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-foreground">Test Results</h3>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  allPassed
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}>
                  {passedTests}/{totalTests} passed
                </span>
                <button
                  onClick={() => setExpandedTests(expandedTests.size === testResults.length ? new Set() : new Set(testResults.map((_: any, i: number) => i)))}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
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
                    className={`rounded-xl border p-4 transition-colors ${
                      result.passed
                        ? "border-success/20 bg-success/5 hover:bg-success/10"
                        : "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                    }`}
                  >
                    <button
                      onClick={() => toggleTestExpansion(index)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Test {index + 1}:</span>
                        <span className={`font-semibold ${result.passed ? "text-success" : "text-destructive"}`}>
                          {result.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.execution_time && <span className="text-xs text-muted-foreground">{result.execution_time}ms</span>}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Expandable Test Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-4 overflow-hidden border-t border-border pt-4"
                        >
                          {/* Test Case Input */}
                          <div>
                            <span className="mb-2 block text-sm font-medium text-foreground">Input:</span>
                            <div className="rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm text-foreground">
                              {result.input ? (
                                typeof result.input === "string" ? result.input : JSON.stringify(result.input, null, 2)
                              ) : (
                                <span className="text-muted-foreground">No input data</span>
                              )}
                            </div>
                          </div>

                          {!result.passed && (
                            <div className="space-y-4">
                              {/* Error Message */}
                              {result.error && (
                                <div>
                                  <span className="mb-2 block text-sm font-medium text-destructive">Error:</span>
                                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 font-mono text-sm text-destructive">
                                    {typeof result.error === "string" ? result.error : JSON.stringify(result.error)}
                                  </div>
                                </div>
                              )}

                              {/* Expected vs Actual Output */}
                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div>
                                  <span className="mb-2 block text-sm font-medium text-success">Expected Output:</span>
                                  <div className="rounded-lg border border-success/20 bg-success/5 p-3 font-mono text-sm text-foreground">
                                    {result.expected !== undefined && result.expected !== null ? (
                                      typeof result.expected === "string" ? result.expected : JSON.stringify(result.expected, null, 2)
                                    ) : (
                                      <span className="text-muted-foreground">No expected output</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="mb-2 block text-sm font-medium text-destructive">Your Output:</span>
                                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 font-mono text-sm text-foreground">
                                    {result.output ? (
                                      typeof result.output === "string" ? result.output : JSON.stringify(result.output, null, 2)
                                    ) : (
                                      <span className="text-muted-foreground">No output</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Success Message */}
                          {result.passed && (
                            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3">
                              <CheckCircle className="h-4 w-4 text-success" />
                              <span className="text-sm font-medium text-success">Output matches expected result</span>
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
        <motion.div variants={ANIMATION_VARIANTS.slideUp}>
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${isPollingFeedback ? "bg-info/15 text-info" : "bg-primary/15 text-primary"}`}>
                  <Brain className={`h-6 w-6 ${isPollingFeedback ? "animate-pulse" : ""}`} />
                </span>
                <div>
                  <h3 className="font-heading text-xl font-bold text-foreground">AI Code Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    {isPollingFeedback ? "Analyzing your solution…" : "Neural analysis of your code"}
                  </p>
                </div>
              </div>
              {!isPollingFeedback && aiFeedback?.overall_score && (
                <div className="text-right">
                  <div className="text-gradient-primary text-3xl font-bold">{aiFeedback.overall_score}/100</div>
                  <div className="text-xs text-muted-foreground">Quality Score</div>
                </div>
              )}
            </div>

            {isPollingFeedback ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="h-3 w-3 rounded-full bg-info"
                    />
                  ))}
                </div>
                <p className="animate-pulse font-medium text-info">Consulting the AI brain…</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Correctness & Performance */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {aiFeedback.correctness && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center gap-2 text-success">
                        <ShieldCheck className="h-5 w-5" />
                        <h4 className="font-bold">Correctness</h4>
                      </div>
                      <ul className="space-y-2">
                        {aiFeedback.correctness.issues?.map((issue: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 text-destructive">•</span><span>{issue}</span>
                          </li>
                        ))}
                        {aiFeedback.correctness.suggestions?.map((suggestion: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 text-success">•</span><span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiFeedback.performance && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center gap-2 text-info">
                        <Zap className="h-5 w-5" />
                        <h4 className="font-bold">Performance</h4>
                      </div>
                      <div className="mb-3 space-y-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Complexity</div>
                        <div className="flex gap-3">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-sm text-foreground">Time: {aiFeedback.performance.time_complexity}</span>
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-sm text-foreground">Space: {aiFeedback.performance.space_complexity}</span>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {aiFeedback.performance.optimizations?.map((opt: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 text-info">•</span><span>{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Best Practices */}
                {aiFeedback.code_quality && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-warning">
                      <Lightbulb className="h-5 w-5" />
                      <h4 className="font-bold">Best Practices & Quality</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Techniques</div>
                        <div className="flex flex-wrap gap-2">
                          {aiFeedback.code_quality.best_practices?.map((practice: string, i: number) => (
                            <span key={i} className="rounded border border-success/20 bg-success/10 px-2 py-1 text-xs text-success">{practice}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Code Smells</div>
                        <div className="flex flex-wrap gap-2">
                          {aiFeedback.code_quality.code_smells?.map((smell: string, i: number) => (
                            <span key={i} className="rounded border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs text-destructive">{smell}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alternative Approach */}
                {aiFeedback.alternative_approaches && aiFeedback.alternative_approaches.length > 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <h4 className="mb-3 font-bold text-foreground">Alternative Approach: {aiFeedback.alternative_approaches[0].approach}</h4>
                    <p className="mb-3 text-sm text-muted-foreground">{aiFeedback.alternative_approaches[0].description}</p>
                    <span className="rounded bg-primary/10 px-2 py-1 text-xs text-foreground">Complexity: {aiFeedback.alternative_approaches[0].complexity}</span>
                  </div>
                )}

                {/* Learning Points */}
                {aiFeedback.learning_points && (
                  <div className="flex flex-wrap gap-2">
                    {aiFeedback.learning_points.map((point: string, i: number) => (
                      <span key={i} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs italic text-primary"># {point}</span>
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
        <motion.div variants={ANIMATION_VARIANTS.slideUp}>
          <Card className="p-6">
            <h3 className="mb-4 font-heading text-xl font-bold text-foreground">Your Solution</h3>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="mb-2 text-sm text-muted-foreground">Language: {language}</div>
              <pre className="overflow-x-auto text-sm text-foreground"><code>{code}</code></pre>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Actual Answer (Reference Solution) */}
      {problemData?.reference_solution && (
        <motion.div variants={ANIMATION_VARIANTS.slideUp}>
          <Card className="border-success/30 bg-success/5 p-6">
            <h3 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-success">
              <CheckCircle className="h-6 w-6" />
              Reference Answer
            </h3>
            <div className="rounded-lg border border-success/20 bg-muted/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-success">Reference Implementation</div>
              <pre className="overflow-x-auto font-mono text-sm text-foreground"><code>{problemData.reference_solution}</code></pre>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div variants={ANIMATION_VARIANTS.slideUp} className="flex flex-wrap justify-center gap-3 pt-2">
        <Link to="/dashboard">
          <Button variant="primary" size="lg">Back to Dashboard</Button>
        </Link>
        <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default CodingResults;

