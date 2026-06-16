# AreaHustle

**"Your Area. Your Hustle. Your Proof."**

AreaHustle is a voice-first hyper-local gig marketplace that turns everyday informal work into bankable onchain creditworthiness proof. Built for the **Celo Onchain Agents Hackathon: Build for Real World Payments & Everyday Applications**, AreaHustle bridges the digital and financial literacy gap using **Voice-first AI Agents** and the **Celo Blockchain** to power secure micropayments, trustless escrows, and accessible credit profiling for small businesses and informal workers (Hustlers) in emerging markets.

---

## 🚀 Key Features (The Three Pillars)

- **🎙️ Pillar 1: Voice-to-Intent Task Posting:** Post jobs like "Car Wash" or "Generator Repair" just by speaking. Powered by **Aethex Speech-to-Text** and **Google Gemini Flash** for structured JSON intent extraction.
- **📞 Pillar 2: AI Agent Outbound Calling & Onchain Auto-Booking:** Matched premium providers receive direct voice calls from an Aethex Outbound AI Agent to accept gigs. Upon voice acceptance, the autonomous agent acts on their behalf to claim the job and lock in the escrowed payment on Celo, preventing others from taking the slot.
- **💳 Pillar 3: Onchain Financial Passport & Creditworthiness Proof Card:** Hustlers track their standings via a premium visual dashboard and generate a shareable, cryptographically hashed alternative data card aligned with the **Nigerian Credit Reporting Act of 2017**, backed by verified onchain transaction histories.

---

## 🛠️ Tech Stack

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Package Manager:** [uv](https://github.com/astral-sh/uv)
- **Database:** [MongoDB](https://www.mongodb.com/) (Async with Motor Driver)
- **Voice AI Platform:** [Aethex API](https://developers.aethexai.com/)
- **Large Language Model:** [Google Gemini Flash](https://ai.google.dev/)
- **On-chain (Celo Sepolia):** USDC escrow via `TaskEscrow`, optional wallet sign-up via `AreaHustleRegistry`, wagmi + viem frontend

---

## ⛓️ Celo Onchain Payments & Stablecoin Swaps

AreaHustle leverages Celo's mobile-first, low-cost network to handle micro-gigs and credit identity mapping. Contracts are deployed on **Celo Sepolia** (chain `11142220`):

| Contract | Address |
|----------|---------|
| AreaHustleRegistry | `0x3924d078753C0e007697b8b487bbdD17Aa6fb580` |
| TaskEscrow | `0x61D4fd78A858D0A74397fAe8F89b0bb7A2576e65` |
| USDC token | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |

**User Flow:** Connect Celo Wallet → Post task (USDC escrow auto-locks) → Hustler accepts via AI Outbound Voice Agent → Gig booked & assigned onchain → Task marked complete → Payment released in USDC.


---

## 🚦 Getting Started

### Prerequisites

- [Python 3.12+](https://www.python.org/)
- [uv](https://github.com/astral-sh/uv) installed
- [MongoDB](https://www.mongodb.com/try/download/community) (Local or Atlas)
- [Node.js & npm](https://nodejs.org/) (for Frontend)

### Backend Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adr1en360/AreaHustle.git
   cd areahustle
   ```

2. **Initialize and sync the virtual environment:**
   ```bash
   cd backend
   uv venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   uv sync
   ```

3. **Configure Environment Variables:**
   Create a `backend/.env` file:
   ```env
   MONGODB_URL="mongodb://localhost:27017"
   AETHEX_API_KEY="your_aethex_key"
   GEMINI_API_KEY="your_gemini_key"
   ```

4. **Start the API server:**
   ```bash
   uv run uvicorn main:app --reload
   ```
   *The API will be available at `http://127.0.0.1:8000`. Documentation at `/docs`.*

### Frontend Installation & Setup

1. **Initialize and run Vite app:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *The dev server will run at `http://localhost:5173`.*

---

## 📖 API Usage Highlights

### Post Task via Voice Intent Extraction
`POST /api/v1/tasks/voice-extract`
- Transcribes customer audio and extracts structured task fields via Gemini Flash.

### Trigger AI Outbound Matching
`POST /api/v1/tasks/notify-hustlers/{task_id}`
- Starts the voice queue matching workflow.

### Outbound call trigger & booking handler
`POST /api/v1/tasks/call-hustler`
- Triggers a premium voice call to offer the task and book it on behalf of the hustler upon acceptance.

### Generate Creditworthiness Proof Card
`GET /api/v1/passport/proof-card`
- Computes verified 90-day earnings velocity, consistency index, and returns a secure verification hash.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Built for **Onchain Hackathon Celo**.
