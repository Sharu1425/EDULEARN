from datetime import timezone
import asyncio
import json
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
from app.models.models import UserModel
from app.schemas.schemas import (
    MasteryQuizGenerateResponse,
    MasteryQuizQuestion,
    MasteryRoadmapGenerateResponse,
    MasterySummaryGenerateResponse,
    MasteryFinalExamGenerateResponse
)
import os
import google.generativeai as genai
from app.core.config import settings

class MasteryService:
    def __init__(self):
        self._init_gemini()

    def _init_gemini(self):
        try:
            api_key = settings.gemini_api_key
            if not api_key or api_key == "not-set":
                print("WARNING: Gemini API Key not set.")
                self.model = None
                return
            genai.configure(api_key=api_key)
            model_name = getattr(settings, 'gemini_model', None) or "gemini-2.0-flash"
            self.model = genai.GenerativeModel(model_name)
        except Exception as e:
            print(f"Error initializing Gemini in MasteryService: {e}")
            self.model = None

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    async def generate_roadmap(self, subject: str) -> Dict[str, Any]:
        if not self.model:
            raise Exception("AI service not initialized")

        prompt = f"""
        # MASTERY TOPIC — AI SYSTEM PROMPT : MODE 1 — ROADMAP GENERATION
        Subject: "{subject}"
        
        Rules:
        - Generate between 6 and 14 subtopics depending on subject breadth.
        - Group subtopics into 2–4 parent clusters (e.g., "Foundations", "Core Concepts", "Advanced Applications").
        - Each subtopic must be atomic — one clear idea.
        - Order subtopics so that no node assumes knowledge from a node that comes after it.
        - Mark prerequisite edges explicitly using subtopic ids.
        - Assign each subtopic a difficulty score from 1 (beginner) to 5 (expert).
        - Estimate reading_time_minutes honestly (3–8 minutes per subtopic).

        Output Schema (strictly JSON, no markdown):
        {{
          "roadmap_title": "string",
          "subject": "string",
          "clusters": [
            {{
              "cluster_id": "string",
              "cluster_title": "string",
              "subtopics": [
                {{
                  "id": "string",
                  "title": "string",
                  "difficulty": 1,
                  "reading_time_minutes": 5,
                  "prerequisites": ["subtopic_id_1"]
                }}
              ]
            }}
          ]
        }}
        """
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            text = self._clean_json_response(response.text)
            data = json.loads(text)
            return data
        except Exception as e:
            print(f"Error generating roadmap: {e}")
            raise Exception(f"Failed to generate roadmap: {str(e)}")

    async def generate_summary(self, subtopic_id: str, subtopic_title: str, difficulty: int) -> Dict[str, Any]:
        if not self.model:
            raise Exception("AI service not initialized")

        prompt = f"""
        # MASTERY TOPIC — AI SYSTEM PROMPT : MODE 2 — READING SUMMARY
        Subtopic: "{subtopic_title}"
        Difficulty: {difficulty}
        
        Rules:
        - Length: 250–450 words for diff 1–2. 400–650 words for diff 3–5.
        - Structure: Hook -> Core explanation -> How it works (example) -> Common mistake -> Quick recap (3 bullet points).
        - If it's a technical/CS topic, include a code snippet (≤15 lines). Otherwise, set code_snippet to null.
        
        Output Schema (strictly JSON, no markdown):
        {{
          "subtopic_id": "{subtopic_id}",
          "subtopic_title": "{subtopic_title}",
          "difficulty": {difficulty},
          "estimated_read_minutes": 5,
          "hook": "string",
          "explanation": "string",
          "example": "string",
          "common_mistake": "string",
          "key_takeaways": ["string", "string", "string"],
          "code_snippet": "string or null"
        }}
        """
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            text = self._clean_json_response(response.text)
            data = json.loads(text)
            return data
        except Exception as e:
            print(f"Error generating summary: {e}")
            raise Exception(f"Failed to generate summary: {str(e)}")

    async def generate_quiz(self, subtopic_id: str, subtopic_title: str, difficulty: int, attempt_number: int) -> Dict[str, Any]:
        if not self.model:
            raise Exception("AI service not initialized")

        prompt = f"""
        # MASTERY TOPIC — AI SYSTEM PROMPT : MODE 3 — SUBTOPIC QUIZ
        Subtopic: "{subtopic_title}"
        Difficulty: {difficulty}
        Attempt Number: {attempt_number}
        
        Rules:
        - Pass mark is 4 out of 5 (80%).
        - Include EXACTLY: 2 × MCQ, 1 × SATA, 1 × FIB, 1 × Scenario (SCN).
        - For SATA (Select All That Apply), correct_answers must be an array.
        - For FIB (Fill in the Blank), provide sentence_with_blank, correct_word, and near_miss_options.
        - For Scenario, provide the scenario string and the question.
        - If attempt_number > 1, DO NOT reuse questions from typical first attempts.

        Output Schema (strictly JSON, no markdown):
        {{
          "subtopic_id": "{subtopic_id}",
          "subtopic_title": "{subtopic_title}",
          "attempt_number": {attempt_number},
          "pass_mark": 4,
          "time_per_question_seconds": 30,
          "questions": [
            {{
              "q_id": "q1",
              "type": "mcq",
              "question": "string",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "A",
              "explanation": "string"
            }},
            {{
              "q_id": "q2",
              "type": "sata",
              "question": "string",
              "options": ["A", "B", "C", "D", "E"],
              "correct_answers": ["A", "C"],
              "explanation": "string"
            }},
            {{
              "q_id": "q3",
              "type": "fib",
              "sentence_with_blank": "string",
              "correct_word": "string",
              "near_miss_options": ["string", "string", "string"],
              "explanation": "string"
            }},
            {{
              "q_id": "q4",
              "type": "scenario",
              "scenario": "string",
              "question": "string",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "B",
              "explanation": "string"
            }},
            {{
              "q_id": "q5",
              "type": "mcq",
              "question": "string",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "C",
              "explanation": "string"
            }}
          ]
        }}
        """
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            text = self._clean_json_response(response.text)
            data = json.loads(text)
            return data
        except Exception as e:
            print(f"Error generating quiz: {e}")
            raise Exception(f"Failed to generate quiz: {str(e)}")

    async def generate_final_exam(self, roadmap_subject: str, completed_subtopics: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not self.model:
            raise Exception("AI service not initialized")

        subtopics_str = ", ".join([f"{t['title']} (Diff: {t.get('difficulty', 3)})" for t in completed_subtopics])

        prompt = f"""
        # MASTERY TOPIC — AI SYSTEM PROMPT : MODE 4 — FINAL BOSS EXAM
        Roadmap Subject: "{roadmap_subject}"
        Completed Subtopics: {subtopics_str}
        
        Rules:
        - Exactly 18 questions.
        - Mix: 6 MCQ, 3 SATA, 3 FIB, 3 Scenario, 3 Cross-topic synthesis (label as `cross_topic: true`).
        - Every subtopic must appear in at least 1 question. No subtopic more than 3.
        - Output a topic_coverage_map (q_id -> [subtopic_ids]).

        Output Schema (strictly JSON, no markdown):
        {{
          "exam_title": "Final Mastery Exam: {roadmap_subject}",
          "roadmap_subject": "{roadmap_subject}",
          "total_questions": 18,
          "pass_mark": 15,
          "time_limit_minutes": 45,
          "topic_coverage_map": {{
            "q1": ["subtopic_id_1"]
          }},
          "questions": [
            {{
              "q_id": "q1",
              "type": "mcq",
              "cross_topic": false,
              "covers_subtopics": ["subtopic_id_1"],
              "question": "string",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "A",
              "explanation": "string"
            }}
          ]
        }}
        """
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            text = self._clean_json_response(response.text)
            data = json.loads(text)
            return data
        except Exception as e:
            print(f"Error generating final exam: {e}")
            raise Exception(f"Failed to generate final exam: {str(e)}")

    async def check_and_update_streak(self, db, user_id) -> int:
        # Use get_collection so this works with both Motor and the mock DB.
        user_coll = db.get_collection("users")
        user = await user_coll.find_one({"_id": user_id})
        
        if not user:
            return 0
        
        last_activity_date = user.get("last_activity_date")
        streak_count = user.get("streak_count", 0)
        
        today = datetime.now(timezone.utc).date()
        
        if last_activity_date:
            if isinstance(last_activity_date, datetime):
                last_date = last_activity_date.date()
            else:
                last_date = today # Fallback
                
            if last_date == today:
                # Already updated today
                return streak_count
            elif last_date == today - timedelta(days=1):
                # Yesterday, increment
                streak_count += 1
            else:
                # Streak broken
                streak_count = 1
        else:
            # First activity ever
            streak_count = 1

        # Update user
        await user_coll.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "streak_count": streak_count,
                    "last_activity_date": datetime.combine(today, datetime.min.time())
                }
            }
        )
        return streak_count

mastery_service = MasteryService()
