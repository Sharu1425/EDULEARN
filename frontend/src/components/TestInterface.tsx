import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Editor } from '@monaco-editor/react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import Card from './ui/Card';
import ConfirmDialog from './ui/ConfirmDialog';
import { useProctoring } from '../hooks/useProctoring';
import ProctoringOverlay from './ui/ProctoringOverlay';

interface Question {
  id: string;
  question?: string;
  options?: string[];
  correct_answer?: number;
  explanation?: string;
  points: number;
  // Coding problem fields
  type?: string;
  title?: string;
  description?: string;
  problem_statement?: string;
  constraints?: string[];
  examples?: Array<{
    input: any;
    output: any;
    explanation?: string;
  }>;
  test_cases?: Array<{
    input: any;
    output?: any;
    expected_output?: any;
    is_hidden?: boolean;
  }>;
  hints?: string[];
  topic?: string;
  difficulty?: string;
  tags?: string[];
  expected_complexity?: {
    time?: string;
    space?: string;
  };
}

interface Assessment {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  time_limit: number;
  questions: Question[];
  type?: string;
}

interface TestInterfaceProps {
  assessmentId: string;
  onComplete?: (result: any) => void;
}

interface CodingTestResult {
  passed: boolean;
  input: any;
  expected: any;
  output: any;
  execution_time?: number;
  error?: string;
  memory?: number;
  debug_info?: any;
}

const deriveProblemId = (question: Question, fallbackIndex: number): string => {
  const candidateKeys = ['problem_id', 'id', 'question_id', 'questionId', 'index'];

  for (const key of candidateKeys) {
    const rawValue = (question as any)?.[key];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }

    const numericValue = typeof rawValue === 'number'
      ? rawValue
      : parseInt(String(rawValue), 10);

    if (!Number.isNaN(numericValue) && numericValue >= 1) {
      return String(numericValue);
    }
  }

  return String(fallbackIndex + 1);
};

const TestInterface: React.FC<TestInterfaceProps> = ({ assessmentId, onComplete }) => {
  const { error: showError, success, info } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { colorScheme } = useTheme();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | string)[]>([]); // Can store MCQ index or code solution
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Coding-specific state
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [executing, setExecuting] = useState(false);
  const [testResults, setTestResults] = useState<CodingTestResult[]>([]);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
  const [codingStartTime] = useState(Date.now());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // ── Proctoring ──────────────────────────────────────────────────────────
  const { violationCount, isWarningVisible, dismissWarning, lastViolationType } = useProctoring({
    maxViolations: 3,
    onAutoSubmit: () => handleSubmit(),
    enabled: !!assessment,
  })

  const MAX_VIOLATIONS = 3;

  const languages = [
    { value: 'python', label: 'Python 3', template: '# Write your solution here\ndef solution():\n    pass' },
    { value: 'c', label: 'C (GCC)', template: '// Write your solution here\n#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your code here\n    return 0;\n}' },
    { value: 'cpp', label: 'C++ (GCC)', template: '// Write your solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}' },
    { value: 'java', label: 'Java (OpenJDK)', template: '// Write your solution here\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}' },
  ];

  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      python: 'python',
      c: 'c',
      cpp: 'cpp',
      java: 'java',
    };
    return languageMap[lang] || 'python';
  };

  const parseInput = (inputStr: string): any => {
    try {
      if (inputStr.includes("=")) {
        const match = inputStr.match(/=\s*(.+)$/);
        if (match) {
          return JSON.parse(match[1].replace(/'/g, '"'));
        }
      }
      if (inputStr.startsWith("[") || inputStr.startsWith("{")) {
        return JSON.parse(inputStr.replace(/'/g, '"'));
      }
      if (inputStr.includes(" ")) {
        const parts = inputStr.split(" ").map((part) => {
          const num = Number.parseFloat(part);
          return isNaN(num) ? part : num;
        });
        return parts.length === 1 ? parts[0] : parts;
      }
      const num = Number.parseFloat(inputStr);
      return isNaN(num) ? inputStr : num;
    } catch {
      return inputStr;
    }
  };

  const parseOutput = (outputStr: string): any => {
    try {
      if (outputStr.startsWith("[") || outputStr.startsWith("{")) {
        return JSON.parse(outputStr.replace(/'/g, '"'));
      }
      const num = Number.parseFloat(outputStr);
      if (!isNaN(num)) {
        return num;
      }
      return outputStr;
    } catch {
      return outputStr;
    }
  };

  const validateCode = (code: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!code.trim()) {
      errors.push("Code cannot be empty");
    }
    if (language === "python") {
      const lines = code.split("\n");
      let indentLevel = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim()) {
          const currentIndent = line.length - line.trimStart().length;
          if (currentIndent > indentLevel + 4) {
            errors.push(`Line ${i + 1}: Unexpected indentation`);
          }
          if (line.trim().endsWith(":")) {
            indentLevel = currentIndent;
          }
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  };

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

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && assessment) {
      handleSubmit();
    }
  }, [timeLeft, assessment]);

  // Initialize code template when question changes or language changes
  useEffect(() => {
    if (!assessment || !assessment.questions || assessment.questions.length === 0) return;

    const currentQ = assessment.questions[currentQuestionIndex];
    if (!currentQ) return;

    const isCoding = currentQ.type === 'coding' ||
      currentQ.problem_statement ||
      (currentQ.title && !currentQ.question) ||
      assessment.type === 'ai_coding' ||
      assessment.type === 'coding';

    if (isCoding) {
      const selectedLang = languages.find((lang) => lang.value === language);
      if (selectedLang) {
        // Load saved code if exists, otherwise use template
        const savedCode = answers[currentQuestionIndex];
        if (typeof savedCode === 'string' && savedCode.trim()) {
          setCode(savedCode);
        } else if (!code.trim() || code.trim() === '') {
          setCode(selectedLang.template);
        }
      }
    } else {
      setCode('');
      setTestResults([]);
    }
  }, [language, currentQuestionIndex, assessment]);

  // Save code when it changes (for coding problems)
  useEffect(() => {
    if (!assessment || !assessment.questions || assessment.questions.length === 0) return;

    const currentQ = assessment.questions[currentQuestionIndex];
    if (!currentQ) return;

    const isCoding = currentQ.type === 'coding' ||
      currentQ.problem_statement ||
      (currentQ.title && !currentQ.question) ||
      assessment.type === 'ai_coding' ||
      assessment.type === 'coding';

    if (isCoding && code.trim()) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = code;
      setAnswers(newAnswers);
    }
  }, [code]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      console.log("📊 [TEST] Fetching assessment:", assessmentId);

      // Try teacher endpoint first, then student endpoint
      let response;
      try {
        response = await api.get(`/api/assessments/teacher/${assessmentId}`);
        console.log("✅ [TEST] Fetched from teacher endpoint");
      } catch (teacherError) {
        console.log("⚠️ [TEST] Teacher endpoint failed, trying student endpoint");
        response = await api.get(`/api/assessments/${assessmentId}/details`);
        console.log("✅ [TEST] Fetched from student endpoint");
      }

      const data = response.data;
      console.log("📊 [TEST] Assessment data:", data);
      console.log("📊 [TEST] Questions count:", data.questions?.length);

      setAssessment(data);
      setTimeLeft(data.time_limit * 60); // Convert minutes to seconds
      // Initialize answers array - will store MCQ index (number) or code solution (string)
      setAnswers(new Array(data.questions.length).fill(-1));
    } catch (error: any) {
      console.error('❌ [TEST] Failed to fetch assessment:', error);
      console.error('❌ [TEST] Error details:', error.response?.data);
      showError('Error', error.response?.data?.detail || 'Failed to load assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < assessment!.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const runCode = async () => {
    const currentQ = assessment!.questions[currentQuestionIndex];
    const isCoding = currentQ.type === 'coding' ||
      currentQ.problem_statement ||
      (currentQ.title && !currentQ.question) ||
      assessment!.type === 'ai_coding' ||
      assessment!.type === 'coding';

    if (!isCoding || !code.trim()) {
      showError('Please write some code first');
      return;
    }

    const validation = validateCode(code);
    if (!validation.isValid) {
      showError(`Code validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setExecuting(true);
    setTestResults([]);

    try {
      const testCases = currentQ.test_cases ||
        (currentQ.examples || []).map((example: any, index: number) => ({
          input: parseInput(typeof example.input === 'string' ? example.input : JSON.stringify(example.input)),
          output: parseOutput(typeof example.output === 'string' ? example.output : JSON.stringify(example.output)),
          description: `Example ${index + 1}`,
        }));

      console.log("🧪 [EXECUTION] Using test cases:", testCases.length);

      const response = await api.post("/api/coding/execute", {
        code: code,
        language,
        test_cases: testCases,
        timeout: 10,
      });

      const exec = response.data.execution_result || response.data;
      if (response.data.success && exec) {
        const results = exec.results || [];
        setTestResults(results);

        const passed = results.filter((r: any) => r.passed).length;
        const total = results.length;

        if (passed === total && total > 0) {
          success(`All ${total} test cases passed! 🎉`);
        } else if (total > 0) {
          info(`${passed}/${total} test cases passed. Check the results below for details.`);
        } else {
          success("Code executed successfully!");
        }
      } else {
        const errorMessage = exec?.error || response.data.error || "Execution failed";
        showError(`Execution failed: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("Execution error:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || "Code execution failed.";
      showError(errorMessage);
    } finally {
      setExecuting(false);
    }
  };

  const submitCodeSolution = async () => {
    const currentQ = assessment!.questions[currentQuestionIndex];

    if (!code.trim()) {
      showError('Please write some code first');
      return;
    }

    const validation = validateCode(code);
    if (!validation.isValid) {
      showError(`Code validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    // Show confirmation dialog
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmitCode = async () => {
    setShowSubmitConfirm(false);
    const currentQ = assessment!.questions[currentQuestionIndex];

    setSubmitting(true);

    try {
      // Run tests first to validate
      const testCases = currentQ.test_cases ||
        (currentQ.examples || []).map((example: any, index: number) => ({
          input: parseInput(typeof example.input === 'string' ? example.input : JSON.stringify(example.input)),
          output: parseOutput(typeof example.output === 'string' ? example.output : JSON.stringify(example.output)),
          description: `Example ${index + 1}`,
        }));

      const execResponse = await api.post("/api/coding/execute", {
        code: code,
        language,
        test_cases: testCases,
        timeout: 10,
      });

      const exec = execResponse.data.execution_result || execResponse.data;
      if (!execResponse.data.success || !exec) {
        showError("Code failed test cases. Please fix your solution.");
        setTestResults(exec?.results || []);
        setSubmitting(false);
        return;
      }

      const results = exec.results || [];
      setTestResults(results);

      const passed = results.filter((r: any) => r.passed).length;
      const total = results.length;

      // Check if all tests passed
      if (passed < total) {
        showError(`Only ${passed}/${total} test cases passed. Fix your solution before submitting.`);
        setSubmitting(false);
        return;
      }

      // Submit to teacher assessment
      const problemId = deriveProblemId(currentQ, currentQuestionIndex);

      const requestBody = {
        problem_id: problemId,
        code: code,
        language: language,
      };

      const response = await api.post(`/api/teacher/assessments/${assessmentId}/submit-coding-student`, requestBody);

      if (response.data.success) {
        success('🎉 Solution submitted successfully!');

        // Prepare result state for CodingResults page
        const resultState = {
          assessmentId: assessmentId,
          assessmentTitle: assessment!.title,
          question: currentQ,
          code: code,
          language: language,
          testResults: results,
          executionTime: exec.execution_time,
          memoryUsed: exec.memory_used,
          passedTests: passed,
          totalTests: total,
          score: response.data.submission?.status === 'accepted' ? 1 : 0,
          timeTaken: Math.floor((Date.now() - codingStartTime) / 1000),
        };

        // Navigate to CodingResults page
        navigate('/coding-results', { state: resultState });

        // Call onComplete if provided
        if (onComplete) {
          onComplete(response.data);
        }
      } else {
        showError(response.data.error || "Submission failed");
      }
    } catch (error: any) {
      console.error("Submission error:", error);

      // Handle FastAPI validation errors (422 status)
      let errorMessage = "Code execution failed.";
      if (error.response?.status === 422 && error.response?.data?.detail) {
        // FastAPI validation errors come as an array of objects
        const validationErrors = error.response.data.detail;
        if (Array.isArray(validationErrors)) {
          errorMessage = validationErrors.map(err =>
            `${err.loc?.join('.') || 'Field'}: ${err.msg || 'Invalid value'}`
          ).join('; ');
        } else {
          errorMessage = validationErrors;
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Calculate score locally first (for MCQ questions)
      let score = 0;
      assessment!.questions.forEach((question, index) => {
        const answer = answers[index];
        if (typeof answer === 'number' && answer === question.correct_answer) {
          score++;
        }
        // For coding problems, score is handled by backend based on test results
      });

      const percentage = Math.round((score / assessment!.questions.length) * 100);
      const timeTaken = assessment!.time_limit * 60 - timeLeft;

      // Prepare answers for submission (MCQ indices and coding solutions)
      const submissionAnswers = answers.map((ans, idx) => {
        const q = assessment!.questions[idx];
        const isCoding = q.type === 'coding' ||
          q.problem_statement ||
          (q.title && !q.question) ||
          assessment!.type === 'ai_coding' ||
          assessment!.type === 'coding';
        if (isCoding) {
          return typeof ans === 'string' ? ans : '';
        }
        return typeof ans === 'number' ? ans : -1;
      });

      // Submit to backend
      const response = await api.post(`/api/assessments/${assessmentId}/submit`, {
        assessment_id: assessmentId,
        student_id: user?.id || '',
        answers: submissionAnswers,
        time_taken: timeTaken,
        score: score,
        percentage: percentage,
        submitted_at: new Date().toISOString(),
        is_completed: true
      });

      // Get response data - it may have question_reviews
      const responseData = response.data;
      const questionReviews = responseData.question_reviews || [];

      // Use backend score if available, otherwise use local score
      const finalScore = responseData.score !== undefined ? responseData.score : score;
      const finalPercentage = responseData.percentage !== undefined ? responseData.percentage : percentage;

      success('Success', 'Assessment submitted successfully!');

      // Prepare result state for Results page
      const resultState = {
        score: finalScore,
        totalQuestions: responseData.total_questions || assessment!.questions.length,
        topic: assessment!.topic,
        difficulty: assessment!.difficulty,
        questions: assessment!.questions.map((q, idx) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          answer: q.options?.[q.correct_answer || 0],
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: assessment!.difficulty,
          topic: assessment!.topic
        })),
        userAnswers: submissionAnswers.map((answer, questionIndex) => {
          const question = assessment!.questions[questionIndex];
          if (typeof answer === 'number' && answer >= 0 && question?.options?.[answer]) {
            return question.options[answer];
          }
          return '';
        }),
        timeTaken: timeTaken,
        explanations: assessment!.questions.map((q, idx) => ({
          questionIndex: idx,
          explanation: q.explanation || "",
        })),
        questionReviews: questionReviews
      };

      // Navigate to Results page with state
      navigate('/results', { state: resultState });

      // Call onComplete if provided (for backward compatibility)
      if (onComplete) {
        onComplete(response.data);
      }
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      showError('Error', 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-300">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">Assessment Not Found</h2>
          <p className="text-red-300">The assessment you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;

  // Detect if this is a coding problem
  const isCodingProblem = currentQuestion ? (
    currentQuestion.type === "coding" ||
    currentQuestion.problem_statement ||
    (currentQuestion.title && !currentQuestion.question) ||
    assessment?.type === "ai_coding" ||
    assessment?.type === "coding"
  ) : false;

  return (
    <div className="min-h-screen pt-20 px-4" style={{ backgroundColor: 'rgb(26, 32, 44)' }}>
      {/* Proctoring Warning Overlay */}
      <ProctoringOverlay
        isVisible={isWarningVisible}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
        lastViolationType={lastViolationType}
        onDismiss={dismissWarning}
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-white">{assessment.title}</h1>
            <div className="text-right">
              <div className={`font-bold text-xl ${timeLeft < 300 ? 'text-red-400 animate-pulse' : 'text-orange-500'
                }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-gray-400 text-sm">Time Remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between text-gray-400">
            <div>Question {currentQuestionIndex + 1} of {assessment.questions.length}</div>
            <div>{Math.round(progress)}% Complete</div>
          </div>
        </motion.div>

        {/* Question */}
        {isCodingProblem ? (
          // Two-column layout for coding problems
          <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] xl:grid-cols-[40%_60%] gap-6 mb-6">
            {/* Left Column: Problem Description */}
            <motion.div
              key={`problem-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="overflow-visible"
              style={{ minHeight: "600px" }}
            >
              <Card className="p-6 h-full" hover={false}>
                {/* Problem Statement */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                  <p className="text-foreground leading-relaxed whitespace-pre-line">
                    {currentQuestion.problem_statement || currentQuestion.description || ""}
                  </p>
                </div>

                {/* Examples */}
                {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Examples</h3>
                    <div className="space-y-4">
                      {currentQuestion.examples.map((example: any, idx: number) => (
                        <div key={idx} className="space-y-2 text-sm">
                          <div className="font-semibold text-foreground mb-2">Example {idx + 1}:</div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-foreground">Input: </span>
                              <span className="text-foreground font-mono">
                                {typeof example.input === "string" ? example.input : JSON.stringify(example.input)}
                              </span>
                            </div>
                            <div>
                              <span className="text-foreground">Output: </span>
                              <span className="text-foreground font-mono">
                                {typeof example.output === "string" ? example.output : JSON.stringify(example.output)}
                              </span>
                            </div>
                            {example.explanation && (
                              <div>
                                <span className="text-foreground">Explanation: </span>
                                <span className="text-foreground">{example.explanation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Cases (if visible) */}
                {currentQuestion.test_cases && currentQuestion.test_cases.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Test Cases</h3>
                    <div className="space-y-4">
                      {currentQuestion.test_cases.map((testCase: any, idx: number) => (
                        !testCase.is_hidden && (
                          <div key={idx} className="space-y-2 text-sm">
                            <div className="font-semibold text-foreground mb-2">Test Case {idx + 1}:</div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-foreground">Input: </span>
                                <span className="text-foreground font-mono">
                                  {typeof testCase.input === "string" ? testCase.input : JSON.stringify(testCase.input)}
                                </span>
                              </div>
                              {(testCase.expected_output !== undefined || testCase.output) && (
                                <div>
                                  <span className="text-foreground">Expected Output: </span>
                                  <span className="text-foreground font-mono">
                                    {typeof (testCase.expected_output || testCase.output) === "string"
                                      ? (testCase.expected_output || testCase.output)
                                      : JSON.stringify(testCase.expected_output || testCase.output)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Constraints</h3>
                    <ul className="space-y-1">
                      {currentQuestion.constraints.map((constraint: string, idx: number) => (
                        <li key={idx} className="text-foreground text-sm">
                          • {constraint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hints */}
                {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">Hints</h3>
                    <div className="space-y-2">
                      {currentQuestion.hints.map((hint: string, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3"
                        >
                          <div className="text-sm text-blue-200">
                            <span className="font-semibold">Hint {idx + 1}: </span>
                            {hint}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Right Column: Compiler Interface */}
            <motion.div
              key={`compiler-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <div style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}>
                <div className="p-6 flex flex-col h-full">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-foreground text-sm focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                      >
                        {languages.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            id="autocomplete-toggle"
                            name="autocomplete"
                            checked={autocompleteEnabled}
                            onChange={(e) => setAutocompleteEnabled(e.target.checked)}
                            className="w-4 h-4 text-gray-600 bg-white border-gray-300 rounded focus:ring-gray-400 focus:ring-2"
                          />
                          <span>Autocomplete</span>
                        </label>
                      </div>

                      <div className="text-sm text-foreground">
                        Time: {Math.floor((Date.now() - codingStartTime) / 1000)}s
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => runCode()}
                        disabled={executing || !code.trim()}
                        variant="outline"
                        size="sm"
                      >
                        {executing ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-1">Running...</span>
                          </>
                        ) : (
                          "▶️ Run"
                        )}
                      </Button>

                      <Button
                        onClick={() => submitCodeSolution()}
                        disabled={submitting || !code.trim()}
                        variant="primary"
                        size="sm"
                      >
                        {submitting ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-1">Submitting...</span>
                          </>
                        ) : (
                          "🚀 Submit"
                        )}
                      </Button>

                      <ConfirmDialog
                        isOpen={showSubmitConfirm}
                        onClose={() => setShowSubmitConfirm(false)}
                        onConfirm={handleConfirmSubmitCode}
                        title="Confirm Submission"
                        message="Are you sure you want to submit your solution? This action cannot be undone."
                        confirmText="Submit"
                        cancelText="Cancel"
                        variant="warning"
                        loading={submitting}
                      />
                    </div>
                  </div>

                  {/* Monaco Code Editor */}
                  <div
                    className="border border-purple-500/20 rounded-lg overflow-hidden"
                    style={{
                      minHeight: "500px",
                      maxHeight: "70vh",
                      flex: "1 1 auto",
                    }}
                  >
                    <Editor
                      height="100%"
                      width="100%"
                      defaultLanguage={getMonacoLanguage(language)}
                      language={getMonacoLanguage(language)}
                      theme={colorScheme === "dark" ? "vs-dark" : "light"}
                      value={code}
                      onChange={(value) => setCode(value || "")}
                      onMount={(editor, monaco) => {
                        // Configure language-specific features
                        if (language === "javascript") {
                          // Enable JavaScript-specific features
                          monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                            noSemanticValidation: false,
                            noSyntaxValidation: false,
                          })
                        }

                        // Configure editor for better autocomplete
                        editor.updateOptions({
                          suggest: {
                            showKeywords: autocompleteEnabled,
                            showSnippets: autocompleteEnabled,
                            showFunctions: autocompleteEnabled,
                            showConstructors: autocompleteEnabled,
                            showFields: autocompleteEnabled,
                            showVariables: autocompleteEnabled,
                            showClasses: autocompleteEnabled,
                            showStructs: autocompleteEnabled,
                            showInterfaces: autocompleteEnabled,
                            showModules: autocompleteEnabled,
                            showProperties: autocompleteEnabled,
                            showEvents: autocompleteEnabled,
                            showOperators: autocompleteEnabled,
                            showUnits: autocompleteEnabled,
                            showValues: autocompleteEnabled,
                            showConstants: autocompleteEnabled,
                            showEnums: autocompleteEnabled,
                            showEnumMembers: autocompleteEnabled,
                            showColors: autocompleteEnabled,
                            showFiles: autocompleteEnabled,
                            showReferences: autocompleteEnabled,
                            showFolders: autocompleteEnabled,
                            showTypeParameters: autocompleteEnabled,
                            showIssues: autocompleteEnabled,
                            showUsers: autocompleteEnabled,
                            showWords: autocompleteEnabled,
                          },
                        })
                      }}
                      options={{
                        // Basic editor settings
                        minimap: { enabled: false },
                        fontSize: 18,
                        wordWrap: "on",
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        lineNumbers: "on",
                        renderLineHighlight: "all",
                        cursorBlinking: "blink",
                        cursorSmoothCaretAnimation: "on",
                        padding: { top: 20, bottom: 20 },
                        folding: true,
                        foldingStrategy: "indentation",
                        showFoldingControls: "always",
                        lineHeight: 1.6,

                        // Syntax and error detection
                        glyphMargin: true,
                        lightbulb: {},
                        codeLens: true,
                        occurrencesHighlight: "singleFile",
                        selectionHighlight: true,
                        bracketPairColorization: { enabled: true },
                        guides: {
                          bracketPairs: true,
                          indentation: true,
                          highlightActiveIndentation: true,
                        },

                        // Error detection and validation
                        // Validation is handled by language services

                        // Autocomplete and suggestions
                        quickSuggestions: autocompleteEnabled
                          ? {
                            other: true,
                            comments: true,
                            strings: true,
                          }
                          : false,
                        suggestOnTriggerCharacters: autocompleteEnabled,
                        acceptSuggestionOnEnter: autocompleteEnabled ? "on" : "off",
                        tabCompletion: autocompleteEnabled ? "on" : "off",
                        wordBasedSuggestions: autocompleteEnabled ? "currentDocument" : "off",

                        // Language-specific autocomplete
                        suggest: {
                          showKeywords: autocompleteEnabled,
                          showSnippets: autocompleteEnabled,
                          showFunctions: autocompleteEnabled,
                          showConstructors: autocompleteEnabled,
                          showFields: autocompleteEnabled,
                          showVariables: autocompleteEnabled,
                          showClasses: autocompleteEnabled,
                          showStructs: autocompleteEnabled,
                          showInterfaces: autocompleteEnabled,
                          showModules: autocompleteEnabled,
                          showProperties: autocompleteEnabled,
                          showEvents: autocompleteEnabled,
                          showOperators: autocompleteEnabled,
                          showUnits: autocompleteEnabled,
                          showValues: autocompleteEnabled,
                          showConstants: autocompleteEnabled,
                          showEnums: autocompleteEnabled,
                          showEnumMembers: autocompleteEnabled,
                          showColors: autocompleteEnabled,
                          showFiles: autocompleteEnabled,
                          showReferences: autocompleteEnabled,
                          showFolders: autocompleteEnabled,
                          showTypeParameters: autocompleteEnabled,
                          showIssues: autocompleteEnabled,
                          showUsers: autocompleteEnabled,
                          showWords: autocompleteEnabled,
                        },

                        // Parameter hints
                        parameterHints: {
                          enabled: autocompleteEnabled,
                          cycle: true,
                        },

                        // Hover information
                        hover: {
                          enabled: true,
                          delay: 300,
                        },

                        // Formatting
                        formatOnPaste: true,
                        formatOnType: true,

                        // Accessibility
                        accessibilitySupport: "auto",

                        // Multi-cursor
                        multiCursorModifier: "ctrlCmd",

                        // Find and replace
                        find: {
                          seedSearchStringFromSelection: "always",
                          autoFindInSelection: "multiline",
                        },
                      }}
                    />
                  </div>

                  {/* Test Results */}
                  {testResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 bg-purple-900/20 rounded-lg p-4 border border-purple-500/30"
                      style={{ maxHeight: "600px", display: "flex", flexDirection: "column" }}
                    >
                      <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h4 className="text-lg font-semibold text-foreground flex items-center">
                          <span className="mr-2">🧪</span>
                          Test Results
                        </h4>
                        <div className="flex items-center space-x-4">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${testResults.filter((r) => r.passed).length === testResults.length
                              ? "bg-green-900/30 text-green-300 border border-green-500/30"
                              : "bg-red-900/30 text-red-300 border border-red-500/30"
                              }`}
                          >
                            {testResults.filter((r) => r.passed).length}/{testResults.length} passed
                          </div>
                          <button
                            onClick={() => setExpandedTests(new Set(testResults.map((_, i) => i)))}
                            className="text-xs text-foreground hover:text-muted-foreground transition-colors"
                          >
                            {expandedTests.size === testResults.length ? "Collapse All" : "Expand All"}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: "520px" }}>
                        {testResults.map((result, index) => {
                          const isExpanded = expandedTests.has(index)
                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border transition-all duration-200 ${result.passed
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
                                    <span className="text-sm font-medium text-foreground">Test {index + 1}:</span>
                                    <span
                                      className={`font-semibold ${result.passed ? "text-green-400" : "text-red-400"}`}
                                    >
                                      {result.passed ? "✅ Passed" : "❌ Failed"}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-foreground">{result.execution_time || 0}ms</span>
                                    <span className="text-lg group-hover:scale-110 transition-transform">
                                      {isExpanded ? "▼" : "▶"}
                                    </span>
                                  </div>
                                </button>
                              </div>

                              {/* Expandable Test Details */}
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
                                      <span className="text-sm font-medium text-foreground">Input:</span>
                                    </div>
                                    <div className="p-3 bg-black/30 rounded-lg border border-purple-500/20 font-mono text-sm">
                                      {result.input ? (
                                        typeof result.input === "string" ? (
                                          result.input
                                        ) : (
                                          JSON.stringify(result.input, null, 2)
                                        )
                                      ) : (
                                        <span className="text-foreground opacity-75">No input data</span>
                                      )}
                                    </div>
                                  </div>

                                  {!result.passed && (
                                    <div className="space-y-4">
                                      {/* Error Message (if compilation/runtime error) */}
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

                                      {/* Always show Expected vs Actual Output for failed tests */}
                                      <div className="space-y-4">
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

                                        {/* Debug Information */}
                                        {result.debug_info && (
                                          <div className="mt-4 p-4 bg-gray-900/30 rounded-lg border border-gray-500/30">
                                            <div className="flex items-center space-x-2 mb-3">
                                              <span className="text-sm font-medium text-yellow-300">Debug Analysis:</span>
                                            </div>
                                            <div className="space-y-3 text-sm">
                                              <div>
                                                <span className="text-yellow-300">Status: </span>
                                                <span className="text-yellow-200">{result.debug_info.status}</span>
                                              </div>
                                              <div>
                                                <span className="text-yellow-300">Comparison: </span>
                                                <span className="text-yellow-200">{result.debug_info.comparison?.message}</span>
                                              </div>
                                              {result.debug_info.comparison?.type === "different" && result.debug_info.comparison?.line_analysis?.first_difference && (
                                                <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600/30">
                                                  <div className="text-yellow-300 mb-2">First Difference at Line {result.debug_info.comparison.line_analysis.first_difference.line_number}:</div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                      <div className="text-red-300 text-xs mb-1">Your Output:</div>
                                                      <div className="p-2 bg-red-900/20 rounded text-red-200 font-mono text-xs">
                                                        {result.debug_info.comparison.line_analysis.first_difference.actual_line || "No output"}
                                                      </div>
                                                    </div>
                                                    <div>
                                                      <div className="text-green-300 text-xs mb-1">Expected:</div>
                                                      <div className="p-2 bg-green-900/20 rounded text-green-200 font-mono text-xs">
                                                        {result.debug_info.comparison.line_analysis.first_difference.expected_line || "No output"}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              {result.debug_info.execution_details && (
                                                <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-600/30">
                                                  <div className="text-yellow-300 mb-2">Execution Details:</div>
                                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                                    <div>
                                                      <span className="text-gray-400">Time: </span>
                                                      <span className="text-white">{result.debug_info.execution_details.time}s</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Memory: </span>
                                                      <span className="text-white">{result.debug_info.execution_details.memory}KB</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Exit Code: </span>
                                                      <span className="text-white">{result.debug_info.execution_details.exit_code}</span>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Wall Time: </span>
                                                      <span className="text-white">{result.debug_info.execution_details.wall_time}s</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
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
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // MCQ Question Display - Full Width
          <motion.div
            key={`question-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ backgroundColor: 'rgb(31, 41, 55)' }}
            className="rounded-lg p-8 mb-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-6">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {(currentQuestion.options || []).map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 rounded-lg bg-gray-800 border cursor-pointer transition-all hover:bg-gray-700 ${answers[currentQuestionIndex] === index
                    ? 'border-blue-500 bg-gray-700'
                    : 'border-gray-700'
                    }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    checked={answers[currentQuestionIndex] === index}
                    onChange={() => handleAnswerChange(currentQuestionIndex, index)}
                    className="mr-4 w-5 h-5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-200">{String.fromCharCode(65 + index)}. {option}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-300 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-2">
            {assessment.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${index === currentQuestionIndex
                  ? 'bg-blue-600 text-white'
                  : answers[index] !== -1
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === assessment.questions.length - 1 ? (
            !isCodingProblem ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Test'}</span>
              </button>
            ) : (
              <div className="text-gray-400 text-sm">
                Use the Submit button in the compiler to submit your solution
              </div>
            )
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Time Warning */}
        {timeLeft < 300 && timeLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 bg-orange-900/50 border border-orange-500/30 rounded-lg"
          >
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                Warning: Only {formatTime(timeLeft)} remaining!
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TestInterface;
