import os
import httpx
import time
import asyncio
import uuid
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
HACKEREARTH_API_URL = "https://api.hackerearth.com/v4/partner/code-evaluation/submissions/"
# Note: HackerEarth API v4 does not have a separate compile endpoint.
# The /submissions/ endpoint handles both compilation and execution.
HACKEREARTH_CLIENT_SECRET = os.getenv('HACKEREARTH_CLIENT_SECRET')

# Debug: Verify secret is loaded (remove in production)
if not HACKEREARTH_CLIENT_SECRET:
    print("[WARNING] [HACKEREARTH] HACKEREARTH_CLIENT_SECRET not found in environment variables")
    print("[WARNING] [HACKEREARTH] Please check your .env file in the backend directory")
else:
    print(f"[OK] [HACKEREARTH] Client secret loaded successfully (length: {len(HACKEREARTH_CLIENT_SECRET)})")

# Mapping our language names to HackerEarth's language codes
# Reference: https://www.hackerearth.com/docs/wiki/developers/v4/
LANGUAGE_MAP = {
    "python": "PYTHON",
    "java": "JAVA",
    "cpp": "C++",
    "c": "C",
    "javascript": "JAVASCRIPT",
    "csharp": "C#",
    "php": "PHP",
    "ruby": "RUBY",
    "go": "GO",
    "rust": "RUST",
}

# Default limits
DEFAULT_TIME_LIMIT = 5  # seconds
DEFAULT_MEMORY_LIMIT = 2463232  # bytes (approx 2.4 MB)


class HackerEarthExecutionService:
    def __init__(self):
        self.headers = {
            "client-secret": HACKEREARTH_CLIENT_SECRET or "",
            "Content-Type": "application/json"
        }

    async def run_tests(self, language: str, code: str, test_cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Executes code against multiple test cases and returns the results.
        """
        if not HACKEREARTH_CLIENT_SECRET:
            raise ValueError("HACKEREARTH_CLIENT_SECRET not configured in environment variables")
            
        if language not in LANGUAGE_MAP:
            raise ValueError(f"Unsupported language: {language}. Supported languages: {list(LANGUAGE_MAP.keys())}")

        lang_code = LANGUAGE_MAP[language]

        # Language-specific code preparation
        source_to_send = self._prepare_code(language, code)

        # Note: HackerEarth API v4's /submissions/ endpoint handles both compilation
        # and execution in a single request. Compilation is automatically tracked
        # in the compile quota when the code is compiled as part of submission.
        # Process each test case
        results = []
        for test_case in test_cases:
            try:
                result = await self._execute_single_test(
                    language=lang_code,
                    code=source_to_send,
                    test_case=test_case
                )
                results.append(result)
            except Exception as e:
                # Create error result for failed execution
                results.append({
                    "passed": False,
                    "input": test_case.get("input", ""),
                    "expected": test_case.get("output", test_case.get("expected_output", "")),
                    "output": "",
                    "execution_time": 0,
                    "memory": 0,
                    "error": f"Execution failed: {str(e)}",
                    "debug_info": {
                        "status": "Execution Error",
                        "error": str(e)
                    }
                })

        return results

    def _prepare_code(self, language: str, code: str) -> str:
        """Prepare code based on language requirements"""
        if language == "python":
            # Check if code uses input() directly (raw stdin reading like competitive programming)
            has_function = "def " in code or "class " in code
            has_input = "input()" in code or "sys.stdin" in code
            has_main_guard = '__name__' in code and '__main__' in code
            
            # If code already has a main guard, use as-is
            if has_main_guard:
                return code
            
            # If code uses input() directly (competitive programming style)
            # We need to execute it so it can read from stdin
            if has_input:
                # If there's a function that uses input(), call it directly
                if has_function:
                    # Find the first function and call it
                    # Simple approach: just execute the function
                    runner = (
                        "\n\nif __name__ == \"__main__\":\n"
                        "    import inspect\n"
                        "    funcs = [obj for name, obj in globals().items() if inspect.isfunction(obj) and getattr(obj, '__module__', '') == '__main__']\n"
                        "    if funcs:\n"
                        "        funcs[0]()\n"
                        "    else:\n"
                        "        # No function found, execute code directly (for inline input() calls)\n"
                        "        pass\n"
                    )
                    return f"{code}{runner}"
                else:
                    # Code uses input() but has no function structure, use as-is
                    return code
            
            # Python: Auto-execute first function with stdin as JSON
            runner = (
                "\n\nif __name__ == \"__main__\":\n"
                "    import sys, json, inspect\n"
                "    raw = sys.stdin.read().strip()\n"
                "    try:\n"
                "        data = json.loads(raw) if raw else None\n"
                "    except Exception:\n"
                "        data = raw\n"
                "    funcs = [obj for name, obj in globals().items() if inspect.isfunction(obj) and getattr(obj, '__module__', '') == '__main__']\n"
                "    result = None\n"
                "    if funcs:\n"
                "        f = funcs[0]\n"
                "        try:\n"
                "            if data is None:\n"
                "                result = f()\n"
                "            else:\n"
                "                # Pass data as single argument (most common for competitive programming)\n"
                "                # If function expects unpacked args, user can handle it in their code\n"
                "                result = f(data)\n"
                "        except Exception as e:\n"
                "            sys.stderr.write('Runtime Error: ' + str(e) + '\\n')\n"
                "            raise SystemExit(1)\n"
                "    if result is not None:\n"
                "        try:\n"
                "            print(json.dumps(result) if not isinstance(result, str) else result)\n"
                "        except Exception:\n"
                "            print(str(result))\n"
                "    elif not funcs:\n"
                "        sys.stderr.write('No callable function found to execute\\n')\n"
                "        raise SystemExit(1)\n"
            )
            return f"{code}{runner}"
        
        elif language == "c":
            # C: Ensure proper includes and main function
            if "int main" not in code and "void main" not in code:
                c_wrapper = (
                    "#include <stdio.h>\n"
                    "#include <stdlib.h>\n"
                    "#include <string.h>\n"
                    f"{code}\n"
                    "int main() {\n"
                    "    // Auto-wrapped main function\n"
                    "    return 0;\n"
                    "}\n"
                )
                return c_wrapper
            else:
                return code
        
        elif language == "cpp":
            # C++: Ensure proper includes
            if "#include" not in code:
                cpp_includes = (
                    "#include <iostream>\n"
                    "#include <vector>\n"
                    "#include <string>\n"
                    "#include <algorithm>\n"
                    "using namespace std;\n\n"
                )
                return cpp_includes + code
            else:
                return code
        
        elif language == "java":
            # Java: Ensure proper class structure
            if "public class" not in code and "class Solution" not in code:
                java_wrapper = (
                    f"public class Main {{\n"
                    f"{code}\n"
                    f"}}\n"
                )
                return java_wrapper
            else:
                return code
        
        else:
            # Other languages: use as-is
            return code

    async def _fetch_output_from_url(self, url: str) -> str:
        """Fetch actual output content from HackerEarth S3 URL"""
        try:
            print(f"[DEBUG] [HACKEREARTH] Fetching output from URL: {url}")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
            response.raise_for_status()
            content = response.text.strip()
            print(f"[DEBUG] [HACKEREARTH] Fetched content length: {len(content)}")
            return content
        except httpx.RequestError as e:
            print(f"[ERROR] [HACKEREARTH] Failed to fetch output from URL: {str(e)}")
            return ""
        except Exception as e:
            print(f"[ERROR] [HACKEREARTH] Unexpected error fetching output: {str(e)}")
            return ""

    async def _execute_single_test(self, language: str, code: str, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code for a single test case"""
        input_data = test_case.get("input", "")
        expected_output = test_case.get("output", test_case.get("expected_output", ""))

        # Format input data properly
        import json as _json
        if input_data:
            if isinstance(input_data, (list, dict)):
                # Convert list/dict to JSON string for input
                input_str = _json.dumps(input_data, separators=(',', ':'))
            else:
                # For strings, check if this is Python with input() usage
                # If so, ensure the string is properly quoted to avoid eval issues
                if language == "PYTHON" and isinstance(input_data, str):
                    # Check if code uses input() - if so, send quoted string to avoid Python 2 eval issues
                    if "input()" in code:
                        # Send as a properly quoted string so input() doesn't evaluate it
                        input_str = f'"{input_data}"'
                    else:
                        input_str = str(input_data)
                else:
                    # For other types or languages, convert to string
                    input_str = str(input_data)
        else:
            input_str = ""

        print(f"[DEBUG] [HACKEREARTH] Input data: {repr(input_data)}, Formatted input: {repr(input_str)}")
        print(f"[DEBUG] [HACKEREARTH] Code to execute:\n{code[:200]}...")

        # Prepare request payload
        unique_id = str(uuid.uuid4())
        payload = {
            "source": code,
            "lang": language,
            "time_limit": DEFAULT_TIME_LIMIT,
            "memory_limit": DEFAULT_MEMORY_LIMIT,
            "input": input_str,
            "id": unique_id
        }

        try:
            # Submit code to HackerEarth
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    HACKEREARTH_API_URL,
                    headers=self.headers,
                    json=payload
                )
            response.raise_for_status()
            
            result_data = response.json()
            
            # HackerEarth API v4 can return results immediately or use async polling
            # Check request_status to determine if we need to poll
            request_status_raw = result_data.get("request_status", "")
            if isinstance(request_status_raw, str):
                request_status = request_status_raw.upper()
            elif isinstance(request_status_raw, dict):
                request_status = request_status_raw.get("message", "").upper() or request_status_raw.get("status", "").upper()
            else:
                request_status = str(request_status_raw).upper() if request_status_raw else ""
            
            # If status indicates processing, poll for results
            if request_status == "REQUEST_QUEUED" or result_data.get("he_id"):
                # We have a submission ID, poll for results
                submission_id = result_data.get("he_id") or unique_id
                result_data = await self._poll_for_result(submission_id, max_retries=20)
            elif request_status != "SUCCESS":
                # Request failed, return error
                return self._format_error_result(result_data, test_case)

            # Format the result
            return await self._format_result(result_data, test_case)

        except httpx.RequestError as e:
            # Handle API request errors gracefully
            error_msg = str(e)
            print(f"[ERROR] [HACKEREARTH] API request failed: {error_msg}")
            return {
                "passed": False,
                "input": test_case.get("input", ""),
                "expected": test_case.get("output", test_case.get("expected_output", "")),
                "output": "",
                "execution_time": 0,
                "memory": 0,
                "error": f"HackerEarth API error: {error_msg}",
                "debug_info": {
                    "status": "API Error",
                    "error": error_msg
                }
            }
        except Exception as e:
            # Catch any other unexpected errors
            error_msg = str(e)
            print(f"[ERROR] [HACKEREARTH] Unexpected error: {error_msg}")
            return {
                "passed": False,
                "input": test_case.get("input", ""),
                "expected": test_case.get("output", test_case.get("expected_output", "")),
                "output": "",
                "execution_time": 0,
                "memory": 0,
                "error": f"Execution error: {error_msg}",
                "debug_info": {
                    "status": "Execution Error",
                    "error": error_msg
                }
            }

    async def _poll_for_result(self, submission_id: str, max_retries: int = 20) -> Dict[str, Any]:
        """Poll HackerEarth API for execution result"""
        # HackerEarth API v4 uses status endpoint to check submission status
        # Format: GET /v4/partner/code-evaluation/submissions/{he_id}/
        status_url = f"{HACKEREARTH_API_URL}{submission_id}/"
        
        for attempt in range(max_retries):
            if attempt > 0:
                await asyncio.sleep(1) # Wait 1 second between checks
            
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        status_url,
                        headers=self.headers
                    )
                response.raise_for_status()
                result = response.json()
                
                # Check request status
                request_status_raw = result.get("request_status", "")
                if isinstance(request_status_raw, str):
                    request_status = request_status_raw.upper()
                elif isinstance(request_status_raw, dict):
                    request_status = request_status_raw.get("message", "").upper() or request_status_raw.get("status", "").upper()
                else:
                    request_status = str(request_status_raw).upper() if request_status_raw else ""
                
                # If request is successful and result is available
                if request_status == "SUCCESS":
                    return result
                # If still processing, continue polling
                elif request_status == "REQUEST_QUEUED":
                    continue
                # If failed, return the error result
                else:
                    return result
                    
            except httpx.RequestError as e:
                # Log error but don't print full traceback for polling errors
                error_msg = str(e)
                if attempt == max_retries - 1:
                    print(f"[ERROR] [HACKEREARTH] Polling failed after {max_retries} attempts: {error_msg}")
                    return {
                        "request_status": "ERROR",
                        "result": {
                            "compile_status": "ERROR",
                            "run_status": {
                                "status": "ERROR",
                                "output": "",
                                "time_used": "0",
                                "memory_used": "0"
                            }
                        }
                    }
                # Continue polling on error (might be temporary network issue)
                print(f"[WARNING] [HACKEREARTH] Polling attempt {attempt + 1} failed: {error_msg}, retrying...")
                continue
            except Exception as e:
                # Catch any other unexpected errors during polling
                error_msg = str(e)
                print(f"[ERROR] [HACKEREARTH] Unexpected error during polling: {error_msg}")
                if attempt == max_retries - 1:
                    return {
                        "request_status": "ERROR",
                        "result": {
                            "compile_status": "ERROR",
                            "run_status": {
                                "status": "ERROR",
                                "output": "",
                                "time_used": "0",
                                "memory_used": "0"
                            }
                        }
                    }
                continue
        
        # If polling exhausted, return timeout status
        return {
            "request_status": "TIMEOUT",
            "result": {
                "compile_status": "OK",
                "run_status": {
                    "status": "TIME_LIMIT_EXCEEDED",
                    "output": "",
                    "time_used": "0",
                    "memory_used": "0"
                }
            }
        }

    async def _format_result(self, result_data: Dict[str, Any], test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Format HackerEarth API response to match expected format"""
        print(f"[DEBUG] [HACKEREARTH] Formatting result - result_data keys: {result_data.keys()}")
        # Extract result object from HackerEarth response
        result_obj = result_data.get("result", {})
        print(f"[DEBUG] [HACKEREARTH] Result object keys: {result_obj.keys() if isinstance(result_obj, dict) else 'Not a dict'}")
        
        # Get compile status - handle both string and dict formats
        compile_status_raw = result_obj.get("compile_status", "")
        if isinstance(compile_status_raw, dict):
            compile_status = compile_status_raw.get("message", "") or compile_status_raw.get("status", "")
        elif isinstance(compile_status_raw, str):
            compile_status = compile_status_raw
        else:
            compile_status = str(compile_status_raw) if compile_status_raw else ""
        
        # Check if compile_status contains a URL (e.g., to compilation output)
        if compile_status and compile_status.startswith("http"):
            compile_status = await self._fetch_output_from_url(compile_status)
        
        # Get run status
        run_status = result_obj.get("run_status", {})
        if isinstance(run_status, dict):
            status_raw = run_status.get("status")
            run_status_code = (status_raw or "").upper() if status_raw is not None else ""
        else:
            run_status_code = ""
        
        # Get outputs - handle None values explicitly
        if isinstance(run_status, dict):
            stdout_raw = run_status.get("output")
            stderr_raw = run_status.get("stderr")
            # Convert to string safely, handle None explicitly
            stdout = "" if stdout_raw is None else str(stdout_raw).strip()
            stderr = "" if stderr_raw is None else str(stderr_raw).strip()
            
            # HackerEarth sometimes returns URLs to output instead of actual text
            # If stdout or stderr is a URL, fetch the actual content
            if stdout and stdout.startswith("http"):
                stdout = await self._fetch_output_from_url(stdout)
            if stderr and stderr.startswith("http"):
                stderr = await self._fetch_output_from_url(stderr)
        else:
            stdout = ""
            stderr = ""
        compile_output = compile_status if compile_status != "OK" else ""
        
        print(f"[DEBUG] [HACKEREARTH] stdout: {repr(stdout[:100]) if stdout else 'EMPTY'}")
        print(f"[DEBUG] [HACKEREARTH] stderr: {repr(stderr[:100]) if stderr else 'EMPTY'}")
        print(f"[DEBUG] [HACKEREARTH] run_status_code: {run_status_code}")
        print(f"[DEBUG] [HACKEREARTH] compile_status: {compile_status}")
        
        expected_output = test_case.get("output", test_case.get("expected_output", ""))
        
        # Determine if test passed
        passed = False
        error_message = None
        
        # Check compile status first - ensure compile_status is a string before calling .upper()
        if isinstance(compile_status, str) and compile_status.upper() != "OK":
            error_message = f"Compilation Error: {compile_status}"
        elif not isinstance(compile_status, str):
            error_message = f"Compilation Error: {str(compile_status)}"
        elif run_status_code in ["RUNTIME_ERROR", "RUNTIME_ERROR_SIGSEGV", "RUNTIME_ERROR_SIGFPE", 
                                  "RUNTIME_ERROR_SIGABRT", "RUNTIME_ERROR_NZEC", "RUNTIME_ERROR_OTHER"]:
            error_message = f"Runtime Error: {stderr or 'Runtime error occurred'}"
        elif run_status_code in ["TIME_LIMIT_EXCEEDED", "TIME_LIMIT_EXCEEDED_ON_TEST"]:
            error_message = "Execution Timeout: Code exceeded time limit"
        elif run_status_code in ["MEMORY_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED_ON_TEST"]:
            error_message = "Memory Limit Exceeded: Code exceeded memory limit"
        elif run_status_code == "COMPILATION_ERROR":
            error_message = f"Compilation Error: {compile_output or compile_status or 'Compilation failed'}"
        else:
            # For all other statuses (ACCEPTED, WRONG_ANSWER, PARTIAL, etc.), compare outputs
            # Code executed, so compare outputs regardless of status
            if stdout or expected_output:
                comparison = self._compare_outputs(stdout, expected_output)
                passed = comparison.get("match", False)
                
                # If status is ACCEPTED and output matches, we're good
                # If status is WRONG_ANSWER/PARTIAL but output matches, it's still a pass
                if passed:
                    # Output matches, so test passed
                    pass
                else:
                    # Output doesn't match, but no error message needed for wrong answers
                    # The frontend will show expected vs actual
                    pass
            else:
                # No output to compare
                if run_status_code == "ACCEPTED":
                    passed = True  # No output expected and status is ACCEPTED
                else:
                    error_message = f"Execution Status: {run_status_code}" if run_status_code else "Unknown status"
        
        # Get execution metrics - handle None values
        if isinstance(run_status, dict):
            time_used_raw = run_status.get("time_used")
            memory_used_raw = run_status.get("memory_used")
            time_used_str = str(time_used_raw) if time_used_raw is not None else "0"
            memory_used_str = str(memory_used_raw) if memory_used_raw is not None else "0"
        else:
            time_used_str = "0"
            memory_used_str = "0"
        
        try:
            execution_time = float(time_used_str) * 1000  # Convert seconds to ms
        except (ValueError, TypeError):
            execution_time = 0
            
        try:
            # Memory is typically in KB, convert to bytes
            memory_used = int(float(memory_used_str) * 1024)
        except (ValueError, TypeError):
            memory_used = 0
        
        debug_info = {
            "status": run_status_code,
            "compile_status": compile_status,
            "raw_output": stdout,
            "raw_error": stderr,
            "compile_output": compile_output,
            "execution_details": {
                "time": time_used_str,
                "memory": memory_used_str,
                "status": run_status_code
            }
        }

        return {
            "passed": passed,
            "input": test_case.get("input", ""),
            "expected": expected_output,
            "output": stdout,
            "execution_time": execution_time,
            "memory": memory_used,
            "error": error_message,
            "debug_info": debug_info
        }
    
    def _format_error_result(self, result_data: Dict[str, Any], test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Format error result when request fails"""
        error_msg = result_data.get("errors", {}).get("message", "Unknown API error")
        
        return {
            "passed": False,
            "input": test_case.get("input", ""),
            "expected": test_case.get("output", test_case.get("expected_output", "")),
            "output": "",
            "execution_time": 0,
            "memory": 0,
            "error": f"API Error: {error_msg}",
            "debug_info": {
                "status": "API_ERROR",
                "error": error_msg
            }
        }

    def _compare_outputs(self, actual: str, expected: str) -> Dict[str, Any]:
        """Compare actual output with expected output and provide detailed analysis"""
        import json as _json
        
        # Coerce non-string values to strings before trimming
        actual_clean = str(actual).strip()
        expected_clean = str(expected).strip()
        
        # Exact match
        if actual_clean == expected_clean:
            return {
                "match": True,
                "type": "exact",
                "message": "Output matches exactly"
            }
        
        # Try numeric comparison (for cases where expected is a number but actual is a string)
        try:
            # Try to convert both to numbers and compare
            actual_num = float(actual_clean)
            expected_num = float(expected_clean)
            if abs(actual_num - expected_num) < 1e-9:  # Handle floating point precision
                return {
                    "match": True,
                    "type": "numeric",
                    "message": "Output matches (numeric comparison)",
                    "actual": actual_clean,
                    "expected": expected_clean
                }
        except (ValueError, TypeError):
            # Not numeric, continue with other comparisons
            pass
        
        # Try integer comparison (more lenient for integer outputs)
        try:
            actual_int = int(float(actual_clean))
            expected_int = int(float(expected_clean))
            if actual_int == expected_int:
                return {
                    "match": True,
                    "type": "integer",
                    "message": "Output matches (integer comparison)",
                    "actual": actual_clean,
                    "expected": expected_clean
                }
        except (ValueError, TypeError):
            pass
        
        # Try to parse both as JSON and compare
        try:
            actual_json = _json.loads(actual_clean)
            expected_json = _json.loads(expected_clean)
            if actual_json == expected_json:
                return {
                    "match": True,
                    "type": "json_match",
                    "message": "Output matches (JSON comparison)"
                }
        except Exception:
            # Not valid JSON, continue with string comparison
            pass
        
        # Try parsing expected as JSON if it's a list/array representation
        try:
            # Handle cases where expected might be "[1,2,3]" format
            expected_json = _json.loads(expected_clean) if expected_clean.startswith('[') or expected_clean.startswith('{') else None
            actual_json = _json.loads(actual_clean) if actual_clean.startswith('[') or actual_clean.startswith('{') else None
            if expected_json is not None and actual_json is not None and expected_json == actual_json:
                return {
                    "match": True,
                    "type": "json_match",
                    "message": "Output matches (JSON comparison)"
                }
        except Exception:
            pass
        
        # Check for whitespace differences (more aggressive)
        actual_no_ws = actual_clean.replace('\n', '').replace('\r', '').replace('\t', '').replace(' ', '')
        expected_no_ws = expected_clean.replace('\n', '').replace('\r', '').replace('\t', '').replace(' ', '')
        if actual_no_ws == expected_no_ws:
            return {
                "match": True,
                "type": "whitespace",
                "message": "Output matches (ignoring whitespace)",
                "actual": actual_clean,
                "expected": expected_clean
            }
        
        # Check for case differences
        if actual_clean.lower() == expected_clean.lower():
            return {
                "match": True,
                "type": "case",
                "message": "Output matches (case insensitive)",
                "actual": actual_clean,
                "expected": expected_clean
            }
        
        # Check for trailing newline differences
        if actual_clean == expected_clean + '\n' or actual_clean + '\n' == expected_clean:
            return {
                "match": True,
                "type": "newline",
                "message": "Output matches (ignoring trailing newlines)",
                "actual": actual_clean,
                "expected": expected_clean
            }
        
        # Partial match analysis
        actual_lines = actual_clean.split('\n')
        expected_lines = expected_clean.split('\n')
        
        return {
            "match": False,
            "type": "different",
            "message": f"Output differs - Got {len(actual_lines)} lines, expected {len(expected_lines)} lines",
            "actual": actual_clean,
            "expected": expected_clean,
            "line_analysis": {
                "actual_lines": actual_lines,
                "expected_lines": expected_lines,
                "first_difference": self._find_first_difference(actual_lines, expected_lines)
            }
        }
    
    def _find_first_difference(self, actual_lines: List[str], expected_lines: List[str]) -> Dict[str, Any]:
        """Find the first line where actual and expected differ"""
        min_len = min(len(actual_lines), len(expected_lines))
        
        for i in range(min_len):
            if actual_lines[i] != expected_lines[i]:
                return {
                    "line_number": i + 1,
                    "actual_line": actual_lines[i],
                    "expected_line": expected_lines[i]
                }
        
        if len(actual_lines) > len(expected_lines):
            return {
                "line_number": min_len + 1,
                "actual_line": actual_lines[min_len],
                "expected_line": None,
                "message": "Extra line in actual output"
            }
        elif len(expected_lines) > len(actual_lines):
            return {
                "line_number": min_len + 1,
                "actual_line": None,
                "expected_line": expected_lines[min_len],
                "message": "Missing line in actual output"
            }
        
        return {"message": "No differences found"}


# Create a singleton instance to be used across the application
# Lazy initialization to avoid errors at import time if env var is missing
_hackerearth_service_instance = None

def get_hackerearth_service():
    """Get or create HackerEarth execution service instance"""
    global _hackerearth_service_instance
    if _hackerearth_service_instance is None:
        _hackerearth_service_instance = HackerEarthExecutionService()
    return _hackerearth_service_instance

# For backward compatibility, create instance if env var is set
if HACKEREARTH_CLIENT_SECRET:
    hackerearth_execution_service = HackerEarthExecutionService()
else:
    # Service will be created when first used if env var is set later
    hackerearth_execution_service = None

