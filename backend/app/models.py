from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ==========================================
# 1. Core Database Entities (Source of Truth)
# ==========================================

class Student(BaseModel):
    id: str
    name: str
    email: str
    target_role: str = "Java Backend / DSA Candidate"
    created_at: str

class QuizAttempt(BaseModel):
    id: Optional[str] = None
    student_id: str
    topic: str
    question_id: str
    question_title: str
    is_correct: bool
    time_taken_seconds: int = 120
    ts: float = Field(default_factory=lambda: datetime.now().timestamp())

class QuizAttemptCreate(BaseModel):
    student_id: Optional[str] = None
    topic: str
    question_id: str
    question_title: str
    is_correct: bool
    time_taken_seconds: Optional[int] = 120
    ts: Optional[float] = None

# ==========================================
# 2. Derived Mastery & Analytics Schemas
# (Mastery is derived on the fly, never stored)
# ==========================================

class TopicMastery(BaseModel):
    topic: str
    raw_accuracy: float = Field(..., description="Unweighted ratio of correct attempts (0.0 - 1.0)")
    recency_weighted_accuracy: float = Field(..., description="Exponential decay weighted accuracy (0.0 - 1.0)")
    attempt_count: int
    correct_count: int
    recent_fail_streak: int
    weakness_score: float = Field(..., description="Derived priority metric: higher = weaker")
    urgency: str = Field(..., description="CRITICAL, NEEDS_REVIEW, STABLE, or MASTERED")
    last_attempt_ts: Optional[float] = None
    last_attempt_ago: Optional[str] = None

class TerrainPoint(BaseModel):
    index: int
    topic: str
    elevation: float = Field(..., description="Terrain elevation height (weakness intensity)")
    accuracy: float
    status: str
    x: float
    y: float

class TopicAnalysisRequest(BaseModel):
    student_id: Optional[str] = None
    attempts: Optional[List[QuizAttemptCreate]] = None

class TopicAnalysisResponse(BaseModel):
    student_id: str
    readiness_score: float = Field(..., description="Overall exam readiness score (0-100)")
    readiness_delta: float = Field(default=0.0, description="Readiness trend compared to previous checkpoint")
    total_attempts: int
    analyzed_at: str
    ranked_weak_topics: List[TopicMastery]
    terrain_curve: List[TerrainPoint]

# ==========================================
# 3. Practice Questions & LeetCode Java Specs
# ==========================================

class QuestionTestCase(BaseModel):
    input: str
    expected_output: str
    explanation: Optional[str] = None

class PracticeQuestion(BaseModel):
    id: str
    topic: str
    title: str
    difficulty: str = Field(..., description="Easy, Medium, Hard")
    leetcode_slug: Optional[str] = None
    description: str
    constraints: List[str] = Field(default_factory=list)
    examples: List[QuestionTestCase] = Field(default_factory=list)
    java_starter_code: str
    solution_approach: str
    time_complexity: str = "O(N)"
    space_complexity: str = "O(1)"
    java_tips: List[str] = Field(default_factory=list)

# ==========================================
# 4. Weekly Plan Runway Schemas
# ==========================================

class DaySession(BaseModel):
    day_number: int = Field(..., ge=1, le=7)
    date: str
    focus_topic: str
    session_type: str = Field(..., description="Weakness Drill, Spaced Repetition, or Integration Challenge")
    allocated_minutes: int = 60
    target_objective: str
    urgency: str
    questions: List[PracticeQuestion] = Field(default_factory=list)

class WeeklyPlan(BaseModel):
    plan_id: str
    student_id: str
    created_at: str
    start_date: str
    end_date: str
    days_count: int = 7
    weak_topics_covered: List[str]
    readiness_score_at_generation: float
    daily_sessions: List[DaySession]

class PlanGenerationRequest(BaseModel):
    student_id: Optional[str] = None
    days_count: int = 7
    daily_minutes: int = 60
    override_topics: Optional[List[str]] = None

# ==========================================
# 5. Async Job Schemas (Polling > 2s)
# ==========================================

class JobStatus(BaseModel):
    job_id: str
    status: str = Field(..., description="pending, processing, completed, failed")
    progress: float = 0.0
    message: str = "Queued"
    result: Optional[WeeklyPlan] = None
    created_at: str
    completed_at: Optional[str] = None
