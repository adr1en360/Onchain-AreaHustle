# AreaHustle — Technical Product Requirements Document (Superseded/Updated)

> [!IMPORTANT]
> **Status:** Updated to reflect the v2.0 creditworthiness proof pivot and the matching queue booking workflow.
> The primary, fully-detailed product requirements document is located at [PRD_V2.md](file:///c:/Users/DELL/Documents/AreaHustle/prd_v2/PRD_V2.md). This document serves as the high-level technical architecture and implementation specification for the developers.

---

## 1. Technical Stack

| Layer | Technology | Justification / Role |
|:---|:---|:---|
| **Frontend** | Vite + React + TanStack Router | Fast, modern, file-based routing and interactive UI components. |
| **Backend** | FastAPI (Python 3.12+) | Async, performance-focused, rapid development, native support for AI/ML tasks. |
| **Package Manager** | `uv` | Rapid Python dependency resolution and virtual environment management. |
| **Database** | MongoDB (Motor Driver) | Single database architecture, flexible schemas for rapid hackathon iteration. |
| **Voice AI** | Aethex API | Premium outbound calling queue and STT/TTS matching. |
| **Intent Extraction** | Google Gemini Flash | Extraction of structured JSON (Category, Neighbourhood, Budget, Description) from transcripts. |

---

## 2. Core Features & Architecture (3 Pillars)

### 2.1 Pillar 1: Voice-to-Intent Task Posting
* **Purpose:** Allows customers to post tasks via natural speech.
* **Backend Endpoint:** `POST /api/v1/tasks/voice-extract`
* **Flow:**
  1. Capture audio in browser or via voice terminal.
  2. Send transcript to backend; backend extracts parameters via Gemini Flash.
  3. Returns: `{ "category": ..., "neighbourhood": ..., "budget": ..., "description": ... }`.
  4. UI displays structured card. Customer confirms to publish task and locks escrow (mocked).

### 2.2 Pillar 2: AI Agent Notifications & Agent Auto-Booking
* **Purpose:** Proactively calls matched hustlers via outbound voice call (premium) to offer gigs and book them immediately on their behalf to prevent other hustlers in the queue from taking it.
* **Backend Endpoint:** `POST /api/v1/tasks/notify-hustlers/{task_id}` & `POST /api/v1/tasks/call-hustler`
* **Flow:**
  1. Rank eligible hustlers in the task's neighbourhood.
  2. Initiate premium outbound call to Hustler #1 via Aethex.
  3. If Hustler answers and accepts via voice ("Yes") → The AI Agent instantly registers the match in the backend, booking the job on their behalf to lock it and prevent the next hustler in queue from claiming it.
  4. If declined or no answer within **2 minutes** → place call to Hustler #2 (max 5 attempts).

### 2.3 Pillar 3: Financial Passport & Creditworthiness Proof Card
* **Purpose:** Turns verified work history into structured, bureau-ready underwriting data.
* **Backend Endpoint:** `GET /api/v1/passport/me` and `GET /api/v1/passport/proof-card`
* **Features:**
  * **Visual Dashboard:** Hustlers view their verified earnings (30d/60d/90d), consistency index, completion rate, and platform metrics.
  * **Proof Card:** A shareable UI component/data card with a unique verification hash. Can be screenshotted and shared directly with lenders via WhatsApp.

---

## 3. Data Models (MongoDB Schema)

### 3.1 User
* `_id` (ObjectId)
* `email` (String, Unique)
* `hashed_password` (String)
* `role` (String: "customer" | "hustler")
* `name` (String)
* `kyc_tier` (Int: 1 | 2 | 3)
* `kyc_status` (String: "unverified" | "pending" | "verified")
* `wallet_balance` (Float)
* `language_preference` (String: "english" | "french" | "arabic")
* `created_at` (Datetime)

### 3.2 Hustler Profile
* `_id` (ObjectId)
* `user_id` (ObjectId, Ref: User)
* `completed_jobs` (Int)
* `completion_rate` (Float)
* `repeat_hire_ratio` (Float)
* `dispute_rate` (Float)
* `avg_response_time` (Float)
* `income_30d` (Float)
* `income_60d` (Float)
* `income_90d` (Float)
* `income_consistency_index` (Float, variance-derived index)
* `platform_tenure_months` (Int)
* `service_areas` (List of Strings, e.g., `["Lekki Phase 1", "Ajah"]`)
* `categories` (List of Strings, e.g., `["Generator Service", "Car Wash"]`)

### 3.3 Task
* `_id` (ObjectId)
* `customer_id` (ObjectId, Ref: User)
* `category` (String)
* `neighbourhood` (String)
* `budget` (Float)
* `description` (String)
* `status` (String: "open" | "matching" | "matched" | "active" | "completed" | "disputed")
* `matched_hustler_id` (ObjectId, Optional)
* `match_attempts` (Int)
* `voice_transcript` (String, Optional)
* `created_at` (Datetime)
* `completed_at` (Datetime, Optional)

### 3.4 Transaction (Immutable Ledger)
* `_id` (ObjectId)
* `user_id` (ObjectId, Ref: User)
* `task_id` (ObjectId, Ref: Task)
* `type` (String: "escrow_hold" | "payout" | "commission")
* `amount` (Float)
* `timestamp` (Datetime)

### 3.5 Consent Token
* `_id` (ObjectId)
* `hustler_id` (ObjectId, Ref: User)
* `institution_id` (String, Optional)
* `scopes` (List of Strings, e.g., `["income_90d", "completion_rate"]`)
* `expires_at` (Datetime)
* `status` (String: "active" | "revoked" | "expired")

---

## 4. API Specification

Key routes required for the hackathon sprint:
- `POST /api/v1/auth/register` — Register User
- `POST /api/v1/auth/login` — Login User
- `POST /api/v1/users/hustler-profile` — Create / Update Hustler Profile
- `POST /api/v1/tasks/` — Post Task
- `POST /api/v1/tasks/voice-extract` — Audio / transcript intent extraction
- `POST /api/v1/tasks/{id}/match` — Hustler manual or voice acceptance
- `POST /api/v1/tasks/{id}/complete` — Complete task & release escrow
- `POST /api/v1/tasks/{id}/confirm` — Customer confirms job and releases payment to hustler
- `POST /api/v1/tasks/notify-hustlers/{task_id}` — Trigger Outbound Voice Matching Queue
- `POST /api/v1/tasks/call-hustler` — Outbound AI agent call generator
- `GET /api/v1/passport/me` — Retrieve Financial Passport metrics
- `GET /api/v1/passport/proof-card` — Get Verification Hash & Proof Card data
