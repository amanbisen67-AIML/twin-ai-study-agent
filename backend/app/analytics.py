import math
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from app.config import settings
from app.models import QuizAttempt, TopicMastery, TerrainPoint, TopicAnalysisResponse

class AnalyticsEngine:
    def __init__(self, half_life_days: float = None):
        self.half_life_days = half_life_days or settings.half_life_days
        # Half-life in seconds
        self.half_life_seconds = self.half_life_days * 86400.0
        # Decay constant lambda = ln(2) / tau
        self.decay_constant = math.log(2) / self.half_life_seconds

    def compute_recency_weight(self, attempt_ts: float, now_ts: float) -> float:
        delta_seconds = max(0.0, now_ts - attempt_ts)
        return math.exp(-self.decay_constant * delta_seconds)

    def analyze_attempts(self, attempts: List[QuizAttempt], student_id: str = "student_alex_chen", now_ts: Optional[float] = None) -> TopicAnalysisResponse:
        if not attempts:
            return TopicAnalysisResponse(
                student_id=student_id,
                readiness_score=50.0,
                readiness_delta=0.0,
                total_attempts=0,
                analyzed_at=datetime.utcnow().isoformat() + "Z",
                ranked_weak_topics=[],
                terrain_curve=[]
            )

        # Use current time or max attempt time + small delta
        if now_ts is None:
            max_attempt_ts = max(a.ts for a in attempts)
            current_time = datetime.now().timestamp()
            now_ts = max(current_time, max_attempt_ts)

        # Group attempts by topic
        topic_groups: Dict[str, List[QuizAttempt]] = {}
        for a in attempts:
            topic_groups.setdefault(a.topic, []).append(a)

        ranked_topics: List[TopicMastery] = []
        
        for topic, topic_attempts in topic_groups.items():
            # Sort attempts chronologically
            sorted_attempts = sorted(topic_attempts, key=lambda x: x.ts)
            
            attempt_count = len(sorted_attempts)
            correct_count = sum(1 for a in sorted_attempts if a.is_correct)
            raw_accuracy = correct_count / attempt_count if attempt_count > 0 else 0.0

            # Compute recency-weighted accuracy
            weighted_correct_sum = 0.0
            weighted_total_sum = 0.0

            for a in sorted_attempts:
                w = self.compute_recency_weight(a.ts, now_ts)
                weighted_total_sum += w
                if a.is_correct:
                    weighted_correct_sum += w

            recency_accuracy = (
                weighted_correct_sum / weighted_total_sum
                if weighted_total_sum > 0
                else raw_accuracy
            )

            # Compute recent failure streak (from newest backwards)
            recent_fail_streak = 0
            for a in reversed(sorted_attempts):
                if not a.is_correct:
                    recent_fail_streak += 1
                else:
                    break

            # Calculate derived weakness score (higher = weaker, needs urgent revision)
            # Base weakness = 1.0 - recency_accuracy
            # Multiplier for recent streaks
            streak_penalty = 1.0 + (0.20 * min(recent_fail_streak, 4))
            # Multiplier if very few attempts (low confidence)
            sample_confidence = min(1.0, attempt_count / 5.0)
            
            weakness_score = (1.0 - recency_accuracy) * streak_penalty * (1.2 if sample_confidence < 0.6 else 1.0)
            weakness_score = round(max(0.0, min(1.5, weakness_score)), 4)

            # Assign urgency label
            if recency_accuracy < 0.45 or recent_fail_streak >= 2:
                urgency = "CRITICAL"
            elif recency_accuracy < 0.70:
                urgency = "NEEDS_REVIEW"
            elif recency_accuracy < 0.85 or attempt_count < 5:
                urgency = "STABLE"
            else:
                urgency = "MASTERED"

            last_attempt = sorted_attempts[-1]
            last_ts = last_attempt.ts
            diff_hours = (now_ts - last_ts) / 3600.0
            if diff_hours < 1.0:
                ago_str = "Just now"
            elif diff_hours < 24.0:
                ago_str = f"{int(diff_hours)}h ago"
            else:
                ago_str = f"{int(diff_hours / 24)}d ago"

            ranked_topics.append(
                TopicMastery(
                    topic=topic,
                    raw_accuracy=round(raw_accuracy, 3),
                    recency_weighted_accuracy=round(recency_accuracy, 3),
                    attempt_count=attempt_count,
                    correct_count=correct_count,
                    recent_fail_streak=recent_fail_streak,
                    weakness_score=weakness_score,
                    urgency=urgency,
                    last_attempt_ts=last_ts,
                    last_attempt_ago=ago_str
                )
            )

        # Sort topics: highest weakness score first
        ranked_topics.sort(key=lambda t: t.weakness_score, reverse=True)

        # Compute overall readiness score (0-100)
        # Readiness is mean recency accuracy across all curriculum topics
        mean_accuracy = sum(t.recency_weighted_accuracy for t in ranked_topics) / len(ranked_topics) if ranked_topics else 0.5
        readiness_score = round(mean_accuracy * 100.0, 1)

        # Compute historical readiness delta
        # Partition attempts by timestamp midpoint
        midpoint_ts = now_ts - (7 * 86400.0)
        earlier_attempts = [a for a in attempts if a.ts <= midpoint_ts]
        earlier_accuracy = (
            sum(1 for a in earlier_attempts if a.is_correct) / len(earlier_attempts)
            if earlier_attempts
            else mean_accuracy
        )
        readiness_delta = round((mean_accuracy - earlier_accuracy) * 100.0, 1)

        # Generate Terrain Points for the signature visual moment
        terrain_points: List[TerrainPoint] = []
        num_topics = len(ranked_topics)
        
        for idx, t in enumerate(ranked_topics):
            # Normalizing coordinates across terrain [0, 100]
            x = (idx / (num_topics - 1)) * 100.0 if num_topics > 1 else 50.0
            # Elevation height: higher = higher weakness intensity (challenging summit!)
            # Invert accuracy: 0% accuracy -> elevation 90, 100% accuracy -> elevation 15
            elevation = round(15.0 + (1.0 - t.recency_weighted_accuracy) * 75.0, 1)
            
            terrain_points.append(
                TerrainPoint(
                    index=idx,
                    topic=t.topic,
                    elevation=elevation,
                    accuracy=round(t.recency_weighted_accuracy * 100, 1),
                    status=t.urgency,
                    x=round(x, 1),
                    y=round(100.0 - elevation, 1) # SVG viewport y inversion
                )
            )

        return TopicAnalysisResponse(
            student_id=student_id,
            readiness_score=readiness_score,
            readiness_delta=readiness_delta,
            total_attempts=len(attempts),
            analyzed_at=datetime.now().astimezone().isoformat(),
            ranked_weak_topics=ranked_topics,
            terrain_curve=terrain_points
        )

analytics_engine = AnalyticsEngine()
