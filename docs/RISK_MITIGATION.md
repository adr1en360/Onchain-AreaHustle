# AreaHustle: Risk Assessment & Mitigation Strategy
**Onchain Hackathon Celo | Technical & Business Resilience Plan**

As we build for the Nigerian informal economy under a voice-first model, we recognize four critical risks that could impact the scale and sustainability of AreaHustle. Below are our documented mitigations based on current industry standards and technical workarounds.

---

## 1. The Network Risk (Technical Latency)
**Risk:** Poor 4G/3G network performance in dense urban corridors in Lagos leading to high latency in WebRTC voice interactions, causing user abandonment.

### 🛡️ Mitigation Strategy
- **Adaptive Bitrate Streaming:** Configure Aethex/WebRTC media constraints to prioritize voice over bandwidth, using Opus Narrowband (6-12 kbps) which remains highly audible and responsive even on congested towers.
- **Asynchronous Audio Capture:** For task posting (Voice-to-Intent), the app uses a standard "Record-then-Upload" flow via the browser's `MediaRecorder` API rather than streaming raw audio live. The user sees a visual upload progress bar, and extraction happens on the completed file.
- **Local TURN Servers:** Ensure our signaling and media streams route through low-latency servers nearest to West Africa to keep round-trip times (RTT) under 150ms.

---

## 2. The Language & Accent Risk (AI Accuracy)
**Risk:** Native STT engines may fail to accurately transcribe local West African accents, Nigerian English, or multi-lingual code-switching (e.g. English mixed with Yoruba or Pidgin), causing Gemini to extract incorrect task entities.

### 🛡️ Mitigation Strategy
- **Accent-Heavy Prompt Priming:** The Aethex STT transcription model is primed with a comprehensive local lexicon, including common Lagos landmarks (e.g. Lekki, Ajah, GRA, Yaba), local currency markers, and service terms (e.g., "vulcanizer," "rewire," "generator servicing").
- **Gemini Post-Extraction Correction:** Instead of using raw STT output, the transcript is processed by **Google Gemini Flash**. The prompt dictates a rigorous entity-extraction pattern designed to recognize phonetic spelling anomalies and map them back to clean system slugs.
- **Explicit UI Confirmation:** The customer is never booked immediately. The frontend displays the extracted intent as a simple, editable draft card where the user can manually adjust the category or neighborhood before confirming.

---

## 3. The Lender Adoption Risk ("Data Nobody Bought")
**Risk:** The Creditworthiness Proof Card and Verified Work Data Package might not be trusted or utilized by local financial institutions and microfinance banks (MFBs), rendering the financial passport useless.

### 🛡️ Mitigation Strategy
- **CRC Credit Bureau Alignment:** The data model structure (income velocity, income consistency index, dispute rates) is mapped specifically to alternative credit variables recognized under the **Nigerian Credit Reporting Act of 2017**.
- **Cryptographic Hash Verification:** Every proof card has a unique, tamper-proof `verification_hash`. Lenders can verify the card's legitimacy via our secure portal, reducing fraud risk to zero.
- **B2B Consent-First APIs:** Rather than just screenshots, we support a secure, time-limited OAuth-style consent handshake (Consent Tokens) enabling lenders to fetch the JSON payload directly into their proprietary underwriting engines.

---

## 4. The Disintermediation Risk (Transacting Off-Platform)
**Risk:** Once a customer finds a reliable generator mechanic, they may save their WhatsApp number and bypass AreaHustle for future jobs, preventing us from gathering continuous income velocity data.

### 🛡️ Mitigation Strategy
- **The Financial Passport Incentive:** The Hustler's creditworthiness proof only updates with transactions processed through AreaHustle's escrow ledger. Off-platform jobs are invisible. If a mechanic wants to maintain high earnings credit velocity to secure a loan, they must insist on transacting on-platform.
- **Zero-Commission Tier for Hustlers:** We charge the transaction fee (3-5%) to the task poster (customer) or wave it entirely for high-performing, verified hustlers to remove any financial friction that would encourage taking the transaction offline.
