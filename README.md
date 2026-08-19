# WAYFARER AI — Adaptive Journey Intelligence

> **HackCelestial 3.0 Prototype**  
> **Theme:** Hospitality & Travel  
> **Primary Focus:** Accessible & Inclusive Travel + Travel Safety & Convenience  
> **Supporting Focus:** Smart Travel & Personalization  

---

## 🌟 Core USP

> **“WAYFARER doesn't just plan your trip — it continuously decides whether your journey is still the right one, and tells you why.”**

---

## 🎯 What Problem Does WAYFARER Solve?

Travelers make plans before they travel, but the journey unfolds in a changing environment. Different travelers have different mobility, safety, and sensory needs, and the best plan often changes while the trip is underway. 

WAYFARER AI is an **Adaptive Journey Orchestrator**:
1. It starts with **Complete Journey Understanding** (extracting traveler mobility constraints, factor weights, and multi-day stops from natural language).
2. It evaluates every segment using **Transparent Multi-Factor Scoring** ($w_{\text{Safety}} \cdot \text{Safety} + w_{\text{Access}} \cdot \text{Access} + w_{\text{Crowd}} \cdot \text{Crowd} + w_{\text{Convenience}} \cdot \text{Convenience}$).
3. It maintains a **Live Journey State** during active travel.
4. When real-world disruptions occur (e.g. elevator failure, crowd surge, route deviation), it **re-evaluates affected segments, checks downstream cascading impact, re-optimizes the itinerary, and explains why the change happened in natural language**.

---

## 🏗️ System Architecture

```
                    USER NATURAL LANGUAGE INPUT
             ("I'm traveling from Pune to Goa for 3 days...")
                                │
                                ▼
                   AI JOURNEY UNDERSTANDING
               (Gemini API + Deterministic Fallback)
                                │
                                ▼
                     STRUCTURED JOURNEY JSON
            (Trip + Traveler Constraints + Chronological Stops)
                                │
                                ▼
                      JOURNEY REVIEW SCREEN
                  (User Confirms / Edits Trip)
                                │
                                ▼
                     JOURNEY SEGMENTATION
                  (S1, S2, S3 Fort Aguada, S4, S5, S6, S7)
                                │
                                ▼
                  CANDIDATE ROUTE GENERATION
                (Route A: Fast, Route B: Accessible,
                 Route C: Low-Crowd Plateau Bypass)
                                │
                                ▼
                PERSONALIZED MULTI-FACTOR SCORING
                     (Weights derived from profile)
                                │
                                ▼
                     ACTIVE JOURNEY DASHBOARD
   ┌─────────────────────────────────────────────────────────────┐
   │ Interactive Map (Leaflet) + Live Route Transitions          │
   │ Journey Score Gauge (90/100 EXCELLENT FIT)                  │
   │ Transparent Route Comparison Matrix (A vs B vs C)           │
   │ Chronological Timeline with Live ETA Updates                │
   │ Traveler Profile Badges (♿ 🚫 🟡 🔴 🟢)                     │
   └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
                     LIVE SIMULATED EVENT
         [⚡ Elevator Fails] [👥 Crowd Spikes] [📍 Traveler Deviates]
                                │
                                ▼
                     SEGMENT RE-EVALUATION
            (Route B Access: 96 → 38, Score: 91 → 68)
                                │
                                ▼
                     DOWNSTREAM CASCADE CHECK
          (Checks ETA ripple effects & operating hour conflicts)
                                │
                                ▼
                     JOURNEY RE-OPTIMIZATION
                 (Route C recommended at Score: 88)
                                │
                                ▼
                     EXPLAINABLE AI REASONING
            ("Route C is now recommended because Route B
              lost accessibility after an elevator failure")
```

---

## 📐 Mathematical Formulation: Personalized Scoring Engine

For any candidate route $r$, the **Segment Journey Score** is calculated as:

$$\text{Segment Score}(r) = \text{round}\Big( w_{\text{Safety}} \cdot \text{Safety}(r) + w_{\text{Accessibility}} \cdot \text{Accessibility}(r) + w_{\text{Crowd}} \cdot \text{Crowd}(r) + w_{\text{Convenience}} \cdot \text{Convenience}(r) \Big)$$

Where weights are derived from the traveler profile and strictly normalize to $1.0$:

$$\sum_{i} w_i = 1.00$$

### Canonical Wheelchair Solo Traveler Archetype (Aditi):
- $w_{\text{Accessibility}} = 0.40$ (Elevated for wheelchair mobility & step-free requirements)
- $w_{\text{Safety}} = 0.30$ (Elevated for solo travel & high safety priority)
- $w_{\text{Crowd}} = 0.20$ (Low crowd tolerance preference)
- $w_{\text{Convenience}} = 0.10$ (Traveler accepts longer routes for higher accessibility)

### Segment S3 (Panjim $\to$ Fort Aguada) Baseline Calculation:
- **Route A (Fastest)**: Safety 82, Access 45, Crowd 61, Conv 92 $\to \mathbf{64}$
- **Route B (Most Accessible - Elevator Deck)**: Safety 90, Access 96, Crowd 85, Conv 86 $\to \mathbf{91}$ ★ (Recommended)
- **Route C (Lower Crowd - Plateau Ramp Bypass)**: Safety 88, Access 91, Crowd 85, Conv 82 $\to \mathbf{88}$

### Segment S3 Post-Disruption (Elevator Failure on Route B):
- **Route B Accessibility**: Degraded $96 \to 38$
- **Route B Score**: $(0.30 \times 90) + (0.40 \times 38) + (0.20 \times 85) + (0.10 \times 86) = 27.0 + 15.2 + 17.0 + 8.6 = \mathbf{68}$
- **Route C Score**: $\mathbf{88}$ $\to$ **★ NEW RECOMMENDATION**

---

## ⚡ Quick Start & Run Commands

### Prerequisites
- Node.js (v18+ recommended, tested on Node v24.15)
- npm (v9+)

### Installation
```bash
# Clone or navigate to the project directory
cd wayfarer

# Install all dependencies (root, server, and client)
npm run install:all
```

### Environment Configuration (Optional)
```bash
# Copy .env.example to .env
cp .env.example .env

# Optional: Add your Google Gemini API Key
# If left empty, WAYFARER operates seamlessly with 100% offline fallback resilience!
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run the Application
```bash
# Option 1: Unified production server (serves API and UI on http://localhost:5000)
npm start

# Option 2: Full development mode with hot reload
npm run dev
# Backend on http://localhost:5000 | Frontend Vite on http://localhost:3000
```

### Run Automated Unit & Integration Tests
```bash
# Run all unit tests (10 passing tests across 4 suites)
npm test

# Run end-to-end integration test
node tests/integration.js
```

---

## 🎭 3-Minute Hackathon Demo Presentation Guide

| Time | Stage | Action & Speaker Cue |
| :--- | :--- | :--- |
| **0:00–0:30** | **Trip Understanding** | Select *"♿ Pune to Goa (Wheelchair Solo)"* preset $\to$ Click **UNDERSTAND JOURNEY**.<br/>🗣️ *"WAYFARER doesn't start with a single route. It starts by understanding the complete journey and extracting traveler-specific priorities."* |
| **0:30–0:55** | **Optimized Journey** | Review Day 1, 2, 3 breakdown $\to$ Show 90/100 Journey Score $\to$ Click **CONFIRM JOURNEY**.<br/>🗣️ *"It evaluates every segment based on what matters to this traveler using deterministic, transparent multi-factor scoring."* |
| **0:55–1:30** | **Hero Event: Elevator Failure** | Select Segment S3 $\to$ Click **[Elevator Fails]**.<br/>• Route B Access drops $96 \to 38$<br/>• Route B Score drops $91 \to 68$<br/>• Route C promoted to 88 (★ RECOMMENDED NOW)<br/>• Leaflet map switches highlight to Route C<br/>• Downstream engine confirms no conflict with Beach buffer.<br/>🗣️ *"WAYFARER re-evaluates the segment, checks downstream cascade effects, and explains why Route C is now recommended."* |
| **1:30–2:00** | **Crowd Surge & Timing Shift** | Click **[Crowd Spikes]**.<br/>• Market crowd suitability drops<br/>• Downstream engine shifts Market schedule from 17:30 to 18:15 (+45m shift).<br/>🗣️ *"It doesn't just reroute. It checks downstream feasibility and shifts timing to preserve an accessible experience."* |
| **2:00–2:30** | **Safety Deviation Verification** | Click **[Traveler Deviates]**.<br/>• Shows "Are You Okay?" prompt with "I'm Fine" verification.<br/>🗣️ *"WAYFARER verifies before escalating, protecting traveler autonomy."* |
| **2:30–3:00** | **Closing Punchline** | Click **[Reset Journey]**.<br/>🗣️ *"Traditional travel tools plan a trip. WAYFARER continuously manages the journey as reality changes."* |

---

## 🛡️ Technical Honesty & Offline Resilience

- **🟢 AI Live vs 🟡 Demo Fallback**: Honest status indicator in the top navbar. When the Gemini API is connected, live models parse prompts and generate natural language reasoning. If offline or without an API key, deterministic fallback parsers and template reasoning engage automatically with transparent labeling.
- **Simulated External Events**: Event triggers are clearly labeled `SIMULATED EXTERNAL EVENT` to demonstrate the continuous orchestration architecture without falsely claiming live municipal sensor feeds or emergency dispatch.

---

## 🏆 HackCelestial 3.0 Alignment Summary

- **Accessible & Inclusive Travel**: Native modeling of wheelchair ramps, step-free pathways, tactile paving, and elevator dependencies.
- **Travel Safety & Convenience**: Transparent safety factor weighting, route deviation verification, and emergency contact telemetry simulation.
- **Smart Travel & Personalization**: End-to-end journey understanding, dynamic multi-factor ranking, and explainable AI adaptations.
