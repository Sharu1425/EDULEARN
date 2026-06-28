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


class GeminiCodingBase:
    def __init__(self):
            """Initialize Gemini AI service for coding platform"""
            from app.core.config import settings
            self.api_key = settings.gemini_api_key
            self.cache = {}  # Simple in-memory cache for recent generations
            self.cache_max_size = 50

            # Build the ordered fallback model list.
            # Start with the model from .env, then add known stable alternatives.
            configured_model = getattr(settings, 'gemini_model', None) or "gemini-2.0-flash"
            self.model_name = configured_model
            self.fallback_models = list(dict.fromkeys([
                configured_model,       # .env model first
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-2.0-flash-lite",
                "gemini-1.5-flash-8b",
            ]))
            self.active_model = configured_model  # updated when a fallback succeeds

            if self.api_key and self.api_key not in ("your-google-ai-api-key", "not-set", ""):
                try:
                    self.client = genai.Client(api_key=self.api_key)
                    self.available = True
                    print(f"[GEMINI] Service ready. Primary model: {self.model_name}")
                except Exception as e:
                    self.client = None
                    self.available = False
                    print(f"[GEMINI] Failed to create client: {e}")
            else:
                self.client = None
                self.available = False
                print("[GEMINI] No API key configured — will serve fallback questions")

    def _get_cache_key(self, topic: str, difficulty: str, count: int = 1) -> str:
            """Generate cache key for requests"""
            return f"{topic}_{difficulty}_{count}"

    def _get_from_cache(self, cache_key: str):
            """Get item from cache if available"""
            if cache_key in self.cache:
                print(f"[CACHE] [GEMINI_CODING] Cache hit for {cache_key}")
                return self.cache[cache_key]
            return None

    def _add_to_cache(self, cache_key: str, data):
            """Add item to cache with size limit"""
            if len(self.cache) >= self.cache_max_size:
                # Remove oldest item
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
            
            self.cache[cache_key] = data
            self.cache[cache_key] = data
            print(f"[CACHE] [GEMINI_CODING] Cached {cache_key}")

    def _clean_json_response(self, json_text: str) -> str:
            """Strip markdown fences and locate the JSON array/object boundaries."""
            # Remove markdown code fences first
            if "```json" in json_text:
                json_text = json_text.split("```json", 1)[1]
            if "```" in json_text:
                json_text = json_text.rsplit("```", 1)[0]
            json_text = json_text.strip()

            # Locate the outermost [ or { (whichever comes first)
            start_bracket = json_text.find('[')
            start_brace = json_text.find('{')

            if start_bracket == -1 and start_brace == -1:
                return json_text  # Nothing to trim

            if start_bracket == -1:
                start = start_brace
                end = json_text.rfind('}') + 1
            elif start_brace == -1:
                start = start_bracket
                end = json_text.rfind(']') + 1
            else:
                if start_bracket < start_brace:
                    start = start_bracket
                    end = json_text.rfind(']') + 1
                else:
                    start = start_brace
                    end = json_text.rfind('}') + 1

            return json_text[start:end] if end > start else json_text

