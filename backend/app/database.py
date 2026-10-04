import json
import uuid
from typing import List, Optional, Set
import aiosqlite
from app.config import settings
from app.models import Student, QuizAttempt, WeeklyPlan, PracticeQuestion, DaySession

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    target_role TEXT DEFAULT 'Java Backend / DSA Candidate',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_title TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    time_taken_seconds INTEGER DEFAULT 120,
    ts REAL NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic ON quiz_attempts(student_id, topic);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_ts ON quiz_attempts(ts);

CREATE TABLE IF NOT EXISTS weekly_plans (
    plan_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_count INTEGER NOT NULL,
    weak_topics_covered TEXT NOT NULL,
    readiness_score REAL NOT NULL,
    plan_data TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_student ON weekly_plans(student_id, created_at);

CREATE TABLE IF NOT EXISTS generated_questions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    question_data TEXT NOT NULL,
    created_at REAL NOT NULL,
    FOREIGN KEY(plan_id) REFERENCES weekly_plans(plan_id)
);

CREATE INDEX IF NOT EXISTS idx_gen_questions_student_topic ON generated_questions(student_id, topic, created_at);
"""

# MySQL Schema reference script exported for production MySQL deployments:
MYSQL_SCHEMA_DDL = """
-- Production MySQL DDL for Twin AI Study Agent
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    target_role VARCHAR(128) DEFAULT 'Java Backend / DSA Candidate',
    created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL,
    topic VARCHAR(64) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    question_title VARCHAR(255) NOT NULL,
    is_correct TINYINT(1) NOT NULL,
    time_taken_seconds INT DEFAULT 120,
    ts DOUBLE NOT NULL,
    INDEX idx_student_topic (student_id, topic),
    INDEX idx_ts (ts),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS weekly_plans (
    plan_id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL,
    weak_topics_covered JSON NOT NULL,
    readiness_score FLOAT NOT NULL,
    plan_data JSON NOT NULL,
    INDEX idx_student_date (student_id, created_at),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS generated_questions (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    topic VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(32) NOT NULL,
    question_data JSON NOT NULL,
    created_at DOUBLE NOT NULL,
    INDEX idx_student_topic_ts (student_id, topic, created_at),
    FOREIGN KEY (plan_id) REFERENCES weekly_plans(plan_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

class Database:
    def __init__(self, db_path: str = None):
        self.db_path = str(db_path or settings.db_path)

    async def init_db(self):
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(CREATE_TABLES_SQL)
            await db.commit()

    async def get_or_create_student(self, student_id: str, name: str = "Alex Chen", email: str = "alex.chen@study.twin") -> Student:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM students WHERE id = ?", (student_id,))
            row = await cursor.fetchone()
            if row:
                return Student(
                    id=row["id"],
                    name=row["name"],
                    email=row["email"],
                    target_role=row["target_role"],
                    created_at=row["created_at"]
                )
            created_at = "2026-09-01T00:00:00Z"
            await db.execute(
                "INSERT INTO students (id, name, email, target_role, created_at) VALUES (?, ?, ?, ?, ?)",
                (student_id, name, email, "Java Backend / DSA Candidate", created_at)
            )
            await db.commit()
            return Student(id=student_id, name=name, email=email, target_role="Java Backend / DSA Candidate", created_at=created_at)

    async def record_quiz_attempt(self, attempt: QuizAttempt) -> QuizAttempt:
        if not attempt.id:
            attempt.id = f"att_{uuid.uuid4().hex[:12]}"
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO quiz_attempts (id, student_id, topic, question_id, question_title, is_correct, time_taken_seconds, ts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    attempt.id,
                    attempt.student_id,
                    attempt.topic,
                    attempt.question_id,
                    attempt.question_title,
                    1 if attempt.is_correct else 0,
                    attempt.time_taken_seconds,
                    attempt.ts
                )
            )
            await db.commit()
        return attempt

    async def get_quiz_attempts(self, student_id: str, topic: Optional[str] = None) -> List[QuizAttempt]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if topic:
                cursor = await db.execute(
                    "SELECT * FROM quiz_attempts WHERE student_id = ? AND topic = ? ORDER BY ts ASC",
                    (student_id, topic)
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM quiz_attempts WHERE student_id = ? ORDER BY ts ASC",
                    (student_id,)
                )
            rows = await cursor.fetchall()
            return [
                QuizAttempt(
                    id=row["id"],
                    student_id=row["student_id"],
                    topic=row["topic"],
                    question_id=row["question_id"],
                    question_title=row["question_title"],
                    is_correct=bool(row["is_correct"]),
                    time_taken_seconds=row["time_taken_seconds"],
                    ts=row["ts"]
                )
                for row in rows
            ]

    async def save_weekly_plan(self, plan: WeeklyPlan):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO weekly_plans (plan_id, student_id, created_at, start_date, end_date, days_count, weak_topics_covered, readiness_score, plan_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    plan.plan_id,
                    plan.student_id,
                    plan.created_at,
                    plan.start_date,
                    plan.end_date,
                    plan.days_count,
                    json.dumps(plan.weak_topics_covered),
                    plan.readiness_score_at_generation,
                    plan.model_dump_json()
                )
            )
            
            # Save generated questions with indices to prevent duplicates
            for day in plan.daily_sessions:
                for q in day.questions:
                    await db.execute(
                        """
                        INSERT OR REPLACE INTO generated_questions (id, plan_id, student_id, topic, title, difficulty, question_data, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            q.id,
                            plan.plan_id,
                            plan.student_id,
                            q.topic,
                            q.title,
                            q.difficulty,
                            q.model_dump_json(),
                            q.examples[0].input if q.examples else 0.0 # simple metadata anchor
                        )
                    )
            await db.commit()

    async def get_latest_weekly_plan(self, student_id: str) -> Optional[WeeklyPlan]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT plan_data FROM weekly_plans WHERE student_id = ? ORDER BY created_at DESC LIMIT 1",
                (student_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None
            data = json.loads(row["plan_data"])
            return WeeklyPlan(**data)

    async def get_weekly_plan(self, plan_id: str) -> Optional[WeeklyPlan]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT plan_data FROM weekly_plans WHERE plan_id = ?",
                (plan_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None
            data = json.loads(row["plan_data"])
            return WeeklyPlan(**data)

    async def get_seen_question_titles(self, student_id: str, topic: Optional[str] = None) -> Set[str]:
        """Returns set of all question titles already assigned to this student to guarantee 0% duplicates."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if topic:
                cursor = await db.execute(
                    "SELECT title FROM generated_questions WHERE student_id = ? AND topic = ?",
                    (student_id, topic)
                )
            else:
                cursor = await db.execute(
                    "SELECT title FROM generated_questions WHERE student_id = ?",
                    (student_id,)
                )
            rows = await cursor.fetchall()
            return {row["title"].strip().lower() for row in rows}

db = Database()
