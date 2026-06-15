# AreaHustle Backend

FastAPI backend orchestrator for the AreaHustle hyper-local gig marketplace. It serves as the gateway connecting Voice AI Agents, LLMs, and the Celo blockchain.

## Tech Stack & Integrations

- **Framework:** FastAPI
- **Database:** MongoDB (via Motor async driver)
- **Auth:** JWT + bcrypt (OAuth2PasswordBearer)
- **Voice AI:** Aethex (WebRTC voice platform & Outbound Calling)
- **LLM/NLU:** Google Gemini Flash (voice-to-intent structured JSON extraction)
- **On-chain Integration:** Celo Sepolia (TaskEscrow interactions, USDC stablecoin flows, and wallet registry lookup)
- **Package Manager:** `uv` (recommended) or `pip`

## Setup

### 1. Install dependencies

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -r requirements.txt
```

### 2. Environment variables

Create a `.env` file:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=areahustle
AETHEX_API_KEY=your_aethex_key
AETHEX_PASSPORT_AGENT_ID=your_agent_id
GEMINI_API_KEY=your_gemini_key

# Celo Integration Configuration
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
CELO_CHAIN_ID=11142220
CELO_REGISTRY_ADDRESS=0x3924d078753C0e007697b8b487bbdD17Aa6fb580
CELO_ESCROW_ADDRESS=0x61D4fd78A858D0A74397fAe8F89b0bb7A2576e65
CELO_PAYMENT_TOKEN=0x01C5C0122039549AD1493B8220cABEdD739BC44E
```

### 3. Run the server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Overview

| Prefix             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `/api/v1/auth`     | Register, login, JWT tokens                                 |
| `/api/v1/tasks`    | Post tasks, match, activate, complete, voice-to-intent      |
| `/api/v1/users`    | Hustler profiles, nearby hustlers                           |
| `/api/v1/passport` | Financial passport, voice session, demo sweep, transactions |
| `/api/v1/loans`    | Active loans, transaction history                           |

## Quick Test

```bash
python test_all.py
```
