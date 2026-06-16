from fastapi import APIRouter, Depends, HTTPException
from database import get_database, settings
from motor.motor_asyncio import AsyncIOMotorDatabase
import httpx
from routes.auth import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/me")
async def get_my_passport(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.get("_id"))
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    profile = await db.hustler_profiles.find_one({"user_id": user_id})

    if not profile:
        # Seed fallback for demo if profile missing
        profile = {"trust_score": 820, "completed_jobs": 15}

    return {
        "user_id": user_id,
        "name": user.get("name", ""),
        "wallet_balance": user.get("wallet_balance", 0.0),
        "trust_score": profile.get("trust_score", 500),
        "completed_jobs": profile.get("completed_jobs", 0),
        "completion_rate": profile.get("completion_rate", 0.0),
        "service_areas": profile.get("service_areas", []),
        "categories": profile.get("categories", []),
    }





@router.post("/demo/complete-job-sweep")
async def demo_complete_job_sweep(
    job_amount: float = 5000.0,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """
    SPECIAL DEMO ENDPOINT: Simulates the completion of a job.
    Releases escrow and records the transaction to the database (without loan sweep).
    """
    user_id = str(current_user.get("_id"))
    final_payout = job_amount

    # 1. Record transaction
    transaction = {
        "user_id": user_id,
        "type": "payout",
        "amount": final_payout,
        "timestamp": datetime.utcnow(),
    }
    await db.transactions.insert_one(transaction)

    # 2. Update user wallet
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"wallet_balance": final_payout}},
    )

    # 3. Update hustler stats
    await db.hustler_profiles.update_one(
        {"user_id": user_id},
        {
            "$inc": {"completed_jobs": 1, "trust_score": 5},
            "$set": {"completion_rate": 0.98},
        },
        upsert=True,
    )

    return {
        "hustler_id": user_id,
        "event": "JOB_COMPLETED_ESCROW_RELEASED",
        "breakdown": {
            "gross_received": job_amount,
            "net_credited_to_wallet": final_payout,
        },
        "animation_sequence": [
            {"label": "Escrow Released", "value": job_amount, "color": "green"},
            {"label": "Final Wallet Credit", "value": final_payout, "color": "blue"},
        ],
    }


@router.get("/proof-card")
async def get_proof_card(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.get("_id"))
    profile = await db.hustler_profiles.find_one({"user_id": user_id})
    if not profile:
        profile = {
            "trust_score": 820,
            "completed_jobs": 47,
            "completion_rate": 0.94,
            "repeat_hire_ratio": 0.66,
            "dispute_rate": 0.02,
            "categories": ["Generator Service", "Car Wash"],
            "service_areas": ["Lekki Phase 1", "Ajah"]
        }

    is_demo_emeka = current_user.get("email") == "hustler@areahustle.com" or profile.get("trust_score", 0) >= 800

    if is_demo_emeka:
        verified_income_30d = 45.0
        verified_income_60d = 82.0
        verified_income_90d = 135.0
        consistency_index = 0.72
        tenure = 8
        avg_response = 4.2
        completed_jobs = profile.get("completed_jobs", 47)
        if completed_jobs < 47:
            completed_jobs = 47
    else:
        completed_jobs = profile.get("completed_jobs", 0)
        tenure = 1
        avg_response = 10.0
        cursor = db.transactions.find({"user_id": user_id, "type": "payout"})
        total_payout = 0.0
        async for tx in cursor:
            total_payout += tx.get("amount", 0.0)
            
        verified_income_30d = total_payout
        verified_income_60d = total_payout
        verified_income_90d = total_payout
        consistency_index = 0.50 if total_payout > 0 else 0.0

    return {
        "hustler_id": f"ah_v2_{user_id[:12]}",
        "hustler_name": current_user.get("name", "Hustler"),
        "kyc_tier": current_user.get("kyc_tier", 2),
        "platform_tenure_months": tenure,
        "verified_income_30d": verified_income_30d,
        "verified_income_60d": verified_income_60d,
        "verified_income_90d": verified_income_90d,
        "income_consistency_index": consistency_index,
        "total_jobs_completed": completed_jobs,
        "completion_rate": profile.get("completion_rate", 0.94),
        "repeat_hire_ratio": profile.get("repeat_hire_ratio", 0.66),
        "dispute_rate": profile.get("dispute_rate", 0.02),
        "avg_response_time_minutes": avg_response,
        "categories": profile.get("categories", ["Generator Service", "Car Wash"]),
        "service_areas": profile.get("service_areas", ["Lekki Phase 1", "Ajah"]),
        "generated_at": datetime.utcnow().isoformat(),
        "verification_hash": f"ah_v2_{user_id[:8]}hash"
    }


@router.get("/transactions")
async def list_transactions(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.get("_id"))
    cursor = db.transactions.find({"user_id": user_id}).sort("timestamp", -1).limit(50)
    txs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        txs.append(doc)
    return txs
