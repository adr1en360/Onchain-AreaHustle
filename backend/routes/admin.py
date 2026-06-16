"""
Admin routes — restricted to users with role=="admin".
Provides job verification so the escrow-release flow is:

  hustler marks done → awaiting_confirmation
  admin verifies     → verified
  customer releases  → completed / USDC transferred on-chain
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_database
from routes.auth import get_current_user

router = APIRouter()


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/tasks")
async def list_pending_tasks(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _admin: dict = Depends(require_admin),
):
    """List all tasks that are awaiting admin verification."""
    cursor = db.tasks.find({"status": "awaiting_confirmation"}).sort("created_at", -1)
    tasks = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        tasks.append(doc)
    return tasks


@router.post("/tasks/{task_id}/verify")
async def verify_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _admin: dict = Depends(require_admin),
):
    """
    Admin marks a completed job as verified.
    This transitions status: awaiting_confirmation → verified
    and allows the customer to release payment / escrow.
    """
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.get("status") != "awaiting_confirmation":
        raise HTTPException(
            status_code=400,
            detail=f"Task is not awaiting confirmation (current status: {task.get('status')})",
        )

    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": "verified",
                "admin_verified_at": datetime.utcnow(),
            }
        },
    )

    return {
        "message": "Task verified — customer can now release payment",
        "task_id": task_id,
        "payment_mode": task.get("payment_mode"),
    }


@router.post("/tasks/{task_id}/reject")
async def reject_task(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _admin: dict = Depends(require_admin),
):
    """
    Admin rejects a claimed completion — puts the task back to active
    so the hustler must redo the work.
    """
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.get("status") != "awaiting_confirmation":
        raise HTTPException(
            status_code=400,
            detail=f"Task is not awaiting confirmation (current status: {task.get('status')})",
        )

    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "status": "active",
                "admin_rejected_at": datetime.utcnow(),
            }
        },
    )

    return {
        "message": "Task rejected — hustler must redo the work",
        "task_id": task_id,
    }
