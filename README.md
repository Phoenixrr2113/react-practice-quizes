# React Interview Lab

A structured, interactive practice environment for mastering expert-level React patterns. Work through 24 progressively difficult challenges covering state management, performance optimization, advanced architecture, and frontier patterns — all inside a modern, in-browser coding environment.

---

## What's Inside

**24 Expert Challenges** across four difficulty phases:

| Phase | Focus | Challenges |
|---|---|---|
| **1 — Foundational** | Reducers, state machines, composition | FSM, Undo/Redo, Compound Components, Middleware Pipeline |
| **2 — Performance** | External stores, caching, concurrency | `useSyncExternalStore`, `useQuery`, Virtualized List, Signals |
| **3 — Architecture** | Production-grade systems | Drag-and-Drop, Optimistic Mutations, Web Workers, RBAC |
| **4 — Frontier** | Pushing React to its limits | CRDTs, Custom Reconciler, Server-Driven UI |

**Built-in tooling:**

- 🔍 **Shiki** — VS Code-quality syntax highlighting (static, zero runtime cost)
- 🚀 **Sandpack** — Full in-browser React execution with HMR, console, and error overlay
- ⏱️ **Challenge Timer** — Per-session timer to track your practice time
- ✅ **Progress Tracking** — Completed challenges persisted to `localStorage`
- 🔎 **Filter & Search** — Filter by category or difficulty; search by title

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 4 | Utility-first styling |
| React Router | 7 | Client-side routing |
| Sandpack | 2 | In-browser code execution |
| Shiki | 3 | Static syntax highlighting |
| Vitest | 4 | Unit testing |
| Testing Library | 16 | Component testing |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repo
git clone https://github.com/your-username/react-practice.git
cd react-practice

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build locally
npm run test       # Run unit tests (Vitest)
npm run test:watch # Run tests in watch mode
```

---

## Project Structure

```
react-practice/
├── src/
│   ├── App.tsx                  # Router + top-level providers
│   ├── types/                   # TypeScript interfaces
│   ├── data/challenges/         # Static challenge data (by category)
│   ├── constants/               # Theme + color maps
│   ├── utils/                   # cn(), formatTime()
│   ├── hooks/                   # useTimer, useProgress, useChallenge
│   └── components/
│       ├── ui/                  # CodeBlock, Badge, ProgressBar, RevealToggle
│       ├── layout/              # PageContainer
│       ├── challenges/          # ChallengeGrid, ChallengeCard, ChallengeView
│       ├── filters/             # FilterBar, SearchInput
│       └── sandbox/             # ChallengeSandbox (lazy-loaded Sandpack)
├── STUDY_GUIDE.md               # Phased learning path for all 24 challenges
├── REFACTOR_PLAN.md             # Architecture decisions and refactor notes
└── REAL_WORLD_EXAMPLES.md       # Real-world context for each pattern
```

---

## How to Use

1. **Browse** the challenge grid — filter by category (`Hooks & State`, `Performance`, `Architecture`) or difficulty
2. **Open a challenge** — read the description, requirements, and starter code
3. **Attempt it** — click "Open in Sandbox" to edit and run code directly in the browser
4. **Check hints** — reveal key points when you're stuck
5. **Reveal the solution** — compare your implementation; run the solution in the sandbox
6. **Mark complete** — track your progress across sessions

Refer to [`STUDY_GUIDE.md`](./STUDY_GUIDE.md) for a recommended study order, prerequisite reading, and a per-challenge breakdown of what to study and why.

---

## License

MIT
