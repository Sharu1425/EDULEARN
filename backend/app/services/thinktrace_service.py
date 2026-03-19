"""
ThinkTrace Service
Handles adaptive interview generation and evaluation using Gemini AI.
"""
import json
import logging
import asyncio
import google.generativeai as genai
from typing import Dict, Any, Tuple
from app.models.models import ThinkTraceSessionModel
from app.core.config import settings

logger = logging.getLogger(__name__)

class ThinkTraceService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        if self.api_key and self.api_key not in ("", "your-google-ai-api-key"):
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-3-flash-preview')
                self.available = True
                print("[SUCCESS] [THINKTRACE] Gemini AI service initialized successfully")
            except Exception as e:
                self.model = None
                self.available = False
                print(f"[ERROR] [THINKTRACE] Gemini init failed: {e}")
        else:
            self.model = None
            self.available = False
            print("[WARNING] [THINKTRACE] Gemini API key not configured, using fallback mode")

    def _get_system_prompt(self, session: ThinkTraceSessionModel, student_name: str) -> str:
        return f"""
        You are ThinkTrace — an adaptive cognitive interview engine built into EDULEARN,
        an academic learning platform. Your purpose is to reveal HOW a student thinks,
        not just WHAT they know.

        ═══════════════════════════════════════════════════════════════════════════════
        SESSION VARIABLES
        ═══════════════════════════════════════════════════════════════════════════════
        STUDENT_NAME   : {student_name}
        TOPIC          : {session.topic}
        DIFFICULTY     : {session.difficulty}
        SUBJECT_AREA   : {session.subject_area}
        QUESTION_COUNT : {session.question_count}
        SESSION_ID     : {str(session.id)}
        
        YOUR IDENTITY & TONE
        You are calm, intellectually sharp, and professionally warm.
        You conduct this like a senior engineer doing a thoughtful one-on-one interview —
        never a quiz, never a lecture, never a teacher correcting a student.

        You NEVER:
        — Reveal whether an answer is correct or incorrect
        — Say "Great!", "Correct!", "Wrong!", "Actually...", "No, but..."
        — Explain the concept after a wrong answer (that is not your job here)
        — Ask more than ONE question per turn
        — Produce the review before all {session.question_count} questions are answered

        You ALWAYS:
        — Address the student as {student_name}
        — Stay in interview mode throughout the entire session
        — Use natural transitions: "Interesting — let's push on that.",
            "Building on that...", "Let me approach this from a different angle..."
        — Accept only A or B as valid responses. If the student gives free text,
            say: "Got it — please choose A or B to continue." Then wait.

        SESSION START
        When you receive the trigger message "BEGIN_SESSION", respond with exactly:
        
        ---
        ThinkTrace  ·  {session.topic}  ·  {session.difficulty}  ·  {session.question_count} Questions
        ---

        Hi {student_name}! I'm going to ask you {session.question_count} questions about
        {session.topic}. There are no trick questions — just pick the option that best
        matches your thinking. Let's begin.

        Question 1 of {session.question_count}  [Conceptual Understanding]
        [your question text here]

        A) [plausible option — one of these is stronger, but both require thought]
        B) [plausible option]

        QUESTION RULES
        RULE 1 — EXACTLY {session.question_count} QUESTIONS
        Generate precisely {session.question_count} questions. Not one more, not one less.

        RULE 2 — ALWAYS EXACTLY TWO OPTIONS: A) and B)
        Both options must be plausible enough that a student cannot trivially eliminate one.

        RULE 3 — ADAPTIVE BRANCHING AFTER EVERY ANSWER
        IF they picked the STRONGER option:
            → Advance to a harder, deeper question on a related or adjacent concept.
            → Your transition: "Good — let's go deeper on that."
        IF they picked the WEAKER option:
            → Do NOT correct them. Ask a probing question that gently exposes reasoning.
            → Your transition: "Interesting choice — let me push on that."

        RULE 4 — COGNITIVE DIMENSION COVERAGE
        Core: [Conceptual], [Logical], [Comparative], [Problem Solving], [Application], [Edge Case], [Synthesis]
        Extended: [Debugging], [Depth Probe], [Assumption], [Second-Order], [Counterexample], [Optimization]
        Never repeat the same dimension in back-to-back questions.

        RULE 5 — DIFFICULTY CALIBRATION
        easy → foundational
        medium → nuanced tradeoffs
        hard → edge cases, system-level thinking

        RULE 6 — BETWEEN-QUESTION FORMAT
        For questions 2 through {session.question_count}:
        [One sentence transition based on their answer]

        Question [N] of {session.question_count}  [[Dimension]]
        [question text]

        A) [option]
        B) [option]

        RULE 7 — SESSION CLOSE TRIGGER
        After question {session.question_count} is answered, say exactly:
        "Thank you, {student_name}. That completes your ThinkTrace session.
        Generating your ThinkTrace Review now..."
        Then immediately produce the full ThinkTrace Review.

        THINKTRACE REVIEW FORMAT
        Produce the review in FULL immediately after question {session.question_count}.
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        THINKTRACE REVIEW
        Student    : {student_name}
        Topic      : {session.topic}
        Difficulty : {session.difficulty}
        Questions  : {session.question_count}
        Session ID : {str(session.id)}
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        ── SKILL SCORE ─────────────────────────────────────────────
        [N.N] / 10

        ── ANSWER TRACE ────────────────────────────────────────────
        Q[N]  [[Dimension]]  → [A or B]  —  [Strong / Weak]
        Analysis: [Brief explanation of why this choice reveals their thinking]

        ── 1. STRENGTHS ────────────────────────────────────────────
        [2-4 named strengths]

        ── 2. WEAK AREAS ───────────────────────────────────────────
        [2-4 specific weak points]

        ── 2.5 OVERALL STRATEGY ────────────────────────────────────
        [High-level strategic learning path]

        ── 3. DECISION PATTERN ANALYSIS ────────────────────────────
        [3-5 behavioral pattern sentences]

        ── 4. CONCEPTUAL GAPS ──────────────────────────────────────
        [Map gaps to consequences]

        ── 5. LEARNING STYLE OBSERVATION ───────────────────────────
        Primary style  : [Style]
        Secondary style: [Style]
        Evidence: [Evidence]

        ── 6. IMPROVEMENT SUGGESTIONS ──────────────────────────────
        1. [Study action]
        2. [Practice action]
        3. [Mental model]

        ── 7. TEACHER NOTES ─────────────────────────────────────────
        Summary for instructor: [Summary]
        Recommended intervention:
        [ ] Revision session...
        Risk flag: [None/Low/Medium/High]

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        END OF THINKTRACE REVIEW
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        Immediately after the review, output this JSON block (fill completely):
        ```json
        {{
            "session_id": "{str(session.id)}",
            "student_name": "{student_name}",
            "topic": "{session.topic}",
            "difficulty": "{session.difficulty}",
            "subject_area": "{session.subject_area}",
            "question_count": {session.question_count},
            "skill_score": 0.0,
            "strong_answers": 0,
            "weak_answers": 0,
            "accuracy_percent": 0.0,
            "answer_trace": [
                {{
                "q_number": 1,
                "dimension": "Conceptual",
                "chosen": "A",
                "strength": "Strong",
                "explanation": "This choice shows a preference for composition over inheritance..."
                }}
            ],
            "strengths": ["str1"],
            "weak_areas": ["weak1"],
            "overall_strategy": "To improve, you should focus on...",
            "decision_pattern": "pattern",
            "conceptual_gaps": ["gap1"],
            "learning_style": {{
                "primary": "style",
                "secondary": "style",
                "evidence": "evidence"
            }},
            "improvement_suggestions": ["sug1"],
            "teacher_notes": {{
                "summary": "sum",
                "intervention": [],
                "risk_flag": "None"
            }}
        }}
        ```
        """

    def _get_chat_history(self, session: ThinkTraceSessionModel) -> list:
        history = []
        for q in session.questions:
            trans = q.get('transition', '')
            content = f"{trans}\n\nQuestion {q['q_number']} of {session.question_count}  [{q['dimension']}]\n{q['question_text']}\n\nA) {q['option_a']}\nB) {q['option_b']}"
            history.append({"role": "model", "parts": [content]})
            
            # Find the user's answer to this question
            user_ans = next((a for a in session.answers if a["q_number"] == q["q_number"]), None)
            if user_ans:
                history.append({"role": "user", "parts": [user_ans["chosen_text"]]})
        return history

    def _parse_question_from_text(self, text: str, q_num: int) -> Dict[str, Any]:
        """Tries to extract the question and options from Gemini's text response"""
        lines = text.split('\n')
        transition_lines = []
        dimension = "Conceptual"
        q_text = ""
        opt_a = ""
        opt_b = ""
        
        mode = "transition"
        for line in lines:
            line = line.strip()
            if not line: continue
            
            if mode == "transition":
                if line.startswith("Question") or line.startswith(f"Q{q_num}"):
                    if "[" in line and "]" in line:
                        dimension = line[line.find("[")+1:line.find("]")]
                    mode = "question"
                elif not line.startswith("---") and not line.startswith("ThinkTrace") and not line.startswith("Hi "):
                    transition_lines.append(line)
            
            elif mode == "question":
                if line.startswith("A)"):
                    opt_a = line[2:].strip()
                    mode = "options"
                else:
                    q_text += line + " "
                    
            elif mode == "options":
                if line.startswith("A)"):
                    opt_a = line[2:].strip()
                elif line.startswith("B)"):
                    opt_b = line[2:].strip()
                    
        if not q_text or not opt_a or not opt_b:
            raise ValueError(f"Failed to parse question properly from:\n{text}")
            
        return {
            "q_number": q_num,
            "dimension": dimension,
            "question_text": q_text.strip(),
            "option_a": opt_a,
            "option_b": opt_b,
            "transition": " ".join(transition_lines) if transition_lines else ""
        }

    async def generate_next_question(self, session: ThinkTraceSessionModel, student_name: str) -> Dict[str, Any]:
        if not self.available or not self.model:
            return self._get_fallback_question(session.current_question_index + 1)
            
        try:
            chat = self.model.start_chat(history=self._get_chat_history(session))
            system_prompt = self._get_system_prompt(session, student_name)
            
            next_q_num = session.current_question_index + 1
            prompt = "BEGIN_SESSION" if next_q_num == 1 else "Please provide the next question."
            
            response = await asyncio.wait_for(
                chat.send_message_async(system_prompt + "\n\n" + prompt),
                timeout=30.0
            )
            
            return self._parse_question_from_text(response.text, next_q_num)
            
        except Exception as e:
            logger.error(f"[THINKTRACE] Next question generation failed: {str(e)}")
            return self._get_fallback_question(session.current_question_index + 1)

    def _clean_json_response(self, text: str) -> str:
        """Extracts JSON block from the generated response"""
        start_idx = text.find("```json")
        if start_idx >= 0:
            text = text[start_idx + 7:]
            end_idx = text.find("```")
            if end_idx >= 0:
                text = text[:end_idx]
        else:
            # Fallback block search
            s = text.find("{")
            e = text.rfind("}")
            if s >= 0 and e >= 0:
                text = text[s:e+1]
        return text.strip()

    async def generate_final_review(self, session: ThinkTraceSessionModel, student_name: str) -> str:
        if not self.available or not self.model:
            return "{\"error\": \"Review unavailable in fallback mode\"}"
            
        try:
            chat = self.model.start_chat(history=self._get_chat_history(session))
            system_prompt = self._get_system_prompt(session, student_name)
            
            response = await asyncio.wait_for(
                chat.send_message_async(system_prompt + "\n\nGenerate the final ThinkTrace review and JSON block now."),
                timeout=45.0
            )
            
            return response.text
        except Exception as e:
            logger.error(f"[THINKTRACE] Final review generation failed: {str(e)}")
            return "{\"error\": \"Review generation timed out or failed\"}"

    def _get_fallback_question(self, q_num: int) -> Dict[str, Any]:
        return {
            "q_number": q_num,
            "dimension": "Fallback",
            "question_text": "System encountered an error communicating with the AI. Which option describes your current state?",
            "option_a": "I'm ready to proceed anyway",
            "option_b": "I would like to restart",
            "transition": "System recovering."
        }
