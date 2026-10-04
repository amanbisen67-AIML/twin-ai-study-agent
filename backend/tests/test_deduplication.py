from app.deduplicator import deduplication_guard
from app.models import PracticeQuestion, QuestionTestCase

def test_zero_duplicate_questions_per_topic():
    q1 = PracticeQuestion(
        id="q1",
        topic="Arrays & Hashing",
        title="Two Sum",
        difficulty="Easy",
        description="Find pair summing to target",
        java_starter_code="class Solution { public int[] twoSum() {} }",
        solution_approach="HashMap lookup",
        examples=[QuestionTestCase(input="[2, 7], 9", expected_output="[0, 1]")]
    )
    
    # Candidate duplicate with same title
    q1_duplicate = q1.model_copy(deep=True)
    q1_duplicate.id = "q1_dupe"

    q2 = PracticeQuestion(
        id="q2",
        topic="Arrays & Hashing",
        title="Group Anagrams",
        difficulty="Medium",
        description="Group words by anagrams",
        java_starter_code="class Solution { public List<List<String>> groupAnagrams() {} }",
        solution_approach="Sort chars",
        examples=[QuestionTestCase(input="['eat', 'tea']", expected_output="[['eat', 'tea']]")]
    )

    seen_set = set()
    first_pass = deduplication_guard.filter_non_duplicates([q1, q1_duplicate, q2], seen_set, limit=5)
    
    assert len(first_pass) == 2
    assert [q.title for q in first_pass] == ["Two Sum", "Group Anagrams"]
    
    # Second attempt with same candidates: should return 0 duplicates!
    second_pass = deduplication_guard.filter_non_duplicates([q1, q2], seen_set, limit=5)
    assert len(second_pass) == 0
