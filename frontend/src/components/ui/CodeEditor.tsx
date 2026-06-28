import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../contexts/ToastContext';
import Button from './Button';

interface CodeEditorProps {
  language: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onExecute?: (code: string) => void;
  onTest?: (code: string, testCases: any[]) => void;
  testCases?: any[];
  readOnly?: boolean;
  className?: string;
}

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  execution_time: number;
  memory_used: number;
  results?: any[];
  passed_tests?: number;
  total_tests?: number;
  success_rate?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  initialCode = '',
  onCodeChange,
  onExecute,
  onTest,
  testCases = [],
  readOnly = false,
  className = ''
}) => {
  const [code, setCode] = useState(initialCode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'output' | 'tests' | 'debug'>('output');
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [variables, setVariables] = useState<any>({});
  const [callStack, setCallStack] = useState<any[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { success, error: showError } = useToast();

  // Language-specific templates
  const languageTemplates = {
    python: `# Write your solution here
def solution():
    # Your code here
    pass

# Test your solution
if __name__ == "__main__":
    # Add your test cases here
    pass`,
    javascript: `// Write your solution here
function solution() {
    // Your code here
}

// Test your solution
// Add your test cases here`,
    java: `// Write your solution here
public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
    cpp: `// Write your solution here
#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
    go: `// Write your solution here
package main

import "fmt"

func main() {
    // Your code here
}`
  };

  useEffect(() => {
    if (initialCode && !code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readOnly) {
      setCode(e.target.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      
      // Update cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const executeCode = async () => {
    if (!code.trim()) {
      showError('Please write some code first');
      return;
    }

    setIsExecuting(true);
    setShowOutput(true);
    setSelectedTab('output');

    try {
      // Use parent's onExecute callback if provided, otherwise use internal logic
      if (onExecute) {
        await onExecute(code);
      } else {
        const response = await fetch('/api/coding/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            code,
            language,
            timeout: 10,
            test_cases: []
          })
        });

        const payload = await response.json();
        const exec = payload.execution_result || payload;
        const result: ExecutionResult = {
          success: !!payload.success,
          output: exec?.output,
          error: exec?.error,
          execution_time: exec?.execution_time || 0,
          memory_used: exec?.memory_used || 0,
          results: exec?.results || [],
          passed_tests: (exec?.results || []).filter((r: any) => r.passed).length,
          total_tests: (exec?.results || []).length
        };
        setExecutionResult(result);

        if (result.success) {
          success('Code executed successfully!');
        } else {
          showError(result.error || 'Execution failed');
        }
      }
    } catch (err) {
      showError('Failed to execute code');
      console.error('Execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const testCode = async () => {
    if (!code.trim()) {
      showError('Please write some code first');
      return;
    }

    if (testCases.length === 0) {
      showError('No test cases available');
      return;
    }

    setIsExecuting(true);
    setShowOutput(true);
    setSelectedTab('tests');

    try {
      // Use parent's onTest callback if provided, otherwise use internal logic
      if (onTest) {
        await onTest(code, testCases);
      } else {
        const response = await fetch('/api/coding/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            code,
            language,
            test_cases: testCases,
            timeout: 10
          })
        });

        const payload = await response.json();
        const exec = payload.execution_result || payload;
        const result: ExecutionResult = {
          success: !!payload.success,
          output: exec?.output,
          error: exec?.error,
          execution_time: exec?.execution_time || 0,
          memory_used: exec?.memory_used || 0,
          results: exec?.results || [],
          passed_tests: (exec?.results || []).filter((r: any) => r.passed).length,
          total_tests: (exec?.results || []).length
        };
        setExecutionResult(result);

        if (result.success) {
          success(`Tests passed: ${result.passed_tests}/${result.total_tests}`);
        } else {
          showError(`Tests failed: ${result.passed_tests}/${result.total_tests} passed`);
        }
      }
    } catch (err) {
      showError('Failed to run tests');
      console.error('Test error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const debugCode = async () => {
    if (!code.trim()) {
      showError('Please write some code first');
      return;
    }

    setIsExecuting(true);
    setShowOutput(true);
    setSelectedTab('debug');

    try {
      const response = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          code,
          language,
          test_cases: [],
          timeout: 10
        })
      });

      const payload = await response.json();
      const exec = payload.execution_result || payload;
      const result: ExecutionResult = {
        success: !!payload.success,
        output: exec?.output,
        error: exec?.error,
        execution_time: exec?.execution_time || 0,
        memory_used: exec?.memory_used || 0,
        results: exec?.results || [],
        passed_tests: (exec?.results || []).filter((r: any) => r.passed).length,
        total_tests: (exec?.results || []).length
      };
      setExecutionResult(result);
      setVariables(result.variables || {});
      setCallStack(result.call_stack || []);

      if (result.success) {
        success('Debug session completed');
      } else {
        showError(result.error || 'Debug failed');
      }
    } catch (err) {
      showError('Failed to debug code');
      console.error('Debug error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatCode = async () => {
    try {
      const response = await fetch('/api/execute/format-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          code,
          language
        })
      });

      const result = await response.json();
      setCode(result.formatted_code);
      success('Code formatted successfully');
    } catch (err) {
      showError('Failed to format code');
    }
  };

  const resetCode = () => {
    setCode(languageTemplates[language as keyof typeof languageTemplates] || '');
    setExecutionResult(null);
    setShowOutput(false);
  };

  const toggleBreakpoint = (lineNumber: number) => {
    if (breakpoints.includes(lineNumber)) {
      setBreakpoints(breakpoints.filter(bp => bp !== lineNumber));
    } else {
      setBreakpoints([...breakpoints, lineNumber].sort());
    }
  };

  const getLineNumbers = () => {
    return code.split('\n').map((_, index) => index + 1);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm font-mono text-gray-300">{language.toUpperCase()}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={formatCode}
            disabled={isExecuting}
          >
            Format
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetCode}
            disabled={isExecuting}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex">
        {/* Line Numbers */}
        <div className="bg-gray-900 text-gray-500 text-sm font-mono p-2 select-none">
          {getLineNumbers().map((lineNumber) => (
            <div
              key={lineNumber}
              className={`h-6 flex items-center justify-center cursor-pointer hover:bg-gray-800 ${
                breakpoints.includes(lineNumber) ? 'bg-red-500/20' : ''
              }`}
              onClick={() => toggleBreakpoint(lineNumber)}
            >
              {lineNumber}
            </div>
          ))}
        </div>

        {/* Code Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none outline-none border-none"
            style={{ lineHeight: '1.5' }}
            placeholder={languageTemplates[language as keyof typeof languageTemplates]}
          />
          
          {/* Breakpoint Indicators */}
          {breakpoints.map((lineNumber) => (
            <div
              key={lineNumber}
              className="absolute left-0 w-4 h-6 bg-red-500 rounded-full transform -translate-x-2"
              style={{ top: `${(lineNumber - 1) * 24}px` }}
            />
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <Button
            variant="primary"
            onClick={executeCode}
            disabled={isExecuting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExecuting ? 'Running...' : '▶ Run'}
          </Button>
          
          {testCases.length > 0 && (
            <Button
              variant="primary"
              onClick={testCode}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExecuting ? 'Testing...' : '🧪 Test'}
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={debugCode}
            disabled={isExecuting}
          >
            🐛 Debug
          </Button>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-400">
          {executionResult && (
            <>
              <span>Time: {executionResult.execution_time.toFixed(2)}ms</span>
              <span>Memory: {executionResult.memory_used.toFixed(2)}MB</span>
            </>
          )}
        </div>
      </div>

      {/* Output Panel */}
      {showOutput && executionResult && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className="border-t border-gray-700"
        >
          <div className="bg-gray-800">
            {/* Output Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  selectedTab === 'output'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSelectedTab('output')}
              >
                Output
              </button>
              {executionResult.results && (
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    selectedTab === 'tests'
                      ? 'text-green-400 border-b-2 border-green-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  onClick={() => setSelectedTab('tests')}
                >
                  Tests ({executionResult.passed_tests}/{executionResult.total_tests})
                </button>
              )}
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  selectedTab === 'debug'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSelectedTab('debug')}
              >
                Debug
              </button>
            </div>

            {/* Output Content */}
            <div className="p-4 max-h-64 overflow-y-auto">
              {selectedTab === 'output' && (
                <div className="space-y-2">
                  {executionResult.output && (
                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Output:</div>
                      <pre className="bg-gray-900 p-3 rounded text-sm text-green-400 font-mono whitespace-pre-wrap">
                        {executionResult.output}
                      </pre>
                    </div>
                  )}
                  {executionResult.error && (
                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Error:</div>
                      <pre className="bg-gray-900 p-3 rounded text-sm text-red-400 font-mono whitespace-pre-wrap">
                        {executionResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'tests' && executionResult.results && (
                <div className="space-y-3">
                  {executionResult.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${
                        result.passed
                          ? 'bg-green-900/20 border-green-500'
                          : 'bg-red-900/20 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Test Case {result.test_case}</span>
                        <span className={`text-sm ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                          {result.passed ? '✓ Passed' : '✗ Failed'}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><strong>Input:</strong> {JSON.stringify(result.input)}</div>
                        <div><strong>Expected:</strong> {JSON.stringify(result.expected_output)}</div>
                        <div><strong>Actual:</strong> {JSON.stringify(result.actual_output)}</div>
                        {result.error && (
                          <div className="text-red-400"><strong>Error:</strong> {result.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTab === 'debug' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">Variables:</div>
                    <pre className="bg-gray-900 p-3 rounded text-sm text-blue-400 font-mono">
                      {JSON.stringify(variables, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-300 mb-2">Call Stack:</div>
                    <pre className="bg-gray-900 p-3 rounded text-sm text-emerald-400 font-mono">
                      {JSON.stringify(callStack, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CodeEditor;
