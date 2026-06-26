import json
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
from app.models.models import UserModel
from app.schemas.schemas import MasteryQuizGenerateResponse
import os
import google.generativeai as genai
from app.core.config import settings

class MasteryService:
    def __init__(self):
        self._init_gemini()

    def _init_gemini(self):
        # Similar logic to gemini_coding_service
        try:
            api_key = settings.gemini_api_key
            if not api_key or api_key == "not-set":
                print("WARNING: Gemini API Key not set.")
                self.model = None
                return
            genai.configure(api_key=api_key)
            model_name = getattr(settings, 'gemini_model', None) or "gemini-2.0-flash"
            self.model = genai.GenerativeModel(model_name) # Using modern default model
        except Exception as e:
            print(f"Error initializing Gemini in MasteryService: {e}")
            self.model = None

    async def generate_roadmap(self, subject: str) -> List[Dict[str, Any]]:
        if not self.model:
            raise Exception("AI service not initialized")

        prompt = f"""
        Generate a structured learning roadmap for the subject: "{subject}".
        Return a JSON array of topics in learning order. Each topic must have:
        - id (slug, e.g. "linked-list")
        - title (e.g. "Linked List")
        - order (integer starting at 1)
        - concept_summary (2-3 paragraph plain English explanation of the concept)
        - estimated_minutes (integer, realistic read time)
        Return 6-10 topics. Return only valid JSON array, no markdown like ```json.
        """
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```"):
                parts = text.split("```")
                if len(parts) >= 3:
                    text = parts[1]
                    if text.strip().startswith("json"):
                        text = text.strip()[4:]
            text = text.strip()
            
            topics = json.loads(text)
            return topics
        except Exception as e:
            print(f"Error generating roadmap: {e}")
            raise Exception(f"Failed to generate roadmap: {str(e)}")

    async def generate_quiz(self, topic_title: str, concept_summary: str) -> List[MasteryQuizGenerateResponse]:
        if not self.model:
            raise Exception("AI service not initialized")

        prompt = f"""
        Based on this concept: "{concept_summary}"
        Generate 5 multiple choice questions to test understanding of "{topic_title}".
        Each question must have: "question" (string), "options" (array of 4 strings), "correct_answer" (0-indexed integer).
        Return only valid JSON array. No markdown like ```json.
        """
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            questions_json = json.loads(text)
            return [MasteryQuizGenerateResponse(**q) for q in questions_json]
        except Exception as e:
            print(f"Error generating quiz: {e}")
            raise Exception(f"Failed to generate quiz: {str(e)}")

    async def check_and_update_streak(self, db, user_id: str) -> int:
        user_coll = db.users
        user = await user_coll.find_one({"_id": user_id})
        
        if not user:
            return 0
        
        last_activity_date = user.get("last_activity_date")
        streak_count = user.get("streak_count", 0)
        
        today = datetime.utcnow().date()
        
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
