from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import httpx

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from database import get_database
from routes.auth import get_current_user

router = APIRouter()

SELF_API = "https://app.ai.self.xyz/api/agent"


class SelfStartRequest(BaseModel):
    wallet_address: str


@router.post("/start")
async def start_self_verification(
    body: SelfStartRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    payload = {
        "mode": "linked",
        "network": "sepolia",
        "humanAddress": body.wallet_address,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(f"{SELF_API}/register", json=payload)
        if res.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Self Agent ID unavailable: {res.text}")
        data = res.json()

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "self_session_token": data.get("sessionToken"),
                "self_scan_url": data.get("scanUrl"),
                "self_verification_started_at": datetime.utcnow(),
            }
        },
    )
    return {
        "session_token": data.get("sessionToken"),
        "scan_url": data.get("scanUrl"),
        "deep_link": data.get("deepLink"),
        "message": "Scan your passport in the Self app to verify you are human.",
    }


@router.get("/status")
async def self_verification_status(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    token = current_user.get("self_session_token")
    if not token:
        return {"verified": current_user.get("self_agent_verified", False), "stage": "not_started"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(
            f"{SELF_API}/register/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        if res.status_code >= 400:
            return {"verified": False, "stage": "error", "detail": res.text}
        data = res.json()

    stage = data.get("stage", "pending")
    verified = stage == "registered"
    if verified:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"self_agent_verified": True, "self_verified_at": datetime.utcnow()}},
        )

    return {
        "verified": verified or current_user.get("self_agent_verified", False),
        "stage": stage,
        "agent_id": data.get("agentId"),
    }


@router.get("/me")
async def my_verification(current_user: dict = Depends(get_current_user)):
    return {
        "self_agent_verified": current_user.get("self_agent_verified", False),
        "wallet_address": current_user.get("wallet_address"),
        "scan_url": current_user.get("self_scan_url"),
    }
