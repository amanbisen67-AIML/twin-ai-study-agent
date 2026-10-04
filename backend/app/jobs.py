import uuid
from datetime import datetime
from typing import Dict, Optional, Any
from app.models import JobStatus

class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobStatus] = {}

    def create_job(self, initial_message: str = "Job queued") -> str:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = datetime.now().astimezone().isoformat()
        self._jobs[job_id] = JobStatus(
            job_id=job_id,
            status="pending",
            progress=0.05,
            message=initial_message,
            result=None,
            created_at=now
        )
        return job_id

    def update_job(
        self,
        job_id: str,
        status: str,
        progress: float,
        result: Optional[Any] = None,
        message: str = ""
    ):
        if job_id in self._jobs:
            job = self._jobs[job_id]
            job.status = status
            job.progress = min(1.0, max(0.0, progress))
            if message:
                job.message = message
            if result is not None:
                job.result = result
            if status in ("completed", "failed"):
                job.completed_at = datetime.now().astimezone().isoformat()

    def get_job(self, job_id: str) -> Optional[JobStatus]:
        return self._jobs.get(job_id)

job_manager = JobManager()
