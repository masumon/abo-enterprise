"""Fuzzy string matching without external dependencies."""

from difflib import SequenceMatcher


def fuzzy_score(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def best_match(query: str, candidates: list[str], threshold: float = 0.55) -> tuple[str | None, float]:
    if not query or not candidates:
        return None, 0.0
    best: str | None = None
    best_score = 0.0
    q = query.lower()
    for c in candidates:
        score = fuzzy_score(q, c)
        if score > best_score:
            best_score = score
            best = c
    if best_score < threshold:
        return None, best_score
    return best, best_score
