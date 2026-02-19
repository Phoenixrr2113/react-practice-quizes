import type { Challenge } from '@/types/challenge';

export const hooksAndStateChallenges: Challenge[] = [
  {
    id: 1,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Build useSyncExternalStore from Scratch",
    timeEstimate: "25 min",
    description:
      "Implement a polyfill for React 18's useSyncExternalStore — the hook that bridges external mutable stores with React's concurrent rendering. Your implementation must handle the tearing problem: ensuring the UI never shows inconsistent state when React renders parts of the tree at different times during concurrent features like useTransition.",
    realWorld:
      "Redux v8+, Zustand, and TanStack Store all use useSyncExternalStore internally. Kent C. Dodds (Epic React) and the React core team have extensively documented the tearing problem. The react-redux team filed a real performance issue (#2086) around this exact hook's behavior with concurrent rendering. This is how every major state library integrates with React 18+.",
    requirements: [
      "subscribe(callback) — subscribe to store changes, return unsubscribe function",
      "getSnapshot() — return current immutable state snapshot",
      "Must detect tearing: if getSnapshot() returns a different value during render than what was used to begin rendering, force a synchronous re-render",
      "Must not cause infinite render loops",
      "Handle server-side rendering via optional getServerSnapshot()",
    ],
    starterCode: `// Implement this hook:
function useSyncExternalStoreShim(subscribe, getSnapshot, getServerSnapshot) {
  // Must handle:
  // 1. Initial snapshot
  // 2. Subscribing to changes
  // 3. Tearing detection — if the store mutates mid-render
  //    in concurrent mode, the snapshot used at the start of
  //    render may differ from what getSnapshot() now returns.
  //    You must force a synchronous re-render to fix this.
  // 4. SSR fallback
}

// Test with this external store:
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (fn) => {
      state = fn(state);
      listeners.forEach(l => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// Usage:
// const store = createStore({ count: 0, filter: '' });
// function Counter() {
//   const state = useSyncExternalStoreShim(
//     store.subscribe,
//     () => store.getState().count, // selector
//     () => 0, // server snapshot
//   );
//   return <div>{state}</div>;
// }`,
    solutionCode: `function useSyncExternalStoreShim(
  subscribe,
  getSnapshot,
  getServerSnapshot
) {
  // For SSR, use server snapshot if available
  const isServer = typeof window === 'undefined';

  const getSnapshotFn = isServer
    ? (getServerSnapshot || getSnapshot)
    : getSnapshot;

  // Store the current snapshot value
  const [{ snapshot }, forceRender] = useReducer(
    (prev) => {
      const next = getSnapshotFn();
      // Object.is comparison — same as React's internal check
      if (Object.is(prev.snapshot, next)) return prev;
      return { snapshot: next };
    },
    undefined,
    () => ({ snapshot: getSnapshotFn() })
  );

  // Keep refs for tearing detection
  const snapshotRef = useRef(snapshot);
  const subscribeFnRef = useRef(subscribe);
  const getSnapshotRef = useRef(getSnapshotFn);

  // Update refs synchronously during render (not in effect)
  // This is intentional — we need them current for tearing check
  snapshotRef.current = snapshot;
  subscribeFnRef.current = subscribe;
  getSnapshotRef.current = getSnapshotFn;

  // TEARING DETECTION: Check during render if the store
  // has already changed since we captured our snapshot.
  // In concurrent mode, React may pause and resume renders,
  // allowing the store to mutate between render start and commit.
  useEffect(() => {
    const currentSnapshot = getSnapshotRef.current();
    if (!Object.is(snapshotRef.current, currentSnapshot)) {
      // Store changed between render and commit — force sync re-render
      forceRender();
    }
  });

  // Subscribe to external store
  useEffect(() => {
    const handleStoreChange = () => {
      try {
        const next = getSnapshotRef.current();
        if (!Object.is(snapshotRef.current, next)) {
          forceRender();
        }
      } catch (e) {
        // getSnapshot threw — force re-render to surface the error
        forceRender();
      }
    };

    // Resubscribe if subscribe function changes
    const unsubscribe = subscribeFnRef.current(handleStoreChange);

    // Check for changes that happened between render and subscription
    handleStoreChange();

    return unsubscribe;
  }, [subscribe]);

  return snapshot;
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useSyncExternalStoreShim } from './implementation';

function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (fn) => {
      state = fn(state);
      listeners.forEach(l => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

describe('useSyncExternalStoreShim', () => {

  test('returns the initial snapshot', () => {
    const store = createStore({ count: 0 });
    const { result } = renderHook(() =>
      useSyncExternalStoreShim(
        store.subscribe,
        () => store.getState().count,
        () => 0,
      )
    );
    expect(result.current).toBe(0);
  });

  test('updates when store changes', () => {
    const store = createStore({ count: 0 });
    const { result } = renderHook(() =>
      useSyncExternalStoreShim(
        store.subscribe,
        () => store.getState().count,
        () => 0,
      )
    );
    act(() => {
      store.setState(s => ({ ...s, count: 5 }));
    });
    expect(result.current).toBe(5);
  });

  test('does not re-render when snapshot is unchanged', () => {
    const store = createStore({ count: 0, other: 'a' });
    let renderCount = 0;
    renderHook(() => {
      renderCount++;
      return useSyncExternalStoreShim(
        store.subscribe,
        () => store.getState().count,
        () => 0,
      );
    });
    const initialRenders = renderCount;
    act(() => {
      store.setState(s => ({ ...s, other: 'b' }));
    });
    // Selector returns same count, so no extra render
    expect(renderCount).toBe(initialRenders);
  });

  test('unsubscribes on unmount', () => {
    const store = createStore({ count: 0 });
    const { result, unmount } = renderHook(() =>
      useSyncExternalStoreShim(
        store.subscribe,
        () => store.getState().count,
        () => 0,
      )
    );
    unmount();
    // Should not throw after unmount
    act(() => {
      store.setState(s => ({ ...s, count: 99 }));
    });
  });

  test('works with different selectors', () => {
    const store = createStore({ count: 0, name: 'test' });
    const { result } = renderHook(() =>
      useSyncExternalStoreShim(
        store.subscribe,
        () => store.getState().name,
        () => '',
      )
    );
    expect(result.current).toBe('test');
    act(() => {
      store.setState(s => ({ ...s, name: 'updated' }));
    });
    expect(result.current).toBe('updated');
  });
});`,
    keyPoints: [
      "The TEARING problem: In concurrent mode, React can pause rendering Component A, let the store mutate, then render Component B with new data — now A and B show inconsistent state from the same store",
      "useReducer with Object.is comparison prevents infinite loops while allowing forced re-renders when the snapshot genuinely changes",
      "Refs are updated during render (not in useEffect) so tearing detection has the freshest values — this is a rare case where mutating refs in render is correct",
      "The post-render useEffect with no deps runs every render to catch tearing — it compares what we rendered with what the store currently holds",
      "handleStoreChange runs immediately after subscribing to catch mutations between render and subscription setup (race condition window)",
    ],
    followUp:
      "Why did React need useSyncExternalStore instead of just useEffect + setState? How does this relate to the useMutableSource RFC that was abandoned? What are the implications for libraries like Redux and Zustand?",
  },
  {
    id: 2,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Finite State Machine with useReducer",
    timeEstimate: "30 min",
    description:
      "Implement a generic `useStateMachine` hook that enforces valid state transitions at runtime. The hook should make illegal states unrepresentable — if a transition isn't defined for the current state, the dispatch is silently ignored. Include support for entry/exit side effects, guards (conditional transitions), and extended state (context) that accompanies the finite state.",
    realWorld:
      "David Khourshid (XState creator) presented 'Goodbye useState' at React Summit 2025, advocating this exact pattern. Kyle Shevlin's widely-shared blog posts show how to build FSMs with useReducer. Frontend Masters has a full course on this (State Modeling in React with XState). Auth flows, multi-step forms, and payment processing all benefit from this pattern — directly relevant to your PMI payment systems work.",
    requirements: [
      "Define a machine config with states, events, transitions, and optional guards",
      "Guards are predicate functions: (context, event) => boolean — transition only fires if guard returns true",
      "Support entry/exit actions on state transitions: (context, event) => newContext",
      "Extended state (context) is separate from finite state and updated via actions",
      "Return [currentState, context, send] — send dispatches events",
    ],
    starterCode: `// Implement:
function useStateMachine(machineConfig, initialContext) {
  // Your implementation
}

// Example: Async data fetcher with retry logic
const fetchMachine = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        FETCH: { target: 'loading', action: (ctx, e) => ({ ...ctx, url: e.url, retries: 0 }) }
      }
    },
    loading: {
      entry: (ctx) => { /* trigger fetch here */ },
      on: {
        RESOLVE: { target: 'success', action: (ctx, e) => ({ ...ctx, data: e.data }) },
        REJECT: [
          {
            target: 'loading',
            guard: (ctx) => ctx.retries < 3,
            action: (ctx) => ({ ...ctx, retries: ctx.retries + 1 })
          },
          {
            target: 'failure',
            action: (ctx, e) => ({ ...ctx, error: e.error })
          }
        ]
      }
    },
    success: {
      on: {
        RESET: { target: 'idle', action: () => ({}) }
      }
    },
    failure: {
      on: {
        RETRY: { target: 'loading', action: (ctx) => ({ ...ctx, retries: 0 }) }
      }
    }
  }
};

// Usage:
// const [state, ctx, send] = useStateMachine(fetchMachine, {});
// send({ type: 'FETCH', url: '/api/data' });
// state === 'loading', ctx.retries === 0`,
    solutionCode: `function useStateMachine(machineConfig, initialContext = {}) {
  const configRef = useRef(machineConfig);

  const [{ state, context }, dispatch] = useReducer(
    (current, event) => {
      const config = configRef.current;
      const stateConfig = config.states[current.state];
      if (!stateConfig || !stateConfig.on) return current;

      const eventConfig = stateConfig.on[event.type];
      if (!eventConfig) return current; // illegal transition — ignore

      // Resolve transition: could be a single transition or array (guarded)
      let transition = null;
      if (Array.isArray(eventConfig)) {
        // Guarded transitions — first matching guard wins, last is default
        transition = eventConfig.find((t, i) => {
          if (!t.guard) return i === eventConfig.length - 1; // default fallback
          return t.guard(current.context, event);
        });
      } else {
        // Single transition, optional guard
        if (eventConfig.guard && !eventConfig.guard(current.context, event)) {
          return current; // guard blocked
        }
        transition = eventConfig;
      }

      if (!transition) return current;

      // Run exit action on current state
      const exitAction = stateConfig.exit;
      let nextContext = current.context;
      if (exitAction) {
        nextContext = exitAction(nextContext, event) ?? nextContext;
      }

      // Run transition action
      if (transition.action) {
        nextContext = transition.action(nextContext, event) ?? nextContext;
      }

      // Run entry action on target state
      const targetConfig = config.states[transition.target];
      if (targetConfig?.entry) {
        nextContext = targetConfig.entry(nextContext, event) ?? nextContext;
      }

      return {
        state: transition.target,
        context: nextContext,
      };
    },
    { state: machineConfig.initial, context: initialContext }
  );

  // Stable send function
  const send = useCallback((event) => {
    // Normalize string events: send('RESET') -> { type: 'RESET' }
    const normalized = typeof event === 'string'
      ? { type: event }
      : event;
    dispatch(normalized);
  }, []);

  return [state, context, send];
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useStateMachine } from './implementation';

const simpleMachine = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        START: { target: 'running', action: (ctx, e) => ({ ...ctx, startedAt: e.time }) }
      }
    },
    running: {
      on: {
        STOP: { target: 'idle', action: (ctx) => ({ ...ctx, startedAt: null }) },
        PAUSE: { target: 'paused' }
      }
    },
    paused: {
      on: {
        RESUME: { target: 'running' }
      }
    }
  }
};

const guardedMachine = {
  initial: 'locked',
  states: {
    locked: {
      on: {
        UNLOCK: [
          { target: 'unlocked', guard: (ctx, e) => e.pin === ctx.pin },
          { target: 'locked', action: (ctx) => ({ ...ctx, attempts: (ctx.attempts || 0) + 1 }) }
        ]
      }
    },
    unlocked: {
      on: {
        LOCK: { target: 'locked' }
      }
    }
  }
};

describe('useStateMachine', () => {
  test('starts in the initial state', () => {
    const { result } = renderHook(() => useStateMachine(simpleMachine, {}));
    const [state] = result.current;
    expect(state).toBe('idle');
  });

  test('transitions on valid events', () => {
    const { result } = renderHook(() => useStateMachine(simpleMachine, {}));
    act(() => {
      const send = result.current[2];
      send({ type: 'START', time: 100 });
    });
    expect(result.current[0]).toBe('running');
  });

  test('updates context via transition actions', () => {
    const { result } = renderHook(() => useStateMachine(simpleMachine, {}));
    act(() => {
      result.current[2]({ type: 'START', time: 42 });
    });
    expect(result.current[1].startedAt).toBe(42);
  });

  test('ignores invalid transitions', () => {
    const { result } = renderHook(() => useStateMachine(simpleMachine, {}));
    act(() => {
      // PAUSE is not valid from idle
      result.current[2]({ type: 'PAUSE' });
    });
    expect(result.current[0]).toBe('idle');
  });

  test('supports guarded transitions — guard passes', () => {
    const { result } = renderHook(() =>
      useStateMachine(guardedMachine, { pin: '1234' })
    );
    act(() => {
      result.current[2]({ type: 'UNLOCK', pin: '1234' });
    });
    expect(result.current[0]).toBe('unlocked');
  });

  test('supports guarded transitions — guard fails, falls through to default', () => {
    const { result } = renderHook(() =>
      useStateMachine(guardedMachine, { pin: '1234' })
    );
    act(() => {
      result.current[2]({ type: 'UNLOCK', pin: 'wrong' });
    });
    expect(result.current[0]).toBe('locked');
    expect(result.current[1].attempts).toBe(1);
  });

  test('handles multi-step transitions', () => {
    const { result } = renderHook(() => useStateMachine(simpleMachine, {}));
    act(() => { result.current[2]({ type: 'START', time: 1 }); });
    expect(result.current[0]).toBe('running');
    act(() => { result.current[2]({ type: 'PAUSE' }); });
    expect(result.current[0]).toBe('paused');
    act(() => { result.current[2]({ type: 'RESUME' }); });
    expect(result.current[0]).toBe('running');
    act(() => { result.current[2]({ type: 'STOP' }); });
    expect(result.current[0]).toBe('idle');
  });
});`,
    keyPoints: [
      "The reducer is the perfect place for state machines — it's synchronous, pure, and React batches updates. Illegal transitions return the same reference, causing no re-render",
      "Guarded transitions as arrays with a fallback default mirrors XState's behavior — the first guard that passes wins",
      "Exit → transition action → entry order matches the Statecharts specification and XState's execution model",
      "configRef avoids the machine config in the reducer's closure going stale if the parent re-renders with a new config object",
      "Normalizing string events is an ergonomic touch — real state machine libraries like XState do this too",
    ],
    followUp:
      "How would you add hierarchical (nested) states? How would you implement parallel states? What about delayed transitions (after 3 seconds, transition to X)? Compare this approach to XState — what are you missing?",
  },
  {
    id: 7,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Undo/Redo System with Command Pattern",
    timeEstimate: "30 min",
    description:
      "Build a generic `useUndoRedo` hook that supports undo/redo for ANY reducer — but instead of storing full state snapshots (which is expensive for large state trees), use the Command pattern: store invertible operations that can be applied forward or backward. Support command coalescing (merge rapid keystrokes into a single undo step) and a configurable max history size.",
    realWorld:
      "Figma, Photoshop, and Google Docs all use command-based undo. Redux's official docs have a dedicated guide on implementing undo history. Libraries like redux-undo, use-undo, and Reddo.js implement variations of this. The command coalescing pattern is critical in rich text editors where you don't want each keystroke to be a separate undo step.",
    requirements: [
      "Wrap any existing useReducer — don't require changes to the inner reducer",
      "Command pattern: store { execute, undo } objects instead of full state snapshots",
      "Command coalescing: merge rapid sequential commands of the same type within a time window",
      "Configurable max history size with oldest entries evicted",
      "Return [state, dispatch, { undo, redo, canUndo, canRedo, history }]",
    ],
    starterCode: `// Implement:
function useUndoRedo(reducer, initialState, options = {}) {
  // options: { maxHistory?: number, coalesceMs?: number }
  //
  // Returns: [state, dispatch, controls]
  // controls: {
  //   undo: () => void,
  //   redo: () => void,
  //   canUndo: boolean,
  //   canRedo: boolean,
  //   jump: (n: number) => void, // jump to specific point
  //   clear: () => void,
  // }
}

// For command-based undo, the inner reducer must return
// enough info to invert. Wrap it:
function createCommand(action, prevState, nextState) {
  // Return a command object that can execute() and undo()
}

// Usage:
// const [state, dispatch, { undo, redo, canUndo, canRedo }] =
//   useUndoRedo(counterReducer, { count: 0 }, { maxHistory: 50 });`,
    solutionCode: `function useUndoRedo(reducer, initialState, options = {}) {
  const { maxHistory = 100, coalesceMs = 300 } = options;

  const [undoState, undoDispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case '__UNDO__': {
          if (state.past.length === 0) return state;
          const prev = state.past[state.past.length - 1];
          return {
            past: state.past.slice(0, -1),
            present: prev.prevState,
            future: [
              { ...prev, fromUndo: true },
              ...state.future,
            ],
          };
        }
        case '__REDO__': {
          if (state.future.length === 0) return state;
          const next = state.future[0];
          return {
            past: [...state.past, next],
            present: next.nextState,
            future: state.future.slice(1),
          };
        }
        case '__JUMP__': {
          // Jump to specific index in past
          const idx = action.index;
          const target = state.past[idx];
          if (!target) return state;
          const undone = state.past.slice(idx + 1);
          return {
            past: state.past.slice(0, idx),
            present: target.prevState,
            future: [...undone.reverse(), ...state.future],
          };
        }
        case '__CLEAR__':
          return { past: [], present: state.present, future: [] };
        default: {
          // Normal action — run through user's reducer
          const nextState = reducer(state.present, action);
          if (Object.is(nextState, state.present)) return state;

          const command = {
            action,
            prevState: state.present,
            nextState,
            timestamp: Date.now(),
          };

          // Coalesce: merge with last command if same type & within window
          let newPast = [...state.past];
          const last = newPast[newPast.length - 1];
          if (
            last &&
            last.action.type === action.type &&
            command.timestamp - last.timestamp < coalesceMs
          ) {
            // Merge: keep original prevState, update nextState
            newPast[newPast.length - 1] = {
              ...last,
              nextState,
              timestamp: command.timestamp,
            };
          } else {
            newPast.push(command);
          }

          // Evict oldest if over max
          if (newPast.length > maxHistory) {
            newPast = newPast.slice(newPast.length - maxHistory);
          }

          return {
            past: newPast,
            present: nextState,
            future: [], // new action clears redo stack
          };
        }
      }
    },
    { past: [], present: initialState, future: [] }
  );

  const undo = useCallback(() => undoDispatch({ type: '__UNDO__' }), []);
  const redo = useCallback(() => undoDispatch({ type: '__REDO__' }), []);
  const jump = useCallback((n) => undoDispatch({ type: '__JUMP__', index: n }), []);
  const clear = useCallback(() => undoDispatch({ type: '__CLEAR__' }), []);

  return [
    undoState.present,
    undoDispatch,
    {
      undo,
      redo,
      jump,
      clear,
      canUndo: undoState.past.length > 0,
      canRedo: undoState.future.length > 0,
    },
  ];
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from './implementation';

function counterReducer(state, action) {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + 1 };
    case 'decrement': return { ...state, count: state.count - 1 };
    case 'set': return { ...state, count: action.value };
    default: return state;
  }
}

describe('useUndoRedo', () => {
  test('returns [state, dispatch, controls]', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 })
    );
    expect(result.current).toHaveLength(3);
    expect(result.current[0]).toEqual({ count: 0 });
    expect(typeof result.current[1]).toBe('function');
    expect(typeof result.current[2].undo).toBe('function');
    expect(typeof result.current[2].redo).toBe('function');
  });

  test('dispatch updates state through the inner reducer', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 })
    );
    act(() => { result.current[1]({ type: 'increment' }); });
    expect(result.current[0].count).toBe(1);
  });

  test('canUndo is false initially, true after dispatch', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 })
    );
    expect(result.current[2].canUndo).toBe(false);
    act(() => { result.current[1]({ type: 'increment' }); });
    expect(result.current[2].canUndo).toBe(true);
  });

  test('undo restores previous state', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 })
    );
    act(() => { result.current[1]({ type: 'increment' }); });
    expect(result.current[0].count).toBe(1);
    act(() => { result.current[2].undo(); });
    expect(result.current[0].count).toBe(0);
  });

  test('redo restores undone state', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 })
    );
    act(() => { result.current[1]({ type: 'increment' }); });
    act(() => { result.current[2].undo(); });
    expect(result.current[2].canRedo).toBe(true);
    act(() => { result.current[2].redo(); });
    expect(result.current[0].count).toBe(1);
  });

  test('new dispatch clears redo stack', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 })
    );
    act(() => { result.current[1]({ type: 'increment' }); });
    act(() => { result.current[2].undo(); });
    expect(result.current[2].canRedo).toBe(true);
    act(() => { result.current[1]({ type: 'set', value: 99 }); });
    expect(result.current[2].canRedo).toBe(false);
  });

  test('respects maxHistory option', () => {
    const { result } = renderHook(() =>
      useUndoRedo(counterReducer, { count: 0 }, { maxHistory: 2 })
    );
    act(() => { result.current[1]({ type: 'set', value: 1 }); });
    act(() => { result.current[1]({ type: 'set', value: 2 }); });
    act(() => { result.current[1]({ type: 'set', value: 3 }); });
    // Only 2 undos should be possible
    act(() => { result.current[2].undo(); });
    act(() => { result.current[2].undo(); });
    expect(result.current[2].canUndo).toBe(false);
  });
});`,
    keyPoints: [
      "The meta-reducer pattern wraps the user's reducer — it intercepts __UNDO__/__REDO__ internally and delegates everything else to the original reducer",
      "Command coalescing compares action.type + timestamp window — this is exactly how text editors merge rapid keystrokes into one undo step",
      "Storing both prevState and nextState per command enables O(1) undo/redo without re-running the reducer chain, but trades off memory",
      "The future stack is cleared on any new action — this matches every undo system's behavior (you can't redo after making a new change)",
      "maxHistory with eviction prevents memory leaks in long-running apps — Figma caps undo history at a configurable limit",
    ],
    followUp:
      "How would you implement structural sharing (like Immer) to reduce the memory cost of storing full state snapshots? How would you add named checkpoints ('save points')? How does collaborative undo work differently (operational transform)?",
  },
  {
    id: 9,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Proxy-Based Form State Manager",
    timeEstimate: "30 min",
    description:
      "Build a form state management hook inspired by react-hook-form's architecture. Use JavaScript Proxies to track which fields a component actually reads, so only the relevant parts of the form re-render when a field changes. Support nested fields (address.city), field-level validation with async validators, and dirty/touched tracking — all without re-rendering the entire form on every keystroke.",
    realWorld:
      "react-hook-form (40M+ weekly npm downloads) uses uncontrolled inputs + refs + Proxy for performance. Formik and React Final Form faced re-render problems that react-hook-form solved architecturally. The Proxy-based field access tracking pattern is also used by MobX, Valtio (by Daishi Kato), and Immer. This is one of the most practically useful patterns in production React.",
    requirements: [
      "Proxy-based field access tracking — components only re-render for fields they read",
      "register(name) returns { ref, onChange, onBlur } for uncontrolled input binding",
      "Nested field paths: register('address.city') works with dot notation",
      "Field-level validation: sync and async validators with debounced async",
      "Dirty and touched tracking per field, plus form-level isDirty/isValid",
    ],
    starterCode: `// Implement:
function useForm(config = {}) {
  // config: {
  //   defaultValues?: object,
  //   mode?: 'onChange' | 'onBlur' | 'onSubmit',
  //   resolver?: (values) => Promise<{ errors }>,
  // }
  //
  // Returns: {
  //   register: (name, rules?) => { ref, onChange, onBlur, name },
  //   handleSubmit: (onValid, onInvalid?) => (e) => void,
  //   watch: (name?) => value,
  //   formState: { errors, isDirty, isValid, dirtyFields, touchedFields },
  //   setValue: (name, value) => void,
  //   getValues: (name?) => values,
  //   reset: (values?) => void,
  // }
}

// The key challenge: when user types in "firstName" input,
// ONLY components reading firstName should re-render.
// Components reading "lastName" should NOT re-render.
//
// Usage:
// function MyForm() {
//   const { register, handleSubmit, formState: { errors } } = useForm({
//     defaultValues: { name: '', email: '', address: { city: '' } }
//   });
//   return (
//     <form onSubmit={handleSubmit(data => console.log(data))}>
//       <input {...register('name', { required: true, minLength: 2 })} />
//       {errors.name && <span>{errors.name.message}</span>}
//       <input {...register('email', {
//         validate: async (v) => {
//           const taken = await checkEmail(v);
//           return taken ? 'Email taken' : true;
//         }
//       })} />
//       <input {...register('address.city')} />
//     </form>
//   );
// }`,
    solutionCode: `function useForm(config = {}) {
  const { defaultValues = {}, mode = 'onSubmit' } = config;

  // Store values in a ref to avoid re-renders on every change
  const valuesRef = useRef(structuredClone(defaultValues));
  const defaultRef = useRef(structuredClone(defaultValues));
  const errorsRef = useRef({});
  const touchedRef = useRef({});
  const dirtyRef = useRef({});
  const fieldRefs = useRef({});      // name -> HTMLElement
  const validatorsRef = useRef({});   // name -> rules
  const subscribersRef = useRef(new Map()); // name -> Set<callback>
  const [, forceRender] = useReducer(x => x + 1, 0);

  // Deep get/set with dot notation
  const getPath = (obj, path) =>
    path.split('.').reduce((o, k) => o?.[k], obj);
  const setPath = (obj, path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = value;
  };

  // Notify only subscribers of a specific field
  const notifyField = useCallback((name) => {
    subscribersRef.current.get(name)?.forEach(cb => cb());
  }, []);

  // Validate a single field
  const validateField = useCallback(async (name, value) => {
    const rules = validatorsRef.current[name];
    if (!rules) return null;

    if (rules.required && (!value && value !== 0)) {
      return { type: 'required', message: rules.required === true
        ? \`\${name} is required\` : rules.required };
    }
    if (rules.minLength && value?.length < rules.minLength) {
      return { type: 'minLength',
        message: \`Min length is \${rules.minLength}\` };
    }
    if (rules.pattern && !rules.pattern.test?.(value)) {
      return { type: 'pattern', message: 'Invalid format' };
    }
    if (rules.validate) {
      const result = await rules.validate(value);
      if (result !== true && result) {
        return { type: 'validate',
          message: typeof result === 'string' ? result : 'Invalid' };
      }
    }
    return null;
  }, []);

  const register = useCallback((name, rules) => {
    if (rules) validatorsRef.current[name] = rules;

    return {
      name,
      ref: (el) => {
        if (el) {
          fieldRefs.current[name] = el;
          // Set initial value from defaultValues
          const val = getPath(valuesRef.current, name);
          if (val !== undefined) el.value = val;
        }
      },
      onChange: async (e) => {
        const value = e.target.value;
        setPath(valuesRef.current, name, value);

        // Track dirty
        const defaultVal = getPath(defaultRef.current, name);
        dirtyRef.current[name] = !Object.is(value, defaultVal);

        if (mode === 'onChange') {
          const error = await validateField(name, value);
          if (error) setPath(errorsRef.current, name, error);
          else { /* delete error */ delete errorsRef.current[name]; }
          notifyField(name);
          forceRender(); // update formState
        }
      },
      onBlur: async (e) => {
        touchedRef.current[name] = true;
        if (mode === 'onBlur') {
          const value = e.target.value;
          const error = await validateField(name, value);
          if (error) errorsRef.current[name] = error;
          else delete errorsRef.current[name];
          notifyField(name);
          forceRender();
        }
      },
    };
  }, [mode, validateField, notifyField]);

  const handleSubmit = useCallback((onValid, onInvalid) => {
    return async (e) => {
      e?.preventDefault();
      // Validate all fields
      const errors = {};
      for (const [name, rules] of Object.entries(validatorsRef.current)) {
        const value = getPath(valuesRef.current, name);
        const error = await validateField(name, value);
        if (error) errors[name] = error;
      }
      errorsRef.current = errors;
      forceRender();

      if (Object.keys(errors).length === 0) {
        onValid(structuredClone(valuesRef.current));
      } else {
        onInvalid?.(errors);
      }
    };
  }, [validateField]);

  const watch = useCallback((name) => {
    if (!name) return valuesRef.current;
    return getPath(valuesRef.current, name);
  }, []);

  const setValue = useCallback((name, value) => {
    setPath(valuesRef.current, name, value);
    if (fieldRefs.current[name]) {
      fieldRefs.current[name].value = value;
    }
    notifyField(name);
  }, [notifyField]);

  const getValues = useCallback((name) => {
    if (!name) return structuredClone(valuesRef.current);
    return getPath(valuesRef.current, name);
  }, []);

  const reset = useCallback((values) => {
    valuesRef.current = structuredClone(values || defaultRef.current);
    errorsRef.current = {};
    touchedRef.current = {};
    dirtyRef.current = {};
    // Reset DOM elements
    Object.entries(fieldRefs.current).forEach(([name, el]) => {
      el.value = getPath(valuesRef.current, name) ?? '';
    });
    forceRender();
  }, []);

  return {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: {
      errors: errorsRef.current,
      isDirty: Object.values(dirtyRef.current).some(Boolean),
      isValid: Object.keys(errorsRef.current).length === 0,
      dirtyFields: { ...dirtyRef.current },
      touchedFields: { ...touchedRef.current },
    },
  };
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useForm } from './implementation';

describe('Proxy-Based Form State Manager', () => {
  test('useForm returns register, handleSubmit, watch, setValue, getValues, reset', () => {
    const { result } = renderHook(() => useForm({ defaultValues: { name: '' } }));
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.handleSubmit).toBe('function');
    expect(typeof result.current.watch).toBe('function');
    expect(typeof result.current.setValue).toBe('function');
    expect(typeof result.current.getValues).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  test('register returns an object with name, ref, onChange, onBlur', () => {
    const { result } = renderHook(() => useForm({ defaultValues: { name: '' } }));
    const field = result.current.register('name');
    expect(field.name).toBe('name');
    expect(typeof field.ref).toBe('function');
    expect(typeof field.onChange).toBe('function');
    expect(typeof field.onBlur).toBe('function');
  });

  test('getValues returns current form values', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: 'John', email: 'john@test.com' } })
    );
    const values = result.current.getValues();
    expect(values.name).toBe('John');
    expect(values.email).toBe('john@test.com');
  });

  test('getValues with field name returns specific field', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: 'John', email: 'john@test.com' } })
    );
    expect(result.current.getValues('name')).toBe('John');
  });

  test('setValue updates a field value', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: '' } })
    );
    act(() => { result.current.setValue('name', 'Jane'); });
    expect(result.current.getValues('name')).toBe('Jane');
  });

  test('reset restores default values', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: 'original' } })
    );
    act(() => { result.current.setValue('name', 'changed'); });
    expect(result.current.getValues('name')).toBe('changed');
    act(() => { result.current.reset(); });
    expect(result.current.getValues('name')).toBe('original');
  });

  test('formState.isDirty starts false', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: '' } })
    );
    expect(result.current.formState.isDirty).toBe(false);
  });

  test('formState.isValid starts true with no validators', () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: '' } })
    );
    expect(result.current.formState.isValid).toBe(true);
  });
});`,
    keyPoints: [
      "Values live in refs, not state — this is the core insight of react-hook-form. Writing to a ref doesn't trigger a re-render, so typing in one field doesn't re-render the whole form",
      "register() returns a ref callback that captures the DOM element + onChange/onBlur handlers. This is the 'uncontrolled input' pattern that makes react-hook-form fast",
      "Dot-notation path resolution (address.city) with getPath/setPath enables nested objects without flattening — same as Lodash's _.get/_.set",
      "Validation modes (onChange/onBlur/onSubmit) match react-hook-form's API exactly — interviewers will recognize the design",
      "structuredClone on getValues/reset prevents consumers from mutating internal state — defensive copying is critical for form libraries",
    ],
    followUp:
      "How would you add field arrays (dynamic lists of fields)? How would you implement a watch() that only re-renders the watching component using Proxy? How does Zod/Yup resolver integration work?",
  },
  {
    id: 14,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Selectable Context (Solve the Re-Render Problem)",
    timeEstimate: "30 min",
    description:
      "React Context has a fundamental limitation: when ANY part of a context value changes, ALL consumers re-render — even if they only use a slice that didn't change. Build a `createSelectableContext` that solves this by implementing a subscription-based store with selector support, so components only re-render when their selected slice actually changes. This is the exact pattern used by Zustand, Redux, and the proposed React useContextSelector RFC.",
    realWorld:
      "This is THE most common React performance problem in production apps. Nadia Makarevich's 'React re-renders guide' (one of the most shared React articles ever) documents this extensively. Daishi Kato created use-context-selector specifically for this. The React team has discussed adding useContext(ctx, selector) natively. Zustand, Jotai, and every serious state manager uses external subscription stores to avoid this — Steve Kinney's React Performance course on Frontend Masters covers this pattern in detail.",
    requirements: [
      "createSelectableContext() returns { Provider, useSelector } — NOT useContext",
      "useSelector(selector, equalityFn?) only re-renders when selected value changes",
      "Support custom equality functions (shallow compare for objects)",
      "Provider doesn't re-render children when state changes (the whole point)",
      "Must work correctly with React's concurrent features (no tearing)",
    ],
    starterCode: `// Implement:
function createSelectableContext(initialState) {
  // Returns: {
  //   Provider: React component that wraps children,
  //   useSelector: (selector, equalityFn?) => selectedValue,
  //   useDispatch: () => dispatch function,
  // }
  //
  // The key insight: DON'T put state in context value.
  // Put a STORE REFERENCE in context, and subscribe to it.
}

// Usage:
// const { Provider, useSelector, useDispatch } = createSelectableContext({
//   user: { name: 'Randy', role: 'engineer' },
//   theme: 'dark',
//   notifications: [],
//   counter: 0,
// });
//
// // This ONLY re-renders when theme changes
// function ThemeDisplay() {
//   const theme = useSelector(state => state.theme);
//   return <div>Theme: {theme}</div>;
// }
//
// // This ONLY re-renders when counter changes
// function Counter() {
//   const count = useSelector(state => state.counter);
//   const dispatch = useDispatch();
//   return <button onClick={() => dispatch(s => ({...s, counter: s.counter + 1}))}>
//     Count: {count}
//   </button>;
// }
//
// // Changing counter does NOT re-render ThemeDisplay!`,
    solutionCode: `function createSelectableContext(initialState) {
  const StoreContext = createContext(null);

  // The store lives OUTSIDE React — this is the key trick
  function createStore(initial) {
    let state = initial;
    const listeners = new Set();

    return {
      getState: () => state,
      setState: (updater) => {
        const next = typeof updater === 'function'
          ? updater(state) : updater;
        if (Object.is(state, next)) return;
        state = next;
        // Notify all subscribers
        listeners.forEach(listener => listener());
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  function Provider({ children, initialValue }) {
    // Create store ONCE — ref ensures stability across re-renders
    const storeRef = useRef(null);
    if (!storeRef.current) {
      storeRef.current = createStore(initialValue ?? initialState);
    }

    // The context value is the STORE REFERENCE, not the state
    // This value NEVER changes, so the Provider NEVER causes
    // re-renders in children through context propagation
    return (
      <StoreContext.Provider value={storeRef.current}>
        {children}
      </StoreContext.Provider>
    );
  }

  function useSelector(selector, equalityFn = Object.is) {
    const store = useContext(StoreContext);
    if (!store) throw new Error('useSelector must be inside Provider');

    // useSyncExternalStore handles concurrent mode safely
    const selectedValue = useSyncExternalStore(
      store.subscribe,
      // getSnapshot: select the slice
      () => selector(store.getState()),
      // getServerSnapshot (SSR)
      () => selector(store.getState())
    );

    // For custom equality (e.g., shallow compare of objects),
    // we need to cache the previous selected value
    const prevRef = useRef(selectedValue);
    const currentSelected = selector(store.getState());

    if (!equalityFn(prevRef.current, currentSelected)) {
      prevRef.current = currentSelected;
    }

    return prevRef.current;
  }

  function useDispatch() {
    const store = useContext(StoreContext);
    if (!store) throw new Error('useDispatch must be inside Provider');

    // Return stable reference — setState doesn't change
    return store.setState;
  }

  // Bonus: useStore for direct access
  function useStore() {
    const store = useContext(StoreContext);
    if (!store) throw new Error('useStore must be inside Provider');
    return store;
  }

  return { Provider, useSelector, useDispatch, useStore };
}

// Utility: shallow equality for object selectors
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(key => Object.is(a[key], b[key]));
}`,
    testCode: `import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createSelectableContext } from './implementation';

describe('Selectable Context', () => {
  test('createSelectableContext returns Provider, useSelector, useDispatch', () => {
    const ctx = createSelectableContext({ count: 0 });
    expect(ctx.Provider).toBeDefined();
    expect(ctx.useSelector).toBeDefined();
    expect(ctx.useDispatch).toBeDefined();
  });

  test('useSelector reads initial state slice', () => {
    const { Provider, useSelector } = createSelectableContext({ count: 0, name: 'test' });
    function Display() {
      const name = useSelector(s => s.name);
      return <div data-testid="name">{name}</div>;
    }
    render(<Provider><Display /></Provider>);
    expect(screen.getByTestId('name').textContent).toBe('test');
  });

  test('useDispatch updates state and useSelector reflects changes', () => {
    const { Provider, useSelector, useDispatch } = createSelectableContext({ count: 0 });
    function Counter() {
      const count = useSelector(s => s.count);
      const dispatch = useDispatch();
      return (
        <div>
          <span data-testid="count">{count}</span>
          <button onClick={() => dispatch(s => ({ ...s, count: s.count + 1 }))}>inc</button>
        </div>
      );
    }
    render(<Provider><Counter /></Provider>);
    expect(screen.getByTestId('count').textContent).toBe('0');
    fireEvent.click(screen.getByText('inc'));
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  test('useSelector only re-renders when selected slice changes', () => {
    const { Provider, useSelector, useDispatch } = createSelectableContext({ count: 0, other: 'a' });
    let countRenders = 0;
    function CountDisplay() {
      const count = useSelector(s => s.count);
      countRenders++;
      return <span>{count}</span>;
    }
    function OtherUpdater() {
      const dispatch = useDispatch();
      return <button onClick={() => dispatch(s => ({ ...s, other: Math.random().toString() }))}>update other</button>;
    }
    render(<Provider><CountDisplay /><OtherUpdater /></Provider>);
    const initial = countRenders;
    fireEvent.click(screen.getByText('update other'));
    // Count selector didn't change, so CountDisplay should not re-render
    expect(countRenders).toBe(initial);
  });

  test('throws when useSelector is used outside Provider', () => {
    const { useSelector } = createSelectableContext({ count: 0 });
    function Bad() {
      useSelector(s => s.count);
      return null;
    }
    expect(() => render(<Bad />)).toThrow();
  });
});`,
    keyPoints: [
      "The fundamental trick: put the STORE in context, not the STATE. The context value (store reference) never changes, so the Provider never triggers context-based re-renders. Components subscribe to the store directly",
      "useSyncExternalStore is the bridge — it subscribes to the external store and only re-renders when getSnapshot returns a different value. This is concurrent-mode safe and prevents tearing",
      "This is exactly how Zustand works under the hood: external store + useSyncExternalStore + selector. Understanding this pattern means you understand Zustand's architecture",
      "Custom equality functions (shallowEqual) prevent re-renders when selectors return new object references with identical values — e.g., state => ({ name: state.name, email: state.email })",
      "The store is created in a ref to survive re-renders. If it were in state, updating it would re-render the Provider — defeating the entire purpose",
    ],
    followUp:
      "How would you add middleware (logging, persistence) to the store? How does this compare to the React team's proposed useContextSelector RFC? What are the tradeoffs vs splitting into multiple contexts?",
  },
  {
    id: 21,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Compound Components with Implicit State Sharing",
    timeEstimate: "25 min",
    description:
      "Build a compound component system (like Radix UI's Tabs, Accordion, or Select) where parent and child components share implicit state without prop drilling. Children don't receive state via props — they discover it via context. Support component composition where children can be wrapped in arbitrary DOM/layout elements, controlled/uncontrolled modes, and automatic index-based registration for keyboard navigation.",
    realWorld:
      "Radix UI, Reach UI (Ryan Florence), Headless UI (Tailwind Labs), and Ariakit all use this exact pattern. Kent C. Dodds popularized it in his 'Advanced React Patterns' course on Frontend Masters and EpicReact.dev. The HTML <select>/<option> relationship is the native platform equivalent. This is the dominant API pattern for accessible component libraries — understanding it is essential for building or contributing to design systems.",
    requirements: [
      "Parent manages state (activeIndex, isOpen) — children read via context",
      "Children work regardless of DOM nesting depth (wrapped in divs, fragments, etc.)",
      "Controlled and uncontrolled modes (like React's input with value vs defaultValue)",
      "Automatic index assignment — children register on mount, unregister on unmount",
      "Type-safe API: <Tabs><Tabs.List><Tabs.Trigger /><Tabs.Content /></Tabs>",
    ],
    starterCode: `// Implement a compound Tabs component:
// <Tabs defaultValue="tab1">
//   <Tabs.List>
//     <Tabs.Trigger value="tab1">Account</Tabs.Trigger>
//     <Tabs.Trigger value="tab2">Settings</Tabs.Trigger>
//   </Tabs.List>
//   <div className="my-custom-wrapper">  {/* arbitrary nesting works */}
//     <Tabs.Content value="tab1">Account settings here</Tabs.Content>
//     <Tabs.Content value="tab2">Settings panel here</Tabs.Content>
//   </div>
// </Tabs>

// The compound component pattern requires:
// 1. A context for implicit state sharing
// 2. A registration system for child components
// 3. Controlled/uncontrolled state management
// 4. Keyboard navigation (Arrow keys, Home, End)

// Implement:
function createCompoundComponent() {
  // Returns a Tabs object with:
  // Tabs (root) — manages state
  // Tabs.List — container for triggers, handles keyboard nav
  // Tabs.Trigger — clickable tab, reads active state from context
  // Tabs.Content — panel, shows/hides based on active tab
}`,
    solutionCode: `// --- Context ---
const TabsContext = createContext(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>');
  return ctx;
}

// --- Root: Manages state ---
function Tabs({ children, defaultValue, value: controlledValue, onValueChange, orientation = 'horizontal' }) {
  // Controlled/uncontrolled pattern
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const setActiveValue = useCallback((val) => {
    if (!isControlled) setUncontrolledValue(val);
    onValueChange?.(val);
  }, [isControlled, onValueChange]);

  // Registration system: track mounted triggers for keyboard nav
  const triggersRef = useRef(new Map()); // value -> DOM element

  const registerTrigger = useCallback((value, element) => {
    triggersRef.current.set(value, element);
    return () => triggersRef.current.delete(value);
  }, []);

  const getTriggerValues = useCallback(() => {
    return [...triggersRef.current.keys()];
  }, []);

  const focusTrigger = useCallback((value) => {
    triggersRef.current.get(value)?.focus();
  }, []);

  const contextValue = useMemo(() => ({
    activeValue,
    setActiveValue,
    registerTrigger,
    getTriggerValues,
    focusTrigger,
    orientation,
  }), [activeValue, setActiveValue, registerTrigger, getTriggerValues, focusTrigger, orientation]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div role="tablist-container" data-orientation={orientation}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// --- List: Container for triggers, keyboard navigation ---
function TabsList({ children, ...props }) {
  const { activeValue, setActiveValue, getTriggerValues, focusTrigger, orientation } = useTabs();

  const handleKeyDown = useCallback((e) => {
    const values = getTriggerValues();
    const currentIdx = values.indexOf(activeValue);
    const isHorizontal = orientation === 'horizontal';

    let nextIdx;
    switch (e.key) {
      case (isHorizontal ? 'ArrowRight' : 'ArrowDown'):
        e.preventDefault();
        nextIdx = currentIdx < values.length - 1 ? currentIdx + 1 : 0;
        break;
      case (isHorizontal ? 'ArrowLeft' : 'ArrowUp'):
        e.preventDefault();
        nextIdx = currentIdx > 0 ? currentIdx - 1 : values.length - 1;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = values.length - 1;
        break;
      default:
        return;
    }

    const nextValue = values[nextIdx];
    setActiveValue(nextValue);
    focusTrigger(nextValue);
  }, [activeValue, getTriggerValues, setActiveValue, focusTrigger, orientation]);

  return (
    <div role="tablist" onKeyDown={handleKeyDown} aria-orientation={orientation} {...props}>
      {children}
    </div>
  );
}

// --- Trigger: Individual tab button ---
function TabsTrigger({ children, value, disabled = false, ...props }) {
  const { activeValue, setActiveValue, registerTrigger } = useTabs();
  const isActive = activeValue === value;
  const ref = useRef(null);

  // Register on mount, unregister on unmount
  useEffect(() => {
    if (ref.current) {
      return registerTrigger(value, ref.current);
    }
  }, [value, registerTrigger]);

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      aria-controls={\`tabpanel-\${value}\`}
      id={\`tab-\${value}\`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => !disabled && setActiveValue(value)}
      {...props}
    >
      {children}
    </button>
  );
}

// --- Content: Tab panel ---
function TabsContent({ children, value, forceMount = false, ...props }) {
  const { activeValue } = useTabs();
  const isActive = activeValue === value;

  if (!isActive && !forceMount) return null;

  return (
    <div
      role="tabpanel"
      id={\`tabpanel-\${value}\`}
      aria-labelledby={\`tab-\${value}\`}
      data-state={isActive ? 'active' : 'inactive'}
      hidden={!isActive}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}

// --- Attach sub-components ---
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;`,
    testCode: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './implementation';

describe('Compound Components (Tabs)', () => {
  test('renders with default value and shows active content', () => {
    render(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
          <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a">Content A</Tabs.Content>
        <Tabs.Content value="b">Content B</Tabs.Content>
      </Tabs>
    );
    expect(screen.getByText('Content A')).toBeTruthy();
  });

  test('clicking a trigger switches active content', () => {
    render(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
          <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a">Content A</Tabs.Content>
        <Tabs.Content value="b">Content B</Tabs.Content>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab B'));
    expect(screen.getByText('Content B')).toBeTruthy();
  });

  test('trigger has correct aria-selected attribute', () => {
    render(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
          <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a">Content A</Tabs.Content>
        <Tabs.Content value="b">Content B</Tabs.Content>
      </Tabs>
    );
    expect(screen.getByText('Tab A').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Tab B').getAttribute('aria-selected')).toBe('false');
  });

  test('works with arbitrary nesting between parent and children', () => {
    render(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
          <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
        </Tabs.List>
        <div><div><Tabs.Content value="a">Nested A</Tabs.Content></div></div>
        <Tabs.Content value="b">Content B</Tabs.Content>
      </Tabs>
    );
    expect(screen.getByText('Nested A')).toBeTruthy();
  });

  test('content panel has role="tabpanel"', () => {
    render(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a">Content A</Tabs.Content>
      </Tabs>
    );
    expect(screen.getByRole('tabpanel')).toBeTruthy();
  });
});`,
    keyPoints: [
      "Context-based implicit state sharing is the core pattern — children don't receive 'isActive' as a prop, they read it from context. This means arbitrary DOM nesting between parent and children works, unlike with React.Children.map",
      "The registration system (triggersRef Map) lets keyboard navigation work without knowing the order of children at compile time — triggers register on mount and unregister on unmount, supporting dynamic lists",
      "Controlled/uncontrolled pattern: if 'value' prop is provided, the component is controlled (parent owns state). Otherwise, internal useState manages it. This mirrors React's own <input> behavior",
      "roving tabIndex (active tab has tabIndex=0, others have -1) is the WAI-ARIA pattern for tab lists — only the active trigger is in the tab order, arrow keys move between triggers",
      "The dot-notation API (Tabs.List, Tabs.Trigger) is achieved by attaching components as static properties — this is the Radix UI, Reach UI, and Headless UI convention for compound components",
    ],
    followUp:
      "How would you add animation support for tab content transitions? How would you implement this with the render prop pattern instead of context? How does Radix handle 'asChild' to let consumers control the rendered element?",
  },
  {
    id: 25,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Reactive Store with Computed Selectors",
    timeEstimate: "30 min",
    description:
      "Build a minimal Zustand/Jotai-style reactive store with computed/derived selectors that only re-render subscribing components when their selected slice changes. The store must use Object.is equality checking for selector output, support middleware (logging, persistence), and handle selector composition where one selector derives from another.",
    realWorld:
      "Zustand (created by Daishi Kato, maintained by pmndrs) is the most popular lightweight React store. Jotai's atom model and Redux's reselect library both solve the derived state problem. Zustand GitHub discussion #2318 explored why useSyncExternalStore was chosen over useState+useEffect — the tearing guarantees are critical for concurrent rendering. The React Working Group's useSyncExternalStore RFC directly shaped how all external stores integrate with React 18+.",
    requirements: [
      "createStore(initialState) returns a store with getState, setState, subscribe, and a destroy method",
      "useStore(store, selector) hook that only re-renders when selector(state) changes per Object.is comparison",
      "Derived/computed selectors: createSelector(store, selectorFn) that caches and only recomputes when dependencies change",
      "Middleware support: applyMiddleware(store, ...middlewares) where each middleware wraps setState to intercept updates (e.g., logger, persist)",
      "Selector composition: selectors can depend on other selectors, forming a DAG that updates leaf-to-root",
    ],
    starterCode: `// Implement:
// function createStore(initialState) { ... }
// function useStore(store, selector) { ... }
// function createSelector(store, selectorFn, equalityFn) { ... }
// function applyMiddleware(store, ...middlewares) { ... }

// Usage:
// const store = createStore({ users: [], filter: '', count: 0 });
//
// // Middleware
// const loggerMiddleware = (store) => (next) => (partial) => {
//   console.log('prev:', store.getState());
//   next(partial);
//   console.log('next:', store.getState());
// };
// applyMiddleware(store, loggerMiddleware);
//
// // Derived selector
// const filteredUsers = createSelector(store, (state) =>
//   state.users.filter(u => u.name.includes(state.filter))
// );
//
// function UserCount() {
//   const count = useStore(store, s => s.count); // only re-renders when count changes
//   return <div>{count}</div>;
// }
//
// function FilteredList() {
//   const users = useStore(store, filteredUsers);
//   return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
// }`,
    solutionCode: `function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  const getState = () => state;

  const setState = (partial) => {
    const nextState = typeof partial === 'function'
      ? partial(state)
      : { ...state, ...partial };
    if (Object.is(state, nextState)) return;
    state = nextState;
    listeners.forEach((listener) => listener(state));
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy = () => listeners.clear();

  return { getState, setState, subscribe, destroy };
}

function useStore(store, selector = (s) => s, equalityFn = Object.is) {
  // If selector is a derived selector object, use its getValue
  const selectorFn = typeof selector === 'function'
    ? selector
    : () => selector.getValue();

  const [, forceRender] = useReducer((c) => c + 1, 0);
  const selectorRef = useRef(selectorFn);
  const equalityRef = useRef(equalityFn);
  const snapshotRef = useRef(null);
  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    snapshotRef.current = selectorFn(store.getState());
    isFirstRender.current = false;
  }

  // Update refs on every render so the subscription closure is fresh
  selectorRef.current = selectorFn;
  equalityRef.current = equalityFn;

  useEffect(() => {
    const unsubscribe = store.subscribe((nextState) => {
      try {
        const nextSlice = selectorRef.current(nextState);
        if (!equalityRef.current(snapshotRef.current, nextSlice)) {
          snapshotRef.current = nextSlice;
          forceRender();
        }
      } catch (e) {
        // Selector threw — force render to show error boundary
        forceRender();
      }
    });
    return unsubscribe;
  }, [store]);

  // Re-run selector during render to catch tearing
  const currentSlice = selectorFn(store.getState());
  if (!equalityFn(snapshotRef.current, currentSlice)) {
    snapshotRef.current = currentSlice;
  }

  return snapshotRef.current;
}

function createSelector(store, selectorFn, equalityFn = Object.is) {
  let cachedInput = undefined;
  let cachedResult = undefined;

  const getValue = () => {
    const currentState = store.getState();
    if (cachedInput !== undefined && Object.is(cachedInput, currentState)) {
      return cachedResult;
    }
    const nextResult = selectorFn(currentState);
    // Structural sharing: reuse old result if equal
    if (cachedResult !== undefined && equalityFn(cachedResult, nextResult)) {
      cachedInput = currentState;
      return cachedResult;
    }
    cachedInput = currentState;
    cachedResult = nextResult;
    return cachedResult;
  };

  // Make it callable as a selector function too
  const derived = (state) => {
    // When called with state directly (from useStore subscription)
    const prevInput = cachedInput;
    cachedInput = state;
    const result = selectorFn(state);
    if (prevInput !== undefined && equalityFn(cachedResult, result)) {
      cachedInput = state;
      return cachedResult;
    }
    cachedResult = result;
    return cachedResult;
  };

  derived.getValue = getValue;
  return derived;
}

function applyMiddleware(store, ...middlewares) {
  const originalSetState = store.setState.bind(store);
  // Build middleware chain: outermost middleware wraps innermost
  const chain = middlewares.reduceRight(
    (next, middleware) => middleware(store)(next),
    originalSetState
  );
  store.setState = chain;
  return store;
}

// --- Demo ---
function StoreDemo() {
  const store = useMemo(() => {
    const s = createStore({ count: 0, text: '', items: [] });
    const logger = (st) => (next) => (partial) => {
      console.log('[store] prev:', st.getState());
      next(partial);
      console.log('[store] next:', st.getState());
    };
    applyMiddleware(s, logger);
    return s;
  }, []);

  const count = useStore(store, (s) => s.count);
  const text = useStore(store, (s) => s.text);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => store.setState((s) => ({ ...s, count: s.count + 1 }))}>+1</button>
      <input value={text} onChange={(e) => store.setState({ text: e.target.value })} />
    </div>
  );
}`,
    testCode: `import { createStore, createSelector, applyMiddleware } from './implementation';

describe('Reactive Store', () => {
  test('createStore returns store with getState, setState, subscribe, destroy', () => {
    const store = createStore({ count: 0 });
    expect(typeof store.getState).toBe('function');
    expect(typeof store.setState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
    expect(typeof store.destroy).toBe('function');
  });

  test('getState returns the current state', () => {
    const store = createStore({ count: 0, name: 'test' });
    expect(store.getState()).toEqual({ count: 0, name: 'test' });
  });

  test('setState merges partial state', () => {
    const store = createStore({ count: 0, name: 'test' });
    store.setState({ count: 5 });
    expect(store.getState().count).toBe(5);
    expect(store.getState().name).toBe('test');
  });

  test('setState accepts updater function', () => {
    const store = createStore({ count: 0 });
    store.setState((s) => ({ ...s, count: s.count + 1 }));
    expect(store.getState().count).toBe(1);
  });

  test('subscribe notifies on state change', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    store.subscribe(listener);
    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('unsubscribe stops notifications', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    const unsub = store.subscribe(listener);
    unsub();
    store.setState({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  test('destroy clears all listeners', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    store.subscribe(listener);
    store.destroy();
    store.setState({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  test('createSelector caches computed results', () => {
    const store = createStore({ items: [1, 2, 3], filter: '' });
    const selectorFn = jest.fn((s) => s.items.filter(i => i > 1));
    const selector = createSelector(store, selectorFn);
    const result1 = selector(store.getState());
    const result2 = selector(store.getState());
    expect(result1).toEqual([2, 3]);
    // Should use cached result for same input
    expect(result1).toBe(result2);
  });

  test('applyMiddleware wraps setState', () => {
    const store = createStore({ count: 0 });
    const log = [];
    const logger = (st) => (next) => (partial) => {
      log.push('before');
      next(partial);
      log.push('after');
    };
    applyMiddleware(store, logger);
    store.setState({ count: 1 });
    expect(log).toEqual(['before', 'after']);
    expect(store.getState().count).toBe(1);
  });
});`,
    keyPoints: [
      "Object.is equality on selector output is the key optimization — if the derived value hasn't changed, the component skips re-rendering even though the store's root reference changed. This is exactly how Zustand's useStore works internally",
      "The middleware pattern (store => next => partial) mirrors Redux middleware and Zustand's middleware API — each middleware wraps setState, allowing logging, persistence, devtools, and immer integration to be composed",
      "createSelector caches both input state and output result, implementing memoized selectors like Reselect — if the state reference hasn't changed, skip recomputation; if the output is equal, reuse the old reference for downstream Object.is checks",
      "Using useReducer for forceRender instead of useState avoids the stale closure problem — the reducer always runs with the latest state, and the subscription callback uses refs to always have the current selector and equality function",
      "Tearing detection during render (re-running the selector and comparing) catches cases where the store mutated between the subscription notification and React committing — this is the same problem useSyncExternalStore solves officially",
    ],
    followUp:
      "How would you integrate this with useSyncExternalStore for proper concurrent mode support? How would you implement transient updates (updates that don't trigger React re-renders, useful for animations)? How would Immer middleware simplify the setState API?",
  },
  {
    id: 26,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Schema-Driven Form Validation Engine",
    timeEstimate: "35 min",
    description:
      "Build a form validation engine that takes a Zod-like schema definition and produces validation errors, touched/dirty tracking, async field validation with debounce, and cross-field validation (e.g., password confirmation). The engine must use field-level subscriptions so that updating one field does not re-render the entire form.",
    realWorld:
      "react-hook-form (by Bill Luo) with Zod integration is the industry standard for performant React forms. Formik's Yup integration popularized schema-driven validation. react-hook-form GitHub issue #10512 documented the FormProvider re-render problem where the entire form tree re-renders on any field change — field-level subscriptions were the solution. TanStack Form (by Tanner Linsley) adopted a similar fine-grained subscription model to eliminate unnecessary re-renders in large forms.",
    requirements: [
      "defineSchema(config) — declare fields with sync validators, async validators, and cross-field rules",
      "useForm(schema) — returns form-level state: isValid, isSubmitting, errors, handleSubmit",
      "useField(form, fieldName) — field-level subscription returning value, error, touched, dirty, onChange, onBlur",
      "Async validation with configurable debounce (e.g., username availability check) that cancels stale requests",
      "Cross-field validation: rules that depend on multiple fields (e.g., passwordConfirm must match password)",
    ],
    starterCode: `// Implement:
// function defineSchema(config) { ... }
// function useForm(schema, initialValues) { ... }
// function useField(form, fieldName) { ... }

// Schema definition:
// const schema = defineSchema({
//   username: {
//     required: 'Username is required',
//     minLength: [3, 'At least 3 characters'],
//     async: {
//       validate: async (value) => {
//         const res = await fetch(\`/api/check-username?u=\${value}\`);
//         const { available } = await res.json();
//         return available ? null : 'Username taken';
//       },
//       debounce: 400,
//     },
//   },
//   email: {
//     required: 'Email is required',
//     pattern: [/^[^@]+@[^@]+\\.[^@]+\$/, 'Invalid email'],
//   },
//   password: {
//     required: 'Password is required',
//     minLength: [8, 'At least 8 characters'],
//   },
//   passwordConfirm: {
//     required: 'Please confirm password',
//     crossField: {
//       deps: ['password'],
//       validate: (value, { password }) => value === password ? null : 'Passwords must match',
//     },
//   },
// });
//
// function SignupForm() {
//   const form = useForm(schema, { username: '', email: '', password: '', passwordConfirm: '' });
//   return (
//     <form onSubmit={form.handleSubmit(onSubmit)}>
//       <UsernameField form={form} />
//       <EmailField form={form} />
//       ...
//     </form>
//   );
// }
//
// function UsernameField({ form }) {
//   const field = useField(form, 'username');
//   return (
//     <div>
//       <input value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
//       {field.touched && field.error && <span>{field.error}</span>}
//     </div>
//   );
// }`,
    solutionCode: `function defineSchema(config) {
  return { fields: config };
}

function createFormStore(schema, initialValues) {
  const state = {
    values: { ...initialValues },
    errors: {},
    touched: {},
    dirty: {},
    isSubmitting: false,
    asyncValidating: {},
  };

  const fieldListeners = {};
  const formListeners = new Set();

  const getState = () => state;

  const notifyField = (name) => {
    (fieldListeners[name] || []).forEach((fn) => fn());
  };

  const notifyForm = () => {
    formListeners.forEach((fn) => fn());
  };

  const validateSync = (name, value) => {
    const rules = schema.fields[name];
    if (!rules) return null;
    if (rules.required && (!value || value.length === 0)) {
      return typeof rules.required === 'string' ? rules.required : 'Required';
    }
    if (rules.minLength) {
      const [min, msg] = Array.isArray(rules.minLength) ? rules.minLength : [rules.minLength, 'Too short'];
      if (value && value.length < min) return msg;
    }
    if (rules.pattern) {
      const [regex, msg] = Array.isArray(rules.pattern) ? rules.pattern : [rules.pattern, 'Invalid'];
      if (value && !regex.test(value)) return msg;
    }
    return null;
  };

  const validateCrossField = (name, value) => {
    const rules = schema.fields[name];
    if (!rules?.crossField) return null;
    const depValues = {};
    rules.crossField.deps.forEach((dep) => { depValues[dep] = state.values[dep]; });
    return rules.crossField.validate(value, depValues);
  };

  const asyncTimers = {};

  const validateAsync = (name, value) => {
    const rules = schema.fields[name];
    if (!rules?.async) return;

    clearTimeout(asyncTimers[name]);
    state.asyncValidating[name] = true;

    asyncTimers[name] = setTimeout(async () => {
      try {
        const error = await rules.async.validate(value);
        // Only apply if value hasn't changed since
        if (state.values[name] === value) {
          state.errors[name] = error || state.errors[name] === error ? error : state.errors[name];
          state.asyncValidating[name] = false;
          notifyField(name);
          notifyForm();
        }
      } catch {
        state.asyncValidating[name] = false;
        notifyField(name);
      }
    }, rules.async.debounce || 300);
  };

  const setFieldValue = (name, value) => {
    state.values[name] = value;
    state.dirty[name] = value !== initialValues[name];
    // Run sync validation
    const syncError = validateSync(name, value);
    const crossError = !syncError ? validateCrossField(name, value) : null;
    state.errors[name] = syncError || crossError;
    // Trigger async validation if sync passes
    if (!syncError && !crossError) validateAsync(name, value);
    // Re-validate dependents (cross-field)
    Object.keys(schema.fields).forEach((fieldName) => {
      const dep = schema.fields[fieldName]?.crossField?.deps;
      if (dep && dep.includes(name) && state.touched[fieldName]) {
        const crossErr = validateCrossField(fieldName, state.values[fieldName]);
        if (state.errors[fieldName] !== crossErr) {
          state.errors[fieldName] = crossErr;
          notifyField(fieldName);
        }
      }
    });
    notifyField(name);
    notifyForm();
  };

  const setFieldTouched = (name) => {
    state.touched[name] = true;
    if (!state.errors[name]) {
      const syncErr = validateSync(name, state.values[name]);
      const crossErr = !syncErr ? validateCrossField(name, state.values[name]) : null;
      state.errors[name] = syncErr || crossErr;
    }
    notifyField(name);
  };

  const subscribeField = (name, fn) => {
    if (!fieldListeners[name]) fieldListeners[name] = new Set();
    fieldListeners[name].add(fn);
    return () => fieldListeners[name].delete(fn);
  };

  const subscribeForm = (fn) => {
    formListeners.add(fn);
    return () => formListeners.delete(fn);
  };

  const isValid = () => {
    return Object.keys(schema.fields).every((name) => !state.errors[name] && !state.asyncValidating[name]);
  };

  return { getState, setFieldValue, setFieldTouched, subscribeField, subscribeForm, isValid };
}

function useForm(schema, initialValues = {}) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createFormStore(schema, initialValues);
  }
  const store = storeRef.current;
  const [, forceRender] = useReducer((c) => c + 1, 0);

  useEffect(() => store.subscribeForm(forceRender), [store]);

  const handleSubmit = useCallback(
    (onSubmit) => (e) => {
      e?.preventDefault();
      const s = store.getState();
      // Touch all fields
      Object.keys(schema.fields).forEach((name) => store.setFieldTouched(name));
      if (store.isValid()) {
        s.isSubmitting = true;
        forceRender();
        Promise.resolve(onSubmit(s.values)).finally(() => {
          s.isSubmitting = false;
          forceRender();
        });
      }
    },
    [store, schema]
  );

  const state = store.getState();
  return {
    handleSubmit,
    isValid: store.isValid(),
    isSubmitting: state.isSubmitting,
    errors: state.errors,
    values: state.values,
    _store: store,
  };
}

function useField(form, name) {
  const store = form._store;
  const [, forceRender] = useReducer((c) => c + 1, 0);

  useEffect(() => store.subscribeField(name, forceRender), [store, name]);

  const state = store.getState();

  const onChange = useCallback(
    (e) => {
      const value = e?.target ? e.target.value : e;
      store.setFieldValue(name, value);
    },
    [store, name]
  );

  const onBlur = useCallback(() => store.setFieldTouched(name), [store, name]);

  return {
    value: state.values[name],
    error: state.errors[name],
    touched: !!state.touched[name],
    dirty: !!state.dirty[name],
    onChange,
    onBlur,
  };
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { defineSchema, useForm, useField } from './implementation';

describe('Schema-Driven Form Validation', () => {
  const schema = defineSchema({
    username: {
      required: 'Username is required',
      minLength: [3, 'At least 3 characters'],
    },
    email: {
      required: 'Email is required',
      pattern: [/^[^@]+@[^@]+\\.[^@]+$/, 'Invalid email'],
    },
    password: {
      required: 'Password is required',
      minLength: [8, 'At least 8 characters'],
    },
  });

  test('defineSchema returns a schema object with fields', () => {
    expect(schema).toBeDefined();
    expect(schema.fields).toBeDefined();
    expect(schema.fields.username).toBeDefined();
    expect(schema.fields.email).toBeDefined();
  });

  test('useForm returns form state and handlers', () => {
    const { result } = renderHook(() =>
      useForm(schema, { username: '', email: '', password: '' })
    );
    expect(result.current.handleSubmit).toBeDefined();
    expect(typeof result.current.handleSubmit).toBe('function');
    expect(result.current.errors).toBeDefined();
  });

  test('useField returns field state with value, onChange, onBlur', () => {
    const { result: formResult } = renderHook(() =>
      useForm(schema, { username: '', email: '', password: '' })
    );
    const { result } = renderHook(() =>
      useField(formResult.current, 'username')
    );
    expect(result.current.value).toBeDefined();
    expect(typeof result.current.onChange).toBe('function');
    expect(typeof result.current.onBlur).toBe('function');
    expect(result.current.touched).toBe(false);
    expect(result.current.dirty).toBe(false);
  });

  test('useField onChange updates field value', () => {
    const { result: formResult } = renderHook(() =>
      useForm(schema, { username: '', email: '', password: '' })
    );
    const { result } = renderHook(() =>
      useField(formResult.current, 'username')
    );
    act(() => {
      result.current.onChange({ target: { value: 'bob' } });
    });
    expect(result.current.value).toBe('bob');
  });

  test('useField onBlur marks field as touched', () => {
    const { result: formResult } = renderHook(() =>
      useForm(schema, { username: '', email: '', password: '' })
    );
    const { result } = renderHook(() =>
      useField(formResult.current, 'username')
    );
    act(() => {
      result.current.onBlur();
    });
    expect(result.current.touched).toBe(true);
  });
});`,
    keyPoints: [
      "Field-level subscriptions via separate listener sets per field name ensure that typing in one input does not re-render sibling fields — this is the core optimization react-hook-form uses to outperform Formik on large forms",
      "Async validation with debounce via setTimeout and stale-value checking prevents race conditions — if the user types 'abc' then 'abcd', only the result for 'abcd' is applied, matching how real username-availability checks must work",
      "Cross-field dependency tracking (passwordConfirm watches password) triggers re-validation of dependents when their dependency changes — this is the declarative approach TanStack Form and react-hook-form use instead of manual imperative validation",
      "The form store is a mutable object with pub/sub rather than immutable state — this is intentional because form state changes rapidly (every keystroke) and creating new objects for each character is wasteful, which is why react-hook-form uses refs internally",
      "Separating the store (createFormStore) from the hooks (useForm/useField) follows the same architecture as react-hook-form's FormProvider — the store is framework-agnostic and testable, while hooks are thin React bindings",
    ],
    followUp:
      "How would you add field arrays (dynamic lists of fields like adding multiple addresses)? How would you implement form-level async validation that runs on submit? How would you handle deeply nested field paths like 'address.city' with proper subscription granularity?",
  },
  {
    id: 32,
    category: "Hooks & State",
    difficulty: "Expert",
    title: "Type-Safe Pub/Sub Event Bus with React Integration",
    timeEstimate: "25 min",
    description:
      "Build an event bus that supports named event channels, wildcard subscriptions (e.g., 'user.*' matches 'user.login' and 'user.logout'), once-only listeners, event history with replay for late subscribers, and automatic cleanup on component unmount. The system must prevent the 'zombie subscription' problem where unmounted components continue to receive events and attempt state updates.",
    realWorld:
      "mitt by Jason Miller (creator of Preact) is a 200-byte event emitter that inspired this pattern — it uses a Map of event-name to handler arrays. EventEmitter3 is the most popular event library on npm with the same core design. RxJS Subjects implement the same pub/sub pattern with replay via ReplaySubject. Node.js EventEmitter is the server-side equivalent. Dan Abramov's 'You Might Not Need Redux' blog post explains why Flux stores originally used event emitters for change notification. React-Redux's 'zombie child' problem (GitHub Issue #1351) demonstrates why subscription cleanup on unmount is critical for correctness.",
    requirements: [
      "createEventBus(): typed event channels with emit(event, data), on(event, handler), and off(event, handler)",
      "Wildcard subscriptions: 'user.*' matches any event starting with 'user.', and '*' matches all events",
      "once(event, handler): listener that automatically removes itself after first invocation",
      "Event history with replay: new subscribers can opt-in to receive the last N events on that channel immediately upon subscribing",
      "useEvent hook: subscribe to events with automatic cleanup on unmount, preventing zombie subscriptions and stale closure bugs",
    ],
    testCode: `import { createEventBus } from './implementation';

describe('createEventBus', () => {
  test('emits and receives events', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.on('test', handler);
    bus.emit('test', { value: 1 });
    expect(handler).toHaveBeenCalledWith({ value: 1 }, 'test');
  });

  test('unsubscribes with returned function', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test', { value: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  test('wildcard * matches all events', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.on('*', handler);
    bus.emit('user.login', { id: 1 });
    bus.emit('app.start', {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('wildcard user.* matches user.login and user.logout', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.on('user.*', handler);
    bus.emit('user.login', { id: 1 });
    bus.emit('user.logout', { id: 1 });
    bus.emit('app.start', {}); // should NOT match
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('once listener fires only once', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.once('test', handler);
    bus.emit('test', 'a');
    bus.emit('test', 'b');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('a', 'test');
  });

  test('replays history for late subscribers', () => {
    const bus = createEventBus({ historySize: 5 });
    bus.emit('msg', { text: 'one' });
    bus.emit('msg', { text: 'two' });
    bus.emit('msg', { text: 'three' });
    const handler = jest.fn();
    bus.on('msg', handler, { replay: 2 });
    // Should have been called with the last 2 historical events
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ text: 'two' }, 'msg');
    expect(handler).toHaveBeenCalledWith({ text: 'three' }, 'msg');
  });

  test('off removes a specific handler', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test', {});
    expect(handler).not.toHaveBeenCalled();
  });

  test('multiple handlers on same event', () => {
    const bus = createEventBus();
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test', 'data');
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });
});`,
    starterCode: `// Implement an event bus with React integration:

// const bus = createEventBus({ historySize: 10 });
//
// // Emit events
// bus.emit('user.login', { userId: '123', timestamp: Date.now() });
// bus.emit('user.logout', { userId: '123' });
// bus.emit('notification.new', { message: 'Hello' });
//
// // Subscribe to specific events
// const unsub = bus.on('user.login', (data) => console.log('Login:', data));
//
// // Wildcard subscriptions
// bus.on('user.*', (data, eventName) => console.log('User event:', eventName, data));
// bus.on('*', (data, eventName) => console.log('Any event:', eventName, data));
//
// // Once-only listener
// bus.once('app.ready', (data) => console.log('App ready (fires once):', data));
//
// // Replay last N events for late subscriber
// bus.on('notification.new', handler, { replay: 5 });
//
// // React hook:
// function ChatWidget() {
//   const [messages, setMessages] = useState([]);
//
//   useEvent(bus, 'chat.message', (msg) => {
//     setMessages(prev => [...prev, msg]);
//   }, { replay: 10 }); // Catch up on last 10 messages
//
//   useEvent(bus, 'chat.*', (data, eventName) => {
//     console.log('Chat activity:', eventName);
//   });
//
//   return <ul>{messages.map((m, i) => <li key={i}>{m.text}</li>)}</ul>;
// }

// Implement createEventBus and useEvent.`,
    solutionCode: `// --- Event Bus ---
function createEventBus({ historySize = 0 } = {}) {
  const handlers = new Map();    // event -> Set<{ fn, once }>
  const history = new Map();     // event -> Array<{ data, timestamp }>

  function getHandlers(event) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    return handlers.get(event);
  }

  function addToHistory(event, data) {
    if (historySize <= 0) return;
    if (!history.has(event)) history.set(event, []);
    const eventHistory = history.get(event);
    eventHistory.push({ data, timestamp: Date.now() });
    // Trim to max size
    if (eventHistory.length > historySize) {
      eventHistory.splice(0, eventHistory.length - historySize);
    }
  }

  function matchesWildcard(pattern, event) {
    if (pattern === '*') return true;
    if (pattern === event) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return event.startsWith(prefix + '.') || event === prefix;
    }
    return false;
  }

  function emit(event, data) {
    addToHistory(event, data);

    // Collect matching handlers: exact match + wildcards
    const toInvoke = [];
    handlers.forEach((handlerSet, pattern) => {
      if (matchesWildcard(pattern, event)) {
        handlerSet.forEach(entry => toInvoke.push({ entry, handlerSet }));
      }
    });

    // Invoke handlers, removing once-only after invocation
    toInvoke.forEach(({ entry, handlerSet }) => {
      try {
        entry.fn(data, event);
      } catch (err) {
        console.error('Event handler error for ' + event + ':', err);
      }
      if (entry.once) handlerSet.delete(entry);
    });
  }

  function on(event, fn, options = {}) {
    const { replay = 0, once = false } = options;
    const entry = { fn, once };
    getHandlers(event).add(entry);

    // Replay history if requested
    if (replay > 0 && historySize > 0) {
      // For wildcard patterns, replay matching events from all channels
      const matchingHistory = [];
      history.forEach((entries, historicEvent) => {
        if (matchesWildcard(event, historicEvent)) {
          entries.forEach(h => matchingHistory.push({ ...h, event: historicEvent }));
        }
      });

      // Sort by timestamp and take last N
      matchingHistory
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-replay)
        .forEach(h => {
          try { fn(h.data, h.event); }
          catch (err) { console.error('Replay handler error:', err); }
        });
    }

    // Return unsubscribe function
    return () => {
      const set = handlers.get(event);
      if (set) {
        set.delete(entry);
        if (set.size === 0) handlers.delete(event);
      }
    };
  }

  function once(event, fn, options = {}) {
    return on(event, fn, { ...options, once: true });
  }

  function off(event, fn) {
    const set = handlers.get(event);
    if (!set) return;
    set.forEach(entry => {
      if (entry.fn === fn) set.delete(entry);
    });
    if (set.size === 0) handlers.delete(event);
  }

  function clear() {
    handlers.clear();
    history.clear();
  }

  function getHistory(event, count) {
    const entries = history.get(event) || [];
    return count ? entries.slice(-count) : [...entries];
  }

  return { emit, on, once, off, clear, getHistory };
}

// --- React Hook ---
function useEvent(bus, event, handler, options = {}) {
  // Use ref to always have the latest handler without re-subscribing
  const handlerRef = useRef(handler);
  const busRef = useRef(bus);
  const eventRef = useRef(event);
  const replayedRef = useRef(false);

  // Update the handler ref on every render to avoid stale closures
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    // Stable wrapper that delegates to the current handler ref
    const stableHandler = (data, eventName) => {
      handlerRef.current(data, eventName);
    };

    // Only replay on first subscription, not on re-renders
    const replayOpts = !replayedRef.current ? options.replay : 0;
    replayedRef.current = true;

    const unsub = busRef.current.on(eventRef.current, stableHandler, {
      replay: replayOpts || 0,
    });

    // Cleanup: unsubscribe on unmount — prevents zombie subscriptions
    return unsub;
  }, [bus, event]); // Re-subscribe only if bus or event changes
}

// --- Emit hook for convenience ---
function useEmit(bus) {
  return useCallback((event, data) => {
    bus.emit(event, data);
  }, [bus]);
}

// --- Demo component ---
function EventBusDemo() {
  const [bus] = useState(() => createEventBus({ historySize: 50 }));
  const [log, setLog] = useState([]);

  // Subscribe to all events
  useEvent(bus, '*', (data, eventName) => {
    setLog(prev => [...prev.slice(-19), { eventName, data, time: Date.now() }]);
  });

  const emit = useEmit(bus);

  return (
    <div>
      <button onClick={() => emit('user.login', { id: 1 })}>Login</button>
      <button onClick={() => emit('user.logout', { id: 1 })}>Logout</button>
      <button onClick={() => emit('notification.new', { text: 'Hi' })}>Notify</button>
      <ul>
        {log.map((entry, i) => (
          <li key={i}>{entry.eventName}: {JSON.stringify(entry.data)}</li>
        ))}
      </ul>
    </div>
  );
}`,
    keyPoints: [
      "The handlerRef pattern in useEvent solves the stale closure problem — the effect subscribes once with a stable wrapper function that always delegates to handlerRef.current, which is updated on every render. This means the subscription never changes but the handler always has access to the latest props and state",
      "Wildcard matching uses a simple prefix check: 'user.*' matches events starting with 'user.' — this avoids the complexity of full glob patterns while covering the most common use case. The '*' catch-all pattern enables global event logging and debugging, similar to Redux DevTools' action logging",
      "Event history with replay enables late subscribers to catch up — like RxJS ReplaySubject, a new chat component mounting can immediately receive the last 10 messages. The replayedRef flag prevents duplicate replays on React strict mode's double-mount in development",
      "Zombie subscription prevention is built into the useEvent hook's cleanup return — when a component unmounts, the returned unsubscribe function removes the handler from the Set. Without this, unmounted components would receive events and call setState, causing React's 'Can't perform a state update on an unmounted component' warning (fixed in React 18 but still a logic bug)",
      "Using a Set of entry objects (rather than a Map of function references) allows the same function to be registered multiple times for different events without collision, and once-only listeners can be removed by deleting the specific entry rather than searching by function identity",
    ],
    followUp:
      "How would you add typed event channels where each event name maps to a specific payload type (compile-time safety without TypeScript, using JSDoc or runtime validation)? How would you implement event middleware (interceptors that can transform, delay, or cancel events before they reach handlers)? How would you add priority-based handler ordering so critical handlers always execute first?",
  },
];
