# AreaHustle

**"Your Area. Your Hustle. Your Proof."**

AreaHustle is a voice-first hyper-local gig marketplace that turns everyday work into bankable creditworthiness proof. It leverages **Voice-first AI** to bridge the digital literacy gap, allowing middle-class households and small businesses to post tasks, and informal workers (Hustlers) to build a verified financial identity that unlocks credit access.

---

## 🚀 Key Features (The Three Pillars)

- **🎙️ Pillar 1: Voice-to-Intent Task Posting:** Post jobs like "Car Wash" or "Generator Repair" just by speaking. Powered by **Aethex Speech-to-Text** and **Google Gemini Flash** for structured JSON intent extraction.
- **📞 Pillar 2: AI Agent Outbound Calling & Auto-Booking:** Matched premium providers receive direct voice calls from an Aethex Outbound AI Agent to accept gigs. Upon acceptance, the agent immediately claims and books the job on their behalf to prevent others in the queue from taking it.
- **💳 Pillar 3: Financial Passport & Creditworthiness Proof Card:** Hustlers track their standings via a premium visual dashboard and generate a shareable, cryptographically hashed alternative data card aligned with the **Nigerian Credit Reporting Act of 2017**.

---

## 🛠️ Tech Stack

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Package Manager:** [uv](https://github.com/astral-sh/uv)
- **Database:** [MongoDB](https://www.mongodb.com/) (Async with Motor Driver)
- **Voice AI Platform:** [Aethex API](https://developers.aethexai.com/)
- **Large Language Model:** [Google Gemini Flash](https://ai.google.dev/)
- **On-chain (Celo Sepolia):** NGNm escrow via `TaskEscrow`, optional wallet sign-up via `AreaHustleRegistry`, wagmi + viem frontend

---

## ⛓️ Celo On-Chain Payments

Contracts are deployed on **Celo Sepolia** (chain `11142220`):

| Contract | Address |
|----------|---------|
| AreaHustleRegistry | `0x2eF4B39664eC55E813bB90703D875a0402C82986` |
| TaskEscrow | `0x7E715F08bA9094475Fa66D3761b42d91b81689C2` |
| NGNm token | `0x3d5ae86F34E2a82771496D140daFAEf3789dF888` |

**Redeploy:** set `PRIVATE_KEY` in root `.env`, then `npm run deploy:sepolia && npm run sync:env`

**User flow:** Connect Celo wallet → Link → Post task (NGNm escrow auto-locks) → Hustler accepts → Assign on-chain → Mark done → Release payment.

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

Built for the **YPIT (Young People in Tech) Hackathon 2026**.
