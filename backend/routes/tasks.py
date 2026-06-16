from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from models import Task, TaskCreate, TaskUpdate
from database import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import settings
from bson import ObjectId
from routes.auth import get_current_user
from services.directory import get_merchant
from services import celo

router = APIRouter()

# --- Gemini client ---
from google import genai
from pydantic import BaseModel
import json

client = genai.Client(api_key=settings.GEMINI_API_KEY)

class TaskEntities(BaseModel):
    category: str
    neighbourhood: str
    description: str

async def extract_intent(text: str):
    response = client.models.generate_content(
        model='gemini-3-flash-preview',
        contents=text,
        config={
            'response_mime_type': 'application/json',
            'response_schema': TaskEntities,
            'system_instruction': """
            You are a task extractor for the AreaHustle app.
            Extract task entities from the user's transcript.
            Categories: Car Wash, Generator Service, Cleaning, Minor Repairs, Errands, Laundry, Tutoring, Other.
            Neighbourhoods: Lekki Phase 1, Ajah, Sangotedo, Magodo, Ketu.
            """
        }
    )
    return response.parsed


# --- Task CRUD + lifecycle ---

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can post tasks")

    payment_mode = task.payment_mode if task.payment_mode in ("demo", "onchain") else "demo"
    if payment_mode == "onchain" and not current_user.get("wallet_address"):
        raise HTTPException(status_code=400, detail="Link a Celo wallet to use on-chain escrow")

    new_task = Task(
        customer_id=str(current_user.get("_id")),
        title=task.title or task.category,
        category=task.category,
        description=task.description,
        budget=task.budget,
        neighbourhood=task.neighbourhood,
        location=task.location or task.neighbourhood,
        voice_transcript=task.voice_transcript,
        payment_mode=payment_mode,
        escrow_status="pending" if payment_mode == "onchain" else None,
    )
    result = await db.tasks.insert_one(new_task.dict(by_alias=True, exclude={"id"}))
    task_id = str(result.inserted_id)

    response = {"id": task_id, "payment_mode": payment_mode}
    if payment_mode == "onchain":
        task_ref = celo.task_ref_from_id(task_id)
        amount_wei = int(float(task.budget) * 1_000_000) # USDC has 6 decimals on Celo
        await db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "escrow_task_ref": task_ref,
                    "escrow_amount_wei": str(amount_wei),
                }
            },
        )
        response["escrow"] = {
            "task_ref": task_ref,
            "amount_wei": str(amount_wei),
            "amount_display": task.budget,
            "token_symbol": settings.CELO_PAYMENT_SYMBOL,
            "status": "pending",
        }
    return response


@router.get("/")
async def list_tasks(
    neighbourhood: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("open", alias="status"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if category:
        query["category"] = category

    conditions = []
    
    target_location = location or neighbourhood
    if target_location:
        conditions.append({
            "$or": [
                {"neighbourhood": target_location},
                {"location": target_location}
            ]
        })

    if status_filter == "open":
        conditions.append({
            "$or": [
                {"payment_mode": {"$ne": "onchain"}},
                {"escrow_status": "funded"},
                {"payment_mode": {"$exists": False}},
            ]
        })

    if conditions:
        if len(conditions) == 1:
            for key, val in conditions[0].items():
                query[key] = val
        else:
            query["$and"] = conditions

    cursor = db.tasks.find(query).sort("created_at", -1)
    tasks = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        tasks.append(doc)
    return tasks


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if str(task.get("customer_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Only task owner can edit the task")

    if task.get("status") not in ("open", "pending"):
        raise HTTPException(status_code=400, detail="Only open or pending tasks can be edited")

    update_data = task_update.dict(exclude_unset=True)
    
    if task.get("payment_mode") == "onchain" and "budget" in update_data:
        if float(update_data["budget"]) != float(task.get("budget", 0)):
            raise HTTPException(
                status_code=400,
                detail="Budget cannot be changed for on-chain jobs because USDC is already locked in escrow."
            )

    if "location" in update_data and not update_data.get("neighbourhood"):
        update_data["neighbourhood"] = update_data["location"]
    elif "neighbourhood" in update_data and not update_data.get("location"):
        update_data["location"] = update_data["neighbourhood"]

    if update_data:
        await db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )

    updated = await db.tasks.find_one({"_id": ObjectId(task_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/my-tasks")
async def my_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.get("_id"))
    role = current_user.get("role")
    query: dict = {"customer_id": user_id} if role == "customer" else {"matched_hustler_id": user_id}
    if status_filter:
        query["status"] = status_filter
    cursor = db.tasks.find(query).sort("created_at", -1)
    tasks = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        tasks.append(doc)
    return tasks


@router.post("/{task_id}/match")
async def match_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "hustler":
        raise HTTPException(status_code=403, detail="Only hustlers can accept tasks")

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "open":
        raise HTTPException(status_code=400, detail="Task is not open")

    hustler_id = str(current_user.get("_id"))

    update_fields = {"status": "matched", "matched_hustler_id": hustler_id}
    if task.get("payment_mode") == "onchain":
        if task.get("escrow_status") != "funded":
            raise HTTPException(status_code=400, detail="On-chain escrow must be funded before matching")
        hustler_wallet = current_user.get("wallet_address")
        if not hustler_wallet:
            raise HTTPException(status_code=400, detail="Link a Celo wallet to accept on-chain jobs")
        update_fields["matched_hustler_wallet"] = hustler_wallet

    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_fields},
    )
    return {
        "message": "Task matched",
        "task_id": task_id,
        "hustler_id": hustler_id,
        "requires_escrow_assign": task.get("payment_mode") == "onchain",
        "escrow_id": task.get("escrow_id"),
        "hustler_wallet": update_fields.get("matched_hustler_wallet"),
    }


@router.post("/{task_id}/activate")
async def activate_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "matched":
        raise HTTPException(status_code=400, detail="Task must be matched before activation")

    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": "active"}},
    )
    return {"message": "Task activated", "task_id": task_id}


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("status") != "active":
        raise HTTPException(status_code=400, detail="Task must be active before completion")

    from datetime import datetime

    # For onchain jobs: escrow must be assigned before hustler can mark done
    if task.get("payment_mode") == "onchain":
        if task.get("escrow_status") != "assigned":
            raise HTTPException(
                status_code=400,
                detail="On-chain escrow must be assigned to hustler before marking the job done.",
            )

    # ALL modes: set awaiting_confirmation — customer must verify and release
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": "awaiting_confirmation",
                "hustler_completed_at": datetime.utcnow(),
            }
        },
    )

    return {
        "message": "Job marked done — awaiting customer confirmation",
        "task_id": task_id,
        "requires_admin_verification": False,
        "payment_mode": task.get("payment_mode"),
    }
    
@router.post("/{task_id}/confirm")
async def confirm_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can confirm tasks")

    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if str(task.get("customer_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Only task owner can confirm")

    # Must be awaiting_confirmation before customer can release
    if task.get("status") != "awaiting_confirmation":
        raise HTTPException(
            status_code=400,
            detail=f"Job must be awaiting confirmation before releasing payment (current: {task.get('status')})",
        )

    # On-chain jobs are released via /celo/escrow/confirm-release, not here
    if task.get("payment_mode") == "onchain":
        raise HTTPException(
            status_code=400,
            detail="Use the on-chain release flow for USDC jobs",
        )

    from datetime import datetime

    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
    )

    hustler_id = task.get("matched_hustler_id")
    if hustler_id:
        payout = float(task.get("budget", 0))
        await db.transactions.insert_one(
            {
                "user_id": hustler_id,
                "task_id": task_id,
                "type": "payout",
                "amount": payout,
                "timestamp": datetime.utcnow(),
            }
        )
        await db.users.update_one({"_id": ObjectId(hustler_id)}, {"$inc": {"wallet_balance": payout}})
        await db.hustler_profiles.update_one(
            {"user_id": hustler_id},
            {"$inc": {"completed_jobs": 1, "trust_score": 5}},
            upsert=True,
        )

    return {
        "message": "Task confirmed and payment released",
        "task_id": task_id,
    }


# --- Voice-to-intent ---

@router.post("/voice-to-intent")
async def voice_to_intent(
    audio_url: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    # TODO: wire Aethex STT when endpoint docs are confirmed.
    # For hackathon demo, accept the transcript directly from the frontend
    # or use a hardcoded sample for testing.
    stt_text = "I need a car wash at Lekki Phase 1 because my car is very dirty"

    try:
        entities = await extract_intent(stt_text)
        return {"text": stt_text, "entities": entities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
