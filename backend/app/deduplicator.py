import hashlib
from typing import Set, List
from app.models import PracticeQuestion

class DeduplicationGuard:
    """
    Enforces 0% duplicate questions per topic per week for a student.
    Guarantees no two questions have the same title or normalized signature.
    """
    @staticmethod
    def normalize_title(title: str) -> str:
        return "".join(ch.lower() for ch in title if ch.isalnum())

    @staticmethod
    def compute_signature(q: PracticeQuestion) -> str:
        normalized = f"{q.topic.lower()}:{DeduplicationGuard.normalize_title(q.title)}"
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    @classmethod
    def filter_non_duplicates(
        cls,
        candidate_questions: List[PracticeQuestion],
        existing_signatures: Set[str],
        limit: int = 2
    ) -> List[PracticeQuestion]:
        unique_questions: List[PracticeQuestion] = []
        for q in candidate_questions:
            sig = cls.compute_signature(q)
            norm_title = cls.normalize_title(q.title)
            
            if sig not in existing_signatures and norm_title not in existing_signatures:
                unique_questions.append(q)
                existing_signatures.add(sig)
                existing_signatures.add(norm_title)
                if len(unique_questions) >= limit:
                    break
        return unique_questions

deduplication_guard = DeduplicationGuard()
