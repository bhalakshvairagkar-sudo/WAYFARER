# WAYFARER AI — Adaptive Journey Intelligence for Dynamic, Inclusive Travel

> **Adaptive Journey Orchestrator & Inclusive Route Intelligence**  
> **Core Mission:** Real-world environmental resilience for accessible, safe, and personalized multi-modal travel.

---

## 🌟 Core USP

> **“A route is only optimal until something changes. WAYFARER doesn't just plan your trip — it continuously decides whether your journey is still the right one, and transparently tells you why.”**

---

## 🏗️ System Architecture

```
                       NATURAL LANGUAGE INPUT / PLACES SEARCH
               ("Traveling with a power wheelchair, step-free access...")
                                         │
                                         ▼
                           AI JOURNEY UNDERSTANDING
                (Configurable Gemini API + Deterministic NLP Fallback)
                                         │
                                         ▼
                            STRUCTURED TRAVELER PROFILE
                { mobility: 'wheelchair', stairsAllowed: false, budget: 'medium', ... }
                                         │
                                         ▼
                                ROUTE SERVICE ABSTRACTION
                   ┌───────────────────────────────────────────┐
                   │ Google Places API + Google Directions API │
                   │  (Or High-Fidelity Verified Demo Engine)  │
                   └───────────────────────────────────────────┘
                                         │
                                         ▼
                               CANDIDATE ROUTE POOL
                       (Route A: Direct, Route B: Accessible Deck,
                        Route C: Low-Stress Scenic Bypass)
                                         │
                                         ▼
                         5-FACTOR DETERMINISTIC SCORING
                     w_Safety · S + w_Access · A + w_Crowd · C +
                         w_Convenience · V + w_Cost · $
                                         │
                                         ▼
                             DYNAMIC ITINERARY GRAPH (DAG)
                         [Node 1] ──Edge S1──► [Node 2] ──Edge S2──► [Node 3]
                            │                     │                     │
                        (Opening Hours, Dwell Durations, Strict Deadlines)
                                         │
                                         ▼
                            LIVE ADAPTIVE ORCHESTRATION
    ┌────────────────────────────────────────────────────────────────────────┐
    │ • Real Google Maps JS API (Polylines, Waypoints, Live Geolocation)     │
    │ • Transparent Score Breakdown ($27.0 + 33.6 + 12.8 + 8.6 + 13.5 = 95$) │
    │ • Dynamic Downstream Dependency Cascade & Dwell Time Compression       │
    │ • Why-Not Rejection Explanations ("Why NOT Route A? Access < 80")      │
    │ • Fleet Operator Center (Live status across all traveler itineraries)  │
    └────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                            REAL ENVIRONMENTAL EVENT
       [⚡ Elevator Fails] [⏱️ Transport Delay +50m] [❌ Activity Cancelled]
       [👥 Crowd Surge]    [⚠️ Safety Hazard]         [📍 Traveler Deviates]
                                         │
                                         ▼
                             STATE MUTATION & RE-RANKING
                 (Route B Access: 96 → 38 | Re-ranks Route C to #1)
                                         │
                                         ▼
                              DOWNSTREAM IMPACT CASCADE
             (Shifts downstream arrival times; compresses dwell buffers;
                 checks venue closing hours & transit deadlines)
                                         │
                                         ▼
                              EXPLAINABLE AI RECOVERY
                 ("Why did this change? Route C avoids the failed
                   elevator while preserving inclusive access")
```

---

## 📐 Mathematical Formulation: 5-Factor Deterministic Scoring

For any candidate route $r$, the **Composite Journey Score** is calculated as:

$$\text{Journey Score}(r) = \text{round}\Big( w_{\text{Safety}} \cdot \text{Safety}(r) + w_{\text{Access}} \cdot \text{Access}(r) + w_{\text{Crowd}} \cdot \text{Crowd}(r) + w_{\text{Conv}} \cdot \text{Conv}(r) + w_{\text{Cost}} \cdot \text{Cost}(r) \Big)$$

Where weights strictly normalize to $1.00$ based on the traveler's physical mobility, budget sensitivity, and safety preferences:

| Traveler Archetype | Safety ($w_S$) | Access ($w_A$) | Crowd ($w_C$) | Conv ($w_V$) | Cost ($w_\$$) |
|:-------------------|:--------------:|:--------------:|:-------------:|:------------:|:-------------:|
| **Wheelchair User**| 0.25 | **0.35** | 0.15 | 0.10 | 0.15 |
| **Walking Cane / Senior** | 0.30 | 0.30 | 0.15 | 0.10 | 0.15 |
| **Budget Sensitive** | 0.20 | 0.25 | 0.10 | 0.15 | **0.30** |
| **Standard Unassisted** | 0.25 | 0.15 | 0.20 | 0.25 | 0.15 |

---

## 🌐 Multi-Page Application Architecture

The frontend is built with React 18, React Router v6, Tailwind CSS, and Lucide icons, connected to a centralized `JourneyContext`:

| Route | Page | Purpose & Capabilities |
|:------|:-----|:-----------------------|
| `/` | **Landing Page** | Overview, core USP, value proposition, quick-jump navigation |
| `/profile` | **Traveler Profile** | Natural-language prompt parsing, structured accessibility constraints |
| `/planner` | **Journey Planner** | Google Places search, waypoint sequencing, Google Map preview, [Generate Journey] |
| `/journey/:id` | **Live Journey** | Interactive Google Map, 5-factor gauge, math breakdown, [View Details], [Report Change], [Open Events], [View History] |
| `/events` | **Events Center** | 6 simulation buttons posting to backend event engine with DAG cascade |
| `/recovery/:id` | **Recovery / Adaptation** | Before vs After score arithmetic, Why Did WAYFARER Change?, [Accept Route] |
| `/operator` | **Operator Dashboard** | Fleet monitoring (Stable, Monitoring, At Risk) bound to shared backend state |
| `/history` | **Decision History** | Data-driven chronological audit trail of all mutations and adaptations |

---

## 🗺️ Google Maps & Google Places Integration

WAYFARER supports live Google Cloud APIs with a graceful, offline-resilient demo fallback:

### Required Google Cloud APIs:
1. **Maps JavaScript API** — Interactive map rendering, vector tiles, custom styled markers, polylines.
2. **Places API (New or Legacy)** — Autocomplete place search, address resolution, place details.
3. **Directions API** — Walking and transit alternative route calculation.

### Environment Setup:
Copy `.env.example` to `.env` or set the environment variables:
```bash
# Server Port
PORT=5000

# Google Gemini API (Configurable model, defaults to gemini-2.0-flash)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Live vs. Demo Mode:
- **`LIVE GOOGLE ROUTING`**: Rendered automatically when `VITE_GOOGLE_MAPS_API_KEY` is present.
- **`DEMO / OFFLINE MAP MODE`**: Automatically activated if key is missing or offline. Renders interactive map canvas with zero crashes, preserving the complete 5-factor scoring and DAG cascade engine.

---

## 🚀 Getting Started

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/bhalakshvairagkar-sudo/WAYFARER.git
cd wayfarer

# Install all dependencies (root, client, server)
npm run install:all
```

### 2. Run Tests
```bash
# Runs 11 unit & engine tests
npm test

# Runs end-to-end integration tests against live Express server
node tests/integration.js
```

### 3. Build & Run
```bash
# Build production client bundle
npm --prefix client run build

# Start production server on port 5000
npm start

# Or run full-stack dev mode (concurrently runs client on :5173 and server on :5000)
npm run dev
```

Open **`http://localhost:5000`** in your browser.

---

## 🎬 Recommended Hackathon Demo Walkthrough

1. **Start at `/` (Landing Page)**:
   - Notice the hero: *"A route is only optimal until something changes."*
   - Click **[Plan My Journey]**.

2. **Personalize at `/profile` (Traveler Profile)**:
   - Notice natural-language input: *"I use a power wheelchair, cannot use stairs, prefer step-free ramps..."*
   - Click **[Understand My Needs]** (Gemini extracts profile and 5-factor weights).
   - Click **[Continue to Journey Planner]**.

3. **Plan at `/planner` (Journey Planner)**:
   - Use Google Places search for Origin and Destination.
   - Add a waypoint/stop.
   - Inspect live route candidates on the Google Map.
   - Click **[Generate Adaptive Journey]**.

4. **Active Travel at `/journey/active` (Live Journey)**:
   - Inspect the interactive map with selected Route B and alternatives.
   - View the 5-factor Score Gauge (e.g. 91/100) and click to view mathematical factor arithmetic.
   - Click **[Open Events]** or **[Report Change]**.

5. **Disrupt at `/events` (Events Center)**:
   - Click **[Simulate Elevator Failure]**.
   - Notice the event is sent to Express backend: Route B drops access (96 → 38), re-ranks to Route C (88/100), and redirects to Recovery!

6. **Adapt at `/recovery/active` (Recovery & Adaptation)**:
   - Inspect Before (Route B: 91) vs After (Route C: 88).
   - Read the structured **Why Did WAYFARER Change?** rationale.
   - Click **[Accept Route C]** (commits update to live state).

7. **Monitor at `/operator` (Operator Center)**:
   - View Tour #1042 reflecting the same backend journey state.
   - Filter by Stable, Monitoring, and At Risk tours.

8. **Audit at `/history` (Decision History)**:
   - Review the complete chronological log from journey creation to elevator failure to accepted adaptation.

---

## 🛡️ License

MIT License — Built for inclusive, accessible, and resilient travel worldwide.
