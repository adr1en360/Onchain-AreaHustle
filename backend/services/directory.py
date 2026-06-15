import json
from pathlib import Path
from typing import Optional

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "directory.json"

CITY = "Lagos"
CATEGORY = "Plumbing"
NEIGHBOURHOOD = "Lekki Phase 1"


def load_directory() -> list[dict]:
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def filter_merchants(
    *,
    neighbourhood: Optional[str] = None,
    category: Optional[str] = None,
    available_today: Optional[bool] = None,
    query: Optional[str] = None,
) -> list[dict]:
    items = load_directory()
    results = []
    for m in items:
        if neighbourhood and neighbourhood.lower() not in m.get("neighbourhood", "").lower():
            continue
        if category and category.lower() not in m.get("category", "").lower():
            continue
        if available_today is not None and m.get("available_today") != available_today:
            continue
        if query:
            hay = " ".join(
                [
                    m.get("name", ""),
                    m.get("bio", ""),
                    " ".join(m.get("tags", [])),
                    m.get("neighbourhood", ""),
                ]
            ).lower()
            if not all(tok in hay for tok in query.lower().split() if len(tok) > 2):
                continue
        results.append(m)
    return results


def get_merchant(merchant_id: str) -> Optional[dict]:
    for m in load_directory():
        if m.get("id") == merchant_id:
            return m
    return None
