# Real-World Examples, Issues & Use Cases

A companion to `STUDY_GUIDE.md` — organized by challenge, with production incidents, GitHub issues, companies, common mistakes, and interview questions.

---

## Table of Contents

- [Phase 1: Foundational Patterns](#phase-1-foundational-patterns)
  - [#2 Finite State Machine](#2-finite-state-machine-with-usereducer)
  - [#7 Undo/Redo Command Pattern](#7-undoredo-system-with-command-pattern)
  - [#14 Selectable Context](#14-selectable-context)
  - [#16 Middleware Pipeline](#16-middleware-pipeline)
  - [#21 Compound Components](#21-compound-components)
- [Phase 2: Performance & Data Flow](#phase-2-performance--data-flow)
  - [#1 useSyncExternalStore](#1-usesyncexternalstore)
  - [#4 Data Fetching / useQuery](#4-concurrent-safe-data-fetching-usequery)
  - [#3 Virtualized List](#3-virtualized-list)
  - [#8 Signals](#8-signals--incremental-computation)
  - [#9 Form State](#9-proxy-based-form-state)
  - [#12 Headless Combobox](#12-accessible-headless-combobox)
  - [#15 Infinite Scroll](#15-bidirectional-infinite-scroll)
  - [#17 Concurrent Search](#17-concurrent-search)
  - [#22 Error Boundary](#22-error-boundary)
- [Phase 3: Advanced Architecture](#phase-3-advanced-architecture)
  - [#5 Drag-and-Drop](#5-nested-drag-and-drop)
  - [#6 Plugin Architecture](#6-plugin-architecture)
  - [#10 Optimistic Mutations](#10-optimistic-mutation-queue)
  - [#11 Web Workers](#11-web-worker-offloading)
  - [#13 Suspense Resource Cache](#13-suspense-resource-cache)
  - [#23 Animation Engine](#23-spring-based-animation-engine)
  - [#24 RBAC Permissions](#24-rbac-permission-guarded-components)
- [Phase 4: Frontier Patterns](#phase-4-frontier-patterns)
  - [#18 Collaborative State / CRDTs](#18-real-time-collaborative-state-crdts)
  - [#19 Custom Reconciler](#19-custom-react-reconciler)
  - [#20 Server-Driven UI](#20-server-driven-ui-renderer)

---

## Phase 1: Foundational Patterns

### #2 Finite State Machine with useReducer

#### Production Incidents
- **The `isLoading` boolean bug**: Kent C. Dodds documented a real scenario where using `isLoading`/`isError` booleans instead of a state machine caused a geolocation app to show stale position data instead of error messages after connection loss. The fix: replace booleans with a status enum (`idle`/`pending`/`resolved`/`rejected`). State machines make impossible states unrepresentable.
- **XState `@xstate/inspect` fails in production** (Issue #2020): The inspect devtool bails entirely when `NODE_ENV === 'production'`, leaving developers without debugging tools in the environment where they need them most.
- **XState errors don't reach Sentry** (Issue #2319): Errors thrown from XState services are logged to console but don't propagate to error tracking services like Sentry's unhandled promise rejection handler.

#### Companies Using This Pattern
- **Kong**: XState in production for form states, errors, loading, and modal flows in Kong Manager (Vue app)
- **Back Market**: XState in their e-commerce platform
- **Koordinates**: Nearly their entire v10 UI built with XState and xstate-tree
- **ThingCo**: 18+ months in production managing authentication flows on mobile and web
- **Meru Health**: XState in React Native for managing complex user interactions
- **tldraw**: Uses Signia signals with a command-based state machine for their collaborative whiteboard
- Full list of companies: github.com/statelyai/xstate/discussions/255

#### Common Mistakes
1. **Overusing `useState` for complex flows** — scattered logic, impossible state combinations, tangled updates
2. **Not defining all valid transitions explicitly** — leaving implicit transitions that cause bugs
3. **Putting side effects in the wrong place** — effects belong in entry/exit actions, not in the transition logic
4. **Making the machine too granular** — not every boolean needs to be a state machine

#### Interview Questions
- "Design a multi-step checkout flow as a state machine. What states, events, and guards would you define?"
- "What are 'impossible states' and how do state machines prevent them?"
- "Compare XState's actor model to useReducer for managing complex async flows"
- "When would you NOT use a state machine?"

#### Key Resources
- [Goodbye, useState](https://blog.logrocket.com/goodbye-usestate-react-state-modeling/) — LogRocket
- [Stop Using isLoading Booleans](https://kentcdodds.com/blog/stop-using-isloading-booleans) — Kent C. Dodds
- [XState: In the Wild!](https://github.com/statelyai/xstate/discussions/255) — Companies using XState

---

### #7 Undo/Redo System with Command Pattern

#### Production Incidents
- **redux-undo can't handle side effects** (Issue #150): When an action triggers an API call, undoing that action should reverse the API call — but redux-undo only stores state changes, not action types, making server-side undo impossible.
- **redux-undo incompatible with Redux Toolkit** (Issue #308 in redux-toolkit): `createReducer` doesn't use the `produce` function in a way compatible with redux-undo's `undoable` higher-order reducer.
- **Cross-slice state access** (Issue #147 in redux-undo): Some reducers need state from other slices, but `undoable` only passes its own slice of state.

#### Companies Using This Pattern
- **tldraw**: History stack uses "marks" and "commands" — commands have their own `undo()` and `redo()` methods. `Editor.mark()` creates checkpoints; undo reverts to the last mark. Built on their Signia signals library with transaction rollback support.
- **Figma**: Each user has their own undo/redo stack for widget state changes. The `figma.commitUndo()` API controls how plugin actions group in the undo history.
- **PowToon**: Built their own `redux-undo-redo` middleware because the standard library couldn't handle their animation timeline requirements.

#### Common Mistakes
1. **Storing full state snapshots** instead of commands — O(n) memory growth for large state trees
2. **Not implementing command coalescing** — every keystroke becomes a separate undo step
3. **Forgetting that new actions clear the redo stack** — this is universal behavior but easy to miss
4. **Not considering collaborative undo** — operational transform is needed when multiple users edit simultaneously

#### Interview Questions
- "Design an undo/redo system for a collaborative drawing app. How does per-user undo work?"
- "What is command coalescing and why do text editors need it?"
- "Compare snapshot-based undo vs. command-based undo. What are the memory/performance tradeoffs?"
- "How would you add named checkpoints (save points) to an undo system?"

#### Key Resources
- [tldraw Editor Docs](https://canary.tldraw.dev/docs/editor) — Marks + commands architecture
- [Introducing Signia](https://tldraw.substack.com/p/introducing-signia) — Signals with transaction rollback
- [Undo, Redo, and the Command Pattern](https://www.esveo.com/en/blog/undo-redo-and-the-command-pattern/) — esveo

---

### #14 Selectable Context

#### Production Incidents
- **The Context Re-render Problem**: A complex multi-selection component using React Context became sluggish with 50+ items because every selection change re-rendered ALL consumers. This is Context's fundamental limitation: all-or-nothing re-rendering.
- **The `useContextSelector` RFC** (PR #119 in reactjs/rfcs): Submitted by Josh Story in 2019, this RFC showed a 10x performance difference (40ms vs 4ms) for context updates with selectors. After 500+ positive reactions, the React team pivoted to the React Compiler as their preferred solution. As of August 2025, they indicated selectors aren't necessary given the Compiler's memoization capabilities.

#### Companies & Libraries
- **Zustand, Jotai, Valtio** (by Daishi Kato): All solve the context re-render problem with external stores + selectors
- **Redux (v8+)**: `useSelector` uses `useSyncExternalStore` internally, avoiding context re-renders entirely
- **use-context-selector** (Daishi Kato): Community polyfill with 1000+ npm dependents

#### Common Mistakes
1. **Using Context for frequently-changing state** — Context is designed for infrequent updates (theme, locale, auth)
2. **Not splitting contexts** — one large context re-renders everything; split by update frequency
3. **Wrapping the entire app in providers** — providers should be as close to consumers as possible
4. **Memoizing context value without memoizing children** — `useMemo` on the value helps, but children still re-render without `React.memo`

#### Interview Questions
- "Why does React Context cause unnecessary re-renders? Draw the component tree and explain."
- "How does Zustand avoid the context re-render problem?"
- "What is `useSyncExternalStore` and how does it relate to external state management?"
- "The React Compiler claims to solve re-render problems. How does it compare to selectable context?"

#### Key Resources
- [RFC: Context Selectors](https://github.com/reactjs/rfcs/pull/119) — The foundational discussion
- [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) — TkDodo
- [Zustand Comparison Page](https://zustand.docs.pmnd.rs/getting-started/comparison) — Official benchmarks

---

### #16 Middleware Pipeline

#### Production Incidents
- **Redux antipatterns** (Issue #857 in reduxjs/redux): Key antipatterns documented — dispatching multiple actions from action creators instead of letting reducers respond to broadcast actions, and putting business logic in action creators instead of reducers.

#### When to Use Which Middleware
- **Redux Thunk**: Simple async (API calls, basic conditional dispatch). Familiar promise-based model.
- **Redux Saga**: Complex workflows — retry logic, race conditions, debouncing, polling, dependent async chains. Uses generators for testable, declarative side effects.
- **Neither**: Modern alternatives (TanStack Query, SWR) have largely replaced Redux middleware for data fetching.

#### Interview Questions
- "Explain the `store => next => action =>` middleware signature. What is each parameter?"
- "Compare Redux Thunk vs Redux Saga. When would you choose each?"
- "How would you implement an optimistic update middleware?"
- "What is the difference between middleware and a higher-order reducer?"

#### Key Resources
- [Redux Middleware Docs](https://redux.js.org/understanding/history-and-design/middleware) — Understanding Middleware
- [Redux Antipatterns](https://github.com/reduxjs/redux/issues/857) — Production patterns to avoid

---

### #21 Compound Components

#### Production Examples
- **Radix UI**: `<Select>`, `<Dialog>`, `<Tabs>`, `<Accordion>` all use compound components with context
- **Headless UI** (Tailwind Labs): Designed for Tailwind CSS integration with compound component API
- **React Aria** (Adobe): Most comprehensive accessibility with compound component patterns
- **Ark UI**: Cross-framework headless compound components

#### Common Mistakes
1. **Using `React.cloneElement` instead of Context** — cloneElement doesn't work with nested wrappers
2. **Exposing internal state directly** — the parent should control the API surface
3. **Not supporting controlled + uncontrolled modes** — component libraries must support both
4. **Missing keyboard navigation** — compound components often represent ARIA widget patterns

---

## Phase 2: Performance & Data Flow

### #1 useSyncExternalStore

#### Production Incidents
- **The Tearing Problem**: In concurrent mode, React can pause Component A, let a store mutate, then render Component B with new data — A and B show inconsistent state. This was documented in [reactwg/react-18 Discussion #69](https://github.com/reactwg/react-18/discussions/69).
- **react-redux v8 performance regression** (Issue #1869): Switching to `useSyncExternalStore` caused performance regressions because it forces synchronous rendering, defeating some concurrent mode benefits. Tracked in [Issue #2086](https://github.com/reduxjs/react-redux/issues/2086).
- **The abandoned `useMutableSource`** (Discussion #86 in reactwg/react-18): React's first attempt at solving tearing was `useMutableSource`, which was abandoned in favor of `useSyncExternalStore` due to selector re-subscription costs.

#### Companies Using This Pattern
- **Redux v8+**, **Zustand**, **Jotai**, **TanStack Store**: All use `useSyncExternalStore` internally
- 1000+ npm packages depend on `use-sync-external-store`
- Browser API integrations: `navigator.onLine`, `matchMedia`, `localStorage` — all should use this hook

#### Common Mistakes
1. **Returning new objects from `getSnapshot`** — causes infinite re-renders (React uses `Object.is`)
2. **Defining `subscribe` inside the component** — new function reference each render causes resubscription
3. **Side effects in `getSnapshot`** — must be a pure function returning immutable data
4. **Missing `getServerSnapshot` for SSR** — causes hydration mismatch errors
5. **Suspending on store values** — triggers the nearest Suspense fallback, replacing content with a spinner

#### Interview Questions
- "What is tearing in concurrent React and how does `useSyncExternalStore` prevent it?"
- "Why did the React team abandon `useMutableSource` in favor of `useSyncExternalStore`?"
- "What happens if `getSnapshot` returns a new object reference every time?"
- "When should you use `useSyncExternalStore` vs `useState`?"

#### Key Resources
- [What is tearing?](https://github.com/reactwg/react-18/discussions/69) — React Working Group
- [useMutableSource -> useSyncExternalStore](https://github.com/reactwg/react-18/discussions/86)
- [react-redux Issue #2086](https://github.com/reduxjs/react-redux/issues/2086) — Performance with transitions
- [will-this-react-global-state-work-in-concurrent-rendering](https://github.com/dai-shi/will-this-react-global-state-work-in-concurrent-rendering) — Test suite for tearing

---

### #4 Concurrent-Safe Data Fetching (useQuery)

#### Production Incidents
- **Race condition with Loadable Components** (TanStack/query Discussion #4598): Using code-splitting with data fetching causes race conditions where old query results overwrite new ones.
- **Parallel fetching broken with Suspense** (TanStack/query Discussion #5946): When using Suspense mode, parallel queries serialize into waterfalls because React bails out on first suspension.
- **AbortController race condition**: Without abort on key change, rapidly changing `userId` from 1→2→3 can resolve in order 1, 3, 2 — showing user 2's data for user 3.

#### Companies Using This Pattern
- **Every production React app** fetching data uses some variant of this pattern
- **TanStack Query**: 8M+ weekly npm downloads
- **SWR** (Vercel): Stale-while-revalidate built into Next.js
- **Apollo Client**: GraphQL equivalent with same caching architecture

#### Common Mistakes
1. **Not cancelling requests on key change** — the #1 source of race conditions in React
2. **Missing AbortController cleanup in useEffect** — memory leaks and stale updates
3. **Not deduplicating in-flight requests** — two components with same key fire two fetches
4. **Ignoring StrictMode double-mount** — aborting your own request on the second mount
5. **Fetching in components (fetch-on-render)** instead of route loaders (render-as-you-fetch) — creates waterfalls

#### Interview Questions
- "Walk through a race condition in data fetching. How does AbortController fix it?"
- "What is stale-while-revalidate and why does it improve perceived performance?"
- "How does TanStack Query deduplicate in-flight requests?"
- "Design a cache with garbage collection for unmounted query subscribers."

#### Key Resources
- [Handling API Request Race Conditions](https://sebastienlorber.com/handling-api-request-race-conditions-in-react) — Sebastien Lorber
- [Fixing Race Conditions with useEffect](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect) — Max Rozen
- [Request Waterfalls](https://tanstack.com/query/latest/docs/framework/react/guides/request-waterfalls) — TanStack docs

---

### #3 Virtualized List

#### Production Incidents
- **Discord mobile 14% memory reduction**: Discord virtualized their chat, member lists, emoji picker, and server list. Mobile uses Android RecyclerView with "View Portaling" — a technique allowing native code to move rendered JS views as they enter the viewport.
- **TanStack Virtual SSR measurement bug** (TanStack/router Issue #2036): Dynamic measurement stops working for server-rendered items. Scrolling away and back forces re-measurement, but initial render shows incorrect heights.
- **max-height container first render** (TanStack/virtual Issue #871): With a dynamically sized list using `max-height`, the first render shows incorrect item count. A forced re-render fixes it.
- **State loss on scroll**: Internal component state is not preserved when content scrolls out of the render window. VirtualizedList components are PureComponents.

#### Library Landscape
- **@tanstack/react-virtual**: ~8.4M weekly downloads (most popular, modern)
- **react-window**: ~4.4M weekly downloads (lightweight, stable)
- **react-virtualized**: ~1.4M weekly downloads (feature-rich, larger bundle)
- **React Virtuoso**: Specialized for chat interfaces, auto-scroll, streaming responses

#### Common Mistakes
1. **Not passing the style prop** — all items stack on top of each other
2. **Storing state inside virtualized items** — state is lost when items scroll out of view
3. **Using array indices as keys** — breaks when data is modified
4. **Not providing overscan** — fast scrolling shows blank areas
5. **Variable height without measurement** — react-window expects known sizes; dynamic content requires `measureElement`

#### Interview Questions
- "Explain the windowing/virtualization technique. How does it reduce DOM nodes?"
- "How would you handle variable-height items in a virtualized list?"
- "Render every word in the English dictionary in a performant, scrollable list." (common coding exercise)
- "How does Discord handle virtualization in their chat UI?"

#### Key Resources
- [Discord: Supercharging Mobile](https://discord.com/blog/supercharging-discord-mobile-our-journey-to-a-faster-app)
- [Attio: Building Virtualized UIs Declaratively](https://attio.com/engineering/blog/react-data-list-building-virtualized-uis-declaratively)
- [TanStack Virtual vs react-window](https://github.com/TanStack/virtual/discussions/459) — Comparison discussion

---

### #8 Signals / Incremental Computation

#### The TC39 Signals Proposal
- **Stage 1** in April 2024, **Stage 3** as of July 2025
- Champions: Daniel Ehrenberg, Yehuda Katz, and others
- Framework collaboration: Authors of Angular, Ember, FAST, MobX, Preact, Qwik, RxJS, Solid, Svelte, Vue, and more

#### Signals vs React Compiler
- **Signals**: Skip the virtual DOM entirely; updates propagate only to DOM nodes that depend on changed values. Cannot avoid prop-drilling because state doesn't travel through the component tree.
- **React Compiler**: Auto-memoizes components and values, still uses virtual DOM diffing. Cannot avoid prop-drilling either — but for a different reason (state must propagate from source to consumer).

#### Companies Using Signals
- **Angular** (Google): Adopted signals as their primary reactive primitive
- **Svelte 5**: "Runes" are their signals implementation
- **Vue 3**: Reactivity system is fundamentally signal-based
- **tldraw**: Built Signia for performance demands other signal libraries couldn't meet

#### Interview Questions
- "What is fine-grained reactivity and how does it differ from React's reconciliation?"
- "Explain the TC39 Signals proposal and its current status."
- "Why can signals avoid re-rendering components that the React Compiler cannot?"
- "What is the tradeoff between push-based (signals) and pull-based (React) reactivity?"

#### Key Resources
- [TC39 Signals Proposal](https://github.com/tc39/proposal-signals)
- [Signals vs React Compiler](https://redmonk.com/kholterhoff/2025/05/13/javascript-signals-react-compiler/) — RedMonk analysis
- [React Compiler Will Not Solve Prop-Drilling](https://www.builder.io/blog/react-compiler-will-not-solve-prop-drilling) — Builder.io

---

### #9 Proxy-Based Form State

#### Production Incidents
- **FormProvider causes unnecessary rerenders** (react-hook-form Issue #10512): `HookFormContext` value changes on every render, breaking memoization of child components.
- **Proxy crashes Jest** (Issue #1520): The Proxy object returned for formState returns `{}` for unknown properties, breaking Jest snapshot serialization.
- **Controller re-render bug** (Issue #2137): In production builds, `<Controller>` doesn't re-render on value changes.
- **`isDirty` always false outside render**: The Proxy subscription only tracks reads during render — reading `isDirty` in a `beforeunload` handler returns stale values.

#### Scale
- **15.8M+ weekly npm downloads**, 44k+ GitHub stars
- **8,500+ dependent npm packages**

#### Common Mistakes
1. **Not reading `formState` during render** — the Proxy only tracks subscriptions during the render cycle
2. **Using `watch` instead of `useWatch`** — `watch` re-renders the entire form; `useWatch` localizes re-renders
3. **Using `useFormContext` instead of `useFormState`** — useFormContext re-renders on every form update
4. **Not understanding the uncontrolled architecture** — developers from Formik fight it instead of embracing it

#### Interview Questions
- "Why is react-hook-form faster than Formik? What architectural pattern enables this?"
- "Explain how Proxy-based formState subscription works."
- "How would you optimize a 100-field form in React?"
- "Compare react-hook-form, Formik, and React 19's built-in form handling."

#### Key Resources
- [react-hook-form Performance Compare](https://github.com/react-hook-form/performance-compare) — Official benchmark
- [FormProvider Rerenders](https://github.com/react-hook-form/react-hook-form/issues/10512)

---

### #12 Accessible Headless Combobox

#### Production Incidents
- **Radix UI audit: 35 accessibility issues** (Discussion #2232): A professional audit by Publicis Sapient found 35 issues classified P1-P3. Many were still present as of 2025.
- **Radix Toast not announced** (Issue #3634): `aria-live="off"` prevents screen reader announcements entirely.
- **ADA lawsuit surge**: 8,800 complaints filed in 2024 (7% increase). Fashion Nova settled for $5.15M. 25% of lawsuits cited accessibility overlay widgets as barriers, not solutions.
- **The average homepage**: 51 WCAG violations — one barrier every 24 elements.

#### Library Landscape
- **Radix UI**: Most popular for React. Foundation for shadcn/ui.
- **React Aria** (Adobe): Most comprehensive accessibility. Recommended for complex ARIA widgets.
- **Headless UI** (Tailwind Labs): Gentlest learning curve.
- **Downshift**: Specialized for combobox/autocomplete with thorough screen reader testing.

#### Common Mistakes
1. **Relying on ARIA overlay widgets** — 25% of 2024 lawsuits cited these as barriers
2. **Not testing with actual screen readers** — automated tools catch only a fraction of real issues
3. **Missing keyboard navigation** — Tab, Escape, Arrow keys, Enter/Space
4. **Assuming headless libraries are fully accessible** — even Radix has 35 known issues from professional audits
5. **Incorrect ARIA roles** — `role="button"` on a div without keyboard handler

#### Interview Questions
- "What is the WAI-ARIA combobox pattern and what keyboard interactions does it require?"
- "Explain focus trapping in a modal dialog."
- "How do headless component libraries handle accessibility differently from styled libraries?"
- "What WCAG level does your company target, and how do you test for compliance?"

#### Key Resources
- [Radix UI Accessibility Audit](https://github.com/radix-ui/primitives/discussions/2232) — 35 issues found
- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Website Accessibility in 2025](https://www.audioeye.com/post/website-accessibility-in-2025/) — Lawsuit data

---

### #15 Bidirectional Infinite Scroll

#### Production Incidents
- **react-window can't scroll upward** (Issue #317): List index is bounded to zero — bidirectional scroll is architecturally impossible.
- **Safari scroll snap catastrophe** (Issue #290): A fast "flick" with CSS scroll snapping jumps to the very end on WebKit.
- **React Virtuoso reverse scrolling flickering** (Discussion #1083): Dynamic height items cause jumping when scrolling upward.
- **`startReached` fires only once** (Discussion #1177): After loading the first batch of older messages, upward scroll detection breaks.
- **Expensify $40,000 bounty** (Issue #7925): For fixing `maintainVisibleContentPosition` in React Native ScrollView.

#### Companies Using This Pattern
- **Twitter/X**: Cursor-based pagination with `seenTweetIds` to prevent duplicates. Hybrid fanout into Redis.
- **Stream (GetStream.io)**: Built and open-sourced `react-native-bidirectional-infinite-scroll` for their chat SDK.
- **Discord/Slack**: The canonical bidirectional scroll use case — load older messages upward, new messages appear at bottom.

#### Common Mistakes
1. **Offset-based pagination** — breaks when items are inserted/deleted. Use cursor-based pagination.
2. **Not combining virtualization with infinite scroll** — causes linear memory/DOM growth.
3. **Not adjusting scroll position on prepend** — content jumps when older messages load above.
4. **Scroll events instead of IntersectionObserver** — 60-80% more CPU usage.
5. **Handling both start/end callbacks simultaneously** — causes scroll jumps. Must serialize.

#### Key Resources
- [Stream: Bidirectional Infinite Scroll](https://getstream.io/blog/react-native-how-to-build-bidirectional-infinite-scroll/)
- [Addy Osmani: Infinite Scroll without Layout Shifts](https://addyosmani.com/blog/infinite-scroll-without-layout-shifts/)
- [react-window Issue #317](https://github.com/bvaughn/react-window/issues/317) — Fundamental limitation

---

### #17 Concurrent Search

#### Production Incidents
- **Agora Systems**: Implemented useTransition for search filters in Q1 2025. Render times dropped 45%, handled 100k concurrent users, 25% uplift in conversion rates.
- **Scheduling Profiler false positives** (facebook/react Issue #22613): React's profiler incorrectly flags useDeferredValue/useTransition as expensive sync updates.

#### useTransition vs Debounce — Critical Distinction
- **Debounce**: Limits API calls (network). Adds artificial latency. Still needed for rate-limiting.
- **useTransition**: Manages render priority (CPU). No artificial delay. Doesn't prevent API calls.
- **Best practice**: Debounce for API calls, useTransition for render-heavy filtering.

#### Common Mistakes
1. **Wrapping ALL state updates in useTransition** — only low-priority updates should be wrapped
2. **Using useTransition for input changes** — makes input feel laggy because it defers the update
3. **Using both useTransition AND useDeferredValue** — they accomplish the same thing from different sides
4. **Forgetting React.memo with useDeferredValue** — without memo, the component re-renders on the urgent value anyway
5. **Expecting useTransition to replace debounce for APIs** — it manages renders, not network requests

#### Interview Questions
- "What's the difference between useTransition and useDeferredValue?"
- "Why might useTransition be better than debounce for filtering a large in-memory list?"
- "When should you still use debounce even if useTransition is available?"
- "Implement a search box that filters 10,000 items without blocking the UI."

#### Key Resources
- [Patterns for startTransition](https://github.com/reactwg/react-18/discussions/100) — React Working Group
- [SIXT: useTransition vs useDeferredValue](https://www.sixt.tech/useTransition-vs-useDeferredValue)
- [Developerway: React useTransition Performance](https://www.developerway.com/posts/use-transition)

---

### #22 Error Boundary

#### Production Incidents
- **Facebook Messenger**: Wraps sidebar, info panel, conversation log, and message input in separate error boundaries. One section crashing doesn't take down the rest. This is the canonical production example.
- **React 19 production error invisibility** (Issue #33967): Exceptions caught by error boundaries in production builds aren't visible in UI but show up in Sentry. Dev mode rethrows to global handler, causing duplicate reports.
- **React 19 error hook changes**: `onCaughtError`, `onUncaughtError`, `onRecoverableError` at root level change error handling behavior between dev and prod.

#### Common Mistakes
1. **Single global error boundary** — full-page error for any crash. Use granular boundaries.
2. **Expecting error boundaries to catch everything** — they do NOT catch: event handlers, async code, SSR errors, or errors in the boundary itself.
3. **No retry mechanism** — always include "Try Again" via `resetErrorBoundary`.
4. **Not integrating with monitoring** — use `componentDidCatch` or `onError` to report to Sentry/DataDog.
5. **Class component requirement** — there's no hooks equivalent. Use `react-error-boundary` library.

#### Interview Questions
- "What types of errors can error boundaries NOT catch?"
- "Describe Facebook's approach to error boundaries in Messenger."
- "How would you implement retry with exponential backoff in an error boundary?"
- "How do React 19's error hooks change error handling?"

#### Key Resources
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary) — Brian Vaughn
- [Sentry Error Boundary](https://docs.sentry.io/platforms/javascript/guides/react/features/error-boundary/)
- [React Issue #33967](https://github.com/facebook/react/issues/33967) — Production error invisibility

---

## Phase 3: Advanced Architecture

### #5 Nested Drag-and-Drop

#### Production Incidents
- **dnd-kit maintenance uncertainty** (Discussion #1355): The creator stepped back from active maintenance, causing concern for production users. Pragmatic DnD (by the Atlassian team) has emerged as an alternative.
- **dnd-kit collision detection with nested containers**: Default `closestCenter` algorithm fails with nested drop zones — items intended for a column get inserted into the wrong container. Requires custom collision strategies.

#### Companies Using This Pattern
- **Trello, Linear, Notion, Jira**: All implement nested DnD with optimistic updates
- **Puck Editor**: Uses dnd-kit for their visual page builder with nested component drag

#### Common Mistakes
1. **Using default collision detection for nested containers** — closestCenter doesn't understand hierarchy
2. **Not implementing optimistic updates** — drag feels sluggish if you wait for server confirmation
3. **Missing keyboard accessibility** — drag must work with arrow keys for WCAG compliance
4. **No auto-scrolling near edges** — users can't drag items to off-screen containers

#### Key Resources
- [dnd-kit Collision Detection Docs](https://docs.dndkit.com/api-documentation/context-provider/collision-detection-algorithms)
- [Top 5 DnD Libraries for React](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)

---

### #6 Plugin Architecture

#### Companies Using This Pattern
- **Backstage (Spotify)**: Internal developer portal with 100+ open-source plugins. TypeScript/React applications loaded dynamically.
- **Grafana**: Frontend plugins loaded at runtime via SystemJS with shared packages (`@grafana/data`, `@grafana/ui`, `@grafana/runtime`).
- **WordPress Gutenberg**: `SlotFillProvider` at app root with named Slots. `bubblesVirtually` prop enables React portal rendering with correct event bubbling.
- **Nylas**: OmniStore (single top-level store) with runtime isolation for plugin business logic.

#### Production Issue
- **Gutenberg SlotFill broken with portals** (Issue #27191): When Fills are rendered through React portals, event bubbling doesn't work as expected, breaking plugin interactions.

#### Common Mistakes
1. **Not isolating plugin state** — tight coupling creates unpredictable side effects
2. **Bundling React in each plugin** — duplicate React instances break hooks/context
3. **No plugin API versioning** — breaking changes destroy all installed plugins
4. **No error boundaries around plugins** — one crash takes down the entire app
5. **String-based registries without types** — silent failures when Slot/Fill names don't match

#### Interview Questions
- "Design a plugin system for a React dashboard. How do you handle isolation, versioning, and shared state?"
- "What is the Slot/Fill pattern? How does it differ from React Portals?"
- "How do you prevent a buggy plugin from crashing the host application?"

---

### #10 Optimistic Mutation Queue

#### Production Incidents
- **React 19 `useOptimistic` rolls back unexpectedly** (Issue #31967, #31961): Confirmed bug — state reverts with no server error.
- **Background actions block optimistic state** (Issue #30637): Any unrelated async action keeps optimistic state active indefinitely.
- **Duplicate optimistic items** (Issue #28574): Rapid clicks create duplicate items because revert happens in a low-priority transition lane.
- **TanStack Query race condition** (Discussion #7932): Query invalidation from mutation1 overwrites mutation2's optimistic state.

#### Companies Using This Pattern
- **Linear**: Full sync engine with MobX. Each mutation implemented twice (server + optimistic). Apps feel instant with 0ms perceived latency.
- **Figma**: Local-first — changes applied immediately, synced asynchronously.
- **Notion**: Optimistic block editing with operational transform conflict resolution.

#### Common Mistakes
1. **Not cancelling queries in `onMutate`** — refetch overwrites optimistic value
2. **Not snapshotting previous state for rollback** — impossible to revert on error
3. **Invalidating after every mutation** — only invalidate after the LAST mutation settles
4. **Assuming optimistic updates are free** — keep the updater function lean and pure
5. **No conflict resolution strategy** — 409 Conflict responses cause silent data loss

#### Key Resources
- [TkDodo: Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [Linear Sync Engine](https://linear.app/now/scaling-the-linear-sync-engine)
- [React useOptimistic Issues](https://github.com/facebook/react/issues/31967)

---

### #11 Web Worker Offloading

#### Companies Using This Pattern
- **Figma**: Canvas engine runs in C++ via WebAssembly. Web Workers handle the dev toolchain (bundling, typechecking). Recently migrated rendering from WebGL to WebGPU.
- **Google**: Documents OffscreenCanvas as a production pattern for moving rendering off the main thread.
- **Konva.js**: Production-ready OffscreenCanvas inside Web Worker support.

#### Production Issues
- **React VDOM in Workers** (facebook/react Issue #3092): Long-running discussion about moving reconciliation to a worker. `react-worker-dom` showed improved main thread responsiveness but was never officially adopted.
- **TypeScript + Workers in CRA** (Issue #5854): Type definition and instantiation issues prevent clean Worker integration.

#### Common Mistakes
1. **Over-threading** — communication overhead (serialization via `postMessage`) exceeds computation time for trivial operations
2. **Not terminating unused workers** — memory leaks on unmount
3. **Not using Transferable Objects** — copying large ArrayBuffers instead of transferring ownership (O(n) vs O(1))
4. **DOM access from workers** — workers have no DOM. `document.querySelector` throws immediately.
5. **Large message payloads** — serialize entire state instead of sending deltas

#### Key Resources
- [Figma: Building a Professional Design Tool](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/)
- [Comlink React Integration](https://blog.logrocket.com/integrating-web-workers-in-a-react-app-with-comlink/)
- [Kent C. Dodds: Speed Up Your App with Web Workers](https://kentcdodds.com/blog/speed-up-your-app-with-web-workers)

---

### #13 Suspense Resource Cache

#### Production Incidents
- **React 19 sibling prerendering removal** (Issue #29898): Major breaking change — React 19 bails out on first suspension instead of continuing to render siblings. Turned parallel fetches into waterfalls. Described as a potential "dealbreaker" for upgrading.
- **TkDodo's "Drama in 3 Acts"**: Documented how apps fetching in parallel under React 18 produced total waterfalls under React 19. React team later added "sibling prewarming" as mitigation.
- **Infinite suspension without cache** (Issue #16954): Without a caching layer, re-renders create new promises, causing infinite suspension loops. This is why Suspense for data fetching requires a cache.

#### Common Mistakes
1. **Single Suspense boundary for entire app** — one suspended child shows a full-page spinner
2. **Initiating fetches inside components** — creates waterfalls (fetch-on-render vs render-as-you-fetch)
3. **Creating new promises on every render** — causes infinite suspension loop
4. **Not pairing Suspense with ErrorBoundary** — network failures crash the tree
5. **Hand-rolled Suspense resources** — React docs warn against this; use TanStack Query, SWR, or Relay

#### Key Resources
- [TkDodo: React 19 and Suspense — A Drama in 3 Acts](https://tkdodo.eu/blog/react-19-and-suspense-a-drama-in-3-acts)
- [Sentry: Fetch Waterfall in React](https://blog.sentry.io/fetch-waterfall-in-react/)
- [React Issue #29898](https://github.com/facebook/react/issues/29898) — Sibling prerendering removal

---

### #23 Spring-Based Animation Engine

#### Production Incidents
- **react-spring performance with many components** (Issue #786): JS calculations become heavy when iterating `getValue` over many nested animated values simultaneously.
- **Firefox-specific performance** (Issue #767): Animations that work fine in Chrome/Safari become extremely slow and make the page unusable in Firefox.
- **30+ animated elements cause frame drops** (react-native-reanimated Issue #3854): Per-frame calculations exceed 16ms budget.

#### Library Landscape
- **Motion** (formerly Framer Motion): 18M+ monthly downloads, most popular by count
- **react-spring**: 1.5M+ weekly downloads, 29k+ stars. Best for physics-heavy animations.
- **GSAP**: Professional-grade, timeline-based. Not React-specific.

#### Common Mistakes
1. **Animating layout properties** (width, height, top, left) instead of transform/opacity — causes layout thrashing
2. **Not using `will-change`** — failing to promote elements to GPU compositor layers
3. **Overusing animations in data-heavy UIs** — dashboards with frequent updates compound animation jank
4. **Not respecting `prefers-reduced-motion`** — accessibility violation
5. **Expensive calculations inside rAF** — must complete within ~16ms on 60Hz displays

#### Key Resources
- [Josh Comeau: Spring Physics Introduction](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)
- [react-spring Issue #786](https://github.com/react-spring/react-spring/issues/786) — Performance deep dive

---

### #24 RBAC Permission-Guarded Components

#### Production Incidents
- **Next.js Authorization Bypass (CVE)**: Attackers could bypass middleware-based auth by spoofing an internal header, gaining access to protected resources. Directly relevant to frontend RBAC that relies on middleware.
- **JWT in localStorage XSS vulnerability**: Storing JWT tokens (containing role info) in localStorage exposes them to XSS attacks. Malicious scripts can steal tokens and escalate privileges.

#### Companies Using This Pattern
- **Auth0/Okta**: RBAC as a core identity platform feature with React SDKs
- **react-admin** (Marmelab): `ra-rbac` with `<IfCanAccess>` components. Pessimistic rendering: restricted components hidden while permissions load.
- **Permit.io**: Centralized permission model across frontend and backend
- **Cerbos**: Policy-as-code authorization engine with React integration

#### Common Mistakes
1. **Relying solely on frontend RBAC** — client-side checks are for UX only; server must reject unauthorized requests
2. **Scattering `if (role === 'admin')` everywhere** — centralize in a permission service/hook
3. **Binary role checks instead of granular permissions** — `isAdmin` vs `canEditPost`, `canDeleteUser`
4. **Not handling the loading state** — flash of unauthorized content before permissions resolve
5. **Not filtering API responses by role** — returning all data and relying on frontend to hide sensitive fields

#### Interview Questions
- "Why is frontend-only RBAC insufficient? Give a concrete bypass example."
- "Design a `<CanAccess>` component that handles sync/async permission checks without flash of restricted content."
- "Compare RBAC vs ABAC (Attribute-Based Access Control)."
- "You have a dashboard where admins see financial data and viewers see summaries. How do you ensure raw data never reaches the viewer's browser?"

#### Key Resources
- [Permit.io: React RBAC](https://www.permit.io/blog/implementing-react-rbac-authorization)
- [react-admin RBAC](https://marmelab.com/react-admin/AuthRBAC.html)
- [Next.js Authorization Bypass](https://www.akamai.com/blog/security-research/march-authorization-bypass-critical-nextjs-detections-mitigations)

---

## Phase 4: Frontier Patterns

### #18 Real-Time Collaborative State (CRDTs)

#### Production Incidents
- **Yjs memory scaling** (Discussion #198 on discuss.yjs.dev): Production users report memory growing unboundedly with large documents because CRDTs must store the full operation history (tombstones for deleted items).
- **CRDT vs OT debate**: Google Docs uses Operational Transform, not CRDTs. The tradeoff: OT requires a central server but has predictable memory; CRDTs enable peer-to-peer but can grow unboundedly.

#### Companies Using This Pattern
- **Figma**: Custom CRDT-like system for real-time canvas collaboration. Operations sync through a central server.
- **Linear**: Event-driven sync engine with MobX. Local-first architecture with 0ms perceived latency.
- **Notion**: Operational transforms for block editing with conflict resolution.
- **Liveblocks**: Infrastructure platform providing CRDT-based collaboration primitives.
- **Yjs ecosystem**: Used by Tiptap, BlockNote, Novel, and many collaborative text editors.

#### Library Landscape
- **Yjs**: Most popular CRDT library. Used for text, JSON, and XML collaboration.
- **Automerge**: Rust-based CRDT with WASM bindings. Better for complex data structures.
- **Liveblocks**: Managed service abstracting CRDT complexity.

#### Key Resources
- [crdt.tech](https://crdt.tech/) — Martin Kleppmann's CRDT resources
- [Collaborative Text Editing without CRDTs or OT](https://mattweidner.com/2025/05/21/text-without-crdts.html) — Alternative approaches

---

### #19 Custom React Reconciler

#### Production Incidents
- **react-pdf breaks with React 19** (Issue #2966): Reconciler version mismatch between react-pdf's bundled reconciler and the app's React version causes crashes only in minified production builds.
- **react-three-fiber iOS crashes** (Issue #2837): iOS production builds crash loading 3D models despite working in development.
- **react-three-fiber performance degradation** (Issues #1635, #2714): Performance drops from 120+ fps in dev to 40 fps in production builds due to minification interacting poorly with the reconciler.
- **Event handler performance** (Issue #320): Adding event handlers to R3F meshes causes FPS to drop from 60 to 10-20 due to expensive raycasting.
- **`supportsPersistence` bug** (facebook/react Issue #24645): When using persistent mode, the reconciler calls wrong methods.

#### Companies & Renderers
| Project | What It Does |
|---------|-------------|
| **react-three-fiber** (pmndrs) | JSX to Three.js. `<mesh />` becomes `new THREE.Mesh()`. Used by thousands of companies for 3D web. |
| **Ink** (Vadim Demedes) | React for terminals. Used by Gatsby CLI, Prisma, Shopify CLI. |
| **react-pdf** (Diego Mura) | React to PDF. Enterprise invoice generation, reports. |
| **react-pixi** | High-performance 2D WebGL via PIXI.js. |
| **React NodeGUI** | Native desktop apps via Qt. |

#### Common Mistakes
1. **Misunderstanding the host config API** — underdocumented, changes between React versions
2. **Mixing mutation and persistent mode methods** — updates silently dropped
3. **`prepareUpdate` return value confusion** — documentation doesn't explain the expected array format
4. **Version coupling** — `react-reconciler` is semi-private API with breaking changes

#### Interview Questions
- "Explain React's Fiber architecture and why it replaced the Stack reconciler."
- "What is the difference between the reconciler and the renderer?"
- "When would you build a custom renderer instead of using ReactDOM?"
- "Walk through what happens when you call setState."

#### Key Resources
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture) — acdlite
- [R3F Technical Breakdown](https://codyb.co/articles/a-technical-breakdown-of-react-three-fiber)
- [Building Custom React Renderer](https://blog.atulr.com/react-custom-renderer-1/) — Beginners guide
- [Awesome React Renderer](https://github.com/chentsulin/awesome-react-renderer) — Full list

---

### #20 Server-Driven UI Renderer

#### Companies Using SDUI
| Company | Implementation |
|---------|---------------|
| **Airbnb** | "Ghost Platform" (GP). Standardized GraphQL data model. Screens composed of reusable Sections and Layouts. Single schema serves web, iOS, Android. |
| **Netflix** | Personalizes UI based on content recommendations, device performance, localization. |
| **Shopify** | Shop App migrated from client-driven to SDUI. Server controls store sections and layouts. Enables per-merchant customization without app releases. |
| **NuBank** | Serves 100M+ users with SDUI for mobile velocity. |
| **PhonePe** | "LiquidUI" — in-house SDUI for mobile payments serving hundreds of millions. |
| **Instagram/Meta** | Server sends tree of blocks (component type + props). Client traverses and renders. |
| **Slack** | Gradual feature rollout with real-time feedback. |
| **Yelp** | Server-driven foundation for mobile app development. |

#### Production Incidents
- **Version mismatch**: Users on legacy app versions won't see new server-defined components. Must implement fallback/graceful degradation.
- **Offline blank screens**: SDUI requires network. Need layered caching with content-checksum invalidation.
- **Shopify rendering delays**: Before SDUI, fixes took a week due to weekly release cycles. SDUI enabled instant server-side fixes.

#### Common Mistakes
1. **No offline strategy** — blank screens on poor network. Need layered caching.
2. **No version management** — old app versions get unknown component types.
3. **Moving too much logic to server** — interactive components (animations, gestures) perform poorly when server-driven.
4. **Massive JSON payloads** — poor schema design negates performance benefits.
5. **Insufficient testing** — traditional mobile testing doesn't cover SDUI failure modes.

#### Interview Questions
- "Design a server-driven UI system for a mobile app."
- "What are the tradeoffs of SDUI vs client-driven UI?"
- "How would you handle backward compatibility in an SDUI system?"
- "How does Airbnb's Ghost Platform work?"

#### Key Resources
- [Airbnb SDUI Deep Dive](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5)
- [Shopify SDUI in Shop App](https://shopify.engineering/server-driven-ui-in-shop-app)
- [PhonePe LiquidUI](https://tech.phonepe.com/introducing-liquidui-phonepes-server-driven-ui-framework/)
- [MobileNativeFoundation SDUI Discussion](https://github.com/MobileNativeFoundation/discussions/discussions/47)
- [Apollo GraphQL SDUI Guide](https://www.apollographql.com/docs/graphos/schema-design/guides/sdui/basics)
