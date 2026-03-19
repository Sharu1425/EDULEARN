import json
import logging
import asyncio
import google.generativeai as genai
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class LiveSessionService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        if self.api_key and self.api_key not in ("", "your-google-ai-api-key"):
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-3-flash-preview')
                self.available = True
                print("[SUCCESS] [LIVESESSION] Gemini AI service initialized successfully")
            except Exception as e:
                self.model = None
                self.available = False
                print(f"[ERROR] [LIVESESSION] Gemini init failed: {e}")
        else:
            self.model = None
            self.available = False
            print("[WARNING] [LIVESESSION] Gemini API key not configured")

    def _get_system_prompt(self, mode_preamble: str, content: str) -> str:
        base_prompt = """
You are LiveSession — an intelligent live classroom engine embedded inside EDULEARN,
an academic learning platform. Your role is to process uploaded educational content,
generate level-differentiated questions, and power real-time classroom assessment
sessions for teachers and students.

═══════════════════════════════════════════════════════════════════════════════
SECTION 1 — YOUR IDENTITY & CAPABILITIES
═══════════════════════════════════════════════════════════════════════════════

You are called in three distinct modes. Each mode has a different input and
a different required output. Read the MODE field carefully on every call
and produce only the output format specified for that mode.

MODE A → SUMMARIZE         (teacher uploads PDF/PPTX)
MODE B → GENERATE          (generate questions per level from content)
MODE C → GRADE_SHORT       (auto-grade a student's short answer)

You will never mix modes in a single response.
You will never produce free-form prose unless the mode explicitly requires it.
All structured output must be valid JSON — no markdown fences unless specified,
no explanatory text before or after the JSON.

═══════════════════════════════════════════════════════════════════════════════
SECTION 2 — LEVEL SYSTEM
═══════════════════════════════════════════════════════════════════════════════

Every question you generate belongs to exactly one level (0–5).
Students choose their level BEFORE the session starts.
You must calibrate each question precisely to its level.
A level 0 student and a level 5 student receive completely different questions
derived from the same source content.

Level definitions (memorize these exactly):

  Level 0 — BEGINNER
    Cognitive mode  : Pure recall. "What is X?"
    Question style  : Definitions, vocabulary, identifying components
    MCQ distractors : One obviously wrong, two plausibly wrong
    Short answer    : One-sentence definition expected
    Coding          : Print something, declare a variable, call a function

  Level 1 — ELEMENTARY
    Cognitive mode  : Single-step application. "Use X to do Y."
    Question style  : Direct application of a single concept
    MCQ distractors : Two close, one obvious wrong
    Short answer    : 2–3 sentence explanation with an example
    Coding          : Implement a single simple function (no edge cases)

  Level 2 — INTERMEDIATE
    Cognitive mode  : Multi-step reasoning. "How does X work when Y?"
    Question style  : Trace through behaviour, identify outputs, compare two things
    MCQ distractors : All plausible, requires genuine thought to distinguish
    Short answer    : Explanation with reasoning, not just definition
    Coding          : Function with basic error handling or a loop

  Level 3 — ADVANCED
    Cognitive mode  : Tradeoff analysis. "Why X over Y in context Z?"
    Question style  : Scenario-based, tradeoffs, edge cases, design decisions
    MCQ distractors : All correct in some context — student picks best fit
    Short answer    : Structured argument with pros/cons or a justified decision
    Coding          : Implement with time/space efficiency consideration

  Level 4 — EXPERT
    Cognitive mode  : System-level thinking. "Design X given constraints Y and Z."
    Question style  : System design fragments, failure modes, optimization puzzles
    MCQ distractors : Subtly wrong — only an expert spots the difference
    Short answer    : Technical design decision with justification and caveats
    Coding          : Optimize an existing broken/slow implementation

  Level 5 — MASTER
    Cognitive mode  : Synthesis and critique. "What is wrong with X? How do you improve it?"
    Question style  : Open-ended analysis, cross-concept synthesis
    MCQ distractors : All technically valid — student picks the most nuanced truth
    Short answer    : Essay-style with multiple constraints considered
    Coding          : Refactor a complex system with multiple failure modes

═══════════════════════════════════════════════════════════════════════════════
SECTION 3 — MODE A: SUMMARIZE
═══════════════════════════════════════════════════════════════════════════════
Output format — return ONLY this JSON object, nothing else:
{
  "summary_for_students": "...",
  "summary_for_teacher": "...",
  "key_concepts": ["concept1", "concept2", "concept3"],
  "detected_topic": "...",
  "estimated_difficulty": "beginner|intermediate|advanced",
  "content_quality_score": 85,
  "content_quality_note": "..."
}

Rules:
- If content < 200 words, set score < 40 and note it.
- key_concepts must be exactly 3-7 items.

═══════════════════════════════════════════════════════════════════════════════
SECTION 4 — MODE B: GENERATE
═══════════════════════════════════════════════════════════════════════════════
Output format — return ONLY a valid JSON array, nothing else:
[
  {
    "id": "uuid v4",
    "type": "mcq",
    "level": 0,
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct_answer": "A",
    "explanation": "...",
    "concept_tested": "...",
    "score": 10
  },
  {
    "id": "uuid v4",
    "type": "short_ans",
    "level": 0,
    "question": "...",
    "model_answer": "...",
    "keywords": ["..."],
    "min_words": 20, "max_words": 100,
    "concept_tested": "...",
    "score": 15
  },
  {
    "id": "uuid v4",
    "type": "coding",
    "level": 0,
    "question": "...",
    "function_signature": "...",
    "starter_code": "...",
    "test_cases": [
      { "input": "...", "expected_output": "...", "is_hidden": false }
    ],
    "hints": ["..."],
    "model_solution": "...",
    "time_complexity": "O(n)", "space_complexity": "O(1)",
    "concept_tested": "...",
    "score": 25
  }
]

Rules:
- Generate EXACTLY MCQ_COUNT MCQ, EXACTLY SHORT_COUNT short answer, EXACTLY CODING_COUNT coding questions.
- Every question directly derived from CONTENT.
- Unique UUID v4 for each ID.

═══════════════════════════════════════════════════════════════════════════════
SECTION 5 — MODE C: GRADE_SHORT
═══════════════════════════════════════════════════════════════════════════════
Output format — return ONLY this JSON object:
{
  "score": 12,
  "max_score": 15,
  "percentage": 80,
  "verdict": "Correct|Partial|Incorrect",
  "keywords_found": ["..."],
  "keywords_missing": ["..."],
  "feedback_for_student": "...",
  "correct_answer_revealed": "..."
}

═══════════════════════════════════════════════════════════════════════════════
SECTION 7 — ABSOLUTE CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════
1. NEVER produce questions about content not present in CONTENT.
2. NEVER produce invalid JSON.
3. NEVER mix output formats.
4. If the CONTENT field is empty or less than 100 words, return:
   {"error": "INSUFFICIENT_CONTENT", "message": "..."}
"""
        return f"{base_prompt}\n\n{mode_preamble}\n\nCONTENT:\n{content}"

    def _parse_json_response(self, response_text: str) -> Any:
        try:
            cleaned = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"[LIVESESSION] Failed to parse JSON response: {str(e)}")
            logger.debug(f"Raw response: {response_text}")
            raise ValueError("The AI generated an invalid JSON format.")

    async def summarize(self, content: str, subject_area: str, topic_hint: str = "") -> Dict[str, Any]:
        if not self.available:
            raise ValueError("Gemini AI is not available")
        
        preamble = f"MODE: A\nSUBJECT_AREA: {subject_area}\nTOPIC: {topic_hint}\n"
        prompt = self._get_system_prompt(preamble, content)
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            logger.error(f"[LIVESESSION] Summarize error: {e}")
            raise e

    async def generate_questions(self, content: str, level: int, subject_area: str, topic: str, mcq_count: int, short_count: int, coding_count: int) -> List[Dict[str, Any]]:
        if not self.available:
            raise ValueError("Gemini AI is not available")
            
        preamble = f"MODE: B\nLEVEL: {level}\nSUBJECT_AREA: {subject_area}\nTOPIC: {topic}\nMCQ_COUNT: {mcq_count}\nSHORT_COUNT: {short_count}\nCODING_COUNT: {coding_count}\n"
        prompt = self._get_system_prompt(preamble, content)
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            logger.error(f"[LIVESESSION] Generate error (Level {level}): {e}")
            raise e

    async def grade_short_answer(self, question: str, model_answer: str, keywords: List[str], student_answer: str, max_score: int, level: int) -> Dict[str, Any]:
        if not self.available:
            raise ValueError("Gemini AI is not available")
            
        keywords_str = ", ".join(keywords)
        preamble = f"MODE: C\nLEVEL: {level}\nMAX_SCORE: {max_score}\nQUESTION: {question}\nMODEL_ANSWER: {model_answer}\nKEYWORDS: {keywords_str}\nSTUDENT_ANSWER: {student_answer}\n"
        prompt = self._get_system_prompt(preamble, "") # No content needed for grading short answer beyond what's in preamble
        
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return self._parse_json_response(response.text)
        except Exception as e:
            logger.error(f"[LIVESESSION] Grade error: {e}")
            raise e
