import re
import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
import httpx

from app.config import settings
from app.models import (
    WeeklyPlan,
    DaySession,
    PracticeQuestion,
    TopicMastery,
    QuestionTestCase
)
from app.scraper.leetcode_scraper import leetcode_scraper
from app.deduplicator import deduplication_guard

logger = logging.getLogger("twin.planner")

class RevisionPlanner:
    def __init__(self):
        self.max_retries = 3

    def clean_json_response(self, text: str) -> str:
        """Strips markdown code fences and extraneous text outside JSON brackets."""
        text = text.strip()
        # Remove ```json ... ``` or ``` ... ```
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if fence_match:
            text = fence_match.group(1).strip()
        # Ensure it starts with { and ends with }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            return text[start:end+1]
        return text

    async def generate_plan_with_llm(
        self,
        student_id: str,
        ranked_topics: List[TopicMastery],
        readiness_score: float,
        days_count: int = 7,
        daily_minutes: int = 60,
        seen_questions: Optional[Set[str]] = None
    ) -> Optional[WeeklyPlan]:
        """
        Attempts LLM generation with deterministic schema enforcement and retries.
        """
        api_key = settings.gemini_api_key or settings.openai_api_key
        if not api_key:
            return None

        weak_topic_names = [t.topic for t in ranked_topics if t.urgency in ("CRITICAL", "NEEDS_REVIEW")]
        if not weak_topic_names:
            weak_topic_names = [t.topic for t in ranked_topics[:2]]

        topics_summary = [
            f"- {t.topic}: Weighted Accuracy {t.recency_weighted_accuracy*100:.1f}%, Status: {t.urgency}, Attempts: {t.attempt_count}"
            for t in ranked_topics
        ]

        system_instruction = (
            "You are Twin, a deterministic Digital Twin AI Study Agent. "
            "You formulate a precise 7-day revision plan for a Java software engineer. "
            "You MUST output valid JSON conforming strictly to the requested schema. "
            "Do NOT wrap in markdown fences. Do NOT add conversation or commentary. "
            "70% of days must target the critical weak topics."
        )

        prompt = f"""
Student Target: Java Backend Engineer / DSA
Current Readiness: {readiness_score}%
Topic Mastery Status:
{chr(10).join(topics_summary)}

Weak topics requiring urgent intervention: {', '.join(weak_topic_names)}
Days in Plan: {days_count}
Daily Study Minutes: {daily_minutes}

Generate a JSON object with this exact structure:
{{
  "days": [
    {{
      "day_number": 1,
      "focus_topic": "Dynamic Programming",
      "session_type": "Weakness Drill",
      "allocated_minutes": 60,
      "target_objective": "Master 1D DP tabulation and state transitions",
      "urgency": "CRITICAL"
    }}
  ]
}}
"""

        # Call LLM via AsyncClient
        for attempt_idx in range(self.max_retries):
            try:
                # If Gemini API key is configured
                if settings.gemini_api_key:
                    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
                    body = {
                        "contents": [{"parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}],
                        "generationConfig": {
                            "temperature": 0.1,
                            "responseMimeType": "application/json"
                        }
                    }
                    async with httpx.AsyncClient(timeout=6.0) as client:
                        res = await client.post(gemini_url, json=body)
                        if res.status_code == 200:
                            data = res.json()
                            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                            cleaned = self.clean_json_response(raw_text)
                            parsed = json.loads(cleaned)
                            if "days" in parsed and len(parsed["days"]) >= days_count:
                                return self._assemble_weekly_plan(
                                    student_id=student_id,
                                    days_data=parsed["days"][:days_count],
                                    ranked_topics=ranked_topics,
                                    readiness_score=readiness_score,
                                    seen_questions=seen_questions
                                )
                elif settings.openai_api_key:
                    openai_url = "https://api.openai.com/v1/chat/completions"
                    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
                    body = {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"}
                    }
                    async with httpx.AsyncClient(timeout=6.0) as client:
                        res = await client.post(openai_url, json=body, headers=headers)
                        if res.status_code == 200:
                            data = res.json()
                            raw_text = data["choices"][0]["message"]["content"]
                            cleaned = self.clean_json_response(raw_text)
                            parsed = json.loads(cleaned)
                            if "days" in parsed and len(parsed["days"]) >= days_count:
                                return self._assemble_weekly_plan(
                                    student_id=student_id,
                                    days_data=parsed["days"][:days_count],
                                    ranked_topics=ranked_topics,
                                    readiness_score=readiness_score,
                                    seen_questions=seen_questions
                                )
            except Exception as e:
                logger.warning(f"LLM generation attempt {attempt_idx+1} failed: {e}")

        return None

    def generate_deterministic_plan(
        self,
        student_id: str,
        ranked_topics: List[TopicMastery],
        readiness_score: float,
        days_count: int = 7,
        daily_minutes: int = 60,
        seen_questions: Optional[Set[str]] = None
    ) -> WeeklyPlan:
        """
        High-precision deterministic rule-based revision planner.
        Allocates ~70% time to weak topics with non-duplicate practice questions.
        """
        weak_topics = [t for t in ranked_topics if t.urgency in ("CRITICAL", "NEEDS_REVIEW")]
        if not weak_topics:
            weak_topics = ranked_topics[:2]
        
        moderate_topics = [t for t in ranked_topics if t.urgency == "STABLE"]
        if not moderate_topics and len(ranked_topics) > 2:
            moderate_topics = ranked_topics[2:4]

        # Template strategy for 7-day runway
        # Day 1: Primary Weak Topic Drill
        # Day 2: Primary Weak Topic Deep Dive
        # Day 3: Secondary Weak Topic Drill
        # Day 4: Cross-topic Weakness Synthesis
        # Day 5: Spaced Repetition on Moderate Topic
        # Day 6: Spaced Repetition & Pattern Recognition
        # Day 7: Full Timed Java Mock Assessment
        days_schedule_plan = []
        today = datetime.now()

        t1 = weak_topics[0].topic if weak_topics else "Dynamic Programming"
        t2 = weak_topics[1].topic if len(weak_topics) > 1 else t1
        t_mod = moderate_topics[0].topic if moderate_topics else "Binary Search"

        blueprints = [
            (1, t1, "Weakness Drill", f"Establish baseline patterns in {t1} with core state equations and Java boilerplate", "CRITICAL"),
            (2, t1, "Advanced Drill", f"Tackle multi-dimensional transitions and space-optimized arrays in {t1}", "CRITICAL"),
            (3, t2, "Weakness Drill", f"Overcome edge-case traps and recursion stacks in {t2}", "NEEDS_REVIEW"),
            (4, t1, "Synthesis Challenge", f"Combine {t1} with greedy and monotonic patterns", "CRITICAL"),
            (5, t_mod, "Spaced Repetition", f"Reinforce retention in {t_mod} to prevent decay", "STABLE"),
            (6, t2, "Integration Drill", f"Solve medium-difficulty LeetCode problems in {t2} under 25 minutes", "NEEDS_REVIEW"),
            (7, "Comprehensive Java Assessment", "Timed Simulation", "End-of-week 75-minute mixed mock interview covering weak spots", "CRITICAL"),
        ]

        days_data = []
        for d_num, topic, s_type, objective, urgency in blueprints[:days_count]:
            days_data.append({
                "day_number": d_num,
                "focus_topic": topic,
                "session_type": s_type,
                "allocated_minutes": daily_minutes,
                "target_objective": objective,
                "urgency": urgency
            })

        return self._assemble_weekly_plan(
            student_id=student_id,
            days_data=days_data,
            ranked_topics=ranked_topics,
            readiness_score=readiness_score,
            seen_questions=seen_questions
        )

    def _assemble_weekly_plan(
        self,
        student_id: str,
        days_data: List[Dict[str, Any]],
        ranked_topics: List[TopicMastery],
        readiness_score: float,
        seen_questions: Optional[Set[str]] = None
    ) -> WeeklyPlan:
        seen_set = set(seen_questions or [])
        today = datetime.now()
        daily_sessions: List[DaySession] = []
        weak_topics_covered = set()

        for d_info in days_data:
            day_num = d_info.get("day_number", 1)
            target_date = (today + timedelta(days=day_num - 1)).strftime("%Y-%m-%d")
            topic = d_info.get("focus_topic", "Arrays & Hashing")
            
            if d_info.get("urgency") in ("CRITICAL", "NEEDS_REVIEW"):
                weak_topics_covered.add(topic)

            # Retrieve candidate practice questions for this topic from LeetCode Java catalog
            candidates = leetcode_scraper.get_questions_for_topic(topic)
            
            # Enforce 0% duplicates
            selected_questions = deduplication_guard.filter_non_duplicates(
                candidate_questions=candidates,
                existing_signatures=seen_set,
                limit=2
            )

            # If all were seen in lookback, assign clone with unique variant seed
            if not selected_questions and candidates:
                base_q = candidates[0]
                variant_q = base_q.model_copy(deep=True)
                variant_q.id = f"var_{uuid.uuid4().hex[:8]}"
                variant_q.title = f"{base_q.title} (Target Drill Variant)"
                selected_questions = [variant_q]

            session = DaySession(
                day_number=day_num,
                date=target_date,
                focus_topic=topic,
                session_type=d_info.get("session_type", "Weakness Drill"),
                allocated_minutes=d_info.get("allocated_minutes", 60),
                target_objective=d_info.get("target_objective", f"Master {topic} patterns"),
                urgency=d_info.get("urgency", "NEEDS_REVIEW"),
                questions=selected_questions
            )
            daily_sessions.append(session)

        plan_id = f"plan_{uuid.uuid4().hex[:12]}"
        start_date = today.strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=len(daily_sessions) - 1)).strftime("%Y-%m-%d")

        return WeeklyPlan(
            plan_id=plan_id,
            student_id=student_id,
            created_at=datetime.now().astimezone().isoformat(),
            start_date=start_date,
            end_date=end_date,
            days_count=len(daily_sessions),
            weak_topics_covered=list(weak_topics_covered),
            readiness_score_at_generation=readiness_score,
            daily_sessions=daily_sessions
        )

planner = RevisionPlanner()
