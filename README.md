# JWE3 Habitat Planner (PWA Companion)

A high-performance Progressive Web App (PWA) and min-maxing companion tool designed for *Jurassic World Evolution 3* (similar in utility to paleo.gg). It provides real-time paddock optimization, multi-species cohabitation checking, and precise space calculations for park builders.

---

## Key Features

* **Advanced Paddock Math Engine**: Automatically scales required surface areas (m2) based on adult counts, juvenile scaling, and environmental percentage rules (MAX algorithm).
* **Cohabitation Conflict Matrix**: Intelligent rule engine parsing family traits, scavenger immunities, sauropod defenses, and explicit likes/dislikes to flag potential fights (Perfect vs Conflict Alert).
* **Appeal Density Optimization**: Live metrics calculating Total Appeal / Total Required Area (m2) to reward space-efficient park design.
* **Smart Tankmate Recommender**: Scans the full species database to auto-recommend zero-conflict, high-density companion species.
* **Mobile-First Dark HUD UI**: Built with touch-friendly steppers, responsive layout structures, and persistent localStorage auto-saving.

---

## Tech Stack

* **Frontend**: React (Vite)
* **Styling**: Inline Styles & Custom Responsive CSS Grid Layouts
* **Data Layer**: Static JSON (`jwe3_species.json`) with client-side calculation engines
* **Hosting / Deployment**: Vercel (Production CI/CD pipeline via GitHub)

---

## Current Roadmap Status

* **Phase 0: Core Foundation & Calculation Validation** — Completed
* **Phase 1: UI/UX Overhaul & Min-Maxing Suite** — Completed
* **Phase 2: Multi-Page Routing & Google SEO Prerendering** — Current Focus
* **Phase 3: PWA Engine & Offline Capability** — Planned
* **Phase 4: User Accounts & Community Blueprint Hub** — Future
* **Phase 5: Launch, Custom Domain & Monetization** — Future

---

## Getting Started Locally

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/jwe3-companion.git](https://github.com/your-username/jwe3-companion.git)
   cd jwe3-companion