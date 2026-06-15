from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta
import secrets

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_database, settings
from routes.auth import get_current_user, create_access_token, get_password_hash
from services import celo

router = APIRouter()


class WalletChallengeResponse(BaseModel):
    message: str
    nonce: str
    expires_at: str


class WalletVerifyRequest(BaseModel):
    address: str
    signature: str
    nonce: str
    role: Optional[str] = "customer"
    name: str = ""


class WalletLinkRequest(BaseModel):
    address: str
    signature: str
    nonce: str


class OnchainTxConfirmRequest(BaseModel):
    tx_hash: str


class EscrowAssignConfirmRequest(BaseModel):
    tx_hash: str
    task_id: str


class EscrowReleaseConfirmRequest(BaseModel):
    tx_hash: str
    task_id: str


@router.get("/config")
async def get_celo_config():
    deployment = celo.load_deployment(settings.CELO_CHAIN_ID)
    registry = settings.CELO_REGISTRY_ADDRESS or deployment.get("registry")
    escrow = settings.CELO_ESCROW_ADDRESS or deployment.get("escrow")
    payment_token = settings.CELO_PAYMENT_TOKEN or deployment.get("paymentToken", celo.DEFAULT_PAYMENT_TOKEN)

    return {
        "chain_id": settings.CELO_CHAIN_ID,
        "rpc_url": settings.CELO_RPC_URL,
        "registry_address": registry,
        "escrow_address": escrow,
        "payment_token": payment_token,
        "payment_symbol": settings.CELO_PAYMENT_SYMBOL,
        "payment_decimals": settings.CELO_PAYMENT_DECIMALS,
        "platform_fee_bps": deployment.get("platformFeeBps", 250),
        "enabled": bool(registry and escrow),
    }


class WalletChallengeRequest(BaseModel):
    address: str
    action: str = "link"


@router.post("/wallet/challenge", response_model=WalletChallengeResponse)
async def wallet_challenge(
    body: WalletChallengeRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    action = body.action if body.action in ("link", "register", "login", "auth") else "link"
    try:
        normalized = celo.normalize_address(body.address)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    nonce = secrets.token_hex(16)
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    message = celo.build_wallet_message(action, normalized, nonce)

    await db.wallet_challenges.insert_one(
        {
            "address": normalized,
            "nonce": nonce,
            "action": action,
            "message": message,
            "expires_at": expires_at,
            "used": False,
        }
    )

    return WalletChallengeResponse(
        message=message,
        nonce=nonce,
        expires_at=expires_at.isoformat(),
    )


@router.post("/wallet/auth")
async def wallet_auth(
    body: WalletVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if body.role not in ("customer", "hustler"):
        raise HTTPException(status_code=400, detail="Invalid role")

    try:
        address = celo.normalize_address(body.address)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    challenge = await db.wallet_challenges.find_one(
        {"address": address, "nonce": body.nonce, "used": False}
    )
    if not challenge or challenge.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Challenge expired or not found")

    if not celo.verify_wallet_signature(address, challenge["message"], body.signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    await db.wallet_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"used": True}})

    # Check if a user with this wallet address and role already exists
    user = await db.users.find_one({"wallet_address": address, "role": body.role})
    if user:
        user_id = str(user["_id"])
        user_role = user.get("role", "customer")
        token = create_access_token({"sub": user_id, "role": user_role}, expires_delta=timedelta(days=7))
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user_id,
            "wallet_address": address,
            "is_new": False,
            "role": user_role,
        }
    else:
        # Create a new user
        placeholder_email = f"{address[2:10]}_{body.role}@wallet.areahustle.com"
        email_taken = await db.users.find_one({"email": placeholder_email})
        if email_taken:
            placeholder_email = f"{address[2:]}_{body.role}@wallet.areahustle.com"

        user_doc = {
            "email": placeholder_email,
            "hashed_password": get_password_hash(secrets.token_urlsafe(32)),
            "role": body.role,
            "name": body.name or f"Wallet {address[:8]}",
            "wallet_address": address,
            "wallet_linked_at": datetime.utcnow(),
            "onchain_registered": False,
            "payment_mode_default": "onchain",
            "language_preference": "english",
            "wallet_balance": 0.0,
            "created_at": datetime.utcnow(),
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        token = create_access_token({"sub": user_id, "role": body.role}, expires_delta=timedelta(days=7))
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user_id,
            "wallet_address": address,
            "is_new": True,
            "role": body.role,
        }



@router.post("/wallet/register")
async def wallet_register(body: WalletVerifyRequest, db: AsyncIOMotorDatabase = Depends(get_database)):
    if body.role not in ("customer", "hustler"):
        raise HTTPException(status_code=400, detail="Invalid role")

    try:
        address = celo.normalize_address(body.address)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    challenge = await db.wallet_challenges.find_one(
        {"address": address, "nonce": body.nonce, "used": False, "action": "register"}
    )
    if not challenge or challenge.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Challenge expired or not found")

    if not celo.verify_wallet_signature(address, challenge["message"], body.signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    existing_wallet = await db.users.find_one({"wallet_address": address, "role": body.role})
    if existing_wallet:
        raise HTTPException(status_code=400, detail="Wallet already registered for this role")

    placeholder_email = f"{address[2:10]}_{body.role}@wallet.areahustle.com"
    email_taken = await db.users.find_one({"email": placeholder_email})
    if email_taken:
        placeholder_email = f"{address[2:]}_{body.role}@wallet.areahustle.com"

    user_doc = {
        "email": placeholder_email,
        "hashed_password": get_password_hash(secrets.token_urlsafe(32)),
        "role": body.role,
        "name": body.name or f"Wallet {address[:8]}",
        "wallet_address": address,
        "wallet_linked_at": datetime.utcnow(),
        "onchain_registered": False,
        "payment_mode_default": "onchain",
        "language_preference": "english",
        "wallet_balance": 0.0,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    await db.wallet_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"used": True}})

    token = create_access_token({"sub": user_id, "role": body.role}, expires_delta=timedelta(days=7))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "wallet_address": address,
    }


@router.post("/wallet/link")
async def wallet_link(
    body: WalletLinkRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    try:
        address = celo.normalize_address(body.address)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    challenge = await db.wallet_challenges.find_one(
        {"address": address, "nonce": body.nonce, "used": False, "action": "link"}
    )
    if not challenge or challenge.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Challenge expired or not found")

    if not celo.verify_wallet_signature(address, challenge["message"], body.signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    taken = await db.users.find_one({"wallet_address": address, "role": current_user.get("role"), "_id": {"$ne": current_user["_id"]}})
    if taken:
        raise HTTPException(status_code=400, detail="Wallet already linked to another account with this role")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"wallet_address": address, "wallet_linked_at": datetime.utcnow()}},
    )
    await db.wallet_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"used": True}})

    return {"message": "Wallet linked", "wallet_address": address}


@router.post("/wallet/onchain-register/confirm")
async def confirm_onchain_registration(
    body: OnchainTxConfirmRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    wallet_address = current_user.get("wallet_address")
    if not wallet_address:
        raise HTTPException(status_code=400, detail="Link a wallet first")

    registry = settings.CELO_REGISTRY_ADDRESS or celo.load_deployment(settings.CELO_CHAIN_ID).get("registry")
    if not registry:
        raise HTTPException(status_code=503, detail="Registry contract not configured")

    event = await celo.verify_registry_registration(
        settings.CELO_RPC_URL,
        body.tx_hash,
        registry,
        wallet_address,
    )
    if not event:
        raise HTTPException(status_code=400, detail="On-chain registration not found in transaction")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "onchain_registered": True,
                "onchain_register_tx": body.tx_hash,
                "onchain_role": int(event.get("role", 0)),
            }
        },
    )
    return {"message": "On-chain profile confirmed", "tx_hash": body.tx_hash}


@router.post("/escrow/{task_id}/confirm-fund")
async def confirm_escrow_fund(
    task_id: str,
    body: OnchainTxConfirmRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if str(task.get("customer_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Only task owner can confirm escrow")
    if task.get("payment_mode") != "onchain":
        raise HTTPException(status_code=400, detail="Task is not on-chain")

    escrow_address = settings.CELO_ESCROW_ADDRESS or celo.load_deployment(settings.CELO_CHAIN_ID).get("escrow")
    if not escrow_address:
        raise HTTPException(status_code=503, detail="Escrow contract not configured")

    task_ref = task.get("escrow_task_ref") or celo.task_ref_from_id(task_id)
    wallet_address = current_user.get("wallet_address")
    if not wallet_address:
        raise HTTPException(status_code=400, detail="Customer wallet not linked")

    event = await celo.verify_escrow_created(
        settings.CELO_RPC_URL,
        body.tx_hash,
        escrow_address,
        task_ref,
        wallet_address,
    )
    if not event:
        raise HTTPException(status_code=400, detail="Escrow funding not found in transaction")

    escrow_id = int(event.get("escrowId"))
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "escrow_id": escrow_id,
                "escrow_status": "funded",
                "escrow_fund_tx": body.tx_hash,
                "escrow_task_ref": task_ref,
                "status": "open",
            }
        },
    )
    return {"message": "Escrow funded", "escrow_id": escrow_id, "tx_hash": body.tx_hash}


@router.post("/escrow/confirm-assign")
async def confirm_escrow_assign(
    body: EscrowAssignConfirmRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    task = await db.tasks.find_one({"_id": ObjectId(body.task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if str(task.get("customer_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Only customer can assign hustler on-chain")

    escrow_address = settings.CELO_ESCROW_ADDRESS or celo.load_deployment(settings.CELO_CHAIN_ID).get("escrow")
    if not escrow_address:
        raise HTTPException(status_code=503, detail="Escrow contract not configured")

    receipt = await celo.get_transaction_receipt(settings.CELO_RPC_URL, body.tx_hash)
    event = celo.find_event_in_receipt(receipt, escrow_address, "HustlerAssigned", celo.ESCROW_ABI)
    if not event:
        raise HTTPException(status_code=400, detail="Hustler assignment not found in transaction")

    expected_escrow_id = task.get("escrow_id")
    if expected_escrow_id and int(event.get("escrowId", -1)) != int(expected_escrow_id):
        raise HTTPException(status_code=400, detail="Escrow ID mismatch")

    await db.tasks.update_one(
        {"_id": ObjectId(body.task_id)},
        {
            "$set": {
                "escrow_status": "assigned",
                "escrow_assign_tx": body.tx_hash,
                "status": "active",
            }
        },
    )
    return {"message": "Hustler assigned on-chain", "tx_hash": body.tx_hash}


@router.post("/escrow/confirm-release")
async def confirm_escrow_release(
    body: EscrowReleaseConfirmRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    task = await db.tasks.find_one({"_id": ObjectId(body.task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if str(task.get("customer_id")) != str(current_user.get("_id")):
        raise HTTPException(status_code=403, detail="Only customer can release escrow")

    escrow_id = task.get("escrow_id")
    if not escrow_id:
        raise HTTPException(status_code=400, detail="Task has no escrow")

    escrow_address = settings.CELO_ESCROW_ADDRESS or celo.load_deployment(settings.CELO_CHAIN_ID).get("escrow")
    if not escrow_address:
        raise HTTPException(status_code=503, detail="Escrow contract not configured")

    event = await celo.verify_escrow_released(
        settings.CELO_RPC_URL,
        body.tx_hash,
        escrow_address,
        int(escrow_id),
    )
    if not event:
        raise HTTPException(status_code=400, detail="Escrow release not found in transaction")

    from datetime import datetime

    payout_wei = int(event.get("payout", 0))
    payout_naira = celo.token_wei_to_naira(payout_wei)
    hustler_id = task.get("matched_hustler_id")

    await db.tasks.update_one(
        {"_id": ObjectId(body.task_id)},
        {
            "$set": {
                "escrow_status": "released",
                "escrow_release_tx": body.tx_hash,
                "status": "completed",
                "completed_at": datetime.utcnow(),
            }
        },
    )

    if hustler_id:
        await db.transactions.insert_one(
            {
                "user_id": hustler_id,
                "task_id": body.task_id,
                "type": "payout",
                "amount": payout_naira,
                "chain_tx": body.tx_hash,
                "payment_mode": "onchain",
                "timestamp": datetime.utcnow(),
            }
        )
        await db.hustler_profiles.update_one(
            {"user_id": hustler_id},
            {"$inc": {"completed_jobs": 1, "trust_score": 5}},
            upsert=True,
        )

    return {
        "message": "Payment released on-chain",
        "tx_hash": body.tx_hash,
        "payout": payout_naira,
        "hustler_wallet": event.get("hustler"),
    }
