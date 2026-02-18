# React Interview Lab — Refactoring Plan

> **Goal:** Transform the 8,329-line monolith `expert.jsx` into a clean, modular, production-quality React application following Clean Code, Bulletproof React, and current best practices. Add in-browser code execution so users can actually run and test challenge solutions.

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Guiding Principles](#2-guiding-principles)
3. [Code Execution Strategy](#3-code-execution-strategy)
4. [Target Architecture](#4-target-architecture)
5. [Phase-by-Phase Implementation Plan](#5-phase-by-phase-implementation-plan)
6. [New Features to Add](#6-new-features-to-add)
7. [Dependency Plan](#7-dependency-plan)
8. [Testing Strategy](#8-testing-strategy)
9. [What We Are Not Doing](#9-what-we-are-not-doing)
10. [Decision Log](#10-decision-log)

---

## 1. Current State Audit

### File Statistics

| Metric | Value |
|---|---|
| Total lines | 8,329 |
| Total files | 1 (plus `src/main.jsx`, `index.html`) |
| Number of challenges | 36 |
| Lines of challenge data | ~7,750 (93% of file) |
| Lines of actual UI code | ~580 (7% of file) |
| React components | 3 (`ReactInterviewChallenges`, `ChallengeView`, `CodeBlock`) |
| Custom hooks | 0 (logic lives inside components) |

### Problems Identified

| Problem | Location | Impact |
|---|---|---|
| 93% of file is static data | Lines 3–7747 | Impossible to navigate; any component edit requires scrolling past 7,700 lines |
| CDN Prism loaded via DOM manipulation | `CodeBlock` `useEffect` | Unpinned runtime dependency, fails offline, flickers on load |
| `formatTime` defined inside root component | Line 7783 | Not reusable, not testable, re-created on every render |
| All styles in one object at bottom of file | Lines 8007–8329 | No colocaton, no theming, magic color strings duplicated throughout |
| `setShowSolution`, `setShowHints`, `setTimerActive` prop-drilled | Root → ChallengeView | Harder to refactor; violates Single Responsibility |
| `completedIds` is ephemeral `useState` | Line 7752 | Progress lost on every page refresh |
| No URL routing | — | Cannot deep-link to a challenge; browser back button breaks |
| No filtering or search | — | Users must scroll through all 36 cards to find a challenge |
| No TypeScript | — | No autocomplete on challenge objects, no prop validation, no refactor safety |
| No tests | — | Zero confidence when changing anything |
| Syntax-only code display | `CodeBlock` | Users read code but cannot run or test it |
| No keyboard navigation | Cards, buttons | Accessibility gap |
| `minmax(380, 1fr)` missing `px` unit | Line 8070 | CSS grid silently broken on some browsers |

---

## 2. Guiding Principles

These principles drive every decision in this refactor. When in doubt, refer back here.

### Bulletproof React

- **Only one component per file.** Never co-locate two independent components.
- **Keep components small.** A component that needs scrolling to read is too big.
- **Colocate by feature.** Files that change together live together.
- **No business logic in JSX.** Derived values and side effects belong in hooks or utils.
- **Avoid prop drilling beyond one level.** Use hooks or context at the right scope.
- **Lift state only as high as necessary.** Start local; move up only when two siblings need it.

### Clean Code

- **Names tell the truth.** `useProgress` not `useCompletedState`. `ChallengeCard` not `Card`.
- **No magic strings or numbers.** Colors, sizes, and string literals go in constants.
- **One level of abstraction per function.** A component either orchestrates or renders — not both.
- **Delete dead code.** Don't comment it out. Git history is the undo button.

### Current React Best Practices (2025–2026)

- **TypeScript everywhere.** Types are documentation that the compiler enforces.
- **CSS Modules or CSS custom properties** over inline style objects at scale.
- **`useMemo`/`useCallback` intentionally**, not defensively. Profile before optimizing.
- **`useReducer` when state transitions have names.** Timer, challenge session, and progress all qualify.
- **Persist important user state** (`localStorage`/`sessionStorage`) so UX expectations are met.
- **`React.StrictMode` always on** in development.

---

## 3. Code Execution Strategy

This is the biggest UX upgrade: letting users write and run React code directly in the browser.

### The Problem with the Current Approach

`CodeBlock` today uses Prism.js (loaded from CDN via `useEffect` DOM injection) for **read-only syntax highlighting only**. Users read the starter code and solution but cannot run, edit, or test anything.

### Options Evaluated

| Library | Executes React | Console Output | Bundle Size | Verdict |
|---|---|---|---|---|
| **Sandpack** (`@codesandbox/sandpack-react`) | Yes — full HMR | Yes — error overlay + console | ~500KB gzip | **Primary recommendation** |
| **react-live** | Yes — component scope | Yes — `<LiveError>` | ~90KB gzip | **Fallback / lightweight mode** |
| **Monaco Editor** | No (editor only) | No | ~4MB | Too heavy, editor only |
| **CodeMirror 6** | No (editor only) | No | ~250KB | Editor only |
| **WebContainers** (StackBlitz) | Yes — full Node.js | Yes — real terminal | Heavy | Overkill; Chrome-only in 2026 |
| **Babel standalone + iframe** | Yes | Via `postMessage` | ~400KB Babel alone | Complex, security surface |

### Decision: Tiered Approach

Use two modes that can coexist:

#### Mode A — View Mode (default, lightweight)
- **Library:** `shiki` for static syntax highlighting
- **When used:** Challenge list cards, requirements, hints sections
- **Why:** Zero runtime cost, VS Code–quality themes, server-renderable

#### Mode B — Sandbox Mode (opt-in per challenge)
- **Library:** `@codesandbox/sandpack-react`
- **When used:** User clicks "Open in Sandbox" on the starter or solution code block
- **Why:** Full React execution, HMR, npm deps, error overlay, console panel — all in-browser with zero backend
- **Lazy loaded:** Sandpack is code-split and only fetched when the user opens a sandbox. The base app stays fast.

#### Why Sandpack Wins

- **No backend required.** Runs entirely in-browser using a service worker.
- **Full React 18 + hooks support.** Exactly what these challenges need.
- **npm dependency resolution in-browser.** Challenge code can `import` from npm.
- **Built-in console panel.** `console.log` output visible without DevTools.
- **Error overlay.** Compilation and runtime errors shown inline with stack traces.
- **Hot module reloading.** Edits reflect instantly.
- **Battle-tested.** Powers CodeSandbox.io production environments.

### Sandpack Integration Sketch

```tsx
// src/components/sandbox/ChallengeSandbox.tsx

import { Sandpack } from '@codesandbox/sandpack-react';
import { sandpackDark } from '@codesandbox/sandpack-themes';

interface ChallengeSandboxProps {
  starterCode: string;
  solutionCode?: string;
  mode: 'starter' | 'solution';
}

export function ChallengeSandbox({ starterCode, solutionCode, mode }: ChallengeSandboxProps) {
  const code = mode === 'solution' ? solutionCode : starterCode;

  return (
    <Sandpack
      theme={sandpackDark}
      template="react"
      files={{
        '/App.jsx': { code: code ?? '', active: true },
      }}
      options={{
        showConsole: true,
        showConsoleButton: true,
        showLineNumbers: true,
        showInlineErrors: true,
        editorHeight: 480,
        resizablePanels: true,
      }}
    />
  );
}
```

The sandbox is **lazy loaded** so it doesn't bloat the initial bundle:

```tsx
// Lazy load Sandpack — only fetched when user opens sandbox
const ChallengeSandbox = React.lazy(() =>
  import('./sandbox/ChallengeSandbox').then((m) => ({ default: m.ChallengeSandbox }))
);
```

### UX Flow

```
Challenge Detail View
│
├── [Starter Code]  ← shiki static highlight (always visible, zero cost)
│     └── [▶ Open in Sandbox] button → lazy loads Sandpack, replaces block
│
├── [Show Hints] toggle
│
└── [Reveal Solution] toggle
      └── [Solution Code] ← shiki static highlight
            └── [▶ Run Solution] button → lazy loads Sandpack with solution code
```

---

## 4. Target Architecture

### Directory Structure

```
react-practice/
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── REFACTOR_PLAN.md
│
└── src/
    ├── main.tsx                          # Entry point
    ├── App.tsx                           # Router + top-level providers
    │
    ├── types/
    │   └── challenge.ts                  # Challenge, Category, Difficulty types
    │
    ├── data/
    │   └── challenges/
    │       ├── index.ts                  # Re-exports ALL_CHALLENGES flat array
    │       ├── hooks-and-state.ts        # ~12 challenge objects
    │       ├── performance.ts            # ~12 challenge objects
    │       └── architecture.ts           # ~12 challenge objects
    │
    ├── constants/
    │   └── theme.ts                      # categoryColors, difficultyBadge, design tokens
    │
    ├── utils/
    │   └── time.ts                       # formatTime(seconds): string
    │
    ├── hooks/
    │   ├── useTimer.ts                   # { seconds, isActive, start, pause, reset }
    │   ├── useProgress.ts                # { completedIds, markComplete, progress } + localStorage
    │   └── useChallenge.ts               # { current, start, goBack }
    │
    ├── components/
    │   │
    │   ├── ui/                           # Generic, reusable, zero domain knowledge
    │   │   ├── Badge.tsx                 # <CategoryBadge> and <DifficultyBadge>
    │   │   ├── CodeBlock.tsx             # shiki static highlight (replaces Prism CDN)
    │   │   ├── ProgressBar.tsx           # value: 0–100
    │   │   └── RevealToggle.tsx          # show/hide toggle pattern
    │   │
    │   ├── layout/
    │   │   └── PageContainer.tsx         # max-width wrapper with dark background
    │   │
    │   ├── sandbox/
    │   │   └── ChallengeSandbox.tsx      # Sandpack wrapper (lazy loaded)
    │   │
    │   ├── challenges/
    │   │   ├── ChallengeGrid.tsx         # Grid + filter logic
    │   │   ├── ChallengeCard.tsx         # Single card (receives one Challenge prop)
    │   │   ├── ChallengeView.tsx         # Detail view orchestrator (~30 lines)
    │   │   ├── ChallengeHeader.tsx       # Title, badges, description, real-world box
    │   │   ├── RequirementsList.tsx      # Requirements bullet list
    │   │   ├── HintsPanel.tsx            # Collapsible hints with RevealToggle
    │   │   ├── SolutionPanel.tsx         # Collapsible solution + sandbox + follow-up
    │   │   └── TopBar.tsx                # Sticky back / timer / mark-complete bar
    │   │
    │   └── filters/
    │       ├── FilterBar.tsx             # Category + difficulty chips
    │       └── SearchInput.tsx           # Text search input
    │
    └── styles/
        ├── tokens.css                    # CSS custom properties (--color-bg, etc.)
        └── global.css                    # Body reset, :root font
```

### Data Flow

```
ALL_CHALLENGES (static data)
        │
        ▼
  useChallenge()          useProgress()         useTimer()
  ┌─────────────┐        ┌─────────────┐       ┌──────────┐
  │ current     │        │ completedIds│       │ seconds  │
  │ start()     │        │ markComplete│       │ isActive │
  │ goBack()    │        │ progress %  │       │ pause()  │
  └─────────────┘        └─────────────┘       └──────────┘
        │                       │                    │
        └───────────────────────┴────────────────────┘
                                │
                           App.tsx / Router
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
        ChallengeGrid                        ChallengeView
         (/ route)                          (/challenge/:id)
              │                                    │
      ┌───────┴────────┐              ┌────────────┼──────────────┐
  FilterBar      ChallengeCard    TopBar    ChallengeHeader    SolutionPanel
  SearchInput                                                       │
                                                              ChallengeSandbox
                                                              (lazy loaded)
```

---

## 5. Phase-by-Phase Implementation Plan

Each phase is independently deployable. The app runs correctly after every phase.

---

### Phase 1 — TypeScript Foundation

**Goal:** Add TypeScript without breaking anything.

**Tasks:**
1. Install TypeScript and `@types/react`, `@types/react-dom`
2. Add `tsconfig.json` (strict mode, `jsx: react-jsx`, path aliases)
3. Update `vite.config.js` → `vite.config.ts`
4. Rename `src/main.jsx` → `src/main.tsx`, fix import path
5. Create `src/types/challenge.ts`:

```ts
export type Category = 'Hooks & State' | 'Performance' | 'Architecture';
export type Difficulty = 'Medium' | 'Hard' | 'Expert';

export interface Challenge {
  id: number;
  category: Category;
  difficulty: Difficulty;
  title: string;
  timeEstimate: string;
  description: string;
  realWorld: string;
  requirements: string[];
  starterCode: string;
  solutionCode: string;
  keyPoints: string[];
  followUp: string;
}
```

**Files changed:** `vite.config`, `package.json`, `tsconfig.json`, `src/main.tsx`, `src/types/challenge.ts`
**`expert.jsx` untouched.** ✓

---

### Phase 2 — Extract Challenge Data

**Goal:** Move the 7,750 lines of challenge data out of the component file.

**Tasks:**
1. Create `src/data/challenges/hooks-and-state.ts` — paste challenges where `category === 'Hooks & State'`
2. Create `src/data/challenges/performance.ts` — paste challenges where `category === 'Performance'`
3. Create `src/data/challenges/architecture.ts` — paste challenges where `category === 'Architecture'`
4. Each file exports a typed `Challenge[]` array
5. Create `src/data/challenges/index.ts`:

```ts
import { hooksAndStateChallenges } from './hooks-and-state';
import { performanceChallenges } from './performance';
import { architectureChallenges } from './architecture';

export const ALL_CHALLENGES: Challenge[] = [
  ...hooksAndStateChallenges,
  ...performanceChallenges,
  ...architectureChallenges,
];
```

6. Update `expert.jsx` to import from `src/data/challenges`
7. Delete the `challenges` const from `expert.jsx`

**Result:** `expert.jsx` drops from 8,329 lines to ~580 lines.

---

### Phase 3 — Theme Constants & CSS Tokens

**Goal:** Eliminate inline style objects and magic color strings.

**Tasks:**
1. Create `src/constants/theme.ts` — move `categoryColors` and `difficultyBadge` here with full types
2. Create `src/styles/tokens.css` with CSS custom properties:

```css
:root {
  --color-bg:         #0a0a12;
  --color-surface:    #111120;
  --color-surface-2:  #0f0f1a;
  --color-border:     #1e1e32;
  --color-text:       #e0e0e8;
  --color-text-muted: #888;
  --color-accent:     #16c79a;
  --color-accent-alt: #e94560;
  --color-purple:     #a78bfa;
  --color-warning:    #f59e0b;
  --color-error:      #ef4444;
  --font-mono:        'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  --font-ui:          -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-sm:        4px;
  --radius-md:        6px;
  --radius-lg:        8px;
  --transition-fast:  0.15s ease;
  --transition-base:  0.2s ease;
}
```

3. Import `tokens.css` in `src/main.tsx`
4. Replace the `styles` object in `expert.jsx` with CSS Modules (one `*.module.css` per component later) — or at minimum convert color literals to `var(--color-*)` references
5. Fix the broken CSS grid: `minmax(380px, 1fr)` (was missing `px`)

---

### Phase 4 — Utilities and Custom Hooks

**Goal:** Move all logic out of components into testable, reusable units.

**Tasks:**

**`src/utils/time.ts`**
```ts
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

**`src/hooks/useTimer.ts`**
```ts
// Encapsulates interval logic; returns stable callbacks
export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const start  = useCallback(() => setIsActive(true), []);
  const pause  = useCallback(() => setIsActive(false), []);
  const reset  = useCallback(() => { setIsActive(false); setSeconds(0); }, []);
  const toggle = useCallback(() => setIsActive((a) => !a), []);

  return { seconds, isActive, start, pause, reset, toggle };
}
```

**`src/hooks/useProgress.ts`**
```ts
// Persists completed challenge IDs to localStorage
export function useProgress(total: number) {
  const [completedIds, setCompletedIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('completed-challenges');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const markComplete = useCallback((id: number) => {
    setCompletedIds((prev) => {
      const next = new Set([...prev, id]);
      localStorage.setItem('completed-challenges', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const progress = useMemo(
    () => Math.round((completedIds.size / total) * 100),
    [completedIds.size, total]
  );

  return { completedIds, markComplete, progress };
}
```

**`src/hooks/useChallenge.ts`**
```ts
// Challenge navigation state
export function useChallenge() {
  const [current, setCurrent] = useState<Challenge | null>(null);

  const start  = useCallback((c: Challenge) => setCurrent(c), []);
  const goBack = useCallback(() => setCurrent(null), []);

  return { current, start, goBack };
}
```

---

### Phase 5 — Replace Prism CDN with Shiki

**Goal:** Static syntax highlighting via npm package — no CDN, no DOM manipulation, no flash.

**Tasks:**
1. Install `shiki`
2. Create `src/components/ui/CodeBlock.tsx`:

```tsx
import { codeToHtml } from 'shiki';
import { useEffect, useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'jsx' }: CodeBlockProps) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    codeToHtml(code, {
      lang: language,
      theme: 'one-dark-pro',  // VS Code theme, matches our dark UI
    }).then(setHtml);
  }, [code, language]);

  return (
    <div
      className={styles.codeBlock}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

3. Remove the old `CodeBlock` from `expert.jsx`
4. Remove the two Prism CDN `useEffect`s and their DOM manipulation

**Note on `dangerouslySetInnerHTML`:** Shiki generates safe, static HTML from source code strings. The input is the challenge's own code — not user input. This is the standard pattern for Shiki in React.

---

### Phase 6 — UI Component Decomposition

**Goal:** Extract small, reusable UI primitives.

**`src/components/ui/Badge.tsx`**
- `<CategoryBadge category={c.category} />` — looks up color from theme constant internally
- `<DifficultyBadge difficulty={c.difficulty} />` — same pattern
- Eliminates the repeated inline spread-style lookups in JSX

**`src/components/ui/ProgressBar.tsx`**
- Props: `value: number` (0–100), optional `label: string`
- Self-contained; no knowledge of challenges

**`src/components/ui/RevealToggle.tsx`**
- Props: `isOpen: boolean`, `onToggle: () => void`, `label: string`, optional `variant: 'default' | 'solution'`
- Renders the show/hide toggle button with correct `aria-expanded`
- Used by both `HintsPanel` and `SolutionPanel`

---

### Phase 7 — Feature Component Decomposition

**Goal:** Break `ChallengeView` (~125 lines) and `ReactInterviewChallenges` (~130 lines) into focused components.

**`src/components/challenges/TopBar.tsx`**
- Props: `onBack`, `timer`, `isTimerActive`, `onToggleTimer`, `onComplete`, `isCompleted`
- Sticky bar only — no challenge knowledge

**`src/components/challenges/ChallengeHeader.tsx`**
- Props: `challenge: Challenge`
- Renders category badge, difficulty badge, time estimate, title, description, real-world box

**`src/components/challenges/RequirementsList.tsx`**
- Props: `requirements: string[]`

**`src/components/challenges/HintsPanel.tsx`**
- Props: `keyPoints: string[]`
- Manages its own `isOpen` state internally (no lifting needed)
- Uses `<RevealToggle>`

**`src/components/challenges/SolutionPanel.tsx`**
- Props: `starterCode: string`, `solutionCode: string`, `followUp: string`
- Manages its own `isOpen` state internally
- Renders `<CodeBlock>` for solution
- Renders `<ChallengeSandbox>` (lazy) when user clicks "Open in Sandbox"
- Renders follow-up question when open

**`src/components/challenges/ChallengeView.tsx`** — now ~30 lines:
```tsx
export function ChallengeView({ challenge, onBack }: ChallengeViewProps) {
  const timer   = useTimer();
  const progress = useProgress(ALL_CHALLENGES.length);

  return (
    <PageContainer>
      <TopBar
        onBack={onBack}
        timer={formatTime(timer.seconds)}
        isTimerActive={timer.isActive}
        onToggleTimer={timer.toggle}
        onComplete={() => progress.markComplete(challenge.id)}
        isCompleted={progress.completedIds.has(challenge.id)}
      />
      <ChallengeHeader challenge={challenge} />
      <RequirementsList requirements={challenge.requirements} />
      <CodeBlock code={challenge.starterCode} />
      <HintsPanel keyPoints={challenge.keyPoints} />
      <SolutionPanel
        starterCode={challenge.starterCode}
        solutionCode={challenge.solutionCode}
        followUp={challenge.followUp}
      />
    </PageContainer>
  );
}
```

**`src/components/challenges/ChallengeCard.tsx`**
- Props: `challenge: Challenge`, `isCompleted: boolean`, `onStart: (c: Challenge) => void`
- No state; pure presentational

**`src/components/challenges/ChallengeGrid.tsx`**
- Receives `challenges`, `completedIds`, `onStart`
- Handles grid layout only

---

### Phase 8 — Filtering and Search

**Goal:** Let users find challenges quickly across 36 entries.

**Tasks:**
1. Create `src/components/filters/FilterBar.tsx`
   - Category filter chips: All / Hooks & State / Performance / Architecture
   - Difficulty filter chips: All / Medium / Hard / Expert
   - Active filter highlighted with accent color

2. Create `src/components/filters/SearchInput.tsx`
   - Debounced text input (200ms) filtering on `title` + `description`

3. Add filter state to `ChallengeGrid.tsx`:
```tsx
const filtered = useMemo(() => {
  return ALL_CHALLENGES
    .filter((c) => activeCategory === 'All' || c.category === activeCategory)
    .filter((c) => activeDifficulty === 'All' || c.difficulty === activeDifficulty)
    .filter((c) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    });
}, [activeCategory, activeDifficulty, query]);
```

4. Show match count: `"Showing 12 of 36 challenges"`

---

### Phase 9 — Routing

**Goal:** Deep-linkable URLs; browser back button works.

**Tasks:**
1. Install `react-router-dom` v7
2. Update `App.tsx`:

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/"                   element={<ChallengeGrid />} />
    <Route path="/challenge/:id"      element={<ChallengeViewRoute />} />
    <Route path="*"                   element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>
```

3. `ChallengeViewRoute` reads `:id` from params, looks up challenge from `ALL_CHALLENGES`, renders `<ChallengeView>`
4. `startChallenge` navigates to `/challenge/:id` instead of setting state
5. "Back" button navigates to `/` instead of calling `goBack()`
6. Timer auto-starts on route mount via `useTimer`'s `start` effect
7. Update `vite.config.ts` to add `historyApiFallback`

---

### Phase 10 — Testing

**Goal:** Confidence when changing anything.

**Stack:** Vitest + React Testing Library + `@testing-library/user-event`

**What to test:**

```
src/utils/time.test.ts
  ✓ formatTime(0)   → "0:00"
  ✓ formatTime(65)  → "1:05"
  ✓ formatTime(3600) → "60:00"

src/hooks/useTimer.test.ts
  ✓ starts at 0
  ✓ increments each second when active
  ✓ pauses correctly
  ✓ resets to 0

src/hooks/useProgress.test.ts
  ✓ markComplete adds id to set
  ✓ progress % calculated correctly
  ✓ persists to and restores from localStorage

src/components/challenges/ChallengeCard.test.tsx
  ✓ renders challenge title
  ✓ renders category badge
  ✓ shows checkmark when isCompleted
  ✓ calls onStart when clicked

src/components/filters/FilterBar.test.tsx
  ✓ All filter shows all 36 challenges
  ✓ Category filter reduces visible cards
  ✓ Difficulty filter reduces visible cards
  ✓ Combined filters stack correctly
  ✓ Search by title works
  ✓ No results state renders
```

---

## 6. New Features to Add

These are improvements beyond pure refactoring.

| Feature | Where | Value |
|---|---|---|
| **In-browser code sandbox** | `ChallengeSandbox` (Sandpack) | Users run and test their solutions — biggest UX win |
| **Progress persistence** | `useProgress` + `localStorage` | Progress survives page refresh |
| **Filter + search** | `FilterBar`, `SearchInput` | Find challenges fast |
| **Deep-linkable URLs** | React Router v7 | Share a specific challenge; browser back works |
| **Keyboard navigation** | Cards, TopBar buttons | Accessibility; power-user UX |
| **"Reset progress" button** | Header | Clear `localStorage` to start over |
| **Copy code button** | `CodeBlock` | One-click copy of starter or solution code |
| **Time-to-complete tracking** | `useProgress` | Show actual time taken next to checkmark |

---

## 7. Dependency Plan

### Add

```jsonc
// dependencies
"@codesandbox/sandpack-react": "^2.20.0",   // in-browser execution
"react-router-dom": "^7.0.0",               // routing
"shiki": "^1.x"                             // syntax highlighting

// devDependencies
"typescript": "^5.x",
"@types/react": "^18.x",
"@types/react-dom": "^18.x",
"vitest": "^2.x",
"@testing-library/react": "^16.x",
"@testing-library/user-event": "^14.x",
"@vitejs/plugin-react": "^4.x"             // already installed
```

### Remove

```jsonc
// Nothing from npm to remove — Prism was loaded from CDN, not npm
// The CDN calls in expert.jsx are deleted when CodeBlock is replaced
```

### Keep

```jsonc
"react": "^18.3.1",      // no upgrade needed yet
"react-dom": "^18.3.1",
"vite": "^6.0.0"
```

---

## 8. Testing Strategy

- **Unit tests** for all hooks and utils (Vitest, no DOM)
- **Component tests** for all interactive components (React Testing Library)
- **No snapshot tests** — they fail on any style change and provide low signal
- **No e2e tests** in scope — Playwright/Cypress is a future addition
- **Coverage target:** 80% on `hooks/` and `utils/`; 60% on `components/`
- **Test colocation:** `*.test.ts` files live next to the file they test, not in a separate `__tests__` directory

---

## 9. What We Are Not Doing

Keeping scope disciplined is as important as what we build.

| Not doing | Why |
|---|---|
| Redux / Zustand / Jotai | Local hooks + context is sufficient for this scale |
| Next.js / SSR migration | Vite SPA is the right tool; no SEO or server requirements |
| CSS-in-JS (styled-components, Emotion) | CSS custom properties + CSS Modules achieves the same with zero runtime |
| Micro-frontend architecture | One domain, one team |
| CI/CD pipeline | Out of scope |
| Backend / database | All state is client-side by design |
| Mobile app / PWA | Out of scope for this refactor |
| i18n / localization | Out of scope |
| Adding new challenges | Data content is out of scope; only structure changes |

---

## 10. Decision Log

Decisions made during planning that may need revisiting.

| Decision | Rationale | Revisit if… |
|---|---|---|
| Shiki for static highlighting (not Prism CDN) | npm-installed, VS Code themes, zero runtime DOM mutation | Shiki bundle size is unacceptable after profiling |
| Sandpack for execution (not react-live) | Full React execution, npm deps, console panel | Bundle size concern grows; react-live is the fallback |
| Sandpack lazy loaded | Don't penalize users who only browse without running code | Most users consistently use sandbox; move to eager load |
| CSS custom properties (not CSS Modules per component) | Simpler migration path from inline styles; shared tokens | Team grows and CSS collisions become a problem |
| React Router v7 (not hash routing) | Clean URLs, standard library, widely known | Deploy environment can't support HTML5 history API |
| localStorage for progress | Zero infrastructure; appropriate for a personal practice tool | Multi-device sync needed; then move to a backend |
| TypeScript strict mode | Catches real bugs; enables safe refactoring | Never a reason to turn this off |
| Vitest (not Jest) | Native Vite integration; faster; no config overhead | Jest ecosystem compatibility becomes a hard requirement |

---

*Last updated: 2026-02-18*
