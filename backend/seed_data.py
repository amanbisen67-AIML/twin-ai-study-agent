import asyncio
import time
import random
from datetime import datetime, timedelta
from app.database import db
from app.models import QuizAttempt
from app.analytics import analytics_engine

TOPIC_QUESTIONS = {
    "Dynamic Programming": [
        ("Coin Change - Fewest Coins", False),
        ("Longest Increasing Subsequence Patience Sort", False),
        ("Word Break Memoization", False),
        ("Partition Equal Subset Sum 0/1 Knapsack", False),
        ("House Robber Dynamic Space Optimization", True),
        ("Climbing Stairs Fibonacci DP", True),
        ("Decode Ways 1D State Array", False),
        ("Target Sum 2D DP Table", False),
    ],
    "Graphs & BFS/DFS": [
        ("Course Schedule Kahn's Topological Sort", False),
        ("Number of Islands Recursive DFS", True),
        ("Clone Graph HashMap Traversal", False),
        ("Pacific Atlantic Water Flow Boundary Search", False),
        ("Rotting Oranges Multi-Source BFS", True),
        ("Word Ladder Shortest Path Queue", False),
    ],
    "Trees & Binary Search Trees": [
        ("Validate Binary Search Tree with Long Bounds", True),
        ("Lowest Common Ancestor in BST", True),
        ("Binary Tree Level Order Traversal", True),
        ("Kth Smallest Element in BST", False),
        ("Serialize and Deserialize Binary Tree", False),
        ("Maximum Depth of Binary Tree", True),
    ],
    "Binary Search": [
        ("Search in Rotated Sorted Array", True),
        ("Find Minimum in Rotated Sorted Array", False),
        ("Median of Two Sorted Arrays", False),
        ("Koko Eating Bananas Binary Search on Answer", True),
        ("Time Based Key-Value Store", True),
    ],
    "Sliding Window": [
        ("Longest Substring Without Repeating Characters", True),
        ("Longest Repeating Character Replacement", False),
        ("Minimum Window Substring with Count Map", False),
        ("Permutation in String Window Match", True),
    ],
    "Stack & Monotonic Queue": [
        ("Valid Parentheses with ArrayDeque", True),
        ("Daily Temperatures Monotonic Decreasing Stack", True),
        ("Min Stack with Constant Auxiliary State", True),
        ("Largest Rectangle in Histogram", False),
    ],
    "Two Pointers": [
        ("3Sum with Duplicate Skipping", True),
        ("Container With Most Water Greedy Inward Pointers", True),
        ("Valid Palindrome Alphanumeric Filter", True),
        ("Two Sum II Input Array Is Sorted", True),
        ("Trapping Rain Water Left/Right Max Arrays", True),
    ],
    "Arrays & Hashing": [
        ("Two Sum Single Pass HashMap", True),
        ("Group Anagrams Canonical Sorted Key", True),
        ("Contains Duplicate HashSet", True),
        ("Top K Frequent Elements Bucket Sort", True),
        ("Product of Array Except Self Prefix/Suffix", True),
        ("Longest Consecutive Sequence HashSet", True),
    ]
}

async def seed():
    print("[Seed] Initializing Twin SQLite database...")
    await db.init_db()

    student_id = "student_alex_chen"
    student = await db.get_or_create_student(
        student_id=student_id,
        name="Alex Chen",
        email="alex.chen@study.twin"
    )
    print(f"[Seed] Confirmed student profile: {student.name} ({student.target_role})")

    # Generate 140 attempts spread over the last 21 days
    now = datetime.now()
    attempts_to_insert = []

    for day_offset in range(21, -1, -1):
        attempt_date = now - timedelta(days=day_offset, hours=random.randint(1, 12), minutes=random.randint(0, 59))
        ts = attempt_date.timestamp()

        for topic, q_list in TOPIC_QUESTIONS.items():
            # In each day, randomly sample 0 to 2 questions
            if random.random() < 0.45:
                q_title, default_correct = random.choice(q_list)
                
                # Biasing probabilities to mirror real-world weak topics
                if topic == "Dynamic Programming":
                    # Historically low, recent days even worse
                    is_correct = False if day_offset < 10 else (random.random() < 0.30)
                elif topic == "Graphs & BFS/DFS":
                    is_correct = False if day_offset < 5 else (random.random() < 0.45)
                elif topic in ("Arrays & Hashing", "Two Pointers"):
                    is_correct = random.random() < 0.90 # Strong mastery
                else:
                    is_correct = random.random() < 0.65

                q_id = f"q_{topic.replace(' ', '_').lower()}_{abs(hash(q_title)) % 1000}"
                attempts_to_insert.append(
                    QuizAttempt(
                        student_id=student_id,
                        topic=topic,
                        question_id=q_id,
                        question_title=q_title,
                        is_correct=is_correct,
                        time_taken_seconds=random.randint(45, 300),
                        ts=ts
                    )
                )

    print(f"[Seed] Writing {len(attempts_to_insert)} historical quiz attempts...")
    for a in attempts_to_insert:
        await db.record_quiz_attempt(a)

    # Validate analytics run
    recorded = await db.get_quiz_attempts(student_id)
    analysis = analytics_engine.analyze_attempts(recorded, student_id=student_id)
    print(f"[Seed] Analytics Verified!")
    print(f"       Readiness Score: {analysis.readiness_score}% (Trend: {analysis.readiness_delta:+.1f}%)")
    print(f"       Weakest Topic: {analysis.ranked_weak_topics[0].topic} (Weighted Acc: {analysis.ranked_weak_topics[0].recency_weighted_accuracy * 100:.1f}%, Status: {analysis.ranked_weak_topics[0].urgency})")
    print(f"       Strongest Topic: {analysis.ranked_weak_topics[-1].topic} (Weighted Acc: {analysis.ranked_weak_topics[-1].recency_weighted_accuracy * 100:.1f}%, Status: {analysis.ranked_weak_topics[-1].urgency})")
    print(f"       Signature Terrain Points Generated: {len(analysis.terrain_curve)} coordinates")

if __name__ == "__main__":
    asyncio.run(seed())
