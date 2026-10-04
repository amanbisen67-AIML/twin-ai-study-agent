import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx
from app.models import PracticeQuestion, QuestionTestCase

logger = logging.getLogger("twin.scraper")
CURRENT_DIR = Path(__file__).resolve().parent
CATALOG_PATH = CURRENT_DIR / "leetcode_java_catalog.json"

LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql"

LEETCODE_QUERY = """
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      questionId
      title
      titleSlug
      difficulty
      topicTags {
        name
        slug
      }
    }
  }
}
"""

class LeetCodeJavaScraper:
    def __init__(self):
        self.cached_catalog: List[PracticeQuestion] = []
        self._load_local_catalog()

    def _load_local_catalog(self):
        try:
            if CATALOG_PATH.exists():
                with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.cached_catalog = [PracticeQuestion(**item) for item in data]
                    logger.info(f"Loaded {len(self.cached_catalog)} LeetCode Java questions from curated catalog.")
        except Exception as e:
            logger.error(f"Failed to load local LeetCode Java catalog: {e}")
            self.cached_catalog = []

    async def sync_live_leetcode_problems(self, category: str = "algorithms", limit: int = 15) -> Dict[str, Any]:
        """
        Attempts to scrape / query live LeetCode problem patterns via public GraphQL API.
        Falls back safely to local curated Java catalog if LeetCode blocks bots (Cloudflare/403/429).
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://leetcode.com/problemset/all/",
            "Content-Type": "application/json"
        }
        payload = {
            "query": LEETCODE_QUERY,
            "variables": {
                "categorySlug": category,
                "skip": 0,
                "limit": limit,
                "filters": {}
            }
        }

        live_results = []
        sync_status = "fallback"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(LEETCODE_GRAPHQL_URL, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    questions_data = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])
                    for q in questions_data:
                        title = q.get("title", "Unknown")
                        slug = q.get("titleSlug", "")
                        difficulty = q.get("difficulty", "Medium")
                        tags = [t.get("name") for t in q.get("topicTags", [])]
                        primary_tag = tags[0] if tags else "Arrays & Hashing"
                        live_results.append({
                            "title": title,
                            "slug": slug,
                            "difficulty": difficulty,
                            "primary_topic": primary_tag,
                            "tags": tags
                        })
                    sync_status = "live_synced"
                    logger.info(f"Successfully live-scraped {len(live_results)} problems from LeetCode.")
        except Exception as ex:
            logger.warning(f"LeetCode live sync encountered {type(ex).__name__} ({ex}). Using resilient Java catalog.")
            sync_status = "fallback_catalog"

        return {
            "status": sync_status,
            "live_count": len(live_results),
            "catalog_total": len(self.cached_catalog),
            "live_samples": live_results[:5] if live_results else []
        }

    def get_all_topics(self) -> List[str]:
        topics = {q.topic for q in self.cached_catalog}
        defaults = [
            "Arrays & Hashing",
            "Two Pointers",
            "Sliding Window",
            "Binary Search",
            "Trees & Binary Search Trees",
            "Graphs & BFS/DFS",
            "Dynamic Programming",
            "Heap & PriorityQueue"
        ]
        return sorted(list(topics.union(defaults)))

    def get_questions_for_topic(self, topic: str) -> List[PracticeQuestion]:
        topic_lower = topic.lower()
        matched = [q for q in self.cached_catalog if q.topic.lower() == topic_lower or topic_lower in q.topic.lower()]
        if not matched:
            # Fallback to any available questions
            matched = self.cached_catalog[:2]
        return matched

leetcode_scraper = LeetCodeJavaScraper()
