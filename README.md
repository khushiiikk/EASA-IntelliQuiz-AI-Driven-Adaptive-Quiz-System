# EASA Flight Dispatcher: AI-Driven Adaptive Quiz System

## Overview
This platform is a Next.js (App Router) based adaptive learning system designed to evaluate and scale the difficulty of EASA Flight Dispatcher concepts in real-time. Driven by an LLM-powered backend, the system tests students on Aviation Navigation and Meteorology, providing instantaneous performance feedback and adaptive scenario generation.

## System Architecture

### Frontend (Client-Side)
- **Framework:** Next.js 14 utilizing React Server Components and Client Components optimally.
- **UI/UX Stack:** Tailwind CSS for a premium "Aviation/Tech" aesthetic. Framer Motion for cognitive-load-reducing micro-animations (e.g., fluid feedback rendering, level-up transitions).
- **State Architecture:** React state managing user session scope (Level 1-10 tracking, correctness streaks, and history arrays) completely securely without requiring a full database for the MVP.

### Backend & AI Engine (Server-Side)
- **Framework:** Next.js Route Handlers (`/api/quiz`).
- **Data Flow:** The client requests a new question by submitting the user's `currentLevel` (1-10) and `history_context` (last 3 questions answered).
- **Security:** The LLM API key (`GROQ_API_KEY`) is kept entirely server-side, a standard requirement for production ML application security.
- **Prompt Engineering:** utilizes the Vercel AI SDK to force the LLM into returning a perfectly validated JSON structure containing the `question`, `options`, `correctAnswer`, `explanation`, and `topic`.

## Key Features

### 1. EASA Adaptive Evaluation Engine
* **Dynamic Scenarios:** Generates unique questions on navigation and meteorology based on EASA protocols.
* **Proficiency Levels:** Implements 10 distinct levels, scaling from basic definitions to multi-variable situational judgment.
* **Intelligent Feedback:** Provides real-time evaluations and pedagogical explanations for every answer.

### 2. ARIA (Adaptive Real-time Instructor for Aviators)
* **Streaming AI Tutor:** A dedicated chatbot assistant to help users understand complex aviation concepts.
* **Conceptual Guidance:** Programmed to explain principles (e.g., pressure altitude, QNH/QFE) without directly revealing quiz answers.

### 3. User Intelligence Profile
* **Persistent History:** Utilizes local storage to track past evaluation performance across sessions.
* **Deviation Analysis:** Automatically identifies and stores specific mistakes, enabling focused remedial study.
* **XP Scoring System:** Awards XP based on level difficulty and response accuracy.

---

## AI & ML Evaluation Rationale

### Model Selection (Groq Llama 3.1 8B Instant)
Based on real-time generation requirements and the need for strict JSON structured outputs, **Groq's Llama 3.1 8B** model was chosen for this architecture.

*   **Speed:** Educational loops require immediate feedback. Groq generates complex JSON schemas almost instantaneously.
*   **Reasoning:** Capable of handling aviation navigation/meteorology rule applications effectively.
*   **Cost Factor:** Generating adaptive questions per-user session can scale costs aggressively. Groq's open-source model hosting offers an incredibly fast and cost-effective solution for scalable consumer-facing education tools.

### Adaptive Scaling Logic & Hallucination Mitigation
The difficulty scales dynamically not via pre-written databases, but via prompt reinforcement:
1. **Level Definition:** Level 1-3 prompts for generic EASA definitions. Level 4-7 requests mathematical or rule-based applications. Level 8-10 requests multi-variable situational judgment scenarios.
2. **Context Injection:** Recent history is injected into the context window to ensure concept variety.
3. **Structured Output:** Pydantic-like Zod schemas force the LLM to adhere to a strict JSON format, mitigating format hallucinations and ensuring UI stability.

---

## How to Run Locally

### Requirements
1. Node.js > 18.0
2. Groq API Key (Available free via [Groq Console](https://console.groq.com/))

### Setup Instructions

1.  Clone or download this repository.
2.  Open the terminal and run:
    ```bash
    npm install
    ```
3.  Open the `.env.local` file and paste your Groq API key:
    ```bash
    GROQ_API_KEY="your-key-here"
    ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Navigate to `http://localhost:3000`.

## Final Deliverables
- [x] 10 Adaptive Proficiency Levels
- [x] EASA Navigation & Meteorology logic integration
- [x] Real-time Streaming AI Tutor (ARIA)
- [x] User History & Mistake tracking (Local Persistence)
- [x] Premium "Aviation-Tech" Aesthetic with Framer Motion
- [x] Secure Server-side API Key Management

