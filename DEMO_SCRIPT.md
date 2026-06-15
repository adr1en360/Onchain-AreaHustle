# AreaHustle: Demo Video Script & Walkthrough Playbook

This document outlines the end-to-end production script and visual walkthrough for the AreaHustle demo video. Designed for a **2-minute submission limit**, it focuses on highlighting the three pillars (Voice posting, AI Agent Outbound Calling, and the Financial Passport) with clear references to the underlying technical stack (Celo, Gemini, and Aethex).

---

## 1. Overview & Setup Checklist

### Video Properties
* **Target Duration:** 2 Minutes (120 seconds max).
* **Tone:** Professional, energetic, problem-solving, and premium.
* **Music:** Subtle, upbeat modern electronic/tech corporate background music (low volume).
* **Key Focus:** The "Wow Moment" — showing the transition from a spoken request to an automated phone call, booking, and final creditworthiness validation.

### Demo Environment Setup
Before hitting record, ensure the following is configured:
1. **Customer Account (Funmi):** Registered and logged in on a browser. Wallet connected with sufficient **Celo Sepolia USDC** and gas fee **CELO** tokens.
2. **Hustler Account (Emeka):** Seeded profile with 90 days of work history (47 completed jobs, 94% completion rate, ₦135,000 earnings, 820 Trust Score). Registered as an onchain agent.
3. **Outbound Call Device:** A phone ready to receive the simulated/real outbound call from Aethex.
4. **Window Layout:** Arrange browser windows side-by-side (Funmi's Customer Dashboard on the left, Emeka's Hustler Settings/Passport on the right) or use a clean transition.
5. **Seeded Data:** Ensure the database has 3-5 mock local providers in Yaba and Lekki Phase 1 to demonstrate rank matching.

---

## 2. Walkthrough Timeline (120 Seconds)

| Timestamp | Segment | Visual Action | Spoken Voiceover (Audio) | Technical Spotlight (Under the Hood) |
| :--- | :--- | :--- | :--- | :--- |
| **0:00 - 0:15** | **The Hook: The Invisibility Problem** | High-quality B-roll or screen recording of a local Nigerian market. Crop to show a generator tech working. Transition to show a blank bank statement. | *"Last week, a generator mechanic in Lekki earned ₦180,000. Yet, no bank in Nigeria will lend him ₦30,000. Why? Because in the informal economy, your hard work leaves no paper trail. You are financially invisible."* | **Problem Context:** 3 million gig workers and $5B informal economy in Nigeria locked out of credit. |
| **0:15 - 0:35** | **The Insight: AreaHustle** | Smooth transition to the **AreaHustle Landing Page**. Scrolling down to show "Powered by Celo" and the "Trust Score" preview cards. | *"We don't lend. We prove you're lendable. AreaHustle is a voice-first local gig marketplace that turns everyday jobs into structured, verified alternative credit data. Let's see how it works in real-time."* | **Value Prop:** Generates a **Verified Work Data Package** compatible with the Nigerian Credit Reporting Act of 2017. |
| **0:35 - 0:55** | **Pillar 1: Voice Task Posting** | Customer Dashboard. Funmi clicks **"Post a Task"**. Tap the purple **"Mic"** button. Waveform animates as she speaks. Intent card pops up. Funmi clicks **"Lock USDC Escrow on Celo"** (confirm MetaMask pop-up). | *"Funmi needs her generator serviced in Lekki. Instead of filling out complex forms, she taps once and speaks naturally: 'Service my generator in Lekki Phase 1 for eight thousand naira.' Aethex and Gemini instantly structure the task, and Funmi locks the escrow on-chain."* | **Tech Stack:** Browser audio capturing → **Aethex Speech-to-Text** → **Gemini Flash** structured Pydantic extraction → `TaskEscrow` smart contract on Celo. |
| **0:55 - 1:20** | **Pillar 2: AI Agent Call & Auto-Booking** | Show Emeka's phone. Phone rings. **AI Outbound Match Call** begins. Emeka answers and says *"Yes"*. Real-time transition to Customer Dashboard: Status updates instantly to **"Matched with Emeka"**. | *"The moment the job is published, the backend ranks nearby eligible technicians. Instead of a buried push notification, the AreaHustle AI Agent dials Emeka directly. He accepts via voice, and the agent auto-claims the job in the backend."* | **AI Matching:** Outbound calling via **Aethex Outbound Agent API**. Backend queue locks the task on database update to prevent race conditions. |
| **1:20 - 1:45** | **Pillar 3: The Financial Passport** | Transition to Emeka's screen. Open **Financial Passport Dashboard**. Show the Trust Dial (820/1000) rising, and recent payout ledger. Click **"Copy Public Link"** or display the **Creditworthiness Proof Card**. | *"Every completed job earns Emeka more than just income. It builds his Financial Passport. Here is Emeka's verified 90-day ledger: 94% completion rate, consistency indicators, and a high Trust Score. No bank built this profile — Emeka did, one job at a time."* | **Credit Engine:** Real-time composite scoring + **Consistency Index** (earnings variance math). **Onchain identity registry** links wallet histories on Celo. |
| **1:45 - 2:00** | **Close: The Vision** | Hover over the **Verification Hash** QR Code. Zoom out to show the AreaHustle logo and tagline: *"Your Area. Your Hustle. Your Proof."* | *"With a shareable Creditworthiness Proof Card and a cryptographically secured verification hash, Emeka can now share his verified history with any bureau or digital lender. Emeka doesn't have a pay stub. He has something better — a verified record of showing up. Join AreaHustle."* | **Security:** Anonymized CRC-aligned JSON data schema accessible via unique verification token. |

---

## 3. Detailed Audio Script & Directives

### Segment 1: Introduction (0:00 - 0:15)
* **Visual:** Close-up of hands typing on a laptop, then panning to an empty bank account statement screen. Slowly zoom in on a graphic of a phone with a lock icon over a wallet.
* **Speaker (Voiceover):** 
  > *"Meet Emeka. He's a skilled generator technician in Lagos, earning a steady income every week. But if Emeka needs a micro-loan to buy new tools, banks and digital lenders turn him down. Why? Because his transactions are in cash, leaving him financially invisible."*

### Segment 2: Introducing the Solution (0:15 - 0:35)
* **Visual:** Transition to a clean browser display of the AreaHustle Landing Page. Mouse hovers over the Celo logo, then scrolls down to the three-step flow.
* **Speaker (Voiceover):** 
  > *"AreaHustle changes the game. We don't lend. We prove you're lendable. By combining mobile-first Voice AI with secure on-chain settlement, we turn everyday gigs into a bankable financial passport on the Celo network."*

### Segment 3: Demo - Voice Posting & Escrow (0:35 - 0:55)
* **Visual:** Screen transitions to `/post-task`. Tap the Mic. A green/purple soundwave vibrates. The fields (Category: Generator Service, Budget: ₦8,000, Location: Lekki Phase 1) fill in automatically. Click "Lock USDC Escrow on Celo". The MetaMask wallet slide-out appears, registers the transaction, and closes.
* **Speaker (Voiceover):**
  > *"Posting a job is as simple as talking to a neighbor. Watch as the customer taps 'Speak' and says: 'I need someone to service my generator in Lekki Phase 1 for eight thousand naira.' Google Gemini Flash parses the intent instantly, and the customer locks the USDC escrow on-chain to secure the payment."*

### Segment 4: Demo - Voice Match & Booking (0:55 - 1:20)
* **Visual:** Cut to a split-screen. On the left is the customer dashboard showing "Matching...". On the right is a mobile phone ringing. The call is answered. Text-to-speech captions show what the AI says. Real-time update on the left window turns to "Matched: Emeka".
* **Speaker (Voiceover):**
  > *"Immediately, the system ranks nearby matches. Instead of a buried push notification, the AreaHustle AI Agent dials Emeka directly. He accepts with a simple 'Yes' on the phone. The agent instantly locks the booking on-chain, protecting the gig from being claimed by anyone else."*

### Segment 5: Demo - Financial Passport & Credit Card (1:20 - 1:45)
* **Visual:** Screen shifts to the Hustler's `/passport` page. The circular Trust Score dial animates up to `820`. The cursor hovers over the 90-day earnings summary and then clicks "Copy Public Link". The "Shareable Proof Card" pops up showing the details, QR code, and `ah_v2_abc123...` verification hash.
* **Speaker (Voiceover):**
  > *"Once the job is completed, the payment is released from escrow, and Emeka's Financial Passport is updated. The dashboard displays his verified income history and consistency index. With one click, Emeka generates his Creditworthiness Proof Card — a structured data package aligned with Nigerian Credit Reporting standards."*

### Segment 6: Closing & Call to Action (1:45 - 2:00)
* **Visual:** Zoom in on the QR code and Verification Hash. Transition to a clean outro slide with the AreaHustle logo, tagline, and GitHub repository links.
* **Speaker (Voiceover):**
  > *"Lenders can instantly verify this data package via our secure consent API. Emeka doesn't have a corporate payslip. He has something better — a cryptographically verified record of showing up. AreaHustle: Your Area. Your Hustle. Your Proof."*

---

## 4. Video Recording & Editing Production Cues

### Capture Best Practices
1. **Resolution:** Record in 1080p or 4K at 60fps to ensure text and numbers are perfectly legible.
2. **Cursor Visibility:** Use a screen recorder that highlights clicks or adds a subtle ripple effect to guide the viewer's eyes.
3. **Pacing:** Speed up MetaMask transaction loading states and blockchain confirmations in post-production by 200% to keep the pacing snappy.

### Editing Elements
* **Zooms:** Zoom in on the Gemini-structured fields (`Category`, `Budget`, `Location`) and the Trust Score dial when they populate.
* **Blur Backgrounds:** Slightly blur surrounding UI components during the phone call segment to draw the viewer's eyes to the phone mockup.
* **Subtitles:** Add stylized, clean captions for the spoken voiceover to make the video engaging even on silent feeds (e.g., Twitter/X).

---

## 5. Lender Verification API Walkthrough (Developer Reference)

To prove technical competence in the demo or pitch slides, show how lenders query the verification hash. 

### Request
```http
GET /api/v1/passport/verify?token=ah_v2_abc123def456
Authorization: Bearer <Lender_API_Key>
```

### Response (CRC-Aligned Alternative Data Package)
```json
{
  "status": "verified",
  "data": {
    "hustler_id": "anonymised_hustler_829",
    "kyc_tier": 2,
    "platform_tenure_months": 8,
    "verified_income_90d_ngn": 135000.0,
    "income_consistency_index": 0.82,
    "total_jobs_completed": 47,
    "completion_rate": 0.94,
    "repeat_hire_ratio": 0.66,
    "dispute_rate": 0.02,
    "verification_hash": "ah_v2_abc123def456"
  }
}
```
