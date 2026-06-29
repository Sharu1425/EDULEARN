from datetime import timezone
from google import genai
from google.genai import types
import json
import os
import re
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


class CodingServiceMixin:
    async def generate_coding_problem(
            self, 
            topic: str, 
            difficulty: str, 
            user_skill_level: str = "intermediate",
            focus_areas: List[str] = None,
            avoid_topics: List[str] = None
        ) -> Dict[str, Any]:
            """Generate a coding problem with test cases using Gemini AI"""
            try:
                print(f" [GEMINI_CODING] Generating {difficulty} coding problem for topic: {topic}")
                
                if not self.available:
                    return self._get_fallback_coding_problem(topic, difficulty)
                
                focus_str = ", ".join(focus_areas) if focus_areas else topic
                avoid_str = ", ".join(avoid_topics) if avoid_topics else "none"
                
                prompt = f"""
                Generate a {difficulty} level coding problem about {topic} for {user_skill_level} programmers.
                Focus areas: {focus_str}
                Avoid: {avoid_str}
                
                Return ONLY valid JSON with this EXACT structure:
                {{
                    "title": "Problem Title (e.g., Two Sum, Reverse String)",
                    "description": "Brief 1-sentence description",
                    "problem_statement": "Detailed problem description explaining what needs to be solved",
                    "topic": "{topic}",
                    "difficulty": "{difficulty}",
                    "constraints": [
                        "1 <= n <= 1000",
                        "Input will contain only integers"
                    ],
                    "examples": [
                        {{
                            "input": "[1,2,3,4]",
                            "output": "10",
                            "explanation": "Sum of all elements is 1+2+3+4=10"
                        }}
                    ],
                    "test_cases": [
                        {{"input": "[1,2,3]", "output": "6"}},
                        {{"input": "[5,5]", "output": "10"}}
                    ],
                    "hidden_test_cases": [
                        {{"input": "[10,20,30]", "output": "60"}},
                        {{"input": "[]", "output": "0"}}
                    ],
                    "hints": [
                        "Hint 1: Consider using a loop",
                        "Hint 2: Initialize a variable to store the result"
                    ],
                    "tags": ["array", "math"],
                    "expected_complexity": {{
                        "time": "O(n)",
                        "space": "O(1)"
                    }},
                    "reference_solution": "Full correct implementation here",
                    "code_templates": {{
                        "python": "# Complete the solve function below\\n# Input will be automatically parsed and passed to your function\\ndef solve(input_data):\\n    # TODO: Implement your solution here\\n    # input_data contains the parsed input (array, string, number, etc.)\\n    # Return the result as specified in the problem\\n    pass\\n\\n# DO NOT MODIFY BELOW THIS LINE\\n# The code below handles input parsing and output printing automatically\\nimport sys\\nimport json\\n\\nif __name__ == '__main__':\\n    # Read input from stdin\\n    input_str = sys.stdin.read().strip()\\n    \\n    # Parse input based on format\\n    try:\\n        input_data = json.loads(input_str)\\n    except:\\n        input_data = input_str\\n    \\n    # Call your function\\n    result = solve(input_data)\\n    \\n    # Print result\\n    print(json.dumps(result) if not isinstance(result, str) else result)",
                        "javascript": "// Complete the solve function below\\n// Input will be automatically parsed and passed to your function\\nfunction solve(inputData) {{\\n    // TODO: Implement your solution here\\n    // inputData contains the parsed input (array, string, number, etc.)\\n    // Return the result as specified in the problem\\n}}\\n\\n// DO NOT MODIFY BELOW THIS LINE\\n// The code below handles input parsing and output printing automatically\\nconst fs = require('fs');\\nconst input = fs.readFileSync(0, 'utf-8').trim();\\n\\nlet inputData;\\ntry {{\\n    inputData = JSON.parse(input);\\n}} catch {{\\n    inputData = input;\\n}}\\n\\nconst result = solve(inputData);\\nconsole.log(typeof result === 'string' ? result : JSON.stringify(result));",
                        "java": "// Complete the solve method below\\n// Input will be automatically parsed and passed to your method\\npublic class Solution {{\\n    public static Object solve(Object inputData) {{\\n        // TODO: Implement your solution here\\n        // inputData contains the parsed input (array, string, number, etc.)\\n        // Return the result as specified in the problem\\n        return null;\\n    }}\\n\\n    // DO NOT MODIFY BELOW THIS LINE\\n    // The code below handles input parsing and output printing automatically\\n    public static void main(String[] args) {{\\n        try {{\\n            java.util.Scanner scanner = new java.util.Scanner(System.in);\\n            String input = scanner.useDelimiter(\\\\\"\\\\\\b\\\\\\\").next();\\n            \\n            Object inputData;\\n            try {{\\n                inputData = new com.google.gson.Gson().fromJson(input, Object.class);\\n            }} catch (Exception e) {{\\n                inputData = input;\\n            }}\\n            \\n            Object result = solve(inputData);\\n            \\n            if (result instanceof String) {{\\n                System.out.println(result);\\n            }} else {{\\n                System.out.println(new com.google.gson.Gson().toJson(result));\\n            }}\\n        }} catch (Exception e) {{\\n            System.err.println(\\\"Error: \\\" + e.getMessage());\\n        }}\\n    }}\\n}}",
                        "cpp": "// Complete the solve function below\\n// Input will be automatically parsed and passed to your function\\n#include <iostream>\\n#include <vector>\\n#include <string>\\n#include <sstream>\\n#include <nlohmann/json.hpp>\\nusing namespace std;\\nusing json = nlohmann::json;\\n\\n// TODO: Implement your solution here\\n// input_data contains the parsed input (vector, string, int, etc.)\\n// Return the result as specified in the problem\\nauto solve(auto input_data) {{\\n    // Your code here\\n    return input_data;  // placeholder\\n}}\\n\\n// DO NOT MODIFY BELOW THIS LINE\\n// The code below handles input parsing and output printing automatically\\nint main() {{\\n    string input_line;\\n    getline(cin, input_line);\\n    \\n    try {{\\n        auto input_data = json::parse(input_line);\\n        auto result = solve(input_data);\\n        \\n        if (result.is_string()) {{\\n            cout << result.get<string>() << endl;\\n        }} else {{\\n            cout << result.dump() << endl;\\n        }}\\n    }} catch (const exception& e) {{\\n        // If JSON parsing fails, pass as string\\n        auto result = solve(input_line);\\n        cout << result << endl;\\n    }}\\n    \\n    return 0;\\n}}",
                        "c": "// Complete the solve function below\\n// Input will be automatically parsed and passed to your function\\n#include <stdio.h>\\n#include <stdlib.h>\\n#include <string.h>\\n\\n// TODO: Implement your solution here\\n// input_data contains the parsed input\\n// Return the result as specified in the problem\\nvoid* solve(void* input_data) {{\\n    // Your code here\\n    return input_data;  // placeholder\\n}}\\n\\n// DO NOT MODIFY BELOW THIS LINE\\n// The code below handles input parsing and output printing automatically\\nint main() {{\\n    char input[10000];\\n    fgets(input, sizeof(input), stdin);\\n    \\n    // Remove newline character\\n    input[strcspn(input, \\\"\\\\n\\\")] = 0;\\n    \\n    // Simple string processing - you can enhance this\\n    void* result = solve((void*)input);\\n    \\n    if (result) {{\\n        printf(\\\"%s\\\\n\\\", (char*)result);\\n    }}\\n    \\n    return 0;\\n}}"
                    }}
                }}
                
                Requirements:
                - Make it solvable and educational
                - Include 2-3 examples
                - Include at least 2 visible test cases
                - Include 2-3 hidden test cases
                - Provide 2-4 helpful hints
                - Specify realistic constraints
                - Be clear and specific

                CRITICAL: Generate complete, runnable code templates for each language:
                - Each template MUST be a complete, executable program
                - Include automatic input parsing from stdin (JSON format)
                - Include function/method definition that the user will complete
                - Include automatic function calling with parsed input
                - Include automatic output printing
                - The user should ONLY implement the core logic inside the solve function
                - Templates should handle different input types (arrays, strings, numbers)
                - For Python: Use json.loads() for parsing, handle both structured and string inputs
                - For JavaScript: Use JSON.parse(), handle both structured and string inputs
                - For Java: Use Gson for JSON parsing
                - For C++: Use nlohmann/json library for parsing
                - For C: Basic string input handling
                - All templates should be immediately runnable without any modifications
                
                Return ONLY the JSON, no markdown formatting.
                """
                
                # Add timeout handling for Gemini API calls
                import asyncio
                try:
                    # Use new SDK client.aio.models.generate_content for async
                    response = await self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.7,
                            max_output_tokens=4096
                        )
                    )
                except Exception as e:
                    print(f"[ERROR] [GEMINI_CODING] Coding problem generation failed: {e}")
                    return self._get_fallback_coding_problem(topic, difficulty)
                
                if not response or not response.text:
                    print("[ERROR] [GEMINI_CODING] No response from Gemini API")
                    return self._get_fallback_coding_problem(topic, difficulty)
                
                # Clean and parse JSON response
                response_text = response.text.strip()
                print(f"[DEBUG] [GEMINI_CODING] Raw response: {response_text[:300]}...")
                
                # Remove markdown formatting if present
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                
                # Clean up any remaining formatting
                response_text = response_text.strip()
                
                try:
                    problem_data = json.loads(response_text)
                    
                    # Validate and ensure all required fields exist
                    problem_data.setdefault('title', f"{topic} Problem ({difficulty})")
                    problem_data.setdefault('description', f"Solve a {difficulty} level {topic} problem")
                    problem_data.setdefault('problem_statement', problem_data.get('description', ''))
                    problem_data.setdefault('topic', topic)
                    problem_data.setdefault('difficulty', difficulty)
                    problem_data.setdefault('constraints', ["No specific constraints"])
                    problem_data.setdefault('examples', [{"input": "example", "output": "result", "explanation": ""}])
                    problem_data.setdefault('test_cases', [])
                    problem_data.setdefault('hidden_test_cases', [])
                    problem_data.setdefault('hints', ["Try to solve it step by step"])
                    problem_data.setdefault('tags', [topic.lower()])
                    problem_data.setdefault('expected_complexity', {"time": "O(n)", "space": "O(1)"})
                    problem_data.setdefault('reference_solution', "// Solution unavailable")
                    problem_data.setdefault('code_templates', self._get_default_templates())
                    
                    # Ensure test_cases and hidden_test_cases are not empty
                    if not problem_data['test_cases']:
                        problem_data['test_cases'] = [{"input": "test", "output": "result"}]
                    if not problem_data['hidden_test_cases']:
                        problem_data['hidden_test_cases'] = [{"input": "hidden", "output": "result"}]
                    
                    print(f"[SUCCESS] [GEMINI_CODING] Successfully generated coding problem: {problem_data['title']}")
                    return problem_data
                    
                except json.JSONDecodeError as e:
                    print(f"[ERROR] [GEMINI_CODING] JSON parsing error: {str(e)}")
                    print(f"[DEBUG] [GEMINI_CODING] Failed response: {response_text[:500]}")
                    return self._get_fallback_coding_problem(topic, difficulty)
                
            except Exception as e:
                print(f"[ERROR] [GEMINI_CODING] Error generating coding problem: {str(e)}")
                import traceback
                traceback.print_exc()
                return self._get_fallback_coding_problem(topic, difficulty)

    async def analyze_code_solution(
            self, 
            code: str, 
            problem_description: str, 
            language: str,
            test_results: List[Dict[str, Any]]
        ) -> Dict[str, Any]:
            """Analyze code solution and provide AI feedback"""
            try:
                print(f"[DEBUG] [GEMINI_CODING] Analyzing {language} solution")
                
                if not self.available:
                    return self._get_fallback_feedback(code, test_results)
                
                passed_tests = sum(1 for result in test_results if result.get('passed', False))
                total_tests = len(test_results)
                
                prompt = f"""
                Analyze this coding solution and provide comprehensive feedback:
                
                Problem: {problem_description}
                Language: {language}
                Code:
                ```{language}
                {code}
                ```
                
                Test Results: {passed_tests}/{total_tests} tests passed
                Failed Tests: {json.dumps([r for r in test_results if not r.get('passed', False)], indent=2)}
                
                Provide detailed analysis in this JSON format:
                {{
                    "correctness": {{
                        "score": 85,
                        "issues": ["Issue 1", "Issue 2"],
                        "suggestions": ["Suggestion 1", "Suggestion 2"]
                    }},
                    "performance": {{
                        "time_complexity": "O(n)",
                        "space_complexity": "O(1)",
                        "efficiency_score": 80,
                        "optimizations": ["Optimization 1", "Optimization 2"]
                    }},
                    "code_quality": {{
                        "readability_score": 75,
                        "maintainability_score": 70,
                        "best_practices": ["Practice 1", "Practice 2"],
                        "code_smells": ["Smell 1", "Smell 2"]
                    }},
                    "alternative_approaches": [
                        {{
                            "approach": "Approach name",
                            "description": "How this approach works",
                            "pros": ["Pro 1", "Pro 2"],
                            "cons": ["Con 1", "Con 2"],
                            "complexity": "O(n log n)"
                        }}
                    ],
                    "learning_points": [
                        "Key concept 1",
                        "Key concept 2"
                    ],
                    "overall_score": 78,
                    "next_steps": [
                        "Step 1 for improvement",
                        "Step 2 for improvement"
                    ]
                }}
                
                Focus on:
                1. Correctness and bug identification
                2. Performance analysis and optimization
                3. Code quality and best practices
                4. Alternative solution approaches
                5. Learning opportunities and growth areas
                """
                
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                        max_output_tokens=4096
                    )
                )
                
                if not response or not response.text:
                    return self._get_fallback_feedback(code, test_results)
                
                # Clean and parse JSON response
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    feedback_data = json.loads(response_text)
                    print("[SUCCESS] [GEMINI_CODING] Code analysis completed successfully")
                    return feedback_data
                    
                except json.JSONDecodeError:
                    return self._get_fallback_feedback(code, test_results)
                
            except Exception as e:
                print(f"[ERROR] [GEMINI_CODING] Error analyzing code: {str(e)}")
                return self._get_fallback_feedback(code, test_results)

    def _get_default_templates(self) -> Dict[str, str]:
            """Get default code templates for all supported languages"""
            return {
                "python": """# Complete the solve function below
    # Input will be automatically parsed and passed to your function
    def solve(input_data):
        # TODO: Implement your solution here
        # input_data contains the parsed input (array, string, number, etc.)
        # Return the result as specified in the problem
        pass

    # DO NOT MODIFY BELOW THIS LINE
    # The code below handles input parsing and output printing automatically
    import sys
    import json

    if __name__ == '__main__':
        # Read input from stdin
        input_str = sys.stdin.read().strip()

        # Parse input based on format
        try:
            input_data = json.loads(input_str)
        except Exception:
            input_data = input_str

        # Call your function
        result = solve(input_data)

        # Print result
        print(json.dumps(result) if not isinstance(result, str) else result)""",
                "javascript": """// Complete the solve function below
    // Input will be automatically parsed and passed to your function
    function solve(inputData) {
        // TODO: Implement your solution here
        // inputData contains the parsed input (array, string, number, etc.)
        // Return the result as specified in the problem
    }

    // DO NOT MODIFY BELOW THIS LINE
    // The code below handles input parsing and output printing automatically
    const fs = require('fs');
    const input = fs.readFileSync(0, 'utf-8').trim();

    let inputData;
    try {
        inputData = JSON.parse(input);
    } catch {
        inputData = input;
    }

    const result = solve(inputData);
    console.log(typeof result === 'string' ? result : JSON.stringify(result));""",
                "java": """// Complete the solve method below
    // Input will be automatically parsed and passed to your method
    public class Solution {
        public static Object solve(Object inputData) {
            // TODO: Implement your solution here
            // inputData contains the parsed input (array, string, number, etc.)
            // Return the result as specified in the problem
            return null;
        }

        // DO NOT MODIFY BELOW THIS LINE
        // The code below handles input parsing and output printing automatically
        public static void main(String[] args) {
            try {
                java.util.Scanner scanner = new java.util.Scanner(System.in);
                String input = scanner.useDelimiter("\\b").next();

                Object inputData;
                try {
                    inputData = new com.google.gson.Gson().fromJson(input, Object.class);
                } catch (Exception e) {
                    inputData = input;
                }

                Object result = solve(inputData);

                if (result instanceof String) {
                    System.out.println(result);
                } else {
                    System.out.println(new com.google.gson.Gson().toJson(result));
                }
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
            }
        }
    }""",
                "cpp": """// Complete the solve function below
    // Input will be automatically parsed and passed to your function
    #include <iostream>
    #include <vector>
    #include <string>
    #include <sstream>
    #include <nlohmann/json.hpp>
    using namespace std;
    using json = nlohmann::json;

    // TODO: Implement your solution here
    // input_data contains the parsed input (vector, string, int, etc.)
    // Return the result as specified in the problem
    auto solve(auto input_data) {
        // Your code here
        return input_data;  // placeholder
    }

    // DO NOT MODIFY BELOW THIS LINE
    // The code below handles input parsing and output printing automatically
    int main() {
        string input_line;
        getline(cin, input_line);

        try {
            auto input_data = json::parse(input_line);
            auto result = solve(input_data);

            if (result.is_string()) {
                cout << result.get<string>() << endl;
            } else {
                cout << result.dump() << endl;
            }
        } catch (const exception& e) {
            // If JSON parsing fails, pass as string
            auto result = solve(input_line);
            cout << result << endl;
        }

        return 0;
    }""",
                "c": """// Complete the solve function below
    // Input will be automatically parsed and passed to your function
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>

    // TODO: Implement your solution here
    // input_data contains the parsed input
    // Return the result as specified in the problem
    void* solve(void* input_data) {
        // Your code here
        return input_data;  // placeholder
    }

    // DO NOT MODIFY BELOW THIS LINE
    // The code below handles input parsing and output printing automatically
    int main() {
        char input[10000];
        fgets(input, sizeof(input), stdin);

        // Remove newline character
        input[strcspn(input, "\n")] = 0;

        // Simple string processing - you can enhance this
        void* result = solve((void*)input);

        if (result) {
            printf("%s\n", (char*)result);
        }

        return 0;
    }"""
            }

    def _get_fallback_coding_problem(self, topic: str, difficulty: str) -> Dict[str, Any]:
            """Get a fallback coding problem when AI is not available"""
            import random
            
            print(f"[FALLBACK] Using fallback coding problem for {topic} - {difficulty}")
            
            # Get comprehensive problem database
            all_problems = self._get_comprehensive_problems()
            
            # Try to find matching problems by topic
            topic_problems = all_problems.get(topic, {})
            difficulty_problems = topic_problems.get(difficulty, [])
            
            # If no exact match, try any topic
            if not difficulty_problems:
                for t in all_problems:
                    if difficulty in all_problems[t] and all_problems[t][difficulty]:
                        difficulty_problems = all_problems[t][difficulty]
                        break
            
            # If still no match, use any available problem
            if not difficulty_problems:
                for t in all_problems:
                    for d in all_problems[t]:
                        if all_problems[t][d]:
                            difficulty_problems = all_problems[t][d]
                            break
                    if difficulty_problems:
                        break
            
            # Select a random problem
            if difficulty_problems:
                problem = random.choice(difficulty_problems)
            else:
                # Ultimate fallback
                problem = {
                    "title": "Sum of Array Elements",
                    "description": "Calculate the sum of all elements in an array",
                    "problem_statement": "Given an array of integers, write a function that returns the sum of all elements.",
                    "topic": topic,
                    "difficulty": difficulty,
                    "constraints": ["1 <= array length <= 1000", "-1000 <= elements <= 1000"],
                    "examples": [
                        {"input": "[1, 2, 3, 4]", "output": "10", "explanation": "1 + 2 + 3 + 4 = 10"}
                    ],
                    "test_cases": [
                        {"input": "[1, 2, 3]", "output": "6"},
                        {"input": "[5, 5]", "output": "10"}
                    ],
                    "hidden_test_cases": [
                        {"input": "[10, 20, 30]", "output": "60"},
                        {"input": "[]", "output": "0"}
                    ],
                    "hints": [
                        "Initialize a variable to store the sum",
                        "Loop through each element and add it to the sum"
                    ],
                    "tags": ["array", "math"],
                    "expected_complexity": {"time": "O(n)", "space": "O(1)"},
                    "code_templates": self._get_default_templates()
                }
            
            # Ensure all required fields are present
            problem.setdefault('problem_statement', problem.get('description', ''))
            problem.setdefault('topic', topic)
            problem.setdefault('difficulty', difficulty)
            problem.setdefault('hints', ["Try to break down the problem step by step"])
            problem.setdefault('tags', [topic.lower()])
            problem.setdefault('code_templates', self._get_default_templates())
            
            return problem

    def _get_comprehensive_problems(self) -> Dict[str, Any]:
            """Get comprehensive problem database with proper test cases"""
            return {
                "Arrays": {
                    "easy": [
                        {
                            "title": "Two Sum",
                            "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
                        "test_cases": [
                                {"input": "2 7 11 15\n9", "output": "0 1"},
                                {"input": "3 2 4\n6", "output": "1 2"},
                                {"input": "3 3\n6", "output": "0 1"}
                            ],
                            "hidden_test_cases": [
                                {"input": "1 2 3 4 5\n8", "output": "2 4"},
                                {"input": "10 20 30 40 50\n70", "output": "1 3"},
                                {"input": "0 4 3 0\n0", "output": "0 3"}
                            ],
                            "examples": [
                                {"input": "2 7 11 15\n9", "output": "0 1", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}
                            ],
                            "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
                            "starter_code": {
                                "python": "def twoSum(nums, target):\n    # Your code here\n    pass",
                                "javascript": "function twoSum(nums, target) {\n    // Your code here\n}",
                                "java": "public int[] twoSum(int[] nums, int target) {\n    // Your code here\n    return new int[0];\n}",
                                "cpp": "vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n    return {};\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(n)"}
                        },
                        {
                            "title": "Maximum Subarray Sum",
                            "description": "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
                            "test_cases": [
                                {"input": "-2 1 -3 4 -1 2 1 -5 4", "output": "6"},
                                {"input": "1", "output": "1"},
                                {"input": "5 4 -1 7 8", "output": "23"}
                            ],
                            "hidden_test_cases": [
                                {"input": "-1 -2 -3 -4", "output": "-1"},
                                {"input": "1 2 3 4 5", "output": "15"},
                                {"input": "-2 -1 -3 -4", "output": "-1"}
                            ],
                            "examples": [
                                {"input": "-2 1 -3 4 -1 2 1 -5 4", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."}
                            ],
                            "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
                            "starter_code": {
                                "python": "def maxSubArray(nums):\n    # Your code here\n    pass",
                                "javascript": "function maxSubArray(nums) {\n    // Your code here\n}",
                                "java": "public int maxSubArray(int[] nums) {\n    // Your code here\n    return 0;\n}",
                                "cpp": "int maxSubArray(vector<int>& nums) {\n    // Your code here\n    return 0;\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(1)"}
                        }
                    ],
                    "medium": [
                        {
                        "title": "Product of Array Except Self",
                        "description": "Given an array nums, return an array where each element is the product of all elements in nums except nums[i]. You must solve it in O(n) time without using division.",
                        "test_cases": [
                                {"input": "1 2 3 4", "output": "24 12 8 6"},
                                {"input": "-1 1 0 -3 3", "output": "0 0 9 0 0"},
                                {"input": "2 3 4 5", "output": "60 40 30 24"}
                            ],
                            "hidden_test_cases": [
                                {"input": "1 0", "output": "0 1"},
                                {"input": "1 2 3", "output": "6 3 2"},
                                {"input": "0 0 0", "output": "0 0 0"}
                            ],
                            "examples": [
                                {"input": "1 2 3 4", "output": "24 12 8 6", "explanation": "For index 0: 2*3*4=24, for index 1: 1*3*4=12, etc."}
                            ],
                            "constraints": ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30"],
                            "starter_code": {
                                "python": "def productExceptSelf(nums):\n    # Your code here\n    pass",
                                "javascript": "function productExceptSelf(nums) {\n    // Your code here\n}",
                                "java": "public int[] productExceptSelf(int[] nums) {\n    // Your code here\n    return new int[0];\n}",
                                "cpp": "vector<int> productExceptSelf(vector<int>& nums) {\n    // Your code here\n    return {};\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(1)"}
                        },
                        {
                            "title": "3Sum",
                            "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
                            "test_cases": [
                                {"input": "-1 0 1 2 -1 -4", "output": "-1 -1 2\n-1 0 1"},
                                {"input": "0 1 1", "output": ""},
                                {"input": "0 0 0", "output": "0 0 0"}
                            ],
                            "hidden_test_cases": [
                                {"input": "-2 0 1 1 2", "output": "-2 0 2\n-2 1 1"},
                                {"input": "1 2 -2 -1", "output": "-2 1 1"},
                                {"input": "0 0 0 0", "output": "0 0 0"}
                            ],
                            "examples": [
                                {"input": "-1 0 1 2 -1 -4", "output": "-1 -1 2\n-1 0 1", "explanation": "nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0"}
                            ],
                            "constraints": ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
                            "starter_code": {
                                "python": "def threeSum(nums):\n    # Your code here\n    pass",
                                "javascript": "function threeSum(nums) {\n    // Your code here\n}",
                                "java": "public List<List<Integer>> threeSum(int[] nums) {\n    // Your code here\n    return new ArrayList<>();\n}",
                                "cpp": "vector<vector<int>> threeSum(vector<int>& nums) {\n    // Your code here\n    return {};\n}"
                            },
                            "expected_complexity": {"time": "O(n^2)", "space": "O(1)"}
                        }
                    ],
                    "hard": [
                        {
                        "title": "Sliding Window Maximum",
                        "description": "Given an array and a sliding window of size k, find the maximum element in each window. Solve in O(n) time using a deque.",
                        "test_cases": [
                                {"input": "1 3 -1 -3 5 3 6 7\n3", "output": "3 3 5 5 6 7"},
                                {"input": "1\n1", "output": "1"},
                                {"input": "1 -1\n1", "output": "1 -1"}
                            ],
                            "hidden_test_cases": [
                                {"input": "9 11\n2", "output": "11"},
                                {"input": "4 -2\n2", "output": "4"},
                                {"input": "1 3 1 2 0 5\n3", "output": "3 3 2 5"}
                            ],
                            "examples": [
                                {"input": "1 3 -1 -3 5 3 6 7\n3", "output": "3 3 5 5 6 7", "explanation": "Window position: [1 3 -1] -3 5 3 6 7 -> Max = 3"}
                            ],
                            "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4", "1 <= k <= nums.length"],
                            "starter_code": {
                                "python": "def maxSlidingWindow(nums, k):\n    # Your code here\n    pass",
                                "javascript": "function maxSlidingWindow(nums, k) {\n    // Your code here\n}",
                                "java": "public int[] maxSlidingWindow(int[] nums, int k) {\n    // Your code here\n    return new int[0];\n}",
                                "cpp": "vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n    // Your code here\n    return {};\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(k)"}
                        }
                    ]
                },
                "Strings": {
                    "easy": [
                        {
                            "title": "Valid Parentheses",
                            "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                            "test_cases": [
                                {"input": "()", "output": "true"},
                                {"input": "()[]{}", "output": "true"},
                                {"input": "(]", "output": "false"}
                            ],
                            "hidden_test_cases": [
                                {"input": "([)]", "output": "false"},
                                {"input": "{[]}", "output": "true"},
                                {"input": "(((", "output": "false"}
                            ],
                            "examples": [
                                {"input": "()", "output": "true", "explanation": "Valid parentheses"}
                            ],
                            "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"],
                            "starter_code": {
                                "python": "def isValid(s):\n    # Your code here\n    pass",
                                "javascript": "function isValid(s) {\n    // Your code here\n}",
                                "java": "public boolean isValid(String s) {\n    // Your code here\n    return false;\n}",
                                "cpp": "bool isValid(string s) {\n    // Your code here\n    return false;\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(n)"}
                        }
                    ],
                    "medium": [
                        {
                            "title": "Longest Substring Without Repeating Characters",
                            "description": "Given a string s, find the length of the longest substring without repeating characters.",
                            "test_cases": [
                                {"input": "abcabcbb", "output": "3"},
                                {"input": "bbbbb", "output": "1"},
                                {"input": "pwwkew", "output": "3"}
                            ],
                            "hidden_test_cases": [
                                {"input": "", "output": "0"},
                                {"input": " ", "output": "1"},
                                {"input": "dvdf", "output": "3"}
                            ],
                            "examples": [
                                {"input": "abcabcbb", "output": "3", "explanation": "The answer is 'abc', with the length of 3."}
                            ],
                            "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
                            "starter_code": {
                                "python": "def lengthOfLongestSubstring(s):\n    # Your code here\n    pass",
                                "javascript": "function lengthOfLongestSubstring(s) {\n    // Your code here\n}",
                                "java": "public int lengthOfLongestSubstring(String s) {\n    // Your code here\n    return 0;\n}",
                                "cpp": "int lengthOfLongestSubstring(string s) {\n    // Your code here\n    return 0;\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(min(m,n))"}
                        }
                    ],
                    "hard": [
                        {
                            "title": "Edit Distance",
                            "description": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have the following three operations permitted on a word: Insert a character, Delete a character, Replace a character.",
                        "test_cases": [
                                {"input": "horse\nros", "output": "3"},
                                {"input": "intention\nexecution", "output": "5"},
                                {"input": "a\nab", "output": "1"}
                            ],
                            "hidden_test_cases": [
                                {"input": "abc\nabc", "output": "0"},
                                {"input": "abc\n", "output": "3"},
                                {"input": "\nabc", "output": "3"}
                            ],
                            "examples": [
                                {"input": "horse\nros", "output": "3", "explanation": "horse -> rorse -> rose -> ros"}
                            ],
                            "constraints": ["0 <= word1.length, word2.length <= 500", "word1 and word2 consist of lowercase English letters"],
                            "starter_code": {
                                "python": "def minDistance(word1, word2):\n    # Your code here\n    pass",
                                "javascript": "function minDistance(word1, word2) {\n    // Your code here\n}",
                                "java": "public int minDistance(String word1, String word2) {\n    // Your code here\n    return 0;\n}",
                                "cpp": "int minDistance(string word1, string word2) {\n    // Your code here\n    return 0;\n}"
                            },
                            "expected_complexity": {"time": "O(m*n)", "space": "O(m*n)"}
                        }
                    ]
                },
                "Dynamic Programming": {
                    "easy": [
                        {
                            "title": "Climbing Stairs",
                            "description": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                            "test_cases": [
                                {"input": "2", "output": "2"},
                                {"input": "3", "output": "3"},
                                {"input": "1", "output": "1"}
                            ],
                            "hidden_test_cases": [
                                {"input": "4", "output": "5"},
                                {"input": "5", "output": "8"},
                                {"input": "6", "output": "13"}
                            ],
                            "examples": [
                                {"input": "2", "output": "2", "explanation": "There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps"}
                            ],
                            "constraints": ["1 <= n <= 45"],
                            "starter_code": {
                                "python": "def climbStairs(n):\n    # Your code here\n    pass",
                                "javascript": "function climbStairs(n) {\n    // Your code here\n}",
                                "java": "public int climbStairs(int n) {\n    // Your code here\n    return 0;\n}",
                                "cpp": "int climbStairs(int n) {\n    // Your code here\n    return 0;\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(1)"}
                        }
                    ],
                    "medium": [
                        {
                            "title": "House Robber",
                            "description": "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected and will automatically contact the police if two adjacent houses were broken into on the same night. Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.",
                            "test_cases": [
                                {"input": "1 2 3 1", "output": "4"},
                                {"input": "2 7 9 3 1", "output": "12"},
                                {"input": "2 1 1 2", "output": "4"}
                            ],
                            "hidden_test_cases": [
                                {"input": "1", "output": "1"},
                                {"input": "1 2", "output": "2"},
                                {"input": "5 1 1 5", "output": "10"}
                            ],
                            "examples": [
                                {"input": "1 2 3 1", "output": "4", "explanation": "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total amount = 1 + 3 = 4."}
                            ],
                            "constraints": ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
                            "starter_code": {
                                "python": "def rob(nums):\n    # Your code here\n    pass",
                                "javascript": "function rob(nums) {\n    // Your code here\n}",
                                "java": "public int rob(int[] nums) {\n    // Your code here\n    return 0;\n}",
                                "cpp": "int rob(vector<int>& nums) {\n    // Your code here\n    return 0;\n}"
                            },
                            "expected_complexity": {"time": "O(n)", "space": "O(1)"}
                        }
                    ],
                    "hard": [
                        {
                            "title": "Edit Distance",
                            "description": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have the following three operations permitted on a word: Insert a character, Delete a character, Replace a character.",
                            "test_cases": [
                                {"input": "horse\nros", "output": "3"},
                                {"input": "intention\nexecution", "output": "5"},
                                {"input": "a\nab", "output": "1"}
                            ],
                            "hidden_test_cases": [
                                {"input": "abc\nabc", "output": "0"},
                                {"input": "abc\n", "output": "3"},
                                {"input": "\nabc", "output": "3"}
                            ],
                            "examples": [
                                {"input": "horse\nros", "output": "3", "explanation": "horse -> rorse -> rose -> ros"}
                            ],
                            "constraints": ["0 <= word1.length, word2.length <= 500", "word1 and word2 consist of lowercase English letters"],
                            "starter_code": {
                                "python": "def minDistance(word1, word2):\n    # Your code here\n    pass",
                                "javascript": "function minDistance(word1, word2) {\n    // Your code here\n}",
                                "java": "public int minDistance(String word1, String word2) {\n    // Your code here\n    return 0;\n}",
                                "cpp": "int minDistance(string word1, string word2) {\n    // Your code here\n    return 0;\n}"
                            },
                            "expected_complexity": {"time": "O(m*n)", "space": "O(m*n)"}
                        }
                    ]
                },
                "Machine Learning": {
                    "easy": [
                        {
                            "title": "Linear Regression Implementation",
                            "description": "Implement linear regression from scratch using gradient descent. Given training data (X, y), find the best line that fits the data.",
                            "test_cases": [
                                {"input": "1 2 3 4\n2 4 6 8\n0.01\n1000", "output": "Slope: 2.0, Intercept: 0.0"},
                                {"input": "1 2 3\n3 5 7\n0.1\n500", "output": "Slope: 2.0, Intercept: 1.0"},
                                {"input": "0 1 2\n1 3 5\n0.01\n1000", "output": "Slope: 2.0, Intercept: 1.0"}
                            ],
                            "hidden_test_cases": [
                                {"input": "1 2 3 4 5\n1 2 3 4 5\n0.01\n1000", "output": "Slope: 1.0, Intercept: 0.0"},
                                {"input": "1 2 3 4\n0 1 2 3\n0.01\n1000", "output": "Slope: 1.0, Intercept: -1.0"}
                            ],
                            "examples": [
                                {"input": "1 2 3 4\n2 4 6 8\n0.01\n1000", "output": "Slope: 2.0, Intercept: 0.0", "explanation": "Perfect linear relationship y = 2x"}
                            ],
                            "constraints": ["1 <= n <= 1000", "0.001 <= learning_rate <= 0.1", "100 <= epochs <= 10000"],
                            "starter_code": {
                                "python": "def linear_regression(X, y, learning_rate, epochs):\n    # Your code here\n    pass",
                                "javascript": "function linearRegression(X, y, learningRate, epochs) {\n    // Your code here\n}",
                                "java": "public String linearRegression(double[] X, double[] y, double learningRate, int epochs) {\n    // Your code here\n    return \"\";\n}",
                                "cpp": "string linearRegression(vector<double>& X, vector<double>& y, double learningRate, int epochs) {\n    // Your code here\n    return \"\";\n}"
                            },
                            "expected_complexity": {"time": "O(n*epochs)", "space": "O(1)"}
                        }
                    ],
                    "medium": {
                        "title": "Neural Network Backpropagation",
                        "description": "Implement a simple neural network with one hidden layer using backpropagation. Include forward pass, backward pass, and weight updates. Support multiple activation functions (sigmoid, ReLU, tanh).",
                        "test_cases": [
                            {"input": {"X": [[0, 0], [0, 1], [1, 0], [1, 1]], "y": [0, 1, 1, 0], "hidden_size": 4, "epochs": 1000}, "output": "XOR problem solved"},
                            {"input": {"X": [[1, 2], [2, 3], [3, 4]], "y": [0, 1, 0], "hidden_size": 3, "epochs": 500}, "output": "Classification completed"}
                        ]
                    },
                    "hard": {
                        "title": "Convolutional Neural Network Implementation",
                        "description": "Implement a CNN from scratch including convolution, pooling, and fully connected layers. Support multiple filter sizes, stride, and padding. Include forward and backward propagation.",
                        "test_cases": [
                            {"input": {"image_shape": [28, 28, 1], "num_classes": 10, "filters": [32, 64], "epochs": 10}, "output": "CNN trained successfully"}
                        ]
                    }
                },
                "Web Development": {
                    "easy": {
                        "title": "Rate Limiting Middleware",
                        "description": "Implement a rate limiting middleware for a web API that limits requests per IP address. Use a sliding window algorithm with Redis or in-memory storage. Support different rate limits for different endpoints.",
                        "test_cases": [
                            {"input": {"ip": "192.168.1.1", "endpoint": "/api/users", "limit": 100, "window": 3600}, "output": "Rate limit applied"},
                            {"input": {"ip": "192.168.1.2", "endpoint": "/api/admin", "limit": 10, "window": 3600}, "output": "Admin rate limit enforced"}
                        ]
                    },
                    "medium": {
                        "title": "WebSocket Real-time Chat System",
                        "description": "Implement a real-time chat system using WebSockets with features like private messaging, group chats, message persistence, and user presence. Include authentication and message encryption.",
                        "test_cases": [
                            {"input": {"users": ["user1", "user2"], "message": "Hello", "room": "general"}, "output": "Message broadcasted"},
                            {"input": {"users": ["user1", "user3"], "message": "Private message", "room": "private"}, "output": "Private message delivered"}
                        ]
                    },
                    "hard": {
                        "title": "Microservices Architecture with API Gateway",
                        "description": "Design and implement a microservices architecture with an API Gateway, service discovery, load balancing, and circuit breaker pattern. Include authentication, logging, and monitoring.",
                        "test_cases": [
                            {"input": {"services": ["user-service", "order-service", "payment-service"], "gateway": "api-gateway", "load_balancer": "round-robin"}, "output": "Microservices deployed"},
                            {"input": {"circuit_breaker": {"threshold": 5, "timeout": 30}, "monitoring": "prometheus"}, "output": "Resilience patterns implemented"}
                        ]
                    }
                },
                "Python Programming": {
                    "easy": {
                        "title": "Context Manager Implementation",
                        "description": "Implement a custom context manager class that handles database connections with automatic cleanup, connection pooling, and transaction management. Include proper exception handling and resource cleanup.",
                        "test_cases": [
                            {"input": {"db_url": "sqlite:///test.db", "pool_size": 5, "timeout": 30}, "output": "Connection managed successfully"},
                            {"input": {"db_url": "postgresql://user:pass@localhost/db", "pool_size": 10, "timeout": 60}, "output": "Transaction committed"}
                        ]
                    },
                    "medium": {
                        "title": "Async/Await Web Scraper",
                        "description": "Implement an asynchronous web scraper using asyncio and aiohttp that can scrape multiple URLs concurrently. Include rate limiting, retry logic, and data extraction with BeautifulSoup. Handle different content types and implement proper error handling.",
                        "test_cases": [
                            {"input": {"urls": ["https://example1.com", "https://example2.com"], "concurrency": 5, "rate_limit": 2}, "output": "Data scraped successfully"},
                            {"input": {"urls": ["https://api.example.com/data"], "headers": {"Authorization": "Bearer token"}, "retry_count": 3}, "output": "API data extracted"}
                        ]
                    },
                    "hard": {
                        "title": "Distributed Task Queue with Celery",
                        "description": "Implement a distributed task queue system using Celery with Redis as the message broker. Include task scheduling, priority queues, result backends, monitoring, and error handling. Support task chaining and workflow management.",
                        "test_cases": [
                            {"input": {"tasks": ["process_data", "send_email", "generate_report"], "workers": 4, "priority": "high"}, "output": "Tasks queued successfully"},
                            {"input": {"workflow": "data_pipeline", "retry_policy": {"max_retries": 3, "backoff": "exponential"}, "monitoring": "flower"}, "output": "Workflow executed"}
                        ]
                    }
                },
                "JavaScript": {
                    "easy": {
                        "title": "React Hooks Custom Implementation",
                        "description": "Implement custom React hooks including useState, useEffect, useReducer, and useCallback from scratch. Include proper dependency tracking, cleanup functions, and performance optimizations. Support concurrent features and suspense.",
                        "test_cases": [
                            {"input": {"hook": "useState", "initialValue": 0, "updates": [1, 2, 3]}, "output": "State managed correctly"},
                            {"input": {"hook": "useEffect", "dependencies": ["count"], "cleanup": "timer"}, "output": "Effect executed and cleaned up"}
                        ]
                    },
                    "medium": {
                        "title": "Node.js Microservices with Express",
                        "description": "Build a microservices architecture using Node.js and Express with service discovery, API Gateway, load balancing, and inter-service communication. Include authentication, logging, monitoring, and error handling.",
                        "test_cases": [
                            {"input": {"services": ["user-service", "order-service"], "gateway": "express-gateway", "discovery": "consul"}, "output": "Microservices deployed"},
                            {"input": {"communication": "gRPC", "auth": "JWT", "monitoring": "prometheus"}, "output": "Services communicating"}
                        ]
                    },
                    "hard": {
                        "title": "Real-time Data Processing with WebSockets and Redis",
                        "description": "Implement a real-time data processing system using WebSockets, Redis Streams, and Node.js. Include data ingestion, real-time analytics, pub/sub messaging, and horizontal scaling. Support multiple data sources and complex event processing.",
                        "test_cases": [
                            {"input": {"sources": ["sensor_data", "user_events"], "processing": "stream", "output": "kafka"}, "output": "Data processed in real-time"},
                            {"input": {"analytics": "real-time", "scaling": "horizontal", "monitoring": "grafana"}, "output": "System scaled successfully"}
                        ]
                    }
                }
            }
            
            # Try to find a matching problem or create a dynamic one
            default_problem = problems.get(topic, {}).get(difficulty)
            
            if not default_problem:
                # Try to find a similar topic
                similar_topics = {
                    "programming": "Arrays",
                    "coding": "Arrays", 
                    "computer science": "Arrays",
                    "cs": "Arrays",
                    "software": "Arrays",
                    "web": "Web Development",
                    "frontend": "JavaScript",
                    "backend": "Python Programming",
                    "data science": "Machine Learning",
                    "ai": "Machine Learning",
                    "machine learning": "Machine Learning",
                    "ml": "Machine Learning",
                    "python": "Python Programming",
                    "javascript": "JavaScript",
                    "java": "Arrays",
                    "c++": "Arrays",
                    "react": "JavaScript",
                    "node": "JavaScript",
                    "sql": "Web Development",
                    "database": "Web Development"
                }
                
                # Find similar topic
                for key, value in similar_topics.items():
                    if key in topic.lower():
                        default_problem = problems.get(value, {}).get(difficulty)
                        break
                
                # If still no match, use Arrays as default
                if not default_problem:
                    default_problem = problems.get("Arrays", {}).get(difficulty, problems["Arrays"]["easy"])
            
            # Generate dynamic problem if still no match
            if not default_problem:
                default_problem = self._generate_dynamic_coding_problem(topic, difficulty)
            
            return {
                "title": default_problem["title"],
                "description": default_problem["description"],
                "topic": topic,
                "difficulty": difficulty,
                "constraints": default_problem.get("constraints", ["1 <= n <= 1000", "Values can be negative"]),
                "examples": default_problem.get("examples", [
                    {
                        "input": "Example input",
                        "output": "Example output",
                        "explanation": "This is a fallback example"
                    }
                ]),
                "test_cases": default_problem.get("test_cases", []),
                "hidden_test_cases": default_problem.get("test_cases", [])[:2],  # Use first 2 as hidden
                "expected_complexity": default_problem.get("expected_complexity", {"time": "O(n)", "space": "O(1)"}),
                "hints": default_problem.get("hints", ["Think about the basic approach", "Consider edge cases"]),
                "tags": [topic.lower(), difficulty]
            }

    def _generate_dynamic_coding_problem(self, topic: str, difficulty: str) -> Dict[str, Any]:
            """Generate a dynamic coding problem for any topic"""
            
            # Define problem templates based on topic categories
            programming_topics = ["programming", "coding", "computer science", "cs", "software", "web", "frontend", "backend", "data science", "ai", "machine learning", "ml", "python", "javascript", "java", "c++", "react", "node", "sql", "database"]
            science_topics = ["science", "physics", "chemistry", "biology", "medicine", "engineering", "environmental", "geology", "astronomy"]
            math_topics = ["math", "mathematics", "calculus", "algebra", "statistics", "geometry", "trigonometry", "linear algebra", "discrete"]
            
            # Determine the category
            topic_lower = topic.lower()
            if any(prog_topic in topic_lower for prog_topic in programming_topics):
                category = "programming"
            elif any(sci_topic in topic_lower for sci_topic in science_topics):
                category = "science"
            elif any(math_topic in topic_lower for math_topic in math_topics):
                category = "mathematics"
            else:
                category = "general"
            
            # Generate problems based on category and difficulty
            if category == "programming":
                if difficulty.lower() == "easy":
                    return {
                        "title": f"Basic {topic} Algorithm Implementation",
                        "description": f"Implement a fundamental algorithm in {topic}. Create a function that demonstrates core programming concepts and handles basic input/output operations.",
                        "test_cases": [
                            {"input": {"data": [1, 2, 3, 4, 5]}, "output": "Algorithm executed successfully"},
                            {"input": {"data": [10, 20, 30]}, "output": "Result computed"}
                        ]
                    }
                elif difficulty.lower() == "medium":
                    return {
                        "title": f"Advanced {topic} Problem Solving",
                        "description": f"Solve a complex problem in {topic} using efficient algorithms and data structures. Implement error handling and optimize for performance.",
                        "test_cases": [
                            {"input": {"complex_data": [1, 2, 3, 4, 5], "parameters": {"threshold": 10}}, "output": "Complex problem solved"},
                            {"input": {"complex_data": [100, 200, 300], "parameters": {"threshold": 50}}, "output": "Optimized solution found"}
                        ]
                    }
                else:  # hard
                    return {
                        "title": f"Expert-Level {topic} System Design",
                        "description": f"Design and implement a comprehensive system in {topic} with multiple components, error handling, scalability considerations, and performance optimization.",
                        "test_cases": [
                            {"input": {"system_requirements": {"scale": "high", "performance": "critical"}}, "output": "System designed and implemented"},
                            {"input": {"system_requirements": {"scale": "enterprise", "performance": "optimal"}}, "output": "Enterprise solution delivered"}
                        ]
                    }
            
            elif category == "science":
                if difficulty.lower() == "easy":
                    return {
                        "title": f"Basic {topic} Data Analysis",
                        "description": f"Implement a simple data analysis tool for {topic} that processes experimental data and generates basic statistics.",
                        "test_cases": [
                            {"input": {"data": [1.2, 2.3, 3.4, 4.5]}, "output": "Analysis completed"},
                            {"input": {"data": [10.1, 20.2, 30.3]}, "output": "Statistics calculated"}
                        ]
                    }
                elif difficulty.lower() == "medium":
                    return {
                        "title": f"Advanced {topic} Simulation",
                        "description": f"Create a simulation model for {topic} phenomena with multiple variables and interactive parameters.",
                        "test_cases": [
                            {"input": {"parameters": {"time": 100, "precision": 0.01}}, "output": "Simulation completed"},
                            {"input": {"parameters": {"time": 1000, "precision": 0.001}}, "output": "High-precision simulation finished"}
                        ]
                    }
                else:  # hard
                    return {
                        "title": f"Complex {topic} Modeling System",
                        "description": f"Implement a comprehensive modeling system for {topic} with advanced algorithms, visualization, and predictive capabilities.",
                        "test_cases": [
                            {"input": {"model_parameters": {"complexity": "high", "accuracy": "precise"}}, "output": "Advanced model implemented"},
                            {"input": {"model_parameters": {"complexity": "expert", "accuracy": "optimal"}}, "output": "Expert-level model completed"}
                        ]
                    }
            
            elif category == "mathematics":
                if difficulty.lower() == "easy":
                    return {
                        "title": f"Basic {topic} Calculator",
                        "description": f"Implement a calculator for {topic} operations with support for basic mathematical functions and error handling.",
                        "test_cases": [
                            {"input": {"expression": "2 + 3 * 4"}, "output": "14"},
                            {"input": {"expression": "sqrt(16) + 5"}, "output": "9"}
                        ]
                    }
                elif difficulty.lower() == "medium":
                    return {
                        "title": f"Advanced {topic} Problem Solver",
                        "description": f"Create a sophisticated problem solver for {topic} that handles complex equations, multiple variables, and provides step-by-step solutions.",
                        "test_cases": [
                            {"input": {"equation": "x^2 + 5x + 6 = 0"}, "output": "x = -2, x = -3"},
                            {"input": {"equation": "2x + 3y = 10, x - y = 1"}, "output": "x = 2.6, y = 1.6"}
                        ]
                    }
                else:  # hard
                    return {
                        "title": f"Expert {topic} Analysis System",
                        "description": f"Implement a comprehensive analysis system for {topic} with advanced algorithms, numerical methods, and visualization capabilities.",
                        "test_cases": [
                            {"input": {"analysis_type": "numerical", "precision": "high"}, "output": "Numerical analysis completed"},
                            {"input": {"analysis_type": "symbolic", "precision": "exact"}, "output": "Symbolic analysis finished"}
                        ]
                    }
            
            else:  # general
                return {
                    "title": f"General {topic} Problem",
                    "description": f"Implement a solution for a {topic} problem that demonstrates problem-solving skills and programming best practices.",
                    "test_cases": [
                        {"input": {"problem_data": "sample"}, "output": "Problem solved"},
                        {"input": {"problem_data": "complex"}, "output": "Complex problem addressed"}
                    ]
                }

    def _get_fallback_feedback(self, code: str, test_results: List[Dict[str, Any]]) -> Dict[str, Any]:
            """Get fallback feedback when AI is not available"""
            passed_tests = sum(1 for result in test_results if result.get('passed', False))
            total_tests = len(test_results)
            success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
            
            return {
                "correctness": {
                    "score": int(success_rate),
                    "issues": ["AI analysis unavailable"],
                    "suggestions": ["Test your solution with more cases", "Check edge cases"]
                },
                "performance": {
                    "time_complexity": "Analysis unavailable",
                    "space_complexity": "Analysis unavailable",
                    "efficiency_score": 70,
                    "optimizations": ["AI optimization suggestions unavailable"]
                },
                "code_quality": {
                    "readability_score": 75,
                    "maintainability_score": 70,
                    "best_practices": ["Use meaningful variable names", "Add comments"],
                    "code_smells": ["AI analysis unavailable"]
                },
                "alternative_approaches": [],
                "learning_points": ["Practice more problems", "Study algorithms"],
                "overall_score": int(success_rate * 0.7),
                "next_steps": ["Continue practicing", "Study algorithm patterns"]
            }

