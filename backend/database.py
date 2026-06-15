import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "areahustle"
    AETHEX_API_KEY: str = ""
    AETHEX_BASE_URL: str = "https://api.aethexai.com/api/v1"
    AETHEX_PASSPORT_AGENT_ID: str = ""
    GEMINI_API_KEY: str = ""
    AETHEX_FROM_NUMBER: str = ""
    AH_CALLBACK_URL: str = ""
    CELO_RPC_URL: str = "https://forno.celo-sepolia.celo-testnet.org"
    CELO_CHAIN_ID: int = 11142220
    CELO_REGISTRY_ADDRESS: str = ""
    CELO_ESCROW_ADDRESS: str = ""
    CELO_PAYMENT_TOKEN: str = "0x01C5C0122039549AD1493B8220cABEdD739BC44E"
    CELO_PAYMENT_DECIMALS: int = 6
    CELO_PAYMENT_SYMBOL: str = "USDC"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        extra="ignore",
    )

settings = Settings()

# Synchronously test connection and fallback to local MongoDB if Atlas cluster is unreachable
from pymongo import MongoClient
resolved_url = settings.MONGODB_URL
if resolved_url != "mongodb://localhost:27017":
    print(f"Testing MongoDB connection: {resolved_url}")
    try:
        test_client = MongoClient(resolved_url, serverSelectionTimeoutMS=2000)
        test_client.list_database_names()
        print("MongoDB connection verified successfully.")
    except Exception as e:
        print(f"Warning: Connection to {resolved_url} failed: {e}")
        print("Falling back to local MongoDB instance: mongodb://localhost:27017")
        resolved_url = "mongodb://localhost:27017"
        settings.MONGODB_URL = resolved_url

client = AsyncIOMotorClient(resolved_url)
db = client[settings.DATABASE_NAME]

async def init_db():
    # Tasks: Filter by neighbourhood and category
    await db.tasks.create_index([("neighbourhood", 1), ("category", 1)])
    # Hustler Profiles: Filter by service_areas and trust_score
    await db.hustler_profiles.create_index([("service_areas", 1), ("trust_score", -1)])
    # Users: Unique email
    await db.users.create_index("email", unique=True)
    try:
        await db.users.drop_index("wallet_address_1")
    except Exception:
        pass
    await db.users.create_index([("wallet_address", 1), ("role", 1)], unique=True, sparse=True)
    await db.wallet_challenges.create_index("expires_at", expireAfterSeconds=0)
    # Transactions: user_id + type index
    await db.transactions.create_index([("user_id", 1), ("timestamp", -1)])

async def get_database():
    return db
