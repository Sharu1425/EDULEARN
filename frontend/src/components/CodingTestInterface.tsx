"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Code, Play, CheckCircle, Clock, Lightbulb } from "lucide-react"
import { useToast } from "../contexts/ToastContext"
import { useTheme } from "../contexts/ThemeContext"
import { Editor } from "@monaco-editor/react"
import api from "../utils/api"
import { useProctoring } from "../hooks/useProctoring"
import ProctoringOverlay from "./ui/ProctoringOverlay"

interface TestCase {
  input: string | any
  expected_output?: string | any
  output?: string | any
  is_hidden: boolean
}

interface CodingQuestion {
  id: string
  title: string
  description: string
  problem_statement: string
  constraints: string[]
  examples: Array<{
    input: string
    output: string
    explanation: string
  }>
  hints: string[]
  points: number
  time_limit: number
  memory_limit: number
  test_cases: TestCase[]
}

interface CodingTestInterfaceProps {
  assessmentId: string
  question: CodingQuestion
  onComplete: (result: any) => void
}

const CodingTestInterface: React.FC<CodingTestInterfaceProps> = ({ assessmentId, question, onComplete }) => {
  const { success, error: showError, info } = useToast()
  const { colorScheme } = useTheme()

  // ── Proctoring ──────────────────────────────────────────────────────────
  const { violationCount, isWarningVisible, dismissWarning, lastViolationType } = useProctoring({
    maxViolations: 3,
    onAutoSubmit: () => {
      // Automatically triggers handleSubmit without waiting for user action
      if (!submitting) {
        handleSubmit()
      }
    },
    enabled: true,
  })
  const MAX_VIOLATIONS = 3;
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("python")
  const [executing, setExecuting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])
  const [showHints, setShowHints] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set())

  const languages = [
    { value: "python", label: "Python 3", template: "# Write your solution here\ndef solution():\n    # Your code here\n    pass" },
    { value: "c", label: "C (GCC)", template: "// Write your solution here\n#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Your code here\n    return 0;\n}" },
    { value: "cpp", label: "C++ (GCC)", template: "// Write your solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}" },
    { value: "java", label: "Java (OpenJDK)", template: "// Write your solution here\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}" },
  ]


  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      python: "python",
      c: "c",
      cpp: "cpp",
      java: "java",
      javascript: "javascript",
    }
    return languageMap[lang] || "python"
  }

  useEffect(() => {
    const selectedLang = languages.find((lang) => lang.value === language)
    if (selectedLang && (!code.trim() || code.trim() === "")) {
      setCode(selectedLang.template)
    }
  }, [language])

  const parseInput = (inputStr: string | any): any => {
    if (typeof inputStr !== "string") return inputStr
    
    try {
      if (inputStr.includes("=")) {
        const match = inputStr.match(/=\s*(.+)$/)
        if (match) {
          return JSON.parse(match[1].replace(/'/g, '"'))
        }
      }

      if (inputStr.startsWith("[") || inputStr.startsWith("{")) {
        return JSON.parse(inputStr.replace(/'/g, '"'))
      }

      if (inputStr.includes(" ")) {
        const parts = inputStr.split(" ").map((part) => {
          const num = Number.parseFloat(part)
          return isNaN(num) ? part : num
        })
        return parts.length === 1 ? parts[0] : parts
      }

      const num = Number.parseFloat(inputStr)
      return isNaN(num) ? inputStr : num
    } catch {
      return inputStr
    }
  }

  const parseOutput = (outputStr: string | any): any => {
    if (typeof outputStr !== "string") return outputStr
    
    try {
      if (outputStr.startsWith("[") || outputStr.startsWith("{")) {
        return JSON.parse(outputStr.replace(/'/g, '"'))
      }

      const num = Number.parseFloat(outputStr)
      if (!isNaN(num)) {
        return num
      }

      return outputStr
    } catch {
      return outputStr
    }
  }

  const handleRunCode = async () => {
    if (!code.trim()) {
      showError("Please write some code first")
      return
    }

    try {
      setExecuting(true)
      setTestResults([])

      console.log("🧪 [CODING_TEST] Executing code with test cases...")

      // Prepare test cases for execution
      const testCases = question.test_cases.map((testCase) => ({
        input: parseInput(testCase.input),
        output: parseOutput(testCase.expected_output || testCase.output || ""),
      }))

      console.log("🧪 [CODING_TEST] Test cases:", testCases)

      const response = await api.post("/api/coding/execute", {
        code,
        language,
        test_cases: testCases,
        timeout: 10,
      })

      console.log("🔍 [CODING_TEST] Response:", response.data)

      const exec = response.data.execution_result || response.data
      if (response.data.success && exec) {
        const results = exec.results || []
        setTestResults(results)

        const passed = results.filter((r: any) => r.passed).length
        const total = results.length

        console.log(`📊 [CODING_TEST] Results: ${passed}/${total} passed`)

        if (passed === total && total > 0) {
          success(`🎉 All ${total} test cases passed!`)
        } else if (total > 0) {
          info(`${passed}/${total} test cases passed. Check the results below.`)
        } else {
          success("Code executed successfully!")
        }
      } else {
        const errorMessage = exec?.error || response.data.error || "Execution failed"
        showError(`Execution failed: ${errorMessage}`)
      }
    } catch (err: any) {
      console.error("❌ [CODING_TEST] Execution error:", err)
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || "Code execution failed"
      showError(errorMessage)
    } finally {
      setExecuting(false)
    }
  }

  const handleSubmit = async () => {
    if (!code.trim()) {
      showError("Please write some code first")
      return
    }

    try {
      setSubmitting(true)

      console.log("📤 [CODING_TEST] Submitting solution...")

      // First, execute the code to validate
      const testCases = question.test_cases.map((testCase) => ({
        input: parseInput(testCase.input),
        output: parseOutput(testCase.expected_output || testCase.output || ""),
      }))

      const execResponse = await api.post("/api/coding/execute", {
        code,
        language,
        test_cases: testCases,
        timeout: 10,
      })

      const exec = execResponse.data.execution_result || execResponse.data
      if (!execResponse.data.success || !exec) {
        showError("Code failed test cases. Please fix your solution.")
        setTestResults(exec?.results || [])
        return
      }

      // We now allow submission even if some test cases fail
      const results = exec.results || []
      const passedCount = results.filter((r: any) => r.passed).length
      const totalCount = results.length
      
      setTestResults(results)
      
      if (passedCount < totalCount) {
        info(`Submitted with ${passedCount}/${totalCount} test cases passed.`)
      }

      // Now submit to teacher assessment
      const response = await api.post(`/api/teacher/assessments/${assessmentId}/submit-coding-student`, {
        problem_id: question.id,
        code: code,
        language: language,
      })

      if (response.data.success) {
        success("🎉 Solution submitted successfully!")
        onComplete(response.data)
      } else {
        showError(response.data.error || "Submission failed")
      }
    } catch (err: any) {
      console.error("❌ [CODING_TEST] Submission error:", err)

      // Handle FastAPI validation errors (422 status)
      let errorMessage = "Failed to submit solution";
      if (err.response?.status === 422 && err.response?.data?.detail) {
        // FastAPI validation errors come as an array of objects
        const validationErrors = err.response.data.detail;
        if (Array.isArray(validationErrors)) {
          errorMessage = validationErrors.map(error =>
            `${error.loc?.join('.') || 'Field'}: ${error.msg || 'Invalid value'}`
          ).join('; ');
        } else {
          errorMessage = validationErrors;
        }
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      showError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const showHint = () => {
    if (!question || hintsUsed >= question.hints.length) return
    setShowHints(true)
    setHintsUsed((prev) => prev + 1)
  }

  const toggleTestExpansion = (index: number) => {
    setExpandedTests((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen pt-20 px-4">
      {/* Proctoring Warning Overlay */}
      <ProctoringOverlay
        isVisible={isWarningVisible}
        violationCount={violationCount}
        maxViolations={MAX_VIOLATIONS}
        lastViolationType={lastViolationType}
        onDismiss={dismissWarning}
      />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-6 mb-6 bg-surface text-fg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Code className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-fg">{question.title}</h1>
                <p className="text-muted-fg">{question.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-fg">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{question.time_limit}s limit</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" />
                <span>{question.points} points</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem Statement */}
          <motion.div className="panel p-6 bg-surface text-fg">
            <h2 className="text-xl font-semibold mb-4">Problem Statement</h2>
            <p className="text-muted-fg whitespace-pre-wrap">{question.problem_statement}</p>
          </motion.div>

          {/* Constraints */}
          {question.constraints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="panel p-6 bg-elevated border-base"
            >
              <h3 className="text-lg font-semibold mb-3">Constraints</h3>
              <ul className="space-y-1">
                {question.constraints.map((constraint, index) => (
                  <li key={index} className="text-muted-fg">
                    • {constraint}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Examples */}
          {question.examples.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="panel p-6 bg-elevated border-base"
            >
              <h3 className="text-lg font-semibold mb-3">Examples</h3>
              <div className="space-y-4">
                {question.examples.map((example, index) => (
                  <div key={index} className="bg-elevated/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-fg font-medium mb-2">Input:</h4>
                        <pre className="text-muted-fg text-sm bg-elevated/50 p-2 rounded">{example.input}</pre>
                      </div>
                      <div>
                        <h4 className="text-fg font-medium mb-2">Output:</h4>
                        <pre className="text-muted-fg text-sm bg-elevated/50 p-2 rounded">{example.output}</pre>
                      </div>
                    </div>
                    {example.explanation && (
                      <div className="mt-3">
                        <h4 className="text-fg font-medium mb-1">Explanation:</h4>
                        <p className="text-muted-fg text-sm">{example.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Hints */}
          {question.hints && question.hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="panel p-6 bg-blue-900/20 border border-blue-500/30 rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-200 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
                  Hints ({hintsUsed}/{question.hints.length})
                </h3>
                {hintsUsed < question.hints.length && (
                  <button
                    onClick={showHint}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    💡 Show Next Hint
                  </button>
                )}
              </div>
              {showHints && hintsUsed > 0 && (
                <div className="space-y-2">
                  {question.hints.slice(0, hintsUsed).map((hint, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3"
                    >
                      <div className="text-sm text-blue-200 flex items-start space-x-2">
                        <span className="text-yellow-400 mt-0.5">💡</span>
                        <div>
                          <span className="font-semibold">Hint {index + 1}: </span>
                          {hint}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {hintsUsed === 0 && (
                <p className="text-blue-300 text-sm">Click "Show Next Hint" to reveal helpful tips for solving this problem.</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Code Editor */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="panel p-6 bg-elevated border-base"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-fg">💻 Code Editor</h2>
              <div className="flex items-center space-x-3">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 bg-purple-800/30 border border-purple-500/30 rounded text-purple-100 text-sm focus:outline-none focus:border-purple-400"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRunCode}
                  disabled={executing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded text-sm flex items-center space-x-2 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>{executing ? "Running..." : "▶️ Run Code"}</span>
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="border border-purple-500/20 rounded-lg overflow-hidden" style={{ minHeight: "500px" }}>
              <Editor
                height="500px"
                width="100%"
                defaultLanguage={getMonacoLanguage(language)}
                language={getMonacoLanguage(language)}
                theme={colorScheme === "dark" ? "vs-dark" : "light"}
                value={code}
                onChange={(value) => setCode(value || "")}
                onMount={(editor, monaco) => {
                  // ── Proctoring constraints for Monaco ──
                  editor.updateOptions({ contextmenu: false })
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => showError('Copying is disabled during the assessment.'))
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => showError('Pasting is disabled during the assessment.'))
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => showError('Cutting is disabled during the assessment.'))
                }}
                options={{
                  dragAndDrop: false,
                  dropIntoEditor: { enabled: false },
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  lineNumbers: "on",
                  renderLineHighlight: "all",
                  cursorBlinking: "blink",
                  cursorSmoothCaretAnimation: "on",
                  padding: { top: 16, bottom: 16 },
                  folding: true,
                  foldingStrategy: "indentation",
                  showFoldingControls: "always",
                  lineHeight: 1.6,
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
                  quickSuggestions: {
                    other: true,
                    comments: true,
                    strings: true,
                  },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  tabCompletion: "on",
                  wordBasedSuggestions: "currentDocument",
                  parameterHints: {
                    enabled: true,
                    cycle: true,
                  },
                  hover: {
                    enabled: true,
                    delay: 300,
                  },
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </div>
          </motion.div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-purple-900/20 rounded-lg p-6 border border-purple-500/30"
              style={{ maxHeight: "600px", display: "flex", flexDirection: "column" }}
            >
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h4 className="text-lg font-semibold text-purple-200 flex items-center">
                  <span className="mr-2">🧪</span>
                  Test Results
                </h4>
                <div className="flex items-center space-x-4">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      testResults.filter((r) => r.passed).length === testResults.length
                        ? "bg-green-900/30 text-green-300 border border-green-500/30"
                        : "bg-red-900/30 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {testResults.filter((r) => r.passed).length}/{testResults.length} passed
                  </div>
                  <button
                    onClick={() => setExpandedTests(new Set(testResults.map((_, i) => i)))}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {expandedTests.size === testResults.length ? "Collapse All" : "Expand All"}
                  </button>
                </div>
              </div>
              <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: "500px" }}>
                {testResults.map((result, index) => {
                  const isExpanded = expandedTests.has(index)
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
                            <span className={`font-semibold ${result.passed ? "text-green-400" : "text-red-400"}`}>
                              {result.passed ? "✅ Passed" : "❌ Failed"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-purple-400">{result.execution_time || 0}ms</span>
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
                              {/* Error Message (if compilation/runtime error) */}
                              {result.error && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-sm font-medium text-red-300">Error:</span>
                                  </div>
                                  <div className="p-3 bg-red-900/30 rounded-lg border border-red-500/30 text-red-200 text-sm font-mono">
                                    {typeof result.error === "string" ? result.error : JSON.stringify(result.error)}
                                  </div>
                                </div>
                              )}

                              {/* Always show Expected vs Actual Output for failed tests */}
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
                              <span className="text-green-300 text-sm font-medium">Output matches expected result</span>
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

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end"
          >
            <button
              onClick={handleSubmit}
              disabled={submitting || !code.trim()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>{submitting ? "Submitting..." : "Submit Solution"}</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default CodingTestInterface
