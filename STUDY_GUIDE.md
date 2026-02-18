# Expert React Study Guide

A structured learning path for mastering the patterns and thinking behind the 24 expert-level challenges in `expert.jsx`.

---

## Table of Contents

1. [How to Use This Guide](#how-to-use-this-guide)
2. [Core Mental Models](#core-mental-models)
3. [Prerequisite Knowledge](#prerequisite-knowledge)
4. [Challenge Map & Study Order](#challenge-map--study-order)
5. [Phase 1: Foundational Patterns](#phase-1-foundational-patterns)
6. [Phase 2: Performance & Data Flow](#phase-2-performance--data-flow)
7. [Phase 3: Advanced Architecture](#phase-3-advanced-architecture)
8. [Phase 4: Frontier Patterns](#phase-4-frontier-patterns)
9. [Computer Science Concepts to Study](#computer-science-concepts-to-study)
10. [Source Code to Read](#source-code-to-read)
11. [Books](#books)
12. [Courses](#courses)
13. [Blogs & People to Follow](#blogs--people-to-follow)
14. [Practice Method](#practice-method)

---

## How to Use This Guide

Each challenge in `expert.jsx` tests a specific combination of React knowledge, CS fundamentals, and architectural thinking. This guide breaks down **what to study** and **in what order** so you build skills cumulatively.

**Do not try to tackle all 24 challenges at once.** Follow the phased approach below. Each phase builds on the previous one.

---

## Core Mental Models

The people who designed these solutions share these thinking habits. Practice them deliberately:

### 1. Think in Data Flow, Not UI
Every solution starts with: "What is the state? How does it change? Who needs to know?" The JSX is always the last concern. Before writing any component, sketch the data flow on paper.

### 2. Think in Invariants
Ask: "What must ALWAYS be true?" Examples from the challenges:
- `useSyncExternalStore`: rendered UI must match current store state (no tearing)
- Finite State Machine: only valid transitions are possible (illegal states are unrepresentable)
- Virtualized List: only visible items exist in the DOM
- Undo/Redo: new actions always clear the redo stack

### 3. Think About Edge Cases During Design
Race conditions, stale closures, concurrent mode double-renders, unmount during async — these aren't afterthoughts, they're the *reason* the solution is shaped the way it is. Before coding, write down what can go wrong.

### 4. Separate Concerns by Mechanism
Notice how the solutions separate:
- **State logic** (reducers, stores) from **subscription logic** (effects, observers)
- **Core algorithms** (collision detection, binary search) from **React integration** (hooks, refs)
- **Data** (what changed) from **notification** (who needs to know)

### 5. Prefer Composition Over Configuration
The solutions compose small, focused primitives (signals + computed + effects) rather than building monolithic APIs. Each piece is independently testable.

---

## Prerequisite Knowledge

Before starting the challenges, make sure you're solid on these React fundamentals:

### React Hooks — Deep Understanding
- [ ] `useState` vs `useReducer`: when to use which, how batching works
- [ ] `useEffect`: cleanup timing, dependency array mechanics, why effects run after paint
- [ ] `useRef`: mutable container that persists across renders without triggering re-renders
- [ ] `useCallback` / `useMemo`: referential stability, when memoization helps vs hurts
- [ ] `useContext`: how context triggers re-renders for ALL consumers (the re-render problem)

### JavaScript Fundamentals
- [ ] Closures: why stale closures happen in effects and callbacks
- [ ] `Object.is()`: how React compares state (not deep equality)
- [ ] `Proxy` and `Reflect`: for challenge #9 (form state) and understanding MobX/Valtio
- [ ] `WeakMap` / `WeakSet` / `Map` / `Set`: used throughout for subscriptions and caches
- [ ] `AbortController`: for cancelling fetch requests (challenge #4)
- [ ] `structuredClone`: deep copying without shared references
- [ ] `queueMicrotask` / `requestAnimationFrame`: scheduling and batching
- [ ] `ResizeObserver` / `IntersectionObserver`: DOM measurement APIs
- [ ] Web Workers and `postMessage`: for challenge #11
- [ ] `ArrayBuffer` and Transferable Objects: zero-copy data transfer

### Key Reading
- "React as a UI Runtime" — Dan Abramov (overreacted.io)
- "A Complete Guide to useEffect" — Dan Abramov (overreacted.io)
- "Before You memo()" — Dan Abramov (overreacted.io)

---

## Challenge Map & Study Order

### All 24 Challenges by Category

| # | Category | Title | Phase |
|---|----------|-------|-------|
| 1 | Hooks & State | Build useSyncExternalStore from Scratch | 2 |
| 2 | Hooks & State | Finite State Machine with useReducer | 1 |
| 3 | Performance | Build a Virtualized List from Scratch | 2 |
| 4 | Performance | Concurrent-Safe Data Fetching (useQuery) | 2 |
| 5 | Architecture | Nested Drag-and-Drop with Collision Detection | 3 |
| 6 | Architecture | Plugin Architecture with Context Composition | 3 |
| 7 | Hooks & State | Undo/Redo System with Command Pattern | 1 |
| 8 | Performance | Incremental Computation (Signals) | 2 |
| 9 | Hooks & State | Proxy-Based Form State Manager | 2 |
| 10 | Architecture | Optimistic Mutation Queue with Conflict Resolution | 3 |
| 11 | Performance | Web Worker Offloading with Transferable Objects | 3 |
| 12 | Architecture | Accessible Headless Combobox (WAI-ARIA) | 2 |
| 13 | Performance | Suspense Resource Cache (Render-as-You-Fetch) | 3 |
| 14 | Hooks & State | Selectable Context (Solve the Re-Render Problem) | 1 |
| 15 | Performance | Bidirectional Infinite Scroll | 2 |
| 16 | Architecture | Middleware Pipeline for React Hooks | 1 |
| 17 | Performance | Concurrent Search (useTransition + useDeferredValue) | 2 |
| 18 | Architecture | Real-Time Collaborative State (CRDTs) | 4 |
| 19 | Architecture | Custom React Reconciler (Mini Renderer) | 4 |
| 20 | Architecture | Server-Driven UI Renderer | 4 |
| 21 | Hooks & State | Compound Components with Implicit State Sharing | 1 |
| 22 | Architecture | Resilient Error Boundary with Retry and Recovery | 2 |
| 23 | Performance | Spring-Based Animation Engine | 3 |
| 24 | Architecture | Permission-Guarded Component Tree (RBAC) | 3 |

---

## Phase 1: Foundational Patterns

**Goal:** Master the core reducer, state machine, composition, and subscription patterns that every later challenge builds on.

### Challenge #2 — Finite State Machine with useReducer
**Why first:** Teaches you to think in states and transitions — the foundation of every complex UI.

**What to study before attempting:**
- David Khourshid's talk "Goodbye useState" (React Summit 2025) — YouTube
- The Statecharts specification (especially entry/exit actions and guarded transitions)
- XState documentation: concepts section (states, transitions, guards, actions)
- Kyle Shevlin's blog series on state machines with useReducer

**Key concepts to internalize:**
- `useReducer` is naturally a state machine — illegal transitions return the same reference (no re-render)
- Guarded transitions: array of transitions where the first passing guard wins
- Exit → transition action → entry execution order (matches the Statecharts spec)

**Practice exercise:** Build a multi-step form wizard where each step has validation guards that prevent advancing until fields are valid. Model it as a state machine.

---

### Challenge #7 — Undo/Redo System with Command Pattern
**Why second:** Teaches the meta-reducer pattern (wrapping one reducer with another) and the Command design pattern.

**What to study before attempting:**
- Refactoring Guru: Command Pattern (refactoring.guru/design-patterns/command)
- Redux docs: "Implementing Undo History" guide
- How Figma implements undo (search for Figma engineering blog posts on undo)

**Key concepts to internalize:**
- Meta-reducer: intercept special actions (`__UNDO__`, `__REDO__`) and delegate everything else to the inner reducer
- Command coalescing: merge rapid actions of the same type within a time window (how text editors work)
- Past/present/future stacks — new actions always clear the future stack
- `Object.is` to detect no-op dispatches and skip re-renders

**Practice exercise:** Add undo/redo to a drawing canvas where each stroke is a command. Implement coalescing so rapid small strokes merge into one undo step.

---

### Challenge #14 — Selectable Context (Solve the Re-Render Problem)
**Why third:** Teaches you WHY context causes re-renders and how to solve it — essential for every architecture challenge.

**What to study before attempting:**
- Dan Abramov's GitHub RFC: "useContextSelector" (facebook/react issues)
- Daishi Kato's `use-context-selector` library source code
- Blog post: "Why React Context is Not a State Management Tool" (Mark Erikson)

**Key concepts to internalize:**
- Context triggers re-renders for ALL consumers when the value changes, even if they only use a slice
- The solution: external store + selector + subscription, bypassing context for state propagation
- `useSyncExternalStore` as the correct integration point for external stores

**Practice exercise:** Build a theme + user preferences context. Measure re-renders (React DevTools Profiler) with naive context vs. selectable context.

---

### Challenge #16 — Middleware Pipeline for React Hooks
**Why fourth:** Teaches higher-order functions and composition — the pattern behind Redux middleware, Express middleware, and plugin systems.

**What to study before attempting:**
- Redux middleware docs: "Understanding Middleware" (the `store => next => action` signature)
- Express.js middleware concept (same `(req, res, next)` pipeline pattern)
- Functional programming: function composition (`compose`, `pipe`)

**Key concepts to internalize:**
- `store => next => action =>` is curried function composition
- Each middleware wraps the next — like nested function calls
- Thunk middleware: if the action is a function, call it with dispatch/getState
- Logger middleware: log before and after calling next(action)

**Practice exercise:** Build a `useReducer` with logger, thunk (async actions), and persist-to-localStorage middleware chained together.

---

### Challenge #21 — Compound Components with Implicit State Sharing
**Why fifth:** Teaches how to share state between parent and children without prop drilling — used by every component library.

**What to study before attempting:**
- Kent C. Dodds' "Advanced React Patterns" workshop (free blog posts cover the core ideas)
- Radix UI source code: how `<Select>`, `<Dialog>`, `<Tabs>` share state implicitly
- React.Children API, cloneElement, and why Context is preferred over cloneElement

**Key concepts to internalize:**
- Parent component owns state, children consume via context
- Flexible composition: `<Select><Select.Trigger /><Select.Content /></Select>`
- The component "owns" its API surface — consumers can't misuse it

**Practice exercise:** Build an `<Accordion>` compound component where only one panel can be open at a time, with keyboard navigation.

---

## Phase 2: Performance & Data Flow

**Goal:** Master external stores, subscriptions, caching, virtualization, and concurrent React features.

### Challenge #1 — useSyncExternalStore from Scratch
**What to study:**
- React 18 Working Group discussion on `useSyncExternalStore` (github.com/reactwg/react-18)
- The "tearing" problem explained: why external stores break with concurrent rendering
- React source code: `packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js`
- The abandoned `useMutableSource` RFC (understanding why it failed illuminates the design)

**Key concepts:**
- Tearing: React pauses rendering Component A, store mutates, Component B renders with new data — A and B are inconsistent
- Refs updated during render (not in effects) for tearing detection — rare case where this is correct
- Post-render effect with no deps runs every render to catch store mutations between render start and commit
- `handleStoreChange` runs immediately after subscribing to catch the race condition window

---

### Challenge #4 — Concurrent-Safe Data Fetching (useQuery)
**What to study:**
- TanStack Query source code: `QueryObserver` and `QueryCache` classes
- TkDodo's blog: "Practical React Query" series (tkdodo.eu)
- Dan Abramov's "Fixing Race Conditions in React" post
- MDN: AbortController and AbortSignal

**Key concepts:**
- Cache lives OUTSIDE React (module-level) — components are just subscribers
- Deduplication: same-key requests share one in-flight promise
- AbortController on key change eliminates race conditions (userId 1→2→3 resolving out of order)
- Garbage collection with grace period: navigate away and back = instant cache hit
- StrictMode double-mount safety: only abort if we're the last subscriber

---

### Challenge #3 — Virtualized List from Scratch
**What to study:**
- TanStack Virtual source code (github.com/TanStack/virtual)
- Brian Vaughn's react-window: the `VariableSizeList` component
- Binary search algorithm (you must be able to write it without thinking)
- MDN: ResizeObserver, `getBoundingClientRect()`, `requestAnimationFrame`

**Key concepts:**
- Binary search O(log n) to find the first visible item — critical at 100k+ items
- Measure-after-mount with ref callbacks: items self-report their actual height
- `requestAnimationFrame` batches measurement updates to avoid layout thrashing
- `{ passive: true }` on scroll listeners enables compositor-thread scrolling (60fps)

---

### Challenge #8 — Signals / Incremental Computation
**What to study:**
- SolidJS tutorial (solidjs.com/tutorial) — work through the reactivity section
- Preact Signals source code (github.com/preactjs/signals)
- TC39 Signals Proposal (Stage 1) — read the explainer document
- Vue 3 Reactivity docs: "Reactivity in Depth" (vuejs.org)

**Key concepts:**
- Global `currentSubscriber` variable: when a signal's getter is called, it auto-registers the caller as a dependency
- Computed values are lazy + cached: only recompute when marked dirty
- `queueMicrotask` batches effect notifications
- Push-based (signals) vs pull-based (React) reactivity — understand the tradeoffs

---

### Challenge #9 — Proxy-Based Form State
**What to study:**
- react-hook-form source code: the `useForm` hook and `register` function
- MDN: JavaScript Proxy and Reflect APIs
- Valtio source code (proxy-based state management by Daishi Kato)
- "Uncontrolled vs Controlled inputs" — React docs

**Key concepts:**
- Values live in refs, not state — writing to a ref doesn't trigger a re-render
- `register()` returns a ref callback + event handlers (uncontrolled input pattern)
- Dot-notation path resolution for nested fields (`address.city`)
- `structuredClone` on output to prevent consumers from mutating internal state

---

### Challenge #12 — Accessible Headless Combobox
**What to study:**
- WAI-ARIA Combobox Pattern (w3.org/WAI/ARIA/apg/patterns/combobox/)
- Downshift source code (github.com/downshift-js/downshift) — the original headless combobox
- React Aria's useComboBox hook source (Adobe)
- Screen reader testing: install VoiceOver (Mac) or NVDA (Windows) and test with it

**Key concepts:**
- ARIA roles and attributes: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-controls`
- Props getters pattern: `getInputProps()`, `getMenuProps()`, `getItemProps()` — consumer controls rendering
- Keyboard navigation: ArrowUp/Down, Enter, Escape, Home/End
- `aria-live` regions for announcing results to screen readers

---

### Challenge #15 — Bidirectional Infinite Scroll
**What to study:**
- MDN: Intersection Observer API
- How Twitter/X implements bidirectional timeline scroll
- "Infinite Scrolling Done Right" articles (search for React + IntersectionObserver patterns)

---

### Challenge #17 — Concurrent Search (useTransition + useDeferredValue)
**What to study:**
- React 18 docs: useTransition and useDeferredValue
- React Working Group: Concurrent Features discussion
- "Real world example of useTransition" (search for practical demos)

---

### Challenge #22 — Error Boundary with Retry and Recovery
**What to study:**
- React docs: Error Boundaries
- react-error-boundary library source code (by Brian Vaughn / Kent C. Dodds)
- "Resilient Components" — Dan Abramov (overreacted.io)

---

## Phase 3: Advanced Architecture

**Goal:** Combine everything from Phases 1-2 into complex, production-grade systems.

### Challenge #5 — Nested Drag-and-Drop
**What to study:**
- dnd-kit source code (github.com/clauderic/dnd-kit) — collision detection strategies
- Euclidean distance and hit testing algorithms
- Optimistic updates with rollback pattern (reused from challenge #10)

---

### Challenge #6 — Plugin Architecture
**What to study:**
- Grafana plugin architecture documentation
- Backstage (Spotify) plugin system
- WordPress Gutenberg SlotFill system
- "Building a Plugin System in React" articles
- Error Boundary isolation pattern (one crashed plugin doesn't take down the app)

---

### Challenge #10 — Optimistic Mutation Queue
**What to study:**
- TanStack Query: `useMutation` with `onMutate` / `onError` / `onSettled`
- TkDodo's blog: "Optimistic Updates in React Query" (Apr 2025)
- React 19: `useOptimistic` hook documentation
- "Layered optimistic state" concept: `displayData = serverData + pending.reduce()`

---

### Challenge #11 — Web Worker Offloading
**What to study:**
- MDN: Web Workers API, Transferable Objects, SharedArrayBuffer
- Comlink library source code (Google Chrome team)
- How Figma uses Web Workers for rendering
- Object pooling pattern (same concept as database connection pools)

---

### Challenge #13 — Suspense Resource Cache
**What to study:**
- React docs: Suspense for Data Fetching
- "Render-as-You-Fetch" pattern (React team blog posts)
- How Relay implements Suspense integration

---

### Challenge #23 — Spring-Based Animation Engine
**What to study:**
- react-spring source code: the `SpringValue` class
- "A Friendly Introduction to Spring Animations" (josh.comeau.com)
- Hooke's Law (F = -kx) and how it maps to UI animation
- `requestAnimationFrame` animation loop pattern

---

### Challenge #24 — RBAC Permission-Guarded Components
**What to study:**
- RBAC (Role-Based Access Control) pattern
- How AWS IAM policies work (for the mental model)
- React higher-order component and render prop patterns for authorization

---

## Phase 4: Frontier Patterns

**Goal:** Explore cutting-edge patterns that push React to its limits.

### Challenge #18 — Real-Time Collaborative State (CRDTs)
**What to study:**
- Martin Kleppmann's CRDT resources (crdt.tech)
- "An Introduction to CRDTs" — Martin Kleppmann (short talks on YouTube, start here)
- Vector clocks and causal ordering concepts
- How Figma handles real-time collaboration (Figma engineering blog)
- "Designing Data-Intensive Applications" Ch. 5 (Replication) — Martin Kleppmann

---

### Challenge #19 — Custom React Reconciler
**What to study:**
- `react-reconciler` package documentation (React repo)
- Ink source code (github.com/vadimdemedes/ink) — React renderer for the terminal
- react-three-fiber source code — React renderer for Three.js
- "Building a Custom React Renderer" (talk by Sophie Alpert, former React team lead)
- React Fiber architecture overview (the internal data structure)

---

### Challenge #20 — Server-Driven UI Renderer
**What to study:**
- Airbnb's Server-Driven UI engineering blog posts
- How Instagram and Facebook render server-driven feeds
- JSON Schema and component registry patterns
- Dynamic component rendering in React (`React.createElement` from config)

---

## Computer Science Concepts to Study

These CS fundamentals appear repeatedly across the 24 challenges:

### Design Patterns
| Pattern | Used In | Resource |
|---------|---------|----------|
| Observer / Pub-Sub | Store, Signals, Event Bus, Plugins, Collaborative State | refactoring.guru/design-patterns/observer |
| Command | Undo/Redo (#7) | refactoring.guru/design-patterns/command |
| State Machine | FSM (#2), Form validation, Auth flows | Statecharts by David Harel |
| Middleware / Chain of Responsibility | Middleware Pipeline (#16) | Redux middleware docs |
| Proxy | Form State (#9), Signals | MDN Proxy documentation |
| Strategy | Collision Detection (#5), Validation | refactoring.guru/design-patterns/strategy |

### Algorithms & Data Structures
| Concept | Used In | Resource |
|---------|---------|----------|
| Binary Search | Virtualized List (#3) | Any algorithms textbook, LeetCode |
| Topological Sort / Dependency Graphs | Signals (#8) | "Algorithms" by Sedgewick |
| Euclidean Distance / Hit Testing | Drag-and-Drop (#5) | MDN: Math.hypot() |
| Vector Clocks | Collaborative State (#18) | Martin Kleppmann's talks |
| CRDTs | Collaborative State (#18) | crdt.tech |
| Object Pooling | Worker Pool (#11) | Database connection pool concepts |
| LRU / Cache Eviction | Query Cache (#4) | Any systems design resource |

### Web Platform APIs
| API | Used In | Resource |
|-----|---------|----------|
| AbortController | Data Fetching (#4) | MDN |
| ResizeObserver | Virtualized List (#3), Infinite Scroll (#15) | MDN |
| IntersectionObserver | Infinite Scroll (#15) | MDN |
| Web Workers | Worker Offloading (#11) | MDN |
| Transferable Objects (ArrayBuffer) | Worker Offloading (#11) | MDN |
| requestAnimationFrame | Virtualized List (#3), Animations (#23) | MDN |
| Proxy / Reflect | Form State (#9), Signals (#8) | MDN |
| WAI-ARIA | Combobox (#12) | w3.org/WAI/ARIA/apg/ |

---

## Source Code to Read

For each challenge, the "real" version exists in an open-source library. Reading 200-500 lines of the core algorithm is more valuable than reading thousands of lines of boilerplate.

| Challenge | Library | What to Read |
|-----------|---------|-------------|
| #1 useSyncExternalStore | React itself | `packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js` |
| #2 State Machine | XState | `packages/core/src/interpreter.ts` — the `transition()` function |
| #3 Virtualized List | TanStack Virtual | `packages/virtual-core/src/index.ts` — the `Virtualizer` class |
| #4 useQuery | TanStack Query | `packages/query-core/src/queryObserver.ts` and `queryCache.ts` |
| #5 Drag and Drop | dnd-kit | `packages/core/src/utilities/algorithms/` — collision detection |
| #6 Plugin System | Backstage (Spotify) | Plugin registration and extension API |
| #7 Undo/Redo | redux-undo | `src/reducer.js` |
| #8 Signals | Preact Signals | `packages/core/src/index.ts` — the full reactivity system |
| #9 Form State | react-hook-form | `src/useForm.ts` and `src/logic/` |
| #10 Optimistic Mutations | TanStack Query | `packages/query-core/src/mutation.ts` |
| #11 Web Workers | Comlink | `src/comlink.ts` — the Proxy-based worker bridge |
| #12 Combobox | Downshift | `src/hooks/useCombobox/` |
| #19 Reconciler | Ink | `src/reconciler.ts` — React for terminal |
| #23 Animation | react-spring | `packages/core/src/SpringValue.ts` |

**How to read source code effectively:**
1. Find the entry point (usually the main exported function/class)
2. Trace ONE operation end-to-end (e.g., "what happens when I call `dispatch`?")
3. Ignore error handling, edge cases, and TypeScript generics on first pass
4. Draw a diagram of the data flow
5. Re-read with edge cases on the second pass

---

## Books

### Essential
- **"Patterns.dev"** — Lydia Hallie & Addy Osmani (free, patterns.dev)
  - Covers React patterns at an advanced level: compound components, HOCs, render props, hooks patterns
- **"JavaScript Patterns"** — Stoyan Stefanov
  - The middleware, observer, proxy, and command patterns in the challenges all trace back to core JS patterns

### For Specific Challenges
- **"Designing Data-Intensive Applications"** — Martin Kleppmann
  - For challenge #18 (CRDTs, collaborative state). Chapters 5 (Replication) and 9 (Consistency) are most relevant
- **"Refactoring UI"** — Adam Wathan & Steve Schoger
  - For understanding why headless component design (#12, #21) matters
- **"Algorithms"** — Robert Sedgewick
  - For binary search (#3), graph algorithms (#8), and general algorithmic thinking

### Supplementary
- **"Structure and Interpretation of Computer Programs" (SICP)**
  - For deep understanding of closures, higher-order functions, and the evaluation model that underlies React hooks
- **"A Philosophy of Software Design"** — John Ousterhout
  - For understanding why the solutions are structured the way they are (deep modules, information hiding)

---

## Courses

### Directly Relevant
- **Epic React** — Kent C. Dodds (epicreact.dev)
  - Advanced Patterns workshop: compound components, context composition, render props
  - Performance workshop: memoization, code splitting, virtualization
- **Frontend Masters: State Machines in JavaScript** — David Khourshid
  - Directly covers challenge #2 (FSM with useReducer) and the XState mental model
- **Frontend Masters: Advanced React Patterns** — Kent C. Dodds
  - Compound components, flexible compound components, state reducer pattern
- **ui.dev: React Internals** — Tyler McGinnis
  - Reconciliation, Fiber, hooks implementation — needed for challenge #19
- **Frontend Masters: Web Performance** — Todd Gardner
  - Virtualization, web workers, requestAnimationFrame — needed for challenges #3, #11, #23
- **Testing Accessibility** — Marcy Sutton (available on various platforms)
  - For challenge #12 (WAI-ARIA combobox)

### For CS Fundamentals
- **MIT OpenCourseWare: 6.006 Introduction to Algorithms**
  - Free. Covers binary search, graph traversal, and the algorithmic thinking behind several challenges.

---

## Blogs & People to Follow

### Essential Reading
| Person | Where | Why |
|--------|-------|-----|
| Dan Abramov | overreacted.io | React mental models, hooks philosophy, concurrent mode design decisions |
| TkDodo (Dominik) | tkdodo.eu | React Query internals, data fetching patterns, practical React architecture |
| Kent C. Dodds | kentcdodds.com | Advanced React patterns, testing, compound components |
| Mark Erikson | blog.isquaredsoftware.com | Redux maintainer, deep dives on React rendering, state management |
| David Khourshid | @davidkpiano / stately.ai/blog | State machines in UI, XState, "Goodbye useState" |
| Daishi Kato | blog.axlight.com | Jotai, Valtio, Zustand — all the state management libs |
| Josh Comeau | joshwcomeau.com | Spring animations, CSS, visual explanations of React concepts |

### For Specific Topics
| Person | Topic |
|--------|-------|
| Ryan Florence & Michael Jackson (Remix team) | Data loading, routing patterns, React Router |
| Sophie Alpert (former React team lead) | React internals, custom reconcilers |
| Sebastian Markbage (React team) | React architecture decisions, Fiber, concurrent mode |
| Martin Kleppmann | Distributed systems, CRDTs, collaborative editing |
| Tanner Linsley | TanStack (Query, Virtual, Table, Router) — real-world OSS architecture |
| Brian Vaughn (former React team) | React DevTools, react-window, profiling |

---

## Practice Method

### For Each Challenge

**Day 1: Attempt (30 min, no hints)**
1. Read the challenge description, requirements, and starter code
2. On paper, write down:
   - What is the state shape?
   - What are the transitions/events?
   - What can go wrong? (race conditions, stale data, memory leaks, re-render storms)
   - What invariants must hold?
3. Attempt the implementation for 30 minutes
4. If stuck, that's fine — move to Day 2

**Day 2: Study the Solution**
1. Read the solution code line by line
2. For each line, ask: "Why is this here? What breaks if I remove it?"
3. Read the `keyPoints` — these explain the design decisions
4. Read the `followUp` questions — these reveal the next level of understanding
5. Cross-reference with the library source code listed in "Source Code to Read"

**Day 3: Rebuild from Memory**
1. Without looking at the solution, implement it again
2. You'll remember the architecture but forget details — that's the point
3. Compare your version to the solution. Note what you forgot and why.

**Day 4+: Extend It**
1. Tackle the `followUp` questions for the challenge
2. These push you beyond the solution into production-grade territory

### Weekly Rhythm
- **Monday/Tuesday:** Attempt new challenge + study solution
- **Wednesday:** Rebuild from memory + read relevant library source
- **Thursday/Friday:** Extend with follow-up questions
- **Weekend:** Read one blog post or watch one talk from the resource list

### Progress Tracking

Use this checklist to track your progress:

```
Phase 1 — Foundational Patterns
[ ] #2  Finite State Machine
[ ] #7  Undo/Redo (Command Pattern)
[ ] #14 Selectable Context
[ ] #16 Middleware Pipeline
[ ] #21 Compound Components

Phase 2 — Performance & Data Flow
[ ] #1  useSyncExternalStore
[ ] #4  useQuery (Data Fetching)
[ ] #3  Virtualized List
[ ] #8  Signals / Dependency Tracking
[ ] #9  Form State Manager
[ ] #12 Headless Combobox (ARIA)
[ ] #15 Infinite Scroll
[ ] #17 Concurrent Search
[ ] #22 Error Boundary

Phase 3 — Advanced Architecture
[ ] #5  Drag-and-Drop
[ ] #6  Plugin Architecture
[ ] #10 Optimistic Mutations
[ ] #11 Web Workers
[ ] #13 Suspense Resource Cache
[ ] #23 Animation Engine
[ ] #24 RBAC Permissions

Phase 4 — Frontier
[ ] #18 Collaborative State (CRDTs)
[ ] #19 Custom Reconciler
[ ] #20 Server-Driven UI
```

---

## Key Insight

The people who write code like these solutions are not memorizing patterns. They are deeply familiar with a small number of principles — **data flow, subscriptions, immutability, closures, the event loop** — and recombine them for each new problem.

Every challenge in `expert.jsx` is a different combination of the same ~10 core ideas:

1. External mutable store + React subscription (pub/sub)
2. Reducers for pure state transitions
3. Refs for mutable values that don't trigger re-renders
4. Effects for synchronization with external systems
5. Memoization for derived/computed values
6. AbortController for cancellation
7. Object.is for equality checking
8. structuredClone for safe copying
9. Composition of small functions into pipelines
10. Separation of mechanism (how) from policy (what)

Master these 10 ideas, and the 24 challenges become variations on a theme rather than 24 separate things to memorize.
