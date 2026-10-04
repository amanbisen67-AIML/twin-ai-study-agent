const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchTopicAnalysis(studentId = "student_alex_chen", customAttempts = null) {
  const payload = { student_id: studentId };
  if (customAttempts) {
    payload.attempts = customAttempts;
  }
  const res = await fetch(`${API_BASE_URL}/topics/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Analysis failed with HTTP ${res.status}`);
  }
  return await res.json();
}

export async function generateWeeklyPlan(studentId = "student_alex_chen", daysCount = 7, onProgress = null) {
  // Call plan generation
  const res = await fetch(`${API_BASE_URL}/plan/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: studentId,
      days_count: daysCount,
      daily_minutes: 60
    })
  });

  // If completed synchronously (under 2s)
  if (res.status === 200) {
    return await res.json();
  }

  // If backend returned 202 Accepted (asynchronous processing)
  if (res.status === 202) {
    const jobInfo = await res.json();
    return await pollJobUntilComplete(jobInfo.job_id, onProgress);
  }

  throw new Error(`Plan generation failed with HTTP ${res.status}`);
}

export async function pollJobUntilComplete(jobId, onProgress = null, maxPolls = 30) {
  for (let attempt = 0; attempt < maxPolls; attempt++) {
    await new Promise(r => setTimeout(r, 800));
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!res.ok) continue;
    const job = await res.json();
    
    if (onProgress) {
      onProgress(job.progress, job.message);
    }

    if (job.status === "completed" && job.result) {
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.message || "Background job failed.");
    }
  }
  throw new Error("Job polling timed out.");
}

export async function fetchLatestWeeklyPlan(studentId = "student_alex_chen") {
  const res = await fetch(`${API_BASE_URL}/plan/latest?student_id=${studentId}`);
  if (!res.ok) {
    throw new Error(`Failed to load plan: ${res.status}`);
  }
  return await res.json();
}

export async function recordQuizAttempt(attempt) {
  const res = await fetch(`${API_BASE_URL}/quiz/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attempt)
  });
  if (!res.ok) {
    throw new Error(`Failed to record attempt: ${res.status}`);
  }
  return await res.json();
}

export async function syncLeetCodeScraper() {
  const res = await fetch(`${API_BASE_URL}/scraper/sync-leetcode`, {
    method: "POST"
  });
  if (!res.ok) {
    throw new Error(`Scraper sync failed: ${res.status}`);
  }
  return await res.json();
}
