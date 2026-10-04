import time
import pytest
from app.analytics import AnalyticsEngine
from app.models import QuizAttempt

def test_recency_decay_weighting():
    engine = AnalyticsEngine(half_life_days=7.0)
    now = 1000000.0
    
    # Weight at t_now should be exactly 1.0
    w_now = engine.compute_recency_weight(now, now)
    assert pytest.approx(w_now, 0.001) == 1.0

    # Weight at 7 days ago should be 0.5 (half-life)
    seven_days_seconds = 7 * 86400.0
    w_7d = engine.compute_recency_weight(now - seven_days_seconds, now)
    assert pytest.approx(w_7d, 0.001) == 0.5

    # Weight at 14 days ago should be 0.25
    w_14d = engine.compute_recency_weight(now - (14 * 86400.0), now)
    assert pytest.approx(w_14d, 0.001) == 0.25

def test_recent_failure_overrides_old_successes():
    engine = AnalyticsEngine(half_life_days=7.0)
    now = time.time()
    day = 86400.0

    # Case A: 5 correct attempts 21 days ago, but 2 consecutive failures yesterday and today
    attempts = [
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q1", question_title="Fib DP", is_correct=True, ts=now - (21 * day)),
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q2", question_title="Coin DP", is_correct=True, ts=now - (20 * day)),
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q3", question_title="LCS DP", is_correct=True, ts=now - (19 * day)),
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q4", question_title="Grid DP", is_correct=True, ts=now - (18 * day)),
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q5", question_title="Edit Dist", is_correct=True, ts=now - (17 * day)),
        # Recent failures
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q6", question_title="Knapsack", is_correct=False, ts=now - (1 * day)),
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="q7", question_title="Regex Match", is_correct=False, ts=now),
    ]

    analysis = engine.analyze_attempts(attempts, student_id="test", now_ts=now)
    dp_topic = analysis.ranked_weak_topics[0]
    
    # Raw unweighted accuracy is 5/7 = 71.4%
    assert pytest.approx(dp_topic.raw_accuracy, 0.01) == 0.714
    
    # Recency-weighted accuracy should be much lower due to the recent failure streak!
    assert dp_topic.recency_weighted_accuracy < 0.40
    assert dp_topic.urgency == "CRITICAL"
    assert dp_topic.recent_fail_streak == 2

def test_terrain_geometry_generation():
    engine = AnalyticsEngine(half_life_days=7.0)
    now = time.time()
    
    attempts = [
        QuizAttempt(student_id="test", topic="Arrays & Hashing", question_id="a1", question_title="Two Sum", is_correct=True, ts=now),
        QuizAttempt(student_id="test", topic="Dynamic Programming", question_id="d1", question_title="Coin Change", is_correct=False, ts=now),
    ]

    analysis = engine.analyze_attempts(attempts, student_id="test", now_ts=now)
    assert len(analysis.terrain_curve) == 2
    
    # Weak topic (DP) should have higher elevation than mastered topic (Arrays)
    dp_pt = [p for p in analysis.terrain_curve if p.topic == "Dynamic Programming"][0]
    arr_pt = [p for p in analysis.terrain_curve if p.topic == "Arrays & Hashing"][0]
    
    assert dp_pt.elevation > arr_pt.elevation
