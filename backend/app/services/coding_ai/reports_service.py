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


class ReportsServiceMixin:
    async def generate_learning_path(
            self, 
            user_solutions: List[Dict[str, Any]], 
            user_analytics: Dict[str, Any]
        ) -> Dict[str, Any]:
            """Generate personalized learning path based on user performance"""
            try:
                print("[TARGET] [GEMINI_CODING] Generating personalized learning path")
                
                if not self.available:
                    return self._get_fallback_learning_path()
                
                prompt = f"""
                Analyze this user's coding progress and create a personalized learning path:
                
                User Analytics:
                - Problems Solved: {user_analytics.get('total_problems_solved', 0)}
                - Success Rate: {user_analytics.get('success_rate', 0)}%
                - Skill Level: {user_analytics.get('skill_level', 'beginner')}
                - Strong Topics: {user_analytics.get('strong_topics', [])}
                - Weak Topics: {user_analytics.get('weak_topics', [])}
                - Preferred Language: {user_analytics.get('preferred_language', 'python')}
                
                Recent Solutions: {json.dumps(user_solutions[-10:] if len(user_solutions) > 10 else user_solutions, indent=2)}
                
                Generate a comprehensive learning plan in this JSON format:
                {{
                    "current_skill_assessment": {{
                        "level": "intermediate",
                        "strengths": ["Strength 1", "Strength 2"],
                        "weaknesses": ["Weakness 1", "Weakness 2"],
                        "confidence_score": 75
                    }},
                    "learning_objectives": [
                        {{
                            "goal": "Master dynamic programming",
                            "priority": "high",
                            "estimated_weeks": 3,
                            "success_criteria": ["Criteria 1", "Criteria 2"]
                        }}
                    ],
                    "recommended_topics": [
                        {{
                            "topic": "Arrays and Strings",
                            "difficulty": "medium",
                            "problems_count": 15,
                            "estimated_time": "2 weeks",
                            "prerequisites": ["Basic programming"],
                            "learning_resources": ["Resource 1", "Resource 2"]
                        }}
                    ],
                    "practice_schedule": {{
                        "daily_problems": 2,
                        "weekly_goals": "Complete 10 medium problems",
                        "review_schedule": "Every 3 days",
                        "difficulty_progression": "Start easy, progress to medium"
                    }},
                    "improvement_areas": [
                        {{
                            "area": "Time complexity analysis",
                            "current_level": "basic",
                            "target_level": "advanced",
                            "action_plan": ["Action 1", "Action 2"]
                        }}
                    ],
                    "milestone_tracking": [
                        {{
                            "milestone": "Solve 50 array problems",
                            "target_date": "2024-02-15",
                            "progress_indicators": ["Indicator 1", "Indicator 2"]
                        }}
                    ]
                }}
                
                Make the plan:
                1. Specific and actionable
                2. Tailored to current skill level
                3. Progressive in difficulty
                4. Include measurable goals
                5. Address identified weaknesses
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
                    return self._get_fallback_learning_path()
                
                # Clean and parse JSON response
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    learning_data = json.loads(response_text)
                    print("[SUCCESS] [GEMINI_CODING] Learning path generated successfully")
                    return learning_data
                    
                except json.JSONDecodeError:
                    return self._get_fallback_learning_path()
                
            except Exception as e:
                print(f"[ERROR] [GEMINI_CODING] Error generating learning path: {str(e)}")
                return self._get_fallback_learning_path()

    def _get_fallback_learning_path(self) -> Dict[str, Any]:
            """Get fallback learning path when AI is not available"""
            return {
                "current_skill_assessment": {
                    "level": "intermediate",
                    "strengths": ["Basic programming"],
                    "weaknesses": ["Advanced algorithms"],
                    "confidence_score": 60
                },
                "learning_objectives": [
                    {
                        "goal": "Improve problem solving skills",
                        "priority": "high",
                        "estimated_weeks": 4,
                        "success_criteria": ["Solve 20 problems", "Improve success rate"]
                    }
                ],
                "recommended_topics": [
                    {
                        "topic": "Arrays and Strings",
                        "difficulty": "easy",
                        "problems_count": 10,
                        "estimated_time": "1 week",
                        "prerequisites": [],
                        "learning_resources": ["Practice problems", "Algorithm tutorials"]
                    }
                ],
                "practice_schedule": {
                    "daily_problems": 1,
                    "weekly_goals": "Complete 5 problems",
                    "review_schedule": "Weekly",
                    "difficulty_progression": "Start with easy problems"
                },
                "improvement_areas": [
                    {
                        "area": "Problem solving approach",
                        "current_level": "basic",
                        "target_level": "intermediate",
                        "action_plan": ["Practice daily", "Study solutions"]
                    }
                ],
                "milestone_tracking": [
                    {
                        "milestone": "Complete 25 problems",
                        "target_date": "2024-02-01",
                        "progress_indicators": ["Daily practice", "Success rate improvement"]
                    }
                ]
            }

    async def generate_student_report(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
            """Generate AI-powered student performance report"""
            try:
                print(f"[AI_REPORT] Generating student report for {performance_data.get('student_name', 'Unknown')}")
                
                if not self.available:
                    return self._get_fallback_student_report(performance_data)
                
                prompt = f"""
                Generate a comprehensive student performance report based on the following data:
                
                Student: {performance_data.get('student_name', 'Unknown')}
                Total Assessments: {performance_data.get('total_assessments', 0)}
                Average Score: {performance_data.get('average_score', 0)}%
                Topic Performance: {performance_data.get('topic_performance', {})}
                Recent Results: {performance_data.get('recent_results', [])}
                
                Provide a detailed analysis in this JSON format:
                {{
                    "report_content": "Comprehensive analysis of student performance with specific insights and recommendations",
                    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
                    "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
                    "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
                    "performance_summary": {{
                        "overall_grade": "B+",
                        "improvement_areas": ["Area 1", "Area 2"],
                        "next_steps": ["Step 1", "Step 2"],
                        "estimated_improvement_time": "2-3 weeks"
                    }}
                }}
                
                Focus on:
                1. Specific performance patterns and trends
                2. Identified strengths and areas for improvement
                3. Actionable recommendations for the teacher
                4. Realistic expectations and timelines
                5. Personalized learning suggestions
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
                    return self._get_fallback_student_report(performance_data)
                
                # Clean and parse JSON response
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    report_data = json.loads(response_text)
                    print("[SUCCESS] [AI_REPORT] Student report generated successfully")
                    return report_data
                    
                except json.JSONDecodeError:
                    return self._get_fallback_student_report(performance_data)
                
            except Exception as e:
                print(f"[ERROR] [AI_REPORT] Error generating student report: {str(e)}")
                return self._get_fallback_student_report(performance_data)

    def _get_fallback_student_report(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
            """Get fallback student report when AI is not available"""
            return {
                "report_content": f"Student {performance_data.get('student_name', 'Unknown')} has completed {performance_data.get('total_assessments', 0)} assessments with an average score of {performance_data.get('average_score', 0)}%. Based on the performance data, there are areas for improvement and strengths to build upon.",
                "strengths": ["Consistent participation", "Good effort"],
                "weaknesses": ["Needs improvement in some areas"],
                "recommendations": ["Continue practicing", "Focus on weak topics"],
                "performance_summary": {
                    "overall_grade": "B",
                    "improvement_areas": ["Practice more problems"],
                    "next_steps": ["Continue learning"],
                    "estimated_improvement_time": "2-4 weeks"
                }
            }

    async def generate_smart_assessment(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
            """Generate AI-powered assessment targeting batch weaknesses"""
            try:
                print(f"[SMART_ASSESSMENT] Generating smart assessment: {assessment_data.get('title', 'Unknown')}")
                
                if not self.available:
                    return self._get_fallback_smart_assessment(assessment_data)
                
                batch_weaknesses = assessment_data.get('batch_weaknesses', {})
                adapt_to_weaknesses = assessment_data.get('adapt_to_weaknesses', False)
                
                prompt = f"""
                Generate a smart assessment that targets student weaknesses:
                
                Assessment Details:
                - Title: {assessment_data.get('title', 'Smart Assessment')}
                - Topic: {assessment_data.get('topic', 'General')}
                - Difficulty: {assessment_data.get('difficulty', 'medium')}
                - Question Count: {assessment_data.get('question_count', 10)}
                - Adapt to Weaknesses: {adapt_to_weaknesses}
                
                Batch Weaknesses: {batch_weaknesses}
                
                Generate assessment in this JSON format:
                {{
                    "description": "Assessment description explaining the focus areas",
                    "questions": [
                        {{
                            "question": "Question text",
                            "options": ["Option A", "Option B", "Option C", "Option D"],
                            "correct_answer": 0,
                            "explanation": "Why this answer is correct",
                            "difficulty": "easy",
                            "topic": "specific topic",
                            "targets_weakness": "specific weakness"
                        }}
                    ],
                    "insights": ["Insight 1", "Insight 2"],
                    "targeted_areas": ["Area 1", "Area 2"],
                    "estimated_time": "30 minutes"
                }}
                
                Requirements:
                1. Target identified weaknesses from batch analysis
                2. Create questions that progressively build understanding
                3. Include explanations that help students learn
                4. Balance difficulty based on student performance
                5. Focus on practical application of concepts
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
                    return self._get_fallback_smart_assessment(assessment_data)
                
                # Clean and parse JSON response
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    assessment_data = json.loads(response_text)
                    print("[SUCCESS] [SMART_ASSESSMENT] Smart assessment generated successfully")
                    return assessment_data
                    
                except json.JSONDecodeError:
                    return self._get_fallback_smart_assessment(assessment_data)
                
            except Exception as e:
                print(f"[ERROR] [SMART_ASSESSMENT] Error generating smart assessment: {str(e)}")
                return self._get_fallback_smart_assessment(assessment_data)

    def _get_fallback_smart_assessment(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
            """Get fallback smart assessment when AI is not available"""
            return {
                "description": f"Assessment on {assessment_data.get('topic', 'General')} topics with {assessment_data.get('question_count', 10)} questions",
                "questions": [
                    {
                        "question": f"Sample question about {assessment_data.get('topic', 'General')}",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_answer": 0,
                        "explanation": "This is the correct answer because...",
                        "difficulty": assessment_data.get('difficulty', 'medium'),
                        "topic": assessment_data.get('topic', 'General'),
                        "targets_weakness": "General understanding"
                    }
                ],
                "insights": ["Focus on fundamental concepts", "Practice regularly"],
                "targeted_areas": [assessment_data.get('topic', 'General')],
                "estimated_time": "30 minutes"
            }

    async def audit_content_quality(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
            """Audit content quality using AI"""
            try:
                print(f"[CONTENT_AUDIT] Auditing content quality")
                
                if not self.available:
                    return self._get_fallback_content_audit(content_data)
                
                prompt = f"""
                Audit the quality of educational content:
                
                Content Type: {content_data.get('content_type', 'unknown')}
                Content Text: {content_data.get('content_text', '')}
                Success Rate: {content_data.get('success_rate', 0)}%
                Total Attempts: {content_data.get('total_attempts', 0)}
                
                Provide quality audit in this JSON format:
                {{
                    "audit_score": 85,
                    "audit_feedback": "Detailed feedback on content quality",
                    "recommendations": ["Recommendation 1", "Recommendation 2"],
                    "quality_issues": ["Issue 1", "Issue 2"],
                    "strengths": ["Strength 1", "Strength 2"]
                }}
                
                Evaluate:
                1. Clarity and comprehensibility
                2. Educational value and learning objectives
                3. Difficulty appropriateness
                4. Potential ambiguity or confusion
                5. Engagement and interest level
                6. Alignment with learning outcomes
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
                    return self._get_fallback_content_audit(content_data)
                
                # Clean and parse JSON response
                response_text = response.text.strip()
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    audit_data = json.loads(response_text)
                    print("[SUCCESS] [CONTENT_AUDIT] Content audit completed successfully")
                    return audit_data
                    
                except json.JSONDecodeError:
                    return self._get_fallback_content_audit(content_data)
                
            except Exception as e:
                print(f"[ERROR] [CONTENT_AUDIT] Error auditing content: {str(e)}")
                return self._get_fallback_content_audit(content_data)

    def _get_fallback_content_audit(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
            """Get fallback content audit when AI is not available"""
            return {
                "audit_score": 75,
                "audit_feedback": "Content appears to be of reasonable quality. Consider reviewing for clarity and educational value.",
                "recommendations": ["Review for clarity", "Ensure educational value"],
                "quality_issues": ["Minor clarity issues"],
                "strengths": ["Relevant content", "Appropriate difficulty"]
            }

