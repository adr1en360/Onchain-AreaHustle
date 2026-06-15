"""
AreaHustle Backend Integration Tests
Run after starting the server:
    uvicorn main:app --reload

This script tests all new endpoints end-to-end:
  1. Auth (register + login)
  2. Task lifecycle (create -> list -> match -> activate -> complete)
  3. Hustler profile CRUD
  4. Loan & transaction persistence
  5. Passport & sweep demo
  6. Aethex + Gemini (if keys are present)
"""

import asyncio
import httpx
import os
from test_aethex_connection import test_connect
from test_gemini_extraction import test_intent_extraction

BASE = "http://localhost:8000"

# Shared state
tokens = {"customer": "", "hustler": ""}


async def register_and_login(role: str):
    address = "0x1111111111111111111111111111111111111111" if role == "customer" else "0x2222222222222222222222222222222222222222"
    async with httpx.AsyncClient() as client:
        challenge_res = await client.post(f"{BASE}/api/v1/celo/wallet/challenge", json={
            "address": address,
            "action": "register"
        })
        assert challenge_res.status_code == 200, f"Challenge failed: {challenge_res.text}"
        nonce = challenge_res.json()["nonce"]

        auth_res = await client.post(f"{BASE}/api/v1/celo/wallet/auth", json={
            "address": address,
            "signature": "mock_signature_for_testing",
            "nonce": nonce,
            "role": role,
            "name": role.capitalize()
        })
        assert auth_res.status_code == 200, f"Auth failed: {auth_res.text}"
        tokens[role] = auth_res.json()["access_token"]
        print(f"[{role}] Registered & authenticated via wallet")


async def test_task_lifecycle():
    print("\n--- Test: Task Lifecycle ---")
    async with httpx.AsyncClient() as client:
        h = {"Authorization": f"Bearer {tokens['customer']}"}
        # Create
        r = await client.post(f"{BASE}/api/v1/tasks/", json={
            "category": "Cleaning",
            "description": "Deep clean my 2BR apartment",
            "budget": 15000,
            "neighbourhood": "Lekki Phase 1",
            "payment_mode": "demo",
        }, headers=h)
        assert r.status_code == 201, f"Create failed: {r.text}"
        task_id = r.json()["id"]
        print(f"  Created task {task_id}")

        # List
        r = await client.get(f"{BASE}/api/v1/tasks/?status=open", headers=h)
        assert r.status_code == 200
        print(f"  Listed {len(r.json())} open tasks")

        # Match (as hustler)
        h2 = {"Authorization": f"Bearer {tokens['hustler']}"}
        r = await client.post(f"{BASE}/api/v1/tasks/{task_id}/match", headers=h2)
        assert r.status_code == 200, f"Match failed: {r.text}"
        print(f"  Matched task")

        # Activate
        r = await client.post(f"{BASE}/api/v1/tasks/{task_id}/activate", headers=h2)
        assert r.status_code == 200, f"Activate failed: {r.text}"
        print(f"  Activated task")

        # Complete
        r = await client.post(f"{BASE}/api/v1/tasks/{task_id}/complete", headers=h2)
        assert r.status_code == 200, f"Complete failed: {r.text}"
        print(f"  Completed task")


async def test_hustler_profile():
    print("\n--- Test: Hustler Profile ---")
    async with httpx.AsyncClient() as client:
        h = {"Authorization": f"Bearer {tokens['hustler']}"}
        # Create profile
        r = await client.post(f"{BASE}/api/v1/users/hustler-profile", json={
            "service_areas": ["Lekki Phase 1", "Ajah"],
            "categories": ["Cleaning", "Repairs"],
        }, headers=h)
        if r.status_code == 201:
            print(f"  Created profile")
        else:
            print(f"  Profile already exists ({r.status_code})")

        # Get profile
        r = await client.get(f"{BASE}/api/v1/users/hustler-profile", headers=h)
        assert r.status_code == 200
        data = r.json()
        print(f"  Trust score: {data.get('trust_score')}")


async def test_escrow_and_payout():
    print("\n--- Test: Escrow & Payout ---")
    async with httpx.AsyncClient() as client:
        h = {"Authorization": f"Bearer {tokens['hustler']}"}

        # Demo sweep (mock escrow release)
        r = await client.post(f"{BASE}/api/v1/passport/demo/complete-job-sweep", json={
            "job_amount": 5000,
        }, headers=h)
        assert r.status_code == 200, f"Payout failed: {r.text}"
        data = r.json()
        print(f"  Gross: {data['breakdown']['gross_received']}")
        print(f"  Net:   {data['breakdown']['net_credited_to_wallet']}")

        # Transactions
        r = await client.get(f"{BASE}/api/v1/passport/transactions", headers=h)
        assert r.status_code == 200
        print(f"  Transactions: {len(r.json())}")

        # Proof Card
        r = await client.get(f"{BASE}/api/v1/passport/proof-card", headers=h)
        assert r.status_code == 200
        data = r.json()
        print(f"  Proof Card Verification Hash: {data['verification_hash']}")
        print(f"  Proof Card 90d verified income: {data['verified_income_90d']}")


async def run_all():
    print("=" * 50)
    print("AreaHustle Backend Integration Tests")
    print("=" * 50)

    # Auth
    await register_and_login("customer")
    await register_and_login("hustler")

    # Core flows
    await test_task_lifecycle()
    await test_hustler_profile()
    await test_escrow_and_payout()

    # AI stack (if keys present)
    if os.getenv("AETHEX_API_KEY") and os.getenv("AETHEX_NOTIFIER_AGENT_ID"):
        print("\n--- Test: Aethex Connection ---")
        await test_connect()
    else:
        print("\n--- Skipping Aethex (no keys) ---")

    if os.getenv("GEMINI_API_KEY"):
        print("\n--- Test: Gemini Intent Extraction ---")
        await test_intent_extraction()
    else:
        print("\n--- Skipping Gemini (no key) ---")

    print("\n" + "=" * 50)
    print("All backend tests completed!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(run_all())
