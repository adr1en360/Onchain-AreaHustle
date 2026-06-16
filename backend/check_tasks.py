import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('c:\\Users\\alara\\OneDrive\\Desktop\\Onchain-AreaHustle\\backend\\.env')

async def main():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client['areahustle']
    tasks = await db.tasks.find({}).to_list(100)
    print(f"Total tasks: {len(tasks)}")
    for t in tasks:
        print(f"ID: {t['_id']}, status: {t.get('status')}, payment_mode: {t.get('payment_mode')}, escrow_status: {t.get('escrow_status')}")

if __name__ == '__main__':
    asyncio.run(main())
