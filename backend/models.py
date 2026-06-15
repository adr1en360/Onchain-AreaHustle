from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    hashed_password: str
    role: str  # "customer" or "hustler"
    name: str = ""
    phone_number: str = ""
    kyc_tier: int = 1
    kyc_status: str = "pending"
    wallet_balance: float = 0.0
    wallet_address: Optional[str] = None
    onchain_registered: bool = False
    self_agent_verified: bool = False
    payment_mode_default: str = "demo"  # demo | onchain
    language_preference: str = "english"  # english, french, arabic
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str
    name: str = ""
    phone_number: str = ""
    language_preference: str = "english"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    role: str
    name: str
    phone_number: str = ""
    wallet_balance: float
    wallet_address: Optional[str] = None
    onchain_registered: bool = False
    self_agent_verified: bool = False
    payment_mode_default: str = "demo"
    language_preference: str

class HustlerProfile(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    trust_score: int = 500
    completed_jobs: int = 0
    completion_rate: float = 98.0
    on_time_arrival: float = 95.0
    repeat_hire_ratio: float = 0.66
    dispute_rate: float = 0.02
    income_30d: float = 0.0
    income_60d: float = 0.0
    income_90d: float = 0.0
    income_consistency_index: float = 0.72
    platform_tenure_months: int = 8
    service_areas: List[str] = []
    categories: List[str] = []

class HustlerProfileCreate(BaseModel):
    service_areas: List[str] = []
    categories: List[str] = []

class Task(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    customer_id: str
    title: str = ""
    category: str
    description: str
    budget: float
    neighbourhood: str
    status: str = "open"  # open, matched, active, completed, disputed
    matched_hustler_id: Optional[str] = None
    matched_hustler_wallet: Optional[str] = None
    merchant_id: Optional[str] = None
    merchant_name: Optional[str] = None
    payment_mode: str = "demo"
    escrow_id: Optional[int] = None
    escrow_task_ref: Optional[str] = None
    escrow_amount_wei: Optional[str] = None
    escrow_fund_tx: Optional[str] = None
    escrow_assign_tx: Optional[str] = None
    escrow_release_tx: Optional[str] = None
    escrow_status: Optional[str] = None  # pending, funded, assigned, released
    voice_payload_url: Optional[str] = None
    voice_transcript: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    title: str = ""
    category: str
    description: str
    budget: float
    neighbourhood: str
    voice_transcript: Optional[str] = None
    payment_mode: str = "onchain"
    merchant_id: Optional[str] = None
    hustler_wallet: Optional[str] = None

class Transaction(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    task_id: Optional[str] = None
    type: str  # escrow_hold, payout, topup, withdrawal
    amount: float
    desc: str = ""
    location: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    user_id: str
    task_id: Optional[str] = None
    type: str
    amount: float
    desc: str = ""
    location: str = ""
