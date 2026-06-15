from fastapi import APIRouter, Depends, Query
from typing import Optional
from services.directory import filter_merchants, get_merchant, CITY, CATEGORY, NEIGHBOURHOOD

router = APIRouter()


@router.get("/meta")
async def directory_meta():
    return {
        "city": CITY,
        "category": CATEGORY,
        "neighbourhood": NEIGHBOURHOOD,
        "payment_token": "USDC",
        "chain": "Celo Sepolia",
    }


@router.get("/")
async def list_merchants(
    neighbourhood: Optional[str] = Query(None),
    category: Optional[str] = Query(CATEGORY),
    available_today: Optional[bool] = Query(None),
    q: Optional[str] = Query(None),
):
    merchants = filter_merchants(
        neighbourhood=neighbourhood or NEIGHBOURHOOD,
        category=category,
        available_today=available_today,
        query=q,
    )
    return {"merchants": merchants, "count": len(merchants)}


@router.get("/{merchant_id}")
async def merchant_detail(merchant_id: str):
    merchant = get_merchant(merchant_id)
    if not merchant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Merchant not found")
    return merchant
