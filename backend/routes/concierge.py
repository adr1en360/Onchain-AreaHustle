from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import settings, get_database
from services.directory import filter_merchants, get_merchant, NEIGHBOURHOOD, CATEGORY
from services import celo
from routes.auth import get_current_user
from models import Task
from google import genai

router = APIRouter()

client = genai.Client(api_key=settings.GEMINI_API_KEY)


class ChatMessage(BaseModel):
    message: str


class ConciergeIntent(BaseModel):
    category: str
    neighbourhood: str
    description: str
    urgency: str
    budget_usdt: float
    merchant_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    intent: Optional[dict] = None
    merchants: List[dict] = []
    suggested_action: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def concierge_chat(body: ChatMessage, current_user: dict = Depends(get_current_user)):
    directory_context = filter_merchants(neighbourhood=NEIGHBOURHOOD, category=CATEGORY)

    prompt = f"""You are AreaHustle, a Local Commerce Concierge for {NEIGHBOURHOOD}, Lagos.
User request: "{body.message}"

Available verified plumbers in directory:
{directory_context}

Extract booking intent as JSON with: category, neighbourhood, description, urgency (today/scheduled), budget_usdt (reasonable 20-80), merchant_id (best match id or null).
Then write a friendly 2-sentence reply suggesting top matches."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "reply": {"type": "string"},
                        "category": {"type": "string"},
                        "neighbourhood": {"type": "string"},
                        "description": {"type": "string"},
                        "urgency": {"type": "string"},
                        "budget_usdt": {"type": "number"},
                        "merchant_id": {"type": "string"},
                    },
                    "required": ["reply", "category", "neighbourhood", "description", "urgency", "budget_usdt"],
                },
            },
        )
        data = response.parsed if hasattr(response, "parsed") and response.parsed else {}
    except Exception:
        data = _fallback_parse(body.message)

    merchants = filter_merchants(
        neighbourhood=data.get("neighbourhood", NEIGHBOURHOOD),
        category=data.get("category", CATEGORY),
        available_today=True if "today" in body.message.lower() else None,
    )
    if data.get("merchant_id"):
        m = get_merchant(data["merchant_id"])
        if m:
            merchants = [m] + [x for x in merchants if x["id"] != m["id"]]

    merchants = merchants[:3]

    return ChatResponse(
        reply=data.get("reply", "I found plumbers in Lekki Phase 1. Pick one to book with USDT escrow."),
        intent={
            "category": data.get("category", CATEGORY),
            "neighbourhood": data.get("neighbourhood", NEIGHBOURHOOD),
            "description": data.get("description", body.message),
            "urgency": data.get("urgency", "today"),
            "budget_usdt": data.get("budget_usdt", 45),
            "merchant_id": data.get("merchant_id"),
        },
        merchants=merchants,
        suggested_action="book" if merchants else "refine",
    )


def _fallback_parse(message: str) -> dict:
    lower = message.lower()
    budget = 45.0
    for word in lower.split():
        if word.replace("$", "").replace("usdt", "").isdigit():
            budget = float(word.replace("$", ""))
    return {
        "reply": f"I found plumbers available in {NEIGHBOURHOOD} today. Escrow payment is in USDT on Celo.",
        "category": CATEGORY,
        "neighbourhood": NEIGHBOURHOOD,
        "description": message,
        "urgency": "today" if "today" in lower else "scheduled",
        "budget_usdt": budget,
        "merchant_id": None,
    }
