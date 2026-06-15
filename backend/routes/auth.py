from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from database import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import UserCreate, User, UserPublic
from bson import ObjectId

router = APIRouter()

# Auth config
SECRET_KEY = "areahustle-super-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise credentials_exception

    user = await db.users.find_one({"_id": obj_id})
    if user is None:
        raise credentials_exception
    return user


class Token(BaseModel):
    access_token: str
    token_type: str


# Removed traditional register and login endpoints to enforce wallet-only authentication.



@router.get("/me", response_model=UserPublic)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    email = current_user.get("email")
    if email and email.endswith(".local"):
        email = email.replace(".local", ".com")
    return UserPublic(
        id=str(current_user.get("_id")),
        email=email,
        role=current_user.get("role"),
        name=current_user.get("name", ""),
        phone_number=current_user.get("phone_number", ""),
        wallet_balance=current_user.get("wallet_balance", 0.0),
        wallet_address=current_user.get("wallet_address"),
        onchain_registered=current_user.get("onchain_registered", False),
        payment_mode_default=current_user.get("payment_mode_default", "demo"),
        language_preference=current_user.get("language_preference", "english"),
    )
