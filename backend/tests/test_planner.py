import pytest
from app.models import TopicMastery, WeeklyPlan
from app.planner import planner

def test_deterministic_plan_pydantic_validation():
    ranked = [
        TopicMastery(
            topic="Dynamic Programming",
            raw_accuracy=0.2,
            recency_weighted_accuracy=0.15,
            attempt_count=10,
            correct_count=2,
            recent_fail_streak=3,
            weakness_score=1.2,
            urgency="CRITICAL"
        ),
        TopicMastery(
            topic="Graphs & BFS/DFS",
            raw_accuracy=0.4,
            recency_weighted_accuracy=0.35,
            attempt_count=8,
            correct_count=3,
            recent_fail_streak=1,
            weakness_score=0.8,
            urgency="NEEDS_REVIEW"
        ),
        TopicMastery(
            topic="Arrays & Hashing",
            raw_accuracy=0.9,
            recency_weighted_accuracy=0.95,
            attempt_count=20,
            correct_count=19,
            recent_fail_streak=0,
            weakness_score=0.05,
            urgency="MASTERED"
        )
    ]

    plan = planner.generate_deterministic_plan(
        student_id="test_student",
        ranked_topics=ranked,
        readiness_score=48.3,
        days_count=7,
        daily_minutes=60
    )

    # Validate WeeklyPlan Pydantic model
    assert isinstance(plan, WeeklyPlan)
    assert len(plan.daily_sessions) == 7
    assert "Dynamic Programming" in plan.weak_topics_covered
    
    # Check that at least 4 out of 7 days (~60-70%) target the weak topics
    weak_days = [
        s for s in plan.daily_sessions
        if s.focus_topic in ("Dynamic Programming", "Graphs & BFS/DFS")
    ]
    assert len(weak_days) >= 4

    # Verify questions are populated with Java starter code
    for day in plan.daily_sessions:
        for q in day.questions:
            assert q.java_starter_code.startswith("class Solution") or "class " in q.java_starter_code
            assert len(q.examples) >= 1

def test_markdown_fence_cleaner():
    raw_markdown = """```json
    {
       "test": "valid"
    }
    ```"""
    cleaned = planner.clean_json_response(raw_markdown)
    assert cleaned == '{\n       "test": "valid"\n    }'
