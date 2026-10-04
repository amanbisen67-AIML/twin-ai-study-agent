import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import db

@pytest.mark.asyncio
async def test_topics_analyze_latency_and_response():
    await db.init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        t0 = time.perf_counter()
        res = await ac.post("/topics/analyze", json={"student_id": "student_alex_chen"})
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        
        assert res.status_code == 200
        # Check non-LLM latency criteria: p95 latency < 300ms
        assert elapsed_ms < 300.0, f"Latency was {elapsed_ms:.2f}ms, exceeding 300ms SLA"
        
        data = res.json()
        assert "readiness_score" in data
        assert "ranked_weak_topics" in data
        assert "terrain_curve" in data
        assert len(data["terrain_curve"]) > 0

@pytest.mark.asyncio
async def test_plan_generation_and_polling():
    await db.init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Test async generation route
        res_async = await ac.post("/plan/generate-async", json={"student_id": "student_alex_chen", "days_count": 7})
        assert res_async.status_code == 202
        job_data = res_async.json()
        job_id = job_data["job_id"]
        assert job_id.startswith("job_")

        # Poll the job status endpoint
        poll_res = await ac.get(f"/jobs/{job_id}")
        assert poll_res.status_code == 200
        status_info = poll_res.json()
        assert status_info["status"] in ("pending", "processing", "completed")

@pytest.mark.asyncio
async def test_record_attempt_and_update_twin():
    await db.init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        attempt_payload = {
            "student_id": "student_alex_chen",
            "topic": "Dynamic Programming",
            "question_id": "test_coin_change",
            "question_title": "Coin Change Practice",
            "is_correct": True,
            "time_taken_seconds": 95
        }
        res = await ac.post("/quiz/attempts", json=attempt_payload)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["status"] == "success"
        assert "updated_readiness" in res_data
