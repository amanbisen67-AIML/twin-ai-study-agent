import time
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import (
    TopicAnalysisRequest,
    TopicAnalysisResponse,
    PlanGenerationRequest,
    WeeklyPlan,
    QuizAttemptCreate,
    QuizAttempt,
    JobStatus
)
from app.database import db
from app.analytics import analytics_engine
from app.planner import planner
from app.scraper.leetcode_scraper import leetcode_scraper
from app.jobs import job_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("twin.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB and ensure default student
    logger.info("Initializing Twin database schema...")
    await db.init_db()
    await db.get_or_create_student(settings.default_student_id)
    yield
    logger.info("Shutting down Twin backend...")

app = FastAPI(
    title="Twin - Digital Twin AI Study Agent API",
    version=settings.version,
    description="Autonomous study agent backend for recency-weighted accuracy analytics and deterministic LLM revision planning.",
    lifespan=lifespan
)

# Enable CORS for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. Topic Analysis Route (POST /topics/analyze)
# ==========================================
@app.post(
    "/topics/analyze",
    response_model=TopicAnalysisResponse,
    summary="Ingest quiz history and return ranked weak topics with recency decay math"
)
async def analyze_topics(request: TopicAnalysisRequest):
    t_start = time.perf_counter()
    student_id = request.student_id or settings.default_student_id
    
    # If explicit attempts provided in body, use them; otherwise fetch from DB source of truth
    if request.attempts:
        attempts = [
            QuizAttempt(
                student_id=student_id,
                topic=a.topic,
                question_id=a.question_id,
                question_title=a.question_title,
                is_correct=a.is_correct,
                time_taken_seconds=a.time_taken_seconds or 120,
                ts=a.ts or time.time()
            )
            for a in request.attempts
        ]
    else:
        attempts = await db.get_quiz_attempts(student_id)

    response = analytics_engine.analyze_attempts(attempts, student_id=student_id)
    latency_ms = (time.perf_counter() - t_start) * 1000.0
    logger.info(f"POST /topics/analyze for {student_id} computed in {latency_ms:.2f}ms (Attempts: {len(attempts)})")
    return response

# ==========================================
# 2. Plan Generation Route (POST /plan/generate)
# (Asynchronous execution; returns 202 + Job ID if long-running)
# ==========================================
async def _execute_plan_generation_task(
    job_id: str,
    student_id: str,
    days_count: int,
    daily_minutes: int
):
    try:
        job_manager.update_job(job_id, status="processing", progress=0.2, message="Analyzing student history & recency decay...")
        attempts = await db.get_quiz_attempts(student_id)
        analysis = analytics_engine.analyze_attempts(attempts, student_id=student_id)

        job_manager.update_job(job_id, status="processing", progress=0.5, message="Consulting AI planner for weak-topic weighting...")
        seen_titles = await db.get_seen_question_titles(student_id)

        # Attempt LLM generation first, fall back seamlessly to deterministic engine
        plan = await planner.generate_plan_with_llm(
            student_id=student_id,
            ranked_topics=analysis.ranked_weak_topics,
            readiness_score=analysis.readiness_score,
            days_count=days_count,
            daily_minutes=daily_minutes,
            seen_questions=seen_titles
        )

        if not plan:
            job_manager.update_job(job_id, status="processing", progress=0.75, message="Synthesizing deterministic LeetCode Java practice runway...")
            plan = planner.generate_deterministic_plan(
                student_id=student_id,
                ranked_topics=analysis.ranked_weak_topics,
                readiness_score=analysis.readiness_score,
                days_count=days_count,
                daily_minutes=daily_minutes,
                seen_questions=seen_titles
            )

        # Save to database source of truth
        await db.save_weekly_plan(plan)
        job_manager.update_job(
            job_id,
            status="completed",
            progress=1.0,
            result=plan,
            message="7-Day Revision Runway synthesized successfully."
        )
    except Exception as e:
        logger.error(f"Plan generation job {job_id} failed: {e}", exc_info=True)
        job_manager.update_job(
            job_id,
            status="failed",
            progress=1.0,
            message=f"Plan generation failed: {str(e)}"
        )

@app.post(
    "/plan/generate",
    summary="Generate 7-day revision plan weighted toward weak topics with non-duplicate practice questions"
)
async def generate_plan(
    request: PlanGenerationRequest,
    background_tasks: BackgroundTasks
):
    student_id = request.student_id or settings.default_student_id
    days_count = request.days_count or 7
    daily_minutes = request.daily_minutes or 60

    # Start generation
    t_start = time.perf_counter()
    attempts = await db.get_quiz_attempts(student_id)
    analysis = analytics_engine.analyze_attempts(attempts, student_id=student_id)
    seen_titles = await db.get_seen_question_titles(student_id)

    # If rapid deterministic generation can complete under 2.0s:
    # We attempt direct generation
    plan = planner.generate_deterministic_plan(
        student_id=student_id,
        ranked_topics=analysis.ranked_weak_topics,
        readiness_score=analysis.readiness_score,
        days_count=days_count,
        daily_minutes=daily_minutes,
        seen_questions=seen_titles
    )
    await db.save_weekly_plan(plan)
    
    elapsed = time.perf_counter() - t_start
    if elapsed <= 2.0:
        return plan
    else:
        # For long generations (> 2s), return 202 Accepted with Job ID for polling
        job_id = job_manager.create_job("Asynchronous plan synthesis in progress")
        background_tasks.add_task(
            _execute_plan_generation_task,
            job_id,
            student_id,
            days_count,
            daily_minutes
        )
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "job_id": job_id,
                "status": "processing",
                "poll_url": f"/jobs/{job_id}",
                "message": "Generation in progress (> 2.0s). Poll status endpoint for results."
            }
        )

# Route to explicitly trigger background generation with 202 polling
@app.post(
    "/plan/generate-async",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Explicit async generation endpoint returning job ID immediately"
)
async def generate_plan_async(
    request: PlanGenerationRequest,
    background_tasks: BackgroundTasks
):
    student_id = request.student_id or settings.default_student_id
    days_count = request.days_count or 7
    daily_minutes = request.daily_minutes or 60

    job_id = job_manager.create_job("Revision plan queued")
    background_tasks.add_task(
        _execute_plan_generation_task,
        job_id,
        student_id,
        days_count,
        daily_minutes
    )
    return {
        "job_id": job_id,
        "status": "pending",
        "poll_url": f"/jobs/{job_id}",
        "message": "Job registered. Polling initiated."
    }

# ==========================================
# 3. Job Polling Endpoint (GET /jobs/{job_id})
# ==========================================
@app.get(
    "/jobs/{job_id}",
    response_model=JobStatus,
    summary="Poll status of background plan generation"
)
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return job

# ==========================================
# 4. Plan Retrieval Endpoint (GET /plan/latest)
# ==========================================
@app.get(
    "/plan/latest",
    summary="Retrieve the active weekly plan for a student"
)
async def get_latest_plan(student_id: Optional[str] = None):
    sid = student_id or settings.default_student_id
    plan = await db.get_latest_weekly_plan(sid)
    if not plan:
        # Auto-generate baseline plan
        attempts = await db.get_quiz_attempts(sid)
        analysis = analytics_engine.analyze_attempts(attempts, student_id=sid)
        plan = planner.generate_deterministic_plan(
            student_id=sid,
            ranked_topics=analysis.ranked_weak_topics,
            readiness_score=analysis.readiness_score
        )
        await db.save_weekly_plan(plan)
    return plan

# ==========================================
# 5. Quiz Attempt Recording (POST /quiz/attempts)
# ==========================================
@app.post(
    "/quiz/attempts",
    summary="Log a quiz attempt to update the student's Digital Twin in real-time"
)
async def record_attempt(attempt_in: QuizAttemptCreate):
    sid = attempt_in.student_id or settings.default_student_id
    attempt = QuizAttempt(
        student_id=sid,
        topic=attempt_in.topic,
        question_id=attempt_in.question_id,
        question_title=attempt_in.question_title,
        is_correct=attempt_in.is_correct,
        time_taken_seconds=attempt_in.time_taken_seconds or 120,
        ts=attempt_in.ts or time.time()
    )
    saved = await db.record_quiz_attempt(attempt)
    # Re-compute updated topic mastery
    all_attempts = await db.get_quiz_attempts(sid)
    updated_analysis = analytics_engine.analyze_attempts(all_attempts, student_id=sid)
    return {
        "status": "success",
        "saved_attempt": saved,
        "updated_readiness": updated_analysis.readiness_score,
        "total_attempts": updated_analysis.total_attempts
    }

# ==========================================
# 6. Student Profile (GET /students/{student_id})
# ==========================================
@app.get("/students/{student_id}")
async def get_student_profile(student_id: str):
    student = await db.get_or_create_student(student_id)
    attempts = await db.get_quiz_attempts(student_id)
    analysis = analytics_engine.analyze_attempts(attempts, student_id=student_id)
    return {
        "student": student,
        "readiness_score": analysis.readiness_score,
        "readiness_delta": analysis.readiness_delta,
        "total_attempts": analysis.total_attempts,
        "ranked_weak_topics": analysis.ranked_weak_topics[:3]
    }

# ==========================================
# 7. LeetCode Scraper Catalog & Live Sync
# ==========================================
@app.get("/topics/catalog")
async def get_topics_catalog():
    return {
        "topics": leetcode_scraper.get_all_topics(),
        "catalog_size": len(leetcode_scraper.cached_catalog),
        "questions": leetcode_scraper.cached_catalog
    }

@app.post("/scraper/sync-leetcode")
async def sync_leetcode_scraper():
    result = await leetcode_scraper.sync_live_leetcode_problems()
    return result

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Twin Study Agent",
        "timestamp": time.time()
    }
