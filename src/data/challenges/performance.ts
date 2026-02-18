import type { Challenge } from '@/types/challenge';

export const performanceChallenges: Challenge[] = [
  {
    id: 3,
    category: "Performance",
    difficulty: "Expert",
    title: "Build a Virtualized List from Scratch",
    timeEstimate: "30 min",
    description:
      "Implement a windowed/virtualized list that can smoothly render 100,000+ items. Only DOM nodes visible in the viewport (plus a small overscan buffer) should exist at any time. The list must handle variable-height items without knowing heights in advance — you must measure them dynamically and adjust positions as heights become known.",
    realWorld:
      "react-window (by Brian Vaughn, former React core team) and TanStack Virtual use these exact algorithms. The variable-height measurement problem using CellMeasurer/ResizeObserver is one of the most common performance challenges in production React apps — Slack, Discord, and Twitter/X all implement custom virtualized lists. Google's web.dev recommends this as a core performance optimization.",
    requirements: [
      "Only render items in the visible viewport + overscan buffer",
      "Support variable/unknown item heights — measure after mount, cache results",
      "Maintain correct scroll position as measured heights replace estimates",
      "Smooth scrolling with no visible jank or flickering",
      "Handle container resize and dynamic content changes",
    ],
    starterCode: `// Implement:
function useVirtualList({
  itemCount,         // total number of items
  estimateHeight,    // (index) => estimated height in px
  overscan = 5,      // extra items above/below viewport
  containerRef,      // ref to the scrollable container
}) {
  // Must return:
  // {
  //   virtualItems: [{ index, offsetTop, height, measureRef }],
  //   totalHeight: number,
  //   scrollToIndex: (index) => void,
  // }
}

// Usage:
// function BigList({ items }) {
//   const containerRef = useRef(null);
//   const { virtualItems, totalHeight } = useVirtualList({
//     itemCount: items.length,
//     estimateHeight: () => 60,
//     overscan: 5,
//     containerRef,
//   });
//
//   return (
//     <div ref={containerRef} style={{ height: 600, overflow: 'auto' }}>
//       <div style={{ height: totalHeight, position: 'relative' }}>
//         {virtualItems.map(vItem => (
//           <div
//             key={vItem.index}
//             ref={vItem.measureRef}
//             style={{
//               position: 'absolute',
//               top: vItem.offsetTop,
//               width: '100%',
//             }}
//           >
//             <ItemComponent data={items[vItem.index]} />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }`,
    solutionCode: `function useVirtualList({
  itemCount,
  estimateHeight,
  overscan = 5,
  containerRef,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const measuredHeights = useRef(new Map()); // index -> measured height
  const measureQueue = useRef(new Set());

  // Get height for an item: measured or estimated
  const getHeight = useCallback((index) => {
    return measuredHeights.current.get(index) ?? estimateHeight(index);
  }, [estimateHeight]);

  // Build offset cache: cumulative offset for each item
  // Only recompute what's needed using a running total
  const { offsets, totalHeight } = useMemo(() => {
    const offsets = new Array(itemCount);
    let runningOffset = 0;
    for (let i = 0; i < itemCount; i++) {
      offsets[i] = runningOffset;
      runningOffset += getHeight(i);
    }
    return { offsets, totalHeight: runningOffset };
  }, [itemCount, getHeight, measuredHeights.current.size]);

  // Binary search for the first visible item
  const findStartIndex = useCallback((scrollTop) => {
    let lo = 0, hi = itemCount - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (offsets[mid] + getHeight(mid) <= scrollTop) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }, [offsets, getHeight, itemCount]);

  // Determine visible range
  const startIndex = Math.max(0, findStartIndex(scrollTop) - overscan);
  const endScrollTop = scrollTop + containerHeight;
  let endIndex = startIndex;
  while (endIndex < itemCount && offsets[endIndex] < endScrollTop) {
    endIndex++;
  }
  endIndex = Math.min(itemCount - 1, endIndex + overscan);

  // Force re-render when measurements come in
  const [, forceRender] = useReducer(x => x + 1, 0);

  // Create measureRef for each virtual item
  const createMeasureRef = useCallback((index) => {
    return (el) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const prevHeight = measuredHeights.current.get(index);
      if (prevHeight !== rect.height) {
        measuredHeights.current.set(index, rect.height);
        measureQueue.current.add(index);
        // Batch measurement updates
        requestAnimationFrame(() => {
          if (measureQueue.current.size > 0) {
            measureQueue.current.clear();
            forceRender();
          }
        });
      }
    };
  }, []);

  // Build virtual items
  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offsetTop: offsets[i],
        height: getHeight(i),
        measureRef: createMeasureRef(i),
      });
    }
    return items;
  }, [startIndex, endIndex, offsets, getHeight, createMeasureRef]);

  // Scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });

    container.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [containerRef]);

  // scrollToIndex
  const scrollToIndex = useCallback((index) => {
    const container = containerRef.current;
    if (container && offsets[index] !== undefined) {
      container.scrollTop = offsets[index];
    }
  }, [offsets, containerRef]);

  return { virtualItems, totalHeight, scrollToIndex };
}`,
    keyPoints: [
      "Binary search (O(log n)) to find the first visible item instead of scanning from 0 — critical at 100k+ items",
      "ResizeObserver on the container handles dynamic container sizing; requestAnimationFrame batches measurement updates to avoid layout thrashing",
      "The measureRef callback pattern lets items self-report their actual height after mount — the offset cache then recalculates, and position: absolute prevents layout shifts",
      "{ passive: true } on the scroll listener tells the browser we won't preventDefault(), enabling compositor-thread scrolling (60fps)",
      "This is essentially how react-window and TanStack Virtual work internally — interviewers will ask you to compare your implementation to these libraries",
    ],
    followUp:
      "How would you handle items that resize after initial measurement (expand/collapse, images loading)? How would you implement smooth scroll-to-index with animation? What about horizontal + vertical virtualization (grid)?",
  },
  {
    id: 4,
    category: "Performance",
    difficulty: "Expert",
    title: "Concurrent-Safe Data Fetching with Race Condition Elimination",
    timeEstimate: "25 min",
    description:
      "Build a `useQuery` hook that manages async data fetching with proper race condition handling, stale-while-revalidate caching, deduplication of in-flight requests, and garbage collection of unused cache entries. This must be concurrent-mode safe — React 18's StrictMode double-mounts and useTransition must not break it.",
    realWorld:
      "TanStack Query (formerly React Query) by Tanner Linsley and SWR by Vercel implement this exact architecture. TkDodo's blog (maintainer of React Query) extensively documents the stale-while-revalidate pattern. Race conditions with AbortController are one of the most commonly tested real-world bugs — Dan Abramov wrote the original post on fixing them, and it's a top interview topic per GreatFrontEnd and Toptal.",
    requirements: [
      "AbortController cancellation on unmount AND on key change (race condition elimination)",
      "Shared cache across components — two components with the same key share one fetch",
      "Stale-while-revalidate: return cached data immediately, revalidate in background",
      "Deduplicate in-flight requests: if a fetch for key X is pending, don't start another",
      "Garbage collect cache entries when no components are subscribed to them (with a grace period)",
    ],
    starterCode: `// Implement:
const queryCache = createQueryCache();

function useQuery(key, fetcher, options = {}) {
  // key: string — cache key
  // fetcher: (signal: AbortSignal) => Promise<T>
  // options: { staleTime?, gcTime?, enabled? }
  //
  // Returns: {
  //   data: T | undefined,
  //   error: Error | undefined,
  //   status: 'idle' | 'loading' | 'success' | 'error',
  //   isStale: boolean,
  //   refetch: () => void,
  // }
}

function createQueryCache() {
  // Shared mutable cache outside React
  // Must track:
  // - cached data + timestamp
  // - subscriber count per key
  // - in-flight promises (for dedup)
  // - gc timers
}

// Usage:
// function UserProfile({ userId }) {
//   const { data, status, isStale } = useQuery(
//     \`user-\${userId}\`,
//     (signal) => fetch(\`/api/users/\${userId}\`, { signal }).then(r => r.json()),
//     { staleTime: 30_000, gcTime: 300_000 }
//   );
// }`,
    solutionCode: `function createQueryCache() {
  const entries = new Map();
  const subscribers = new Map(); // key -> Set<callback>
  const inflightRequests = new Map(); // key -> { promise, abort }
  const gcTimers = new Map();

  return {
    get(key) { return entries.get(key); },

    set(key, data, error = null) {
      entries.set(key, { data, error, timestamp: Date.now() });
      // Notify all subscribers
      subscribers.get(key)?.forEach(cb => cb());
    },

    subscribe(key, callback) {
      if (!subscribers.has(key)) subscribers.set(key, new Set());
      subscribers.get(key).add(callback);
      // Cancel any pending GC — someone is using this key
      if (gcTimers.has(key)) {
        clearTimeout(gcTimers.get(key));
        gcTimers.delete(key);
      }
      return () => {
        subscribers.get(key)?.delete(callback);
        if (subscribers.get(key)?.size === 0) {
          subscribers.delete(key);
          // Start GC timer
          this.scheduleGC(key);
        }
      };
    },

    scheduleGC(key, gcTime = 300_000) {
      const timer = setTimeout(() => {
        entries.delete(key);
        gcTimers.delete(key);
      }, gcTime);
      gcTimers.set(key, timer);
    },

    getInflight(key) { return inflightRequests.get(key); },

    setInflight(key, promise, abort) {
      inflightRequests.set(key, { promise, abort });
    },

    clearInflight(key) { inflightRequests.delete(key); },
  };
}

const queryCache = createQueryCache();

function useQuery(key, fetcher, options = {}) {
  const {
    staleTime = 0,
    gcTime = 300_000,
    enabled = true,
  } = options;

  const [, forceRender] = useReducer(x => x + 1, 0);

  // Derive state from cache (single source of truth)
  const cached = queryCache.get(key);
  const isStale = !cached || (Date.now() - cached.timestamp > staleTime);

  let status = 'idle';
  if (cached?.error) status = 'error';
  else if (cached?.data !== undefined) status = 'success';
  else if (queryCache.getInflight(key)) status = 'loading';

  // Subscribe to cache changes — re-render when our key updates
  useEffect(() => {
    return queryCache.subscribe(key, forceRender);
  }, [key]);

  // Fetch logic
  const fetchData = useCallback(() => {
    // Dedup: if a request for this key is already in flight, reuse it
    const existing = queryCache.getInflight(key);
    if (existing) return existing.promise;

    const controller = new AbortController();

    const promise = fetcher(controller.signal)
      .then(data => {
        queryCache.set(key, data, null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          queryCache.set(key, undefined, err);
        }
      })
      .finally(() => {
        queryCache.clearInflight(key);
      });

    queryCache.setInflight(key, promise, () => controller.abort());
    return promise;
  }, [key, fetcher]);

  // Trigger fetch on mount / key change
  useEffect(() => {
    if (!enabled) return;

    // Stale-while-revalidate: if data exists but is stale, refetch
    if (!cached || isStale) {
      fetchData();
    }

    // Abort in-flight on key change or unmount (race condition fix)
    return () => {
      const inflight = queryCache.getInflight(key);
      // Only abort if we're the last subscriber
      if (inflight && (queryCache.subscribers?.get(key)?.size ?? 0) <= 1) {
        inflight.abort();
        queryCache.clearInflight(key);
      }
    };
  }, [key, enabled]);

  return {
    data: cached?.data,
    error: cached?.error,
    status,
    isStale,
    refetch: fetchData,
  };
}`,
    keyPoints: [
      "The cache lives OUTSIDE React (module-level) — this is how TanStack Query, SWR, and Apollo all work. React components are just subscribers to external mutable state",
      "Deduplication via inflightRequests: if ComponentA and ComponentB both mount with the same key, only one fetch fires. The second caller gets the existing promise",
      "AbortController on key change is the race condition fix — without it, changing userId from 1→2→3 fast could resolve in order 1,3,2 and show user 2's data",
      "GC with grace period prevents cache churn: navigating away from a page and back within gcTime is an instant cache hit instead of a refetch",
      "StrictMode double-mount safety: the cleanup aborts only if we're the last subscriber, so double-mount doesn't cancel its own fetch",
    ],
    followUp:
      "How would you add optimistic updates? What about dependent queries (query B depends on query A's result)? How does this compare to TanStack Query's architecture — what are you missing?",
  },
  {
    id: 8,
    category: "Performance",
    difficulty: "Expert",
    title: "Incremental Computation with Dependency Tracking",
    timeEstimate: "30 min",
    description:
      "Build a reactive computation system inspired by SolidJS signals and Vue's reactivity. Create `createSignal`, `createComputed`, and `createEffect` primitives that automatically track which computations depend on which signals — and only re-execute the minimum necessary computations when a signal changes. Then integrate this with React via a `useSignal` hook.",
    realWorld:
      "SolidJS, Vue 3's reactivity system, and Preact Signals all use automatic dependency tracking. The TC39 Signals proposal (Stage 1) aims to standardize this pattern. Jotai and Recoil implement similar atom-based dependency graphs. @preact/signals-react bridges this exact concept into React. This is the pattern behind the most efficient fine-grained reactivity systems in frontend.",
    requirements: [
      "createSignal(value) — returns [getter, setter] where getter auto-tracks dependencies",
      "createComputed(fn) — derived value that auto-recomputes only when dependencies change",
      "createEffect(fn) — side effect that re-runs when dependencies change",
      "Dependency tracking must be automatic — no manual dependency arrays like useEffect",
      "useSignal hook to bridge into React (subscribe + trigger re-render on change)",
    ],
    starterCode: `// Implement the reactive primitives:
function createSignal(initialValue) {
  // Returns [read, write]
  // read() returns value AND registers as dependency
  // write(newValue) updates and notifies dependents
}

function createComputed(fn) {
  // Returns a getter that lazily recomputes only when
  // its tracked dependencies have changed
}

function createEffect(fn) {
  // Runs fn immediately, tracks dependencies,
  // re-runs when any dependency changes
  // Returns a dispose function
}

// Bridge into React:
function useSignal(signal) {
  // Subscribe to a signal, re-render component on change
  // Must work with React's concurrent features
}

// Usage:
// const [count, setCount] = createSignal(0);
// const doubled = createComputed(() => count() * 2);
// const dispose = createEffect(() => {
//   console.log('Count is now:', count());
//   console.log('Doubled is:', doubled());
// });
// setCount(1); // effect re-runs, logs 1 and 2
// setCount(2); // effect re-runs, logs 2 and 4`,
    solutionCode: `// --- Dependency tracking context ---
let currentSubscriber = null;

function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  const read = () => {
    // Auto-track: if someone is listening, register them
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }
    return value;
  };

  const write = (nextValue) => {
    if (Object.is(value, nextValue)) return;
    value = nextValue;
    // Notify all subscribers (effects and computeds)
    // Copy to avoid mutation during iteration
    [...subscribers].forEach(sub => sub.notify());
  };

  read._subscribers = subscribers; // for cleanup
  return [read, write];
}

function createComputed(fn) {
  let cachedValue;
  let dirty = true;
  const subscribers = new Set();

  const node = {
    notify() {
      dirty = true;
      // Propagate: notify our own subscribers
      [...subscribers].forEach(sub => sub.notify());
    },
    execute() {
      // Track dependencies of fn
      const prevSubscriber = currentSubscriber;
      currentSubscriber = node;
      try {
        cachedValue = fn();
      } finally {
        currentSubscriber = prevSubscriber;
      }
      dirty = false;
    },
  };

  // Initial computation
  node.execute();

  const read = () => {
    if (dirty) node.execute();
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }
    return cachedValue;
  };

  return read;
}

function createEffect(fn) {
  let cleanupFn = null;

  const node = {
    notify() {
      // Schedule re-execution
      queueMicrotask(() => node.execute());
    },
    execute() {
      // Run cleanup from previous execution
      if (typeof cleanupFn === 'function') cleanupFn();

      const prevSubscriber = currentSubscriber;
      currentSubscriber = node;
      try {
        cleanupFn = fn();
      } finally {
        currentSubscriber = prevSubscriber;
      }
    },
  };

  // Run immediately to establish initial dependencies
  node.execute();

  // Return dispose function
  return () => {
    if (typeof cleanupFn === 'function') cleanupFn();
    currentSubscriber = null;
  };
}

// --- React bridge ---
function useSignal(signalGetter) {
  const [, forceRender] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const node = {
      notify() { forceRender(); },
    };
    // Track by calling the signal within tracking context
    const prev = currentSubscriber;
    currentSubscriber = node;
    try {
      signalGetter(); // establishes subscription
    } finally {
      currentSubscriber = prev;
    }

    return () => {
      // Cleanup: remove ourselves from signal's subscribers
      signalGetter._subscribers?.delete(node);
    };
  }, [signalGetter]);

  return signalGetter();
}`,
    keyPoints: [
      "The global currentSubscriber variable is the key trick — when a signal's read() is called, it checks if anyone is 'listening' and auto-registers them. This is identical to Vue 3's track() mechanism",
      "Computed values are lazy + cached — they only recompute when marked dirty by a dependency change, not on every read. This is O(1) for repeated reads",
      "queueMicrotask in effects batches notifications — multiple signal changes in the same synchronous block only trigger one effect execution",
      "The React bridge (useSignal) uses the same subscription pattern as useSyncExternalStore — it registers a forceRender callback as a subscriber",
      "This is essentially how the TC39 Signals proposal works — understanding it shows you grasp the direction frontend reactivity is heading",
    ],
    followUp:
      "How would you handle diamond dependency problems (A→B, A→C, B→D, C→D — D should only recompute once)? How does this compare to React's dependency array model? What are the tradeoffs of push-based (signals) vs pull-based (React) reactivity?",
  },
  {
    id: 11,
    category: "Performance",
    difficulty: "Expert",
    title: "Web Worker Offloading with Transferable Objects",
    timeEstimate: "25 min",
    description:
      "Build a `useWorker` hook that offloads expensive computations to a Web Worker, with proper lifecycle management, cancellation, and zero-copy data transfer using Transferable Objects (ArrayBuffers). The hook must handle the case where the component unmounts mid-computation, where multiple calls race, and where large datasets need to be transferred without blocking the main thread.",
    realWorld:
      "Figma offloads their entire rendering engine to a Web Worker. Google Sheets uses workers for formula computation. Excalidraw uses workers for collision detection. Libraries like comlink (Google Chrome team), workerize-loader, and react-hooks-worker implement patterns for bridging workers with React. Transferable Objects (ArrayBuffer transfers) are critical for passing large datasets (images, CSV parsing, etc.) without serialization cost.",
    requirements: [
      "useWorker(fn) — takes a function, runs it in a Web Worker, returns { run, cancel, status, result, error }",
      "Support Transferable Objects for zero-copy ArrayBuffer transfer",
      "Cancel in-flight computation on unmount or when run() is called again",
      "Handle worker errors gracefully with proper cleanup",
      "Pool workers for reuse instead of creating/destroying per call",
    ],
    starterCode: `// Implement:
function useWorker(workerFn, options = {}) {
  // workerFn: (...args) => result (runs in worker thread)
  // options: { transferable?: boolean, pool?: number }
  //
  // Returns: {
  //   run: (...args) => Promise<result>,
  //   cancel: () => void,
  //   status: 'idle' | 'running' | 'done' | 'error' | 'cancelled',
  //   result: any,
  //   error: Error | null,
  // }
}

// Worker pool manager (shared across hook instances)
function createWorkerPool(size = navigator.hardwareConcurrency || 4) {
  // Manage a pool of reusable workers
  // Assign tasks to idle workers
  // Queue tasks when all workers are busy
}

// Usage:
// const { run, cancel, status, result } = useWorker(
//   (data) => {
//     // This runs in a Web Worker — no access to DOM
//     return data
//       .filter(row => row.amount > 1000)
//       .sort((a, b) => b.amount - a.amount)
//       .slice(0, 100);
//   }
// );
//
// // With Transferable for zero-copy:
// const { run } = useWorker(
//   (buffer) => {
//     const view = new Float32Array(buffer);
//     // Process image data...
//     return view.buffer; // transfer back
//   },
//   { transferable: true }
// );
// run(imageBuffer); // buffer is transferred, not copied`,
    solutionCode: `// --- Worker Pool ---
function createWorkerPool(size = navigator.hardwareConcurrency || 4) {
  const workers = [];
  const queue = [];
  const busy = new Set();

  // Create a worker from a function by serializing it
  const createWorkerFromFn = () => {
    const blob = new Blob([\`
      self.onmessage = async (e) => {
        const { id, fn, args, transferableIndices } = e.data;
        try {
          // Reconstruct the function
          const func = new Function('return ' + fn)();
          const result = await func(...args);

          // Detect transferable results
          const transfer = [];
          if (result instanceof ArrayBuffer) transfer.push(result);
          else if (result?.buffer instanceof ArrayBuffer)
            transfer.push(result.buffer);

          self.postMessage({ id, result }, transfer);
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    \`], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  };

  // Initialize pool
  for (let i = 0; i < size; i++) {
    workers.push({ worker: createWorkerFromFn(), idle: true });
  }

  return {
    execute(fn, args, transferables = []) {
      return new Promise((resolve, reject) => {
        const task = { fn: fn.toString(), args, transferables, resolve, reject };
        const idle = workers.find(w => w.idle);

        if (idle) {
          this._run(idle, task);
        } else {
          queue.push(task);
        }
      });
    },

    _run(workerSlot, task) {
      workerSlot.idle = false;
      busy.add(workerSlot);
      const id = crypto.randomUUID();

      const handler = (e) => {
        if (e.data.id !== id) return;
        workerSlot.worker.removeEventListener('message', handler);
        workerSlot.idle = true;
        busy.delete(workerSlot);

        // Process next in queue
        if (queue.length > 0) {
          this._run(workerSlot, queue.shift());
        }

        if (e.data.error) {
          task.reject(new Error(e.data.error));
        } else {
          task.resolve(e.data.result);
        }
      };

      workerSlot.worker.addEventListener('message', handler);
      workerSlot.worker.postMessage(
        { id, fn: task.fn, args: task.args },
        task.transferables
      );
    },

    terminate() {
      workers.forEach(w => w.worker.terminate());
    },
  };
}

// Singleton pool
let _pool = null;
const getPool = () => _pool ??= createWorkerPool();

// --- React Hook ---
function useWorker(workerFn, options = {}) {
  const { transferable = false } = options;
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const cancelRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setStatus('cancelled');
  }, []);

  const run = useCallback(async (...args) => {
    cancelRef.current = false;
    setStatus('running');
    setError(null);

    // Detect transferable ArrayBuffers in args
    const transfers = transferable
      ? args.filter(a => a instanceof ArrayBuffer)
      : [];

    try {
      const res = await getPool().execute(workerFn, args, transfers);

      if (!mountedRef.current || cancelRef.current) return;

      setResult(res);
      setStatus('done');
      return res;
    } catch (err) {
      if (!mountedRef.current || cancelRef.current) return;

      setError(err);
      setStatus('error');
      throw err;
    }
  }, [workerFn, transferable]);

  return { run, cancel, status, result, error };
}`,
    keyPoints: [
      "Serializing functions to a Blob URL (new Function('return ' + fn)()) is how comlink and workerize-loader work — the function runs in a completely separate thread with no shared memory",
      "Transferable Objects (ArrayBuffer) are moved, not copied — the sender loses access. This is O(1) instead of O(n) for large data. Critical for image processing, audio, etc.",
      "Worker pooling avoids the 50-100ms overhead of creating/destroying workers per call. The pool reuses idle workers and queues excess tasks — same pattern as database connection pools",
      "mountedRef + cancelRef prevent state updates after unmount (memory leak) and stale results from previous calls (race condition)",
      "The singleton pool pattern (module-level _pool) shares workers across all components — creating per-component pools would quickly exhaust browser limits",
    ],
    followUp:
      "How would you add SharedArrayBuffer for true shared memory between main thread and worker? How would you implement progress reporting from the worker? What about using Comlink to make the worker API feel like calling regular async functions?",
  },
  {
    id: 13,
    category: "Performance",
    difficulty: "Expert",
    title: "Suspense Resource Cache (Render-as-You-Fetch)",
    timeEstimate: "30 min",
    description:
      "Build a Suspense-compatible resource cache that enables the 'render-as-you-fetch' pattern — where data fetching starts BEFORE components render, not inside useEffect. Create a `createResource` function that returns a readable resource which throws promises to integrate with Suspense boundaries. Handle cache invalidation, preloading, and the React 19 waterfall problem where sibling components inside the same Suspense boundary load sequentially.",
    realWorld:
      "Relay (Meta) pioneered this pattern for GraphQL. React's official docs describe three data fetching approaches: fetch-on-render (useEffect), fetch-then-render (await before setState), and render-as-you-fetch (Suspense). Kent C. Dodds covers this extensively in Epic React. TkDodo noted a React 19 behavior change where siblings in the same Suspense boundary waterfall. Next.js App Router and Remix both use this pattern for their data loading layer.",
    requirements: [
      "createResource(fetcher) returns { read() } that throws promises for Suspense integration",
      "Cache results by key — same key returns cached data without re-fetching",
      "preload(key) starts fetching before component renders (the key optimization)",
      "invalidate(key) clears cache and triggers re-fetch on next read",
      "Handle the sibling waterfall: provide a way to fetch multiple resources in parallel",
    ],
    starterCode: `// Implement:
function createResourceCache() {
  // Returns: {
  //   createResource: (key, fetcher) => Resource,
  //   preload: (key, fetcher) => void,
  //   invalidate: (key) => void,
  //   preloadAll: (entries) => void, // parallel fetch
  // }
  //
  // Resource shape: { read: () => T }
  //   - If pending: throws the promise (Suspense catches it)
  //   - If resolved: returns the data
  //   - If rejected: throws the error (ErrorBoundary catches it)
}

// Usage:
// const cache = createResourceCache();
//
// // Preload BEFORE rendering — this is the key insight
// function onNavigate(userId) {
//   cache.preload('user', () => fetchUser(userId));
//   cache.preload('posts', () => fetchPosts(userId));
//   navigate('/profile');
// }
//
// // Component reads from cache — suspends if not ready
// function UserProfile() {
//   const user = cache.createResource('user', fetchUser).read();
//   return <h1>{user.name}</h1>;
// }
//
// // Parallel loading — avoids waterfall
// <Suspense fallback={<Skeleton />}>
//   <UserProfile />
// </Suspense>
// <Suspense fallback={<Skeleton />}>
//   <UserPosts />
// </Suspense>`,
    solutionCode: `function createResourceCache() {
  const cache = new Map();
  // cache entries: { status, value, promise, subscribers }

  function getOrCreate(key, fetcher) {
    if (cache.has(key)) return cache.get(key);

    const entry = {
      status: 'pending',
      value: null,
      promise: null,
      subscribers: new Set(),
    };

    // Start the fetch
    entry.promise = fetcher()
      .then(data => {
        entry.status = 'resolved';
        entry.value = data;
        entry.subscribers.forEach(cb => cb());
      })
      .catch(error => {
        entry.status = 'rejected';
        entry.value = error;
        entry.subscribers.forEach(cb => cb());
      });

    cache.set(key, entry);
    return entry;
  }

  function createResource(key, fetcher) {
    return {
      read() {
        const entry = getOrCreate(key, fetcher);

        switch (entry.status) {
          case 'pending':
            // Throw the promise — Suspense catches this
            throw entry.promise;
          case 'rejected':
            // Throw the error — ErrorBoundary catches this
            throw entry.value;
          case 'resolved':
            return entry.value;
        }
      },
    };
  }

  function preload(key, fetcher) {
    // Fire the fetch NOW — before any component renders
    // If already cached, this is a no-op
    getOrCreate(key, fetcher);
  }

  function preloadAll(entries) {
    // Start ALL fetches in parallel — avoids waterfall
    entries.forEach(([key, fetcher]) => preload(key, fetcher));
  }

  function invalidate(key) {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear(); // invalidate all
    }
  }

  // Subscribe to cache changes (for re-rendering on invalidate)
  function subscribe(key, callback) {
    const entry = cache.get(key);
    if (entry) {
      entry.subscribers.add(callback);
      return () => entry.subscribers.delete(callback);
    }
    return () => {};
  }

  return { createResource, preload, preloadAll, invalidate, subscribe };
}

// React hook for using resources with automatic re-render on invalidation
function useResource(cache, key, fetcher) {
  const resource = useMemo(
    () => cache.createResource(key, fetcher),
    [cache, key]
  );

  // Subscribe to invalidation
  const [, forceRender] = useReducer(x => x + 1, 0);
  useEffect(() => {
    return cache.subscribe(key, forceRender);
  }, [cache, key]);

  return resource.read();
}`,
    keyPoints: [
      "Throwing promises is the Suspense integration contract — when a component throws a promise, React catches it, shows the fallback, and retries when the promise resolves. This is how Relay and Next.js work internally",
      "preload() is the critical function — calling it BEFORE rendering (e.g., on route change) is what makes render-as-you-fetch faster than fetch-on-render. The component doesn't trigger the fetch; the router/event handler does",
      "Separate Suspense boundaries per component prevents the React 19 sibling waterfall — with one boundary, React suspends on the first thrower and doesn't render siblings until it resolves",
      "preloadAll() starts fetches in parallel — this is equivalent to Promise.all but each resource is independently suspendable",
      "The cache entry state machine (pending→resolved/rejected) is the same pattern used by React's internal cache for the use() hook",
    ],
    followUp:
      "How would you add time-based cache expiry (staleTime)? How does React's built-in cache() function in Server Components compare? How would you handle cache dependencies (user resource depends on auth resource)?",
  },
  {
    id: 15,
    category: "Performance",
    difficulty: "Expert",
    title: "Bidirectional Infinite Scroll with Intersection Observer",
    timeEstimate: "25 min",
    description:
      "Build a `useInfiniteScroll` hook that loads data in both directions (older AND newer items, like a chat or timeline). Use IntersectionObserver for efficient scroll detection, maintain scroll position when prepending items (the hard part), and implement a sliding window that unmounts off-screen pages to cap DOM size. Handle the edge cases: loading states at both ends, empty states, reaching the beginning/end of data, and rapid scrolling.",
    realWorld:
      "Slack, Discord, and iMessage all implement bidirectional infinite scroll for chat. Twitter/X uses it for timeline loading. TanStack Query's useInfiniteQuery supports both getNextPageParam and getPreviousPageParam for this exact pattern. The scroll-position-maintenance problem when prepending items is one of the trickiest UX bugs in production — Chrome's scroll anchoring helps but doesn't cover all cases. This is a top interview question at messaging/social companies.",
    requirements: [
      "IntersectionObserver sentinels at top and bottom of list trigger loading",
      "Bidirectional: fetchNextPage (append) and fetchPreviousPage (prepend)",
      "Maintain scroll position when prepending items (user doesn't jump)",
      "Sliding window: only keep N pages in DOM, unmount distant pages",
      "Return { pages, hasNextPage, hasPreviousPage, isFetching, sentinelRefs }",
    ],
    starterCode: `// Implement:
function useInfiniteScroll({
  fetchPage,         // (cursor, direction) => { data, nextCursor, prevCursor }
  initialCursor,
  pageSize = 20,
  maxPages = 5,      // sliding window size
}) {
  // Returns: {
  //   pages: Page[],
  //   hasNextPage: boolean,
  //   hasPreviousPage: boolean,
  //   isFetchingNext: boolean,
  //   isFetchingPrevious: boolean,
  //   topSentinelRef: React.Ref,  // attach to element at top of list
  //   bottomSentinelRef: React.Ref, // attach to element at bottom
  //   scrollContainerRef: React.Ref,
  // }
}

// Usage (chat app):
// function ChatMessages() {
//   const {
//     pages, topSentinelRef, bottomSentinelRef,
//     scrollContainerRef, isFetchingPrevious,
//   } = useInfiniteScroll({
//     fetchPage: (cursor, dir) => api.getMessages(cursor, dir),
//     initialCursor: 'latest',
//   });
//
//   return (
//     <div ref={scrollContainerRef} style={{ overflow: 'auto', height: 600 }}>
//       <div ref={topSentinelRef} />
//       {isFetchingPrevious && <Spinner />}
//       {pages.flatMap(p => p.data).map(msg => (
//         <Message key={msg.id} message={msg} />
//       ))}
//       <div ref={bottomSentinelRef} />
//     </div>
//   );
// }`,
    solutionCode: `function useInfiniteScroll({
  fetchPage,
  initialCursor,
  pageSize = 20,
  maxPages = 5,
}) {
  const [pages, setPages] = useState([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [isFetchingPrevious, setIsFetchingPrevious] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [hasPreviousPage, setHasPreviousPage] = useState(true);

  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Load initial page
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    fetchPage(initialCursor, 'next').then(result => {
      setPages([{
        data: result.data,
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
      }]);
      if (!result.nextCursor) setHasNextPage(false);
      if (!result.prevCursor) setHasPreviousPage(false);
    });
  }, []);

  // Fetch next page (append to bottom)
  const loadNext = useCallback(async () => {
    if (isFetchingNext || !hasNextPage || pages.length === 0) return;
    setIsFetchingNext(true);

    const lastPage = pages[pages.length - 1];
    try {
      const result = await fetchPage(lastPage.nextCursor, 'next');
      if (!result.nextCursor) setHasNextPage(false);

      setPages(prev => {
        const next = [...prev, {
          data: result.data,
          nextCursor: result.nextCursor,
          prevCursor: result.prevCursor,
        }];
        // Sliding window: drop oldest pages from the TOP
        if (next.length > maxPages) {
          setHasPreviousPage(true); // we dropped pages, so we can go back
          return next.slice(next.length - maxPages);
        }
        return next;
      });
    } finally {
      setIsFetchingNext(false);
    }
  }, [isFetchingNext, hasNextPage, pages, fetchPage, maxPages]);

  // Fetch previous page (prepend to top) — THE HARD PART
  const loadPrevious = useCallback(async () => {
    if (isFetchingPrevious || !hasPreviousPage || pages.length === 0) return;
    setIsFetchingPrevious(true);

    const firstPage = pages[0];
    try {
      const result = await fetchPage(firstPage.prevCursor, 'previous');
      if (!result.prevCursor) setHasPreviousPage(false);

      // CRITICAL: Preserve scroll position when prepending
      const container = scrollContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;

      setPages(prev => {
        const next = [{
          data: result.data,
          nextCursor: result.nextCursor,
          prevCursor: result.prevCursor,
        }, ...prev];
        // Sliding window: drop pages from the BOTTOM
        if (next.length > maxPages) {
          setHasNextPage(true); // we dropped pages, so we can go forward
          return next.slice(0, maxPages);
        }
        return next;
      });

      // Restore scroll position after React commits the DOM update
      // New content was added above — adjust scrollTop by the height delta
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const delta = newScrollHeight - prevScrollHeight;
          container.scrollTop += delta;
        }
      });
    } finally {
      setIsFetchingPrevious(false);
    }
  }, [isFetchingPrevious, hasPreviousPage, pages, fetchPage, maxPages]);

  // IntersectionObserver for top sentinel
  useEffect(() => {
    const el = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadPrevious();
      },
      { root: container, rootMargin: '200px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadPrevious]);

  // IntersectionObserver for bottom sentinel
  useEffect(() => {
    const el = bottomSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadNext();
      },
      { root: container, rootMargin: '0px 0px 200px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNext]);

  return {
    pages,
    hasNextPage,
    hasPreviousPage,
    isFetchingNext,
    isFetchingPrevious,
    topSentinelRef,
    bottomSentinelRef,
    scrollContainerRef,
  };
}`,
    keyPoints: [
      "The scroll-position-maintenance trick when prepending is the hardest part: measure scrollHeight before update, then adjust scrollTop by the delta in a requestAnimationFrame after React commits. This is how Slack and Discord handle it",
      "IntersectionObserver with rootMargin creates a 'trigger zone' — loading starts 200px before the sentinel is visible, giving a smoother experience than scroll event listeners",
      "The sliding window (maxPages) caps DOM size — without it, memory grows unbounded. When trimming, set hasNextPage/hasPreviousPage to true so the user can re-fetch trimmed pages",
      "Sentinel elements (empty divs) at the top/bottom of the list are the IntersectionObserver targets — this pattern is cleaner than observing actual content items",
      "The root: container option scopes the IntersectionObserver to the scroll container, not the viewport — critical for components that aren't full-page",
    ],
    followUp:
      "How would you combine this with virtualization for truly massive lists? How does TanStack Query's useInfiniteQuery handle cursor management differently? How would you add 'jump to message' that loads a specific cursor position and scrolls to it?",
  },
  {
    id: 17,
    category: "Performance",
    difficulty: "Expert",
    title: "Concurrent Search with useTransition + useDeferredValue",
    timeEstimate: "25 min",
    description:
      "Build a high-performance search interface that demonstrates mastery of React 18/19's concurrent features. Implement a search input that filters a large dataset (10k+ items) without blocking typing, using useTransition for the search trigger and useDeferredValue for the results rendering. Add debouncing that cooperates with (not fights against) React's concurrent scheduler, highlight matching text, and show visual indicators for pending transitions.",
    realWorld:
      "React 18's concurrent features (useTransition, useDeferredValue) are specifically designed for this use case — Dan Abramov's original demos used search filtering to showcase concurrent rendering. VS Code's command palette, GitHub's file finder, and Algolia's InstantSearch all implement non-blocking search. The interaction between debouncing and React's scheduler is a nuanced topic covered in React 19's docs — naive debouncing can actually fight concurrent rendering instead of helping it.",
    requirements: [
      "useTransition wraps the search state update — typing stays responsive while results render",
      "useDeferredValue on the filtered results — stale results show while new ones compute",
      "Visual pending indicator (opacity fade or spinner) during transition",
      "Text highlighting in results (mark matching substrings)",
      "Must handle 10k+ items without janky typing — demonstrate with performance metrics",
    ],
    starterCode: `// Implement:
function useSearch(items, options = {}) {
  // items: the full dataset to search
  // options: {
  //   keys?: string[],       // which fields to search
  //   debounceMs?: number,   // debounce input (cooperates with transition)
  //   maxResults?: number,
  //   highlightTag?: string, // HTML tag for highlighting matches
  // }
  //
  // Returns: {
  //   query: string,
  //   setQuery: (value) => void,
  //   results: FilteredItem[],
  //   isPending: boolean,     // transition is processing
  //   isStale: boolean,       // showing deferred (stale) results
  //   highlight: (text, query) => JSX, // highlight matching text
  // }
}

// Usage:
// function SearchUI() {
//   const { query, setQuery, results, isPending, highlight } = useSearch(
//     allProducts,
//     { keys: ['name', 'description'], maxResults: 50 }
//   );
//
//   return (
//     <div>
//       <input
//         value={query}
//         onChange={e => setQuery(e.target.value)}
//         placeholder="Search 10,000 products..."
//       />
//       <div style={{ opacity: isPending ? 0.6 : 1 }}>
//         {results.map(item => (
//           <div key={item.id}>
//             {highlight(item.name, query)}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }`,
    solutionCode: `function useSearch(items, options = {}) {
  const {
    keys = [],
    debounceMs = 0,
    maxResults = 100,
  } = options;

  // The actual input value — updates synchronously (keeps typing responsive)
  const [query, setQueryRaw] = useState('');

  // The search query used for filtering — updated via transition
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Debounce timer ref
  const timerRef = useRef(null);

  const setQuery = useCallback((value) => {
    // Update input immediately — never block typing
    setQueryRaw(value);

    // Clear previous debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    const doSearch = () => {
      // Wrap the expensive state update in a transition
      // React can interrupt this if the user types again
      startTransition(() => {
        setSearchQuery(value);
      });
    };

    if (debounceMs > 0) {
      timerRef.current = setTimeout(doSearch, debounceMs);
    } else {
      // No debounce — let useTransition handle the scheduling
      // This is often better than debouncing because React's
      // scheduler is smarter than setTimeout
      doSearch();
    }
  }, [debounceMs, startTransition]);

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // The expensive filtering computation
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return items.slice(0, maxResults);

    const lowerQuery = searchQuery.toLowerCase();
    const terms = lowerQuery.split(/\\s+/).filter(Boolean);

    const scored = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let score = 0;

      // Search across specified keys or entire item
      const searchFields = keys.length > 0
        ? keys.map(k => item[k]).filter(Boolean)
        : [JSON.stringify(item)];

      for (const field of searchFields) {
        const lowerField = String(field).toLowerCase();
        for (const term of terms) {
          const idx = lowerField.indexOf(term);
          if (idx !== -1) {
            score += 10;
            if (idx === 0) score += 5; // prefix match bonus
            if (lowerField === term) score += 10; // exact match bonus
          }
        }
      }

      if (score > 0) {
        scored.push({ ...item, _score: score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, maxResults);
  }, [items, searchQuery, keys, maxResults]);

  // useDeferredValue: shows stale results while new ones compute
  const deferredResults = useDeferredValue(filteredResults);
  const isStale = deferredResults !== filteredResults;

  // Highlight matching text in results
  const highlight = useCallback((text, q) => {
    if (!q?.trim() || !text) return text;

    const terms = q.toLowerCase().split(/\\s+/).filter(Boolean);
    // Build regex that matches any search term
    const escaped = terms.map(t =>
      t.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\\$&')
    );
    const regex = new RegExp(\`(\${escaped.join('|')})\`, 'gi');

    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? createElement('mark', {
            key: i,
            style: {
              background: '#fbbf24',
              color: '#000',
              padding: '0 2px',
              borderRadius: 2,
            },
          }, part)
        : part
    );
  }, []);

  return {
    query,
    setQuery,
    results: deferredResults,
    isPending,
    isStale,
    highlight,
  };
}`,
    keyPoints: [
      "Two separate state values: query (synchronous, drives the input) and searchQuery (inside transition, drives filtering). This separation is why typing stays responsive — the input never waits for filtering to complete",
      "useTransition makes the filtering interruptible — if the user types another character while filtering is in progress, React abandons the current render and starts a new one with the latest query. This is fundamentally better than debouncing",
      "useDeferredValue on filtered results lets React show stale results while computing new ones — the opacity fade (isPending) gives visual feedback that an update is processing. This is the React-native loading indicator",
      "Debouncing and useTransition serve different purposes: debounce reduces how often you start work, transition makes work interruptible. Using both (short debounce + transition) can be optimal for network requests but transition alone is usually better for client-side filtering",
      "The scoring system (prefix bonus, exact match bonus) mirrors how fuzzy finders like fzf and VS Code's command palette rank results — simple but effective",
    ],
    followUp:
      "How would you add fuzzy matching (Levenshtein distance)? How does this interact with React Compiler / React Forget's automatic memoization? How would you move the filtering to a Web Worker for truly non-blocking search?",
  },
  {
    id: 23,
    category: "Performance",
    difficulty: "Expert",
    title: "Spring-Based Animation Engine",
    timeEstimate: "30 min",
    description:
      "Build a physics-based spring animation hook that produces buttery-smooth 60fps animations driven by spring physics (mass, tension, friction) rather than duration/easing curves. Use requestAnimationFrame for the animation loop, support interruption (start a new animation mid-flight without jarring jumps), and batch multiple animated values. This is the core of how Framer Motion and React Spring work internally.",
    realWorld:
      "Framer Motion (Framer) and React Spring (Poimandres) are the two dominant React animation libraries, both using spring physics. Apple's iOS and Android's material motion both default to spring-based animations. The key insight (from Andy Matuschak at Apple, and Matt Perry at Framer) is that springs can be interrupted mid-flight and naturally decelerate, while duration-based animations feel robotic when interrupted. Cheng Lou's 'react-motion' (2015) pioneered this approach in React.",
    requirements: [
      "useSpring(config) returns { value, style } where value animates smoothly via spring physics",
      "Spring parameters: mass, tension (stiffness), friction (damping)",
      "Interruption: calling animate() mid-flight continues from current velocity (no jump)",
      "requestAnimationFrame loop with proper delta time for frame-rate independence",
      "Batch multiple springs in one rAF loop (don't create separate loops per spring)",
    ],
    starterCode: `// Implement:
function useSpring(config = {}) {
  // config: {
  //   from?: number,
  //   to?: number,
  //   mass?: number,      // default 1
  //   tension?: number,   // stiffness, default 170
  //   friction?: number,  // damping, default 26
  //   precision?: number, // settle threshold, default 0.01
  //   onRest?: () => void,
  // }
  //
  // Returns: {
  //   value: number,              // current animated value
  //   velocity: number,           // current velocity
  //   isAnimating: boolean,
  //   animate: (to, config?) => void,  // start/interrupt animation
  //   stop: () => void,
  //   set: (value) => void,       // instantly jump to value
  // }
}

// Physics:
// Spring force: F = -tension * (position - target)
// Damping force: F = -friction * velocity
// Acceleration: a = (springForce + dampingForce) / mass
// Velocity: v += a * dt
// Position: x += v * dt
//
// The spring is "at rest" when both |velocity| and |displacement| < precision

// Usage:
// function AnimatedBox() {
//   const spring = useSpring({ from: 0, to: 0, tension: 170, friction: 26 });
//
//   return (
//     <div
//       style={{ transform: \`translateX(\${spring.value}px)\` }}
//       onMouseEnter={() => spring.animate(200)}
//       onMouseLeave={() => spring.animate(0)}
//     />
//   );
// }`,
    solutionCode: `// --- Shared animation loop (batch all springs) ---
const springs = new Set();
let rafId = null;
let prevTime = null;

function tick(time) {
  if (prevTime === null) prevTime = time;
  // Cap delta to prevent huge jumps (e.g., tab was backgrounded)
  const dt = Math.min((time - prevTime) / 1000, 0.064);
  prevTime = time;

  springs.forEach(spring => spring.step(dt));

  // Remove settled springs
  springs.forEach(spring => {
    if (!spring.isActive) springs.delete(spring);
  });

  if (springs.size > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
    prevTime = null;
  }
}

function addSpring(spring) {
  springs.add(spring);
  if (rafId === null) {
    rafId = requestAnimationFrame(tick);
  }
}

// --- Spring physics simulation ---
class SpringSimulation {
  constructor(config = {}) {
    this.mass = config.mass ?? 1;
    this.tension = config.tension ?? 170;
    this.friction = config.friction ?? 26;
    this.precision = config.precision ?? 0.01;

    this.position = config.from ?? 0;
    this.target = config.to ?? this.position;
    this.velocity = 0;
    this.isActive = false;
    this.onUpdate = null;
    this.onRest = config.onRest ?? null;
  }

  step(dt) {
    if (!this.isActive) return;

    // RK4 integration would be more accurate, but Euler
    // is sufficient for 60fps UI animations and much simpler
    const displacement = this.position - this.target;
    const springForce = -this.tension * displacement;
    const dampingForce = -this.friction * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * dt;
    this.position += this.velocity * dt;

    // Check if spring has settled
    if (
      Math.abs(this.velocity) < this.precision &&
      Math.abs(this.position - this.target) < this.precision
    ) {
      this.position = this.target;
      this.velocity = 0;
      this.isActive = false;
      this.onRest?.();
    }

    this.onUpdate?.(this.position, this.velocity);
  }

  start(to, config) {
    if (config) {
      if (config.mass !== undefined) this.mass = config.mass;
      if (config.tension !== undefined) this.tension = config.tension;
      if (config.friction !== undefined) this.friction = config.friction;
    }

    this.target = to;
    // KEY: Don't reset velocity — this enables smooth interruption
    // The spring continues from current position + velocity
    this.isActive = true;
    addSpring(this);
  }

  stop() {
    this.velocity = 0;
    this.isActive = false;
  }

  setImmediate(value) {
    this.position = value;
    this.velocity = 0;
    this.target = value;
    this.isActive = false;
    this.onUpdate?.(value, 0);
  }
}

// --- React Hook ---
function useSpring(config = {}) {
  const [value, setValue] = useState(config.from ?? 0);
  const [velocity, setVelocity] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const simRef = useRef(null);
  if (!simRef.current) {
    simRef.current = new SpringSimulation(config);
  }

  useEffect(() => {
    const sim = simRef.current;
    sim.onUpdate = (pos, vel) => {
      setValue(pos);
      setVelocity(vel);
    };
    sim.onRest = () => {
      setIsAnimating(false);
      config.onRest?.();
    };

    // Start initial animation if from !== to
    if (config.to !== undefined && config.to !== config.from) {
      sim.start(config.to);
      setIsAnimating(true);
    }

    return () => {
      sim.isActive = false;
      springs.delete(sim);
    };
  }, []);

  const animate = useCallback((to, overrideConfig) => {
    simRef.current.start(to, overrideConfig);
    setIsAnimating(true);
  }, []);

  const stop = useCallback(() => {
    simRef.current.stop();
    setIsAnimating(false);
  }, []);

  const set = useCallback((val) => {
    simRef.current.setImmediate(val);
    setValue(val);
    setVelocity(0);
    setIsAnimating(false);
  }, []);

  return { value, velocity, isAnimating, animate, stop, set };
}`,
    keyPoints: [
      "The shared rAF loop (module-level Set of springs) is critical — creating a separate requestAnimationFrame per spring wastes CPU. Framer Motion and React Spring both batch all animations into one loop",
      "Preserving velocity on interruption is the KEY difference from CSS transitions — when you call animate(newTarget), the spring continues from its current velocity instead of stopping and restarting. This creates the natural, fluid feel Apple and Google motion guidelines recommend",
      "Delta time capping (Math.min(dt, 0.064)) prevents physics explosions when the tab is backgrounded — without this, a 10-second gap produces dt=10, which makes springs fly off screen",
      "Euler integration (velocity += acceleration * dt) is good enough for UI at 60fps. RK4 (Runge-Kutta) is more accurate but the visual difference is negligible for spring animations, and it's 4x more expensive",
      "The precision threshold (position + velocity both near zero) determines when the spring 'snaps' to its target — too high and it snaps visibly, too low and it wastes CPU on imperceptible sub-pixel movements. 0.01 is the industry standard",
    ],
    followUp:
      "How would you animate CSS properties without causing layout thrash (hint: transform + opacity only)? How would you implement gesture-driven springs (drag releases with fling velocity)? How does Framer Motion's layout animation system work?",
  },
  {
    id: 27,
    category: "Performance",
    difficulty: "Expert",
    title: "Structural Sharing for Immutable State",
    timeEstimate: "30 min",
    description:
      "Build a structural sharing utility that compares old and new state trees and reuses unchanged subtree references. When a deeply nested property changes, only the path from root to that property gets new references — all sibling branches keep their original identity. This is how TanStack Query, Zustand, and Immer maintain referential equality for unchanged branches, preventing unnecessary re-renders in selector-based systems.",
    realWorld:
      "TanStack Query's replaceEqualDeep function (authored by Dominik Dorfmeister / TkDodo) performs structural sharing on every query result to preserve referential identity of unchanged data. Immer by Michel Weststrate uses structural sharing under the hood for its produce() function. Redux Toolkit's createSlice relies on Immer's structural sharing. The concept originates from persistent data structures in Clojure (Rich Hickey's immutable collections) and was brought to JavaScript by libraries like Immutable.js (Lee Byron at Facebook).",
    requirements: [
      "replaceEqualDeep(oldData, newData) — recursively compare two values and return oldData references where values are deeply equal",
      "Must handle plain objects, arrays, Date objects, null, undefined, and primitive types",
      "Arrays with the same elements in the same order must return the original array reference",
      "Objects where all values are deeply equal must return the original object reference",
      "If the root value is deeply equal, return the original root reference (identity preservation)",
    ],
    starterCode: `// Implement:
// function replaceEqualDeep(oldData, newData) { ... }

// Also implement a React hook that applies structural sharing:
// function useStructuralSharing(newValue) { ... }

// Example behavior:
// const old = { users: [{ id: 1, name: 'Alice' }], meta: { page: 1 } };
// const next = { users: [{ id: 1, name: 'Alice' }], meta: { page: 2 } };
// const result = replaceEqualDeep(old, next);
//
// result === old                     // false (meta.page changed)
// result.users === old.users         // true! (users array didn't change)
// result.users[0] === old.users[0]   // true! (user object didn't change)
// result.meta === old.meta           // false (page changed)
//
// In a React component:
// function UserList({ queryData }) {
//   const data = useStructuralSharing(queryData);
//   // 'data.users' keeps the same reference across re-renders
//   // if the users array content hasn't changed,
//   // so React.memo children won't re-render
//   const memoizedList = useMemo(() =>
//     data.users.map(u => <UserCard key={u.id} user={u} />),
//     [data.users] // stable reference thanks to structural sharing
//   );
//   return <div>{memoizedList}</div>;
// }`,
    solutionCode: `function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isDate(value) {
  return value instanceof Date;
}

function replaceEqualDeep(oldData, newData) {
  // Identical references — short circuit
  if (Object.is(oldData, newData)) return oldData;

  // If either is not an object (or is null), they're not equal (we checked Object.is above)
  if (typeof oldData !== typeof newData) return newData;
  if (oldData === null || newData === null) return newData;
  if (typeof oldData !== 'object') return newData;

  // Handle Date comparison
  if (isDate(oldData) || isDate(newData)) {
    if (isDate(oldData) && isDate(newData) && oldData.getTime() === newData.getTime()) {
      return oldData;
    }
    return newData;
  }

  // Handle arrays
  if (Array.isArray(oldData) || Array.isArray(newData)) {
    if (!Array.isArray(oldData) || !Array.isArray(newData)) return newData;
    if (oldData.length !== newData.length) {
      // Different length — still structurally share items that match
      const result = newData.map((item, i) =>
        i < oldData.length ? replaceEqualDeep(oldData[i], item) : item
      );
      return result;
    }

    let allEqual = true;
    const result = new Array(newData.length);
    for (let i = 0; i < newData.length; i++) {
      result[i] = replaceEqualDeep(oldData[i], newData[i]);
      if (result[i] !== oldData[i]) allEqual = false;
    }
    // If every element kept its old reference, reuse the entire old array
    return allEqual ? oldData : result;
  }

  // Handle plain objects
  if (!isPlainObject(oldData) || !isPlainObject(newData)) return newData;

  const oldKeys = Object.keys(oldData);
  const newKeys = Object.keys(newData);

  // Different key count — can't reuse root, but still share children
  if (oldKeys.length !== newKeys.length) {
    const result = {};
    for (const key of newKeys) {
      result[key] = key in oldData
        ? replaceEqualDeep(oldData[key], newData[key])
        : newData[key];
    }
    return result;
  }

  let allEqual = true;
  const result = {};
  for (const key of newKeys) {
    if (!(key in oldData)) {
      result[key] = newData[key];
      allEqual = false;
    } else {
      result[key] = replaceEqualDeep(oldData[key], newData[key]);
      if (result[key] !== oldData[key]) allEqual = false;
    }
  }

  return allEqual ? oldData : result;
}

// React hook that preserves referential identity via structural sharing
function useStructuralSharing(newValue) {
  const prevRef = useRef(undefined);
  const sharedValue = useMemo(() => {
    if (prevRef.current === undefined) {
      prevRef.current = newValue;
      return newValue;
    }
    const shared = replaceEqualDeep(prevRef.current, newValue);
    prevRef.current = shared;
    return shared;
  }, [newValue]);
  return sharedValue;
}

// --- Demo: shows how structural sharing preserves references ---
function StructuralSharingDemo() {
  const [tick, setTick] = useState(0);

  // Simulate API returning fresh objects every time
  const rawData = useMemo(() => ({
    users: [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' },
    ],
    meta: { page: 1, total: tick > 2 ? 100 : 50 },
  }), [tick > 2 ? 'changed' : 'same']);

  const data = useStructuralSharing(rawData);
  const prevDataRef = useRef(data);

  const usersStable = data.users === prevDataRef.current?.users;
  prevDataRef.current = data;

  return (
    <div>
      <p>Tick: {tick}</p>
      <p>Users ref stable: {usersStable ? 'YES' : 'NO'}</p>
      <button onClick={() => setTick(t => t + 1)}>Re-fetch</button>
    </div>
  );
}`,
    keyPoints: [
      "The bottom-up recursion is critical — you must compare children first, then decide if the parent can be reused. If all children kept their old reference, the parent can return oldData directly, preserving the entire subtree identity in one check",
      "Object.is as the leaf comparison handles edge cases like NaN === NaN (true in Object.is) and +0 !== -0 (distinguished by Object.is), matching React's own comparison semantics for props and state",
      "Even when array lengths differ, items at matching indices still get structural sharing — this is important for paginated lists where the first N items are the same but new items were appended",
      "The useStructuralSharing hook acts as a referential stability layer between data fetching and rendering — TanStack Query does this internally so that query.data.someList keeps the same reference if the list content hasn't changed, which makes useMemo/React.memo dependency arrays work correctly",
      "This approach is O(n) in the size of the state tree, not O(1) like Immer's proxy-based approach. Immer knows exactly what changed because it tracks mutations via Proxy, but structural sharing works on any two values without requiring mutation tracking — it's the comparison-based alternative",
    ],
    followUp:
      "How would you add support for Map and Set objects? How would you handle circular references without infinite recursion? How does Immer's Proxy-based approach achieve O(1) structural sharing compared to this O(n) deep comparison approach?",
  },
  {
    id: 28,
    category: "Performance",
    difficulty: "Expert",
    title: "Parallel Data Loader (Suspense Waterfall Eliminator)",
    timeEstimate: "35 min",
    description:
      "Build a preload/prefetch system that eliminates Suspense waterfalls by initiating all data fetches before rendering begins. When multiple sibling components each have their own data dependencies, naive Suspense creates a waterfall: the first child suspends, its data loads, it renders, then the second child suspends. This loader must kick off all fetches in parallel at the route level, with cache integration and support for React.lazy code-split components.",
    realWorld:
      "React Router v6.4+'s loader pattern (by Ryan Florence and Michael Jackson at Remix) solves this exact problem by fetching data before rendering. Relay's preloaded queries (Joe Savona at Meta) initiate fetches at the event handler level, not the component level. TkDodo (Dominik Dorfmeister) wrote 'React 19 and Suspense - A Drama in 3 Acts' describing how Suspense waterfalls are the most common performance pitfall with data fetching. React GitHub issue #29898 removed sibling prerendering, making the waterfall problem worse and motivating external preloading solutions.",
    requirements: [
      "createLoader(fetchFn, options) — wraps an async function with caching, returns a loader with preload() and read() methods",
      "preloadRoute(loaders[]) — initiates all loader fetches in parallel, returns a route-data object",
      "useLoaderData(loader) — Suspense-compatible hook that throws promise if pending, throws error if failed, returns data if resolved",
      "Cache integration: loaders support stale-while-revalidate with configurable staleTime and cacheKey",
      "Integration with React.lazy: preloadRoute can accept both data loaders and component loaders to fetch code and data in parallel",
    ],
    starterCode: `// Implement:
// function createLoader(fetchFn, options) { ... }
// function preloadRoute(loaders) { ... }
// function useLoaderData(loader) { ... }

// Usage:
// const userLoader = createLoader(
//   (params) => fetch(\`/api/users/\${params.id}\`).then(r => r.json()),
//   { cacheKey: (params) => \`user-\${params.id}\`, staleTime: 30000 }
// );
//
// const postsLoader = createLoader(
//   (params) => fetch(\`/api/users/\${params.id}/posts\`).then(r => r.json()),
//   { cacheKey: (params) => \`posts-\${params.id}\`, staleTime: 10000 }
// );
//
// // In a route handler or link hover:
// const ProfilePage = React.lazy(() => import('./ProfilePage'));
//
// function onNavigateToProfile(userId) {
//   // Kick off ALL fetches in parallel — data + code
//   preloadRoute([
//     userLoader.preload({ id: userId }),
//     postsLoader.preload({ id: userId }),
//     ProfilePage,  // also preload the code-split component
//   ]);
// }
//
// // Inside the component — these will not waterfall because data is already loading
// function ProfileContent({ userId }) {
//   const user = useLoaderData(userLoader, { id: userId });
//   const posts = useLoaderData(postsLoader, { id: userId });
//   return (
//     <div>
//       <h1>{user.name}</h1>
//       <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
//     </div>
//   );
// }`,
    solutionCode: `const loaderCache = new Map();

function createLoader(fetchFn, options = {}) {
  const { staleTime = 0, cacheKey: cacheKeyFn } = options;

  const getCacheKey = (params) => {
    if (cacheKeyFn) return cacheKeyFn(params);
    return JSON.stringify(params ?? '__default__');
  };

  const getEntry = (key) => loaderCache.get(key);

  const fetchAndCache = (params) => {
    const key = getCacheKey(params);
    const existing = loaderCache.get(key);

    // If there's a fresh cache entry, return it
    if (existing && existing.status === 'resolved' && staleTime > 0) {
      const age = Date.now() - existing.timestamp;
      if (age < staleTime) return existing;
    }

    // If already in flight, return existing promise
    if (existing && existing.status === 'pending') return existing;

    const entry = {
      status: 'pending',
      promise: null,
      data: undefined,
      error: undefined,
      timestamp: 0,
      key,
    };

    entry.promise = fetchFn(params)
      .then((data) => {
        entry.status = 'resolved';
        entry.data = data;
        entry.timestamp = Date.now();
        // Stale-while-revalidate: keep old data but mark for refresh
        if (staleTime > 0) {
          setTimeout(() => {
            const cached = loaderCache.get(key);
            if (cached === entry) cached.status = 'stale';
          }, staleTime);
        }
        return data;
      })
      .catch((error) => {
        entry.status = 'rejected';
        entry.error = error;
        throw error;
      });

    loaderCache.set(key, entry);
    return entry;
  };

  const preload = (params) => {
    const entry = fetchAndCache(params);
    return { _loader: loader, _params: params, _key: getCacheKey(params), _entry: entry };
  };

  const read = (params) => {
    const key = getCacheKey(params);
    const entry = loaderCache.get(key);

    if (!entry) {
      // Not preloaded — initiate fetch now (fallback for non-preloaded usage)
      const newEntry = fetchAndCache(params);
      throw newEntry.promise;
    }

    switch (entry.status) {
      case 'pending':
        throw entry.promise;
      case 'rejected':
        throw entry.error;
      case 'stale':
        // Return stale data but trigger background revalidation
        fetchAndCache(params);
        return entry.data;
      case 'resolved':
        return entry.data;
      default:
        throw entry.promise;
    }
  };

  const invalidate = (params) => {
    const key = getCacheKey(params);
    loaderCache.delete(key);
  };

  const loader = { preload, read, invalidate, getCacheKey };
  return loader;
}

function preloadRoute(loaders) {
  const results = loaders.map((item) => {
    // If it's a preload result (already kicked off), nothing to do
    if (item && item._loader) return item;

    // If it's a React.lazy-like component, trigger its load
    if (item && item._payload && typeof item._init === 'function') {
      try { item._init(item._payload); } catch (p) { /* promise is fine */ }
      return item;
    }

    // If it's a loader object, preload with no params
    if (item && typeof item.preload === 'function') {
      return item.preload();
    }

    return item;
  });

  return results;
}

function useLoaderData(loader, params) {
  // Read will either return data or throw (promise for Suspense, error for boundary)
  const data = loader.read(params);

  // On unmount, we don't invalidate — cache persists for stale-while-revalidate
  return data;
}

// --- Demo ---
function ParallelLoaderDemo() {
  const userLoader = useMemo(() => createLoader(
    async (params) => {
      await new Promise(r => setTimeout(r, 800));
      return { id: params.id, name: 'Alice', email: 'alice@test.com' };
    },
    { cacheKey: (p) => \`user-\${p.id}\`, staleTime: 30000 }
  ), []);

  const postsLoader = useMemo(() => createLoader(
    async (params) => {
      await new Promise(r => setTimeout(r, 600));
      return [
        { id: 1, title: 'First Post', userId: params.id },
        { id: 2, title: 'Second Post', userId: params.id },
      ];
    },
    { cacheKey: (p) => \`posts-\${p.id}\`, staleTime: 10000 }
  ), []);

  const handlePreload = useCallback(() => {
    preloadRoute([
      userLoader.preload({ id: 1 }),
      postsLoader.preload({ id: 1 }),
    ]);
  }, [userLoader, postsLoader]);

  return (
    <div>
      <button onClick={handlePreload}>Preload Profile Data</button>
      <p>Open console to see parallel fetches. Both start simultaneously.</p>
    </div>
  );
}`,
    keyPoints: [
      "The key insight is decoupling fetch initiation from component rendering — by calling preload() in an event handler (click, hover, route change), all fetches start in parallel before React even begins rendering the component tree, eliminating the Suspense waterfall",
      "The Suspense integration works via the throw-promise protocol: read() throws a promise when data is pending (React catches it and shows the fallback), throws an error when failed (caught by ErrorBoundary), and returns data when resolved — this is the same contract Relay and React Cache use",
      "Stale-while-revalidate is implemented by transitioning entries from 'resolved' to 'stale' after staleTime — when stale data is read, it's returned immediately (no Suspense fallback) while a background revalidation starts, exactly how TanStack Query and SWR work",
      "React.lazy integration works because lazy components have a _payload/_init internal structure — calling _init triggers the dynamic import. By including lazy components in preloadRoute alongside data loaders, code splitting and data fetching happen truly in parallel",
      "The cache is keyed by a serializable cacheKey function rather than object identity — this means navigating away and back to the same route with the same params will hit the cache, avoiding redundant fetches. This matches React Router's loader caching behavior",
    ],
    followUp:
      "How would you implement automatic preloading on link hover (like Remix's prefetch='intent')? How would you add cancellation via AbortController when the user navigates away before loading completes? How would you handle dependent loaders where one fetch needs the result of another while still parallelizing the independent ones?",
  },
  {
    id: 33,
    category: "Performance",
    difficulty: "Expert",
    title: "Persistent State with Version Migrations",
    timeEstimate: "30 min",
    description:
      "Build a persistence layer that saves React state to localStorage with schema versioning and automatic migrations. When the state shape changes between app versions, migration functions transform old persisted data into the new schema without data loss. The system must handle corrupt data gracefully, support sequential migration chains, and provide a React hook that hydrates persisted state on mount and auto-saves on change with debouncing.",
    realWorld:
      "Redux Persist by rt2zz is the most widely used persistence library in the React ecosystem and uses exactly this migration pattern. Issue #1114 on the Redux Persist repo documents migration failures when version numbers are skipped. Zustand's persist middleware (by Daishi Kato) offers a similar migrate option. React Native apps with AsyncStorage face this constantly — every app update risks breaking user data. Notion's offline cache migration system reportedly runs chained migrations when users haven't updated in months.",
    requirements: [
      "usePersistentState(key, initialState, options) hook that reads from storage on mount and writes on state change",
      "Schema versioning: each state shape has a version number stored alongside the data",
      "Migration registry: define migration functions (v1 -> v2, v2 -> v3) that run sequentially to bring old data up to current version",
      "Corruption recovery: if persisted data fails to parse or migrate, fall back to initialState and log the error without crashing",
      "Debounced writes: batch rapid state changes into a single storage write using a configurable debounce interval",
    ],
    starterCode: `// Implement a persistence hook with versioned migrations:

function usePersistentState(key, initialState, options = {}) {
  // options: {
  //   version: number (current schema version),
  //   migrations: { [fromVersion]: (oldState) => newState },
  //   debounceMs: number (default 300),
  //   storage: Storage (default localStorage),
  //   serialize: (state) => string (default JSON.stringify),
  //   deserialize: (raw) => state (default JSON.parse),
  // }
  //
  // Stored format in localStorage:
  // { __version: number, __timestamp: number, data: state }
  //
  // On mount: read from storage, run migrations if version mismatch
  // On state change: debounced write to storage
  // Returns: [state, setState, { isPersisted, lastSaved, clearStorage }]
}

// Define migrations when your state shape changes:
// const migrations = {
//   1: (v1State) => ({
//     ...v1State,
//     preferences: { theme: 'light', lang: 'en' },
//   }),
//   2: (v2State) => ({
//     ...v2State,
//     preferences: {
//       ...v2State.preferences,
//       notifications: { email: true, push: false },
//     },
//   }),
// };

// Usage:
// const [settings, setSettings, { isPersisted, clearStorage }] =
//   usePersistentState('app-settings', defaultSettings, {
//     version: 3,
//     migrations,
//     debounceMs: 500,
//   });`,
    solutionCode: `function runMigrations(data, fromVersion, toVersion, migrations) {
  let current = data;
  let version = fromVersion;

  while (version < toVersion) {
    const migrateFn = migrations[version];
    if (!migrateFn) {
      throw new Error(
        \`Missing migration from version \${version} to \${version + 1}\`
      );
    }
    current = migrateFn(current);
    version++;
  }
  return current;
}

function usePersistentState(key, initialState, options = {}) {
  const {
    version = 0,
    migrations = {},
    debounceMs = 300,
    storage = localStorage,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const [meta, setMeta] = useState({ isPersisted: false, lastSaved: null });

  // Lazy initializer — runs once, reads and migrates persisted state
  const [state, setState] = useState(() => {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return initialState;

      const envelope = deserialize(raw);
      const storedVersion = envelope.__version ?? 0;
      let data = envelope.data;

      // Run migrations if version mismatch
      if (storedVersion < version) {
        data = runMigrations(data, storedVersion, version, migrations);
        // Persist migrated data immediately
        storage.setItem(
          key,
          serialize({ __version: version, __timestamp: Date.now(), data })
        );
      }

      return data;
    } catch (err) {
      console.error(\`[usePersistentState] Failed to restore "\${key}":\`, err);
      // Corruption recovery — fall back, don't crash
      return initialState;
    }
  });

  // Debounced persistence on state changes
  const timerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Skip the initial mount write — only persist on changes
    if (timerRef.current === null) {
      timerRef.current = undefined; // sentinel: mount complete
      // But do mark persisted if we loaded from storage
      const existing = storage.getItem(key);
      if (existing !== null) {
        setMeta({ isPersisted: true, lastSaved: new Date() });
      }
      return;
    }

    // Clear previous debounce timer
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const envelope = {
          __version: version,
          __timestamp: Date.now(),
          data: stateRef.current,
        };
        storage.setItem(key, serialize(envelope));
        setMeta({ isPersisted: true, lastSaved: new Date() });
      } catch (err) {
        console.error(\`[usePersistentState] Write failed for "\${key}":\`, err);
      }
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [state, key, version, debounceMs, serialize, storage]);

  // Cleanup on unmount — flush pending write
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        try {
          const envelope = {
            __version: version,
            __timestamp: Date.now(),
            data: stateRef.current,
          };
          storage.setItem(key, serialize(envelope));
        } catch {}
      }
    };
  }, [key, version, serialize, storage]);

  const clearStorage = useCallback(() => {
    storage.removeItem(key);
    setMeta({ isPersisted: false, lastSaved: null });
  }, [key, storage]);

  return [state, setState, { ...meta, clearStorage }];
}

// --- Demo usage ---
// const migrations = {
//   0: (v0) => ({ ...v0, preferences: { theme: 'light' } }),
//   1: (v1) => ({ ...v1, preferences: { ...v1.preferences, lang: 'en' } }),
// };
// function App() {
//   const [settings, setSettings, { isPersisted, clearStorage }] =
//     usePersistentState('settings', { name: '' }, {
//       version: 2, migrations, debounceMs: 500,
//     });
//   return (
//     <div>
//       <input value={settings.name}
//         onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} />
//       <p>Persisted: {isPersisted ? 'Yes' : 'No'}</p>
//       <button onClick={clearStorage}>Clear</button>
//     </div>
//   );
// }`,
    keyPoints: [
      "Sequential migration chaining (v0 -> v1 -> v2 -> v3) is the same pattern Redux Persist uses — each migration only knows about the transition from one version to the next, keeping each function simple and testable",
      "The lazy initializer in useState(() => { ... }) runs synchronously before first render, preventing a flash of default state. This avoids the hydration flicker that plagues naive useEffect-based persistence",
      "Debounced writes prevent localStorage thrashing during rapid state changes (like typing in an input). The unmount flush ensures no data loss when the component unmounts mid-debounce",
      "The envelope format ({ __version, __timestamp, data }) stores metadata alongside the state — this is critical for knowing which migrations to run and for debugging when data was last persisted",
      "Corruption recovery with try/catch around deserialization and migration prevents the entire app from crashing when localStorage contains invalid data — this happens more often than expected in production (browser extensions, storage clearing, manual edits)",
    ],
    followUp:
      "How would you extend this to use IndexedDB for larger data sets while keeping the same migration API? How would you handle async migrations (e.g., migrating data that requires a network call to transform)? How would you add cross-tab synchronization so two tabs don't write conflicting versions?",
  },
  {
    id: 34,
    category: "Performance",
    difficulty: "Expert",
    title: "Layout Animation Engine (FLIP Technique)",
    timeEstimate: "35 min",
    description:
      "Build a FLIP (First, Last, Invert, Play) animation system for React that smoothly animates elements between layout positions. When items reorder in a list, the FLIP technique measures element positions before and after the DOM update, computes the positional delta, and animates via CSS transforms. The system must handle entering and exiting elements, interruptible animations (new layout changes mid-animation), and batch DOM reads/writes to avoid layout thrashing.",
    realWorld:
      "Paul Lewis at Google coined the FLIP technique and documented it extensively on his blog and in Google's web.dev performance guides. Framer Motion by Matt Perry implements this as the layout and layoutId props, which became the gold standard for layout animations in React. Ryan Florence demonstrated a 'Magic Motion' technique at React Conf using the same FLIP principle. The auto-animate library by Formkit uses FLIP to add animations declaratively. Vue's built-in <TransitionGroup> component uses FLIP internally for list reordering animations.",
    requirements: [
      "useFlipAnimation(containerRef) hook that measures child positions before and after React commits DOM updates",
      "Automatic FLIP calculation: capture First (before update), let React commit Last, compute Invert (transform delta), then Play (animate to zero transform)",
      "Enter animations: new elements animate in from a configurable initial state (scale, opacity, translate)",
      "Exit animations: removed elements are kept in the DOM with position:absolute during their exit animation, then removed",
      "Interruption handling: if a new layout change occurs mid-animation, cancel current animations and start a new FLIP from the current interpolated position",
    ],
    starterCode: `// Implement a FLIP animation system for React:

function useFlipAnimation(containerRef, options = {}) {
  // options: {
  //   duration: number (ms, default 300),
  //   easing: string (CSS easing, default 'cubic-bezier(0.25, 0.1, 0.25, 1)'),
  //   enterFrom: { opacity?: number, scale?: number, y?: number },
  //   exitTo: { opacity?: number, scale?: number, y?: number },
  // }
  //
  // Usage:
  // const containerRef = useRef(null);
  // useFlipAnimation(containerRef, { duration: 400 });
  //
  // return (
  //   <ul ref={containerRef}>
  //     {items.map(item => (
  //       <li key={item.id} data-flip-key={item.id}>
  //         {item.name}
  //       </li>
  //     ))}
  //   </ul>
  // );
  //
  // When items reorder, add, or remove, elements
  // automatically FLIP animate to their new positions.
}

// The FLIP algorithm:
// 1. FIRST: Record getBoundingClientRect() of all children
//    (in useLayoutEffect, before browser paints)
// 2. React updates the DOM (reorder, add, remove)
// 3. LAST: Record new getBoundingClientRect() of all children
// 4. INVERT: Apply transform to move elements from LAST back to FIRST
// 5. PLAY: Animate the transform to identity (0,0)

// Handle:
// - Elements that are new (enter animation)
// - Elements that were removed (exit animation)
// - Elements that moved (FLIP animation)
// - Interruptions (new changes during animation)`,
    solutionCode: `function useFlipAnimation(containerRef, options = {}) {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    enterFrom = { opacity: 0, scale: 0.8, y: 20 },
    exitTo = { opacity: 0, scale: 0.8, y: -20 },
  } = options;

  // Persistent map: flipKey -> { rect, element }
  const prevRectsRef = useRef(new Map());
  const activeAnimationsRef = useRef(new Map());
  const exitingNodesRef = useRef(new Map());

  // FIRST: Capture positions before React updates the DOM
  // useLayoutEffect runs synchronously after DOM mutations
  // but before the browser paints — perfect for FLIP
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prevRects = prevRectsRef.current;
    const children = container.querySelectorAll('[data-flip-key]');
    const currentKeys = new Set();

    // LAST: Measure new positions
    const newRects = new Map();
    children.forEach(el => {
      const key = el.dataset.flipKey;
      currentKeys.add(key);
      newRects.set(key, el.getBoundingClientRect());
    });

    // Process each child
    children.forEach(el => {
      const key = el.dataset.flipKey;
      const lastRect = newRects.get(key);
      const firstRect = prevRects.get(key);

      // Cancel any running animation on this element
      const running = activeAnimationsRef.current.get(key);
      if (running) {
        running.cancel();
        activeAnimationsRef.current.delete(key);
      }

      if (!firstRect) {
        // ENTER: New element — animate in
        const anim = el.animate([
          {
            opacity: enterFrom.opacity ?? 1,
            transform: [
              \`scale(\${enterFrom.scale ?? 1})\`,
              \`translateY(\${enterFrom.y ?? 0}px)\`,
            ].join(' '),
          },
          { opacity: 1, transform: 'scale(1) translateY(0px)' },
        ], { duration, easing, fill: 'none' });

        activeAnimationsRef.current.set(key, anim);
        anim.onfinish = () => activeAnimationsRef.current.delete(key);
        return;
      }

      // INVERT + PLAY: Moved element
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      const scaleX = firstRect.width / lastRect.width || 1;
      const scaleY = firstRect.height / lastRect.height || 1;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5
          && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) {
        return; // No meaningful movement — skip
      }

      const anim = el.animate([
        {
          transform: \`translate(\${deltaX}px, \${deltaY}px) scale(\${scaleX}, \${scaleY})\`,
        },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ], { duration, easing, fill: 'none' });

      activeAnimationsRef.current.set(key, anim);
      anim.onfinish = () => activeAnimationsRef.current.delete(key);
    });

    // EXIT: Handle removed elements
    prevRects.forEach((firstRect, key) => {
      if (currentKeys.has(key)) return; // still present

      // Find a placeholder position relative to the container
      const clone = exitingNodesRef.current.get(key);
      if (clone) return; // already exiting

      // We need the original element — it's gone from DOM, so
      // create an absolutely positioned ghost at its last position
      const containerRect = container.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.style.position = 'absolute';
      ghost.style.left = \`\${firstRect.left - containerRect.left}px\`;
      ghost.style.top = \`\${firstRect.top - containerRect.top}px\`;
      ghost.style.width = \`\${firstRect.width}px\`;
      ghost.style.height = \`\${firstRect.height}px\`;
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '0';

      // Ensure container is positioned for absolute children
      const pos = getComputedStyle(container).position;
      if (pos === 'static') container.style.position = 'relative';

      container.appendChild(ghost);
      exitingNodesRef.current.set(key, ghost);

      const anim = ghost.animate([
        { opacity: 1, transform: 'scale(1) translateY(0)' },
        {
          opacity: exitTo.opacity ?? 0,
          transform: [
            \`scale(\${exitTo.scale ?? 1})\`,
            \`translateY(\${exitTo.y ?? 0}px)\`,
          ].join(' '),
        },
      ], { duration, easing, fill: 'forwards' });

      anim.onfinish = () => {
        ghost.remove();
        exitingNodesRef.current.delete(key);
      };
    });

    // Store current rects for next FLIP cycle
    prevRectsRef.current = newRects;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeAnimationsRef.current.forEach(a => a.cancel());
      exitingNodesRef.current.forEach(node => node.remove());
    };
  }, []);
}

// --- Demo ---
// function ShuffleList() {
//   const [items, setItems] = useState([
//     { id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' },
//     { id: '3', name: 'Gamma' }, { id: '4', name: 'Delta' },
//   ]);
//   const ref = useRef(null);
//   useFlipAnimation(ref, { duration: 400 });
//
//   const shuffle = () => setItems(i =>
//     [...i].sort(() => Math.random() - 0.5));
//   const remove = (id) => setItems(i => i.filter(x => x.id !== id));
//   const add = () => setItems(i => [...i, { id: String(Date.now()), name: 'New' }]);
//
//   return (
//     <div>
//       <button onClick={shuffle}>Shuffle</button>
//       <button onClick={add}>Add</button>
//       <ul ref={ref} style={{ position: 'relative' }}>
//         {items.map(item => (
//           <li key={item.id} data-flip-key={item.id}
//             onClick={() => remove(item.id)}>
//             {item.name}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }`,
    keyPoints: [
      "useLayoutEffect is essential for FLIP — it fires synchronously after DOM mutations but before the browser paints. This gives you the tiny window to measure 'Last' positions and apply 'Invert' transforms before the user sees the un-animated layout change",
      "The Web Animations API (element.animate()) is used instead of CSS transitions because it provides cancel() for interruptions, onfinish callbacks for cleanup, and doesn't require managing CSS classes or inline style cleanup",
      "Exit animations require keeping removed elements alive — the ghost div approach creates an absolutely positioned clone at the element's last known position, which can animate out independently of React's DOM updates",
      "Interruption handling works because we cancel() any running animation before starting a new FLIP. The element's current visual position becomes the starting point for the next animation, creating smooth redirects instead of jumps",
      "Batching all getBoundingClientRect() calls together (reading all rects, then writing all transforms) avoids layout thrashing — the browser only needs to calculate layout once instead of interleaving reads and writes",
    ],
    followUp:
      "How would you implement shared layout animations across different components (like Framer Motion's layoutId)? How would you add spring physics instead of CSS easing for more natural motion? How would you handle FLIP animations inside a virtualized list where off-screen elements don't exist in the DOM?",
  },
];
