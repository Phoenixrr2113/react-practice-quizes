import type { Challenge } from '@/types/challenge';

export const architectureChallenges: Challenge[] = [
  {
    id: 5,
    category: "Architecture",
    difficulty: "Expert",
    title: "Nested Drag-and-Drop with Collision Detection",
    timeEstimate: "35 min",
    description:
      "Design and implement the state management and collision detection logic for a nested drag-and-drop system — like a Kanban board where cards can be dragged between columns AND columns can be reordered. The tricky part: you must determine whether the user intends to drop INTO a container (inserting a card) or BETWEEN containers (reordering columns) based on pointer position relative to drop zones.",
    realWorld:
      "@dnd-kit (most popular React DnD library) uses collision detection algorithms with configurable strategies. Trello, Linear, Notion, and Jira all implement nested DnD with optimistic updates. The edge-vs-center zone detection pattern is what separates production Kanban boards from toy implementations. Atlassian's react-beautiful-dnd (now deprecated) made this a common interview topic.",
    requirements: [
      "Support two levels: containers (columns) and items within containers",
      "Dragging an item near the edge of a container = reorder between containers; dragging toward center = insert into container",
      "Collision detection: nearest drop zone based on pointer coordinates with configurable activation thresholds",
      "Produce a flat operation descriptor: { type: 'move-item' | 'reorder-container', from, to, position }",
      "Optimistic state update with rollback on failure",
    ],
    starterCode: `// Implement the core logic (not the UI/mouse handling):

function useDragAndDrop(initialState) {
  // initialState: {
  //   containers: ['col-1', 'col-2', 'col-3'],
  //   items: {
  //     'col-1': ['item-a', 'item-b'],
  //     'col-2': ['item-c'],
  //     'col-3': ['item-d', 'item-e', 'item-f'],
  //   }
  // }
  //
  // Returns: {
  //   state,
  //   dragStart: (id, type: 'item' | 'container') => void,
  //   dragOver: (pointerX, pointerY, dropZones: DropZone[]) => void,
  //   dragEnd: (onCommit: (operation) => Promise<void>) => void,
  //   dragCancel: () => void,
  //   activeId: string | null,
  //   overId: string | null,
  //   operation: Operation | null, // preview of what will happen on drop
  // }
}

// DropZone: { id, type: 'item' | 'container', rect: DOMRect }
// The collision detection must determine:
// 1. Which drop zone is the pointer closest to?
// 2. Is the pointer in the "edge zone" (top/bottom 25%) or "center zone"?
//    - Edge of a container = reorder containers
//    - Center of a container = insert item into container
//    - Near an item = reorder within/across containers

function detectCollision(pointerX, pointerY, dropZones, dragType) {
  // Return: { targetId, position: 'before' | 'after' | 'inside', type }
}`,
    solutionCode: `function detectCollision(pointerX, pointerY, dropZones, dragType) {
  let closest = null;
  let minDist = Infinity;

  for (const zone of dropZones) {
    const { rect } = zone;
    // Distance from pointer to center of drop zone
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(pointerX - centerX, pointerY - centerY);

    // Only consider zones the pointer is reasonably close to
    const isInsideX = pointerX >= rect.left && pointerX <= rect.right;
    const isInsideY = pointerY >= rect.top && pointerY <= rect.bottom;
    const isInside = isInsideX && isInsideY;

    // Effective distance: 0 if inside, otherwise euclidean
    const effectiveDist = isInside ? 0 : dist;

    if (effectiveDist < minDist) {
      minDist = effectiveDist;

      // Determine position based on pointer within the zone
      const relativeY = (pointerY - rect.top) / rect.height;
      const EDGE_THRESHOLD = 0.25;

      if (zone.type === 'container' && dragType === 'item') {
        // Item dragged over a container
        if (relativeY < EDGE_THRESHOLD) {
          closest = { targetId: zone.id, position: 'before', type: 'reorder-container-edge' };
        } else if (relativeY > 1 - EDGE_THRESHOLD) {
          closest = { targetId: zone.id, position: 'after', type: 'reorder-container-edge' };
        } else {
          closest = { targetId: zone.id, position: 'inside', type: 'insert-into-container' };
        }
      } else if (zone.type === 'item') {
        closest = {
          targetId: zone.id,
          position: relativeY < 0.5 ? 'before' : 'after',
          type: 'reorder-item',
        };
      } else {
        // Container dragged over container
        closest = {
          targetId: zone.id,
          position: relativeY < 0.5 ? 'before' : 'after',
          type: 'reorder-container',
        };
      }
    }
  }

  return closest;
}

function useDragAndDrop(initialState) {
  const [state, setState] = useState(initialState);
  const [dragState, setDragState] = useState({
    activeId: null,
    activeType: null,
    overId: null,
    operation: null,
  });
  const snapshotRef = useRef(null); // for rollback

  const dragStart = useCallback((id, type) => {
    snapshotRef.current = structuredClone(state); // save for rollback
    setDragState({ activeId: id, activeType: type, overId: null, operation: null });
  }, [state]);

  const dragOver = useCallback((pointerX, pointerY, dropZones) => {
    setDragState(prev => {
      if (!prev.activeId) return prev;

      const collision = detectCollision(pointerX, pointerY, dropZones, prev.activeType);
      if (!collision || collision.targetId === prev.activeId) {
        return { ...prev, overId: null, operation: null };
      }

      const operation = buildOperation(prev.activeId, prev.activeType, collision, state);
      return { ...prev, overId: collision.targetId, operation };
    });
  }, [state]);

  const dragEnd = useCallback(async (onCommit) => {
    const { operation } = dragState;
    if (!operation) {
      setDragState({ activeId: null, activeType: null, overId: null, operation: null });
      return;
    }

    // Optimistic update
    setState(prev => applyOperation(prev, operation));
    setDragState({ activeId: null, activeType: null, overId: null, operation: null });

    try {
      await onCommit(operation);
    } catch {
      // Rollback on failure
      setState(snapshotRef.current);
      snapshotRef.current = null;
    }
  }, [dragState]);

  const dragCancel = useCallback(() => {
    setDragState({ activeId: null, activeType: null, overId: null, operation: null });
  }, []);

  return {
    state, ...dragState,
    dragStart, dragOver, dragEnd, dragCancel,
  };
}

function buildOperation(activeId, activeType, collision, state) {
  // Find source container for items
  if (activeType === 'item') {
    const sourceContainer = Object.keys(state.items).find(
      key => state.items[key].includes(activeId)
    );
    if (collision.type === 'insert-into-container') {
      return {
        type: 'move-item',
        itemId: activeId,
        from: { containerId: sourceContainer },
        to: { containerId: collision.targetId, index: state.items[collision.targetId]?.length ?? 0 },
      };
    }
    if (collision.type === 'reorder-item') {
      const targetContainer = Object.keys(state.items).find(
        key => state.items[key].includes(collision.targetId)
      );
      const targetIndex = state.items[targetContainer].indexOf(collision.targetId);
      return {
        type: 'move-item',
        itemId: activeId,
        from: { containerId: sourceContainer },
        to: {
          containerId: targetContainer,
          index: collision.position === 'after' ? targetIndex + 1 : targetIndex,
        },
      };
    }
  }
  return {
    type: 'reorder-container',
    containerId: activeId,
    position: collision.position,
    targetId: collision.targetId,
  };
}

function applyOperation(state, op) {
  const next = structuredClone(state);
  if (op.type === 'move-item') {
    // Remove from source
    next.items[op.from.containerId] = next.items[op.from.containerId].filter(id => id !== op.itemId);
    // Insert into target
    next.items[op.to.containerId].splice(op.to.index, 0, op.itemId);
  } else if (op.type === 'reorder-container') {
    const arr = next.containers;
    const fromIdx = arr.indexOf(op.containerId);
    arr.splice(fromIdx, 1);
    const toIdx = arr.indexOf(op.targetId);
    arr.splice(op.position === 'after' ? toIdx + 1 : toIdx, 0, op.containerId);
  }
  return next;
}`,
    testCode: `import { renderHook } from '@testing-library/react';
import { detectCollision, useDragAndDrop } from './implementation';

// Helper to create a mock DOMRect-like drop zone
function makeZone(id, type, left, top, width, height) {
  return {
    id,
    type,
    rect: { left, top, right: left + width, bottom: top + height, width, height },
  };
}

describe('detectCollision', () => {

  test('returns null when dropZones is empty', () => {
    expect(detectCollision(100, 100, [], 'item')).toBeNull();
  });

  test('detects closest drop zone by pointer position', () => {
    const zones = [
      makeZone('col-1', 'container', 0, 0, 200, 400),
      makeZone('col-2', 'container', 300, 0, 200, 400),
    ];
    const result = detectCollision(350, 200, zones, 'container');
    expect(result.targetId).toBe('col-2');
  });

  test('item dragged to center of container returns insert-into-container', () => {
    const zones = [makeZone('col-1', 'container', 0, 0, 200, 400)];
    // Center of container: y=200 out of 400 = 0.5 relative (center zone)
    const result = detectCollision(100, 200, zones, 'item');
    expect(result.targetId).toBe('col-1');
    expect(result.position).toBe('inside');
    expect(result.type).toBe('insert-into-container');
  });

  test('item dragged to top edge of container returns before', () => {
    const zones = [makeZone('col-1', 'container', 0, 0, 200, 400)];
    // Top edge: y=20 => relativeY = 20/400 = 0.05, which is < 0.25
    const result = detectCollision(100, 20, zones, 'item');
    expect(result.targetId).toBe('col-1');
    expect(result.position).toBe('before');
  });

  test('item dragged to bottom edge of container returns after', () => {
    const zones = [makeZone('col-1', 'container', 0, 0, 200, 400)];
    // Bottom edge: y=380 => relativeY = 380/400 = 0.95, which is > 0.75
    const result = detectCollision(100, 380, zones, 'item');
    expect(result.targetId).toBe('col-1');
    expect(result.position).toBe('after');
  });

  test('pointer near an item returns reorder-item with before/after', () => {
    const zones = [makeZone('item-a', 'item', 10, 10, 180, 50)];
    // Top half: y=20 => relativeY = (20-10)/50 = 0.2 < 0.5
    const result = detectCollision(100, 20, zones, 'item');
    expect(result.targetId).toBe('item-a');
    expect(result.position).toBe('before');
    expect(result.type).toBe('reorder-item');
  });
});

describe('useDragAndDrop', () => {

  test('returns the expected API shape', () => {
    const initial = {
      containers: ['col-1', 'col-2'],
      items: { 'col-1': ['a', 'b'], 'col-2': ['c'] },
    };
    const { result } = renderHook(() => useDragAndDrop(initial));
    expect(result.current.state).toEqual(initial);
    expect(typeof result.current.dragStart).toBe('function');
    expect(typeof result.current.dragOver).toBe('function');
    expect(typeof result.current.dragEnd).toBe('function');
    expect(typeof result.current.dragCancel).toBe('function');
    expect(result.current.activeId).toBeNull();
    expect(result.current.overId).toBeNull();
    expect(result.current.operation).toBeNull();
  });
});`,
    keyPoints: [
      "Edge vs center detection (the 25% threshold) is what separates good DnD from great DnD — it's how users intuitively communicate 'put it IN here' vs 'put it NEXT TO this'",
      "structuredClone for rollback snapshots avoids shared references — critical when state contains nested arrays/objects",
      "Optimistic update + async rollback is the same pattern Trello and Linear use — the card moves instantly, and only snaps back if the server rejects",
      "Separating collision detection from state updates makes the system testable — you can unit test detectCollision with mock rects without any React rendering",
      "This architecture mirrors @dnd-kit's approach — mentioning that library and how your design compares shows deep ecosystem knowledge",
    ],
    followUp:
      "How would you add keyboard accessibility (drag with arrow keys)? How would you handle auto-scrolling when dragging near container edges? What about multi-select drag?",
  },
  {
    id: 6,
    category: "Architecture",
    difficulty: "Expert",
    title: "Plugin Architecture with React Context Composition",
    timeEstimate: "30 min",
    description:
      "Design a plugin system for a React application where third-party plugins can register UI slots, middleware, and state extensions — without the host application knowing about them at build time. Think VS Code extensions or Figma plugins but for a React app. Plugins must be isolated (one crashing plugin can't take down the app), lazily loaded, and able to communicate through a typed event bus.",
    realWorld:
      "Nylas Mail (open-source) published the foundational article on React plugin architecture with OmniStores and component injection. Grafana, Backstage (Spotify), and WordPress Gutenberg all use slot-based plugin systems. Facebook Messenger wraps sidebar, info panel, and conversation in separate error boundaries — exactly this isolation pattern. A Nov 2025 Medium article by a senior frontend engineer documents building this exact system.",
    requirements: [
      "PluginHost component that manages plugin lifecycle (register, activate, deactivate, error isolation)",
      "Slot system: plugins declare UI they want to inject at named slots (<Slot name='sidebar' />)",
      "Event bus for cross-plugin communication with type-safe subscribe/emit",
      "Each plugin wrapped in its own Error Boundary — a crashed plugin shows fallback, not a white screen",
      "Lazy loading: plugins loaded via dynamic import, with loading states",
    ],
    starterCode: `// Plugin interface:
// {
//   id: string,
//   name: string,
//   load: () => Promise<PluginModule>,
// }
//
// PluginModule: {
//   slots?: { [slotName: string]: React.ComponentType },
//   onActivate?: (api: PluginAPI) => void | (() => void),
//   middleware?: { [key: string]: MiddlewareFn },
// }
//
// PluginAPI: {
//   emit: (event, payload) => void,
//   on: (event, handler) => unsubscribe,
//   getSharedState: (key) => any,
//   setSharedState: (key, value) => void,
// }

function PluginHost({ plugins, children }) {
  // Manages loading, activation, error isolation
}

function Slot({ name, fallback }) {
  // Renders all plugin components registered for this slot
}

function createEventBus() {
  // Type-safe pub/sub for cross-plugin communication
}

// Usage:
// const plugins = [
//   { id: 'analytics', name: 'Analytics', load: () => import('./plugins/analytics') },
//   { id: 'ai-assist', name: 'AI Assistant', load: () => import('./plugins/ai-assist') },
// ];
//
// <PluginHost plugins={plugins}>
//   <AppShell>
//     <Slot name="sidebar" />
//     <MainContent />
//     <Slot name="toolbar" />
//   </AppShell>
// </PluginHost>`,
    solutionCode: `// --- Event Bus ---
function createEventBus() {
  const listeners = new Map(); // event -> Set<handler>

  return {
    emit(event, payload) {
      listeners.get(event)?.forEach(handler => {
        try { handler(payload); }
        catch (e) { console.error(\`Plugin event handler error [\${event}]:\`, e); }
      });
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    destroy() { listeners.clear(); },
  };
}

// --- Shared State (external store for plugins) ---
function createSharedState() {
  const state = new Map();
  const subs = new Set();
  return {
    get: (key) => state.get(key),
    set: (key, value) => { state.set(key, value); subs.forEach(fn => fn()); },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
}

// --- Contexts ---
const PluginRegistryCtx = createContext(null);
const SlotRegistryCtx = createContext(null);

// --- PluginHost ---
function PluginHost({ plugins, children }) {
  const eventBus = useRef(createEventBus()).current;
  const sharedState = useRef(createSharedState()).current;
  const [slotRegistry, setSlotRegistry] = useState({}); // slotName -> [{ pluginId, Component }]
  const [pluginStates, setPluginStates] = useState({}); // pluginId -> 'loading'|'active'|'error'
  const cleanupFns = useRef(new Map());

  // Load and activate plugins
  useEffect(() => {
    plugins.forEach(async (plugin) => {
      setPluginStates(prev => ({ ...prev, [plugin.id]: 'loading' }));

      try {
        const mod = await plugin.load();

        // Register slot components
        if (mod.slots) {
          setSlotRegistry(prev => {
            const next = { ...prev };
            Object.entries(mod.slots).forEach(([slotName, Component]) => {
              next[slotName] = [
                ...(next[slotName] || []),
                { pluginId: plugin.id, Component },
              ];
            });
            return next;
          });
        }

        // Build sandboxed API for this plugin
        const pluginAPI = {
          emit: eventBus.emit,
          on: eventBus.on,
          getSharedState: sharedState.get,
          setSharedState: sharedState.set,
        };

        // Activate — may return cleanup function
        const cleanup = mod.onActivate?.(pluginAPI);
        if (typeof cleanup === 'function') {
          cleanupFns.current.set(plugin.id, cleanup);
        }

        setPluginStates(prev => ({ ...prev, [plugin.id]: 'active' }));
      } catch (err) {
        console.error(\`Plugin \${plugin.id} failed to load:\`, err);
        setPluginStates(prev => ({ ...prev, [plugin.id]: 'error' }));
      }
    });

    return () => {
      cleanupFns.current.forEach(fn => fn());
      cleanupFns.current.clear();
      eventBus.destroy();
    };
  }, []); // Intentionally load once

  return (
    <PluginRegistryCtx.Provider value={pluginStates}>
      <SlotRegistryCtx.Provider value={slotRegistry}>
        {children}
      </SlotRegistryCtx.Provider>
    </PluginRegistryCtx.Provider>
  );
}

// --- Error-Isolated Slot ---
function Slot({ name, fallback = null }) {
  const registry = useContext(SlotRegistryCtx);
  const entries = registry?.[name] || [];

  if (entries.length === 0) return fallback;

  return entries.map(({ pluginId, Component }) => (
    <PluginErrorBoundary key={pluginId} pluginId={pluginId}>
      <Component />
    </PluginErrorBoundary>
  ));
}

// --- Per-Plugin Error Boundary ---
class PluginErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(\`Plugin \${this.props.pluginId} crashed:\`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 8, color: '#f87171', fontSize: 12, border: '1px solid #f8717133', borderRadius: 4 }}>
          Plugin "{this.props.pluginId}" encountered an error
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}`,
    testCode: `import { createEventBus } from './implementation';

describe('createEventBus', () => {

  test('returns an object with emit and on methods', () => {
    const bus = createEventBus();
    expect(typeof bus.emit).toBe('function');
    expect(typeof bus.on).toBe('function');
  });

  test('on registers a handler that receives emitted payloads', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.on('test', handler);
    bus.emit('test', { data: 42 });
    expect(handler).toHaveBeenCalledWith({ data: 42 });
  });

  test('multiple handlers can subscribe to the same event', () => {
    const bus = createEventBus();
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('evt', h1);
    bus.on('evt', h2);
    bus.emit('evt', 'payload');
    expect(h1).toHaveBeenCalledWith('payload');
    expect(h2).toHaveBeenCalledWith('payload');
  });

  test('on returns an unsubscribe function', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    const unsub = bus.on('evt', handler);
    expect(typeof unsub).toBe('function');
    unsub();
    bus.emit('evt', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  test('emit to an event with no listeners does not throw', () => {
    const bus = createEventBus();
    expect(() => bus.emit('nonexistent', 'data')).not.toThrow();
  });

  test('one handler throwing does not prevent others from running', () => {
    const bus = createEventBus();
    const badHandler = jest.fn(() => { throw new Error('oops'); });
    const goodHandler = jest.fn();
    bus.on('evt', badHandler);
    bus.on('evt', goodHandler);
    bus.emit('evt', 'data');
    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalledWith('data');
  });

  test('different events are independent', () => {
    const bus = createEventBus();
    const h1 = jest.fn();
    const h2 = jest.fn();
    bus.on('event-a', h1);
    bus.on('event-b', h2);
    bus.emit('event-a', 'a');
    expect(h1).toHaveBeenCalledWith('a');
    expect(h2).not.toHaveBeenCalled();
  });

  test('destroy clears all listeners', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.on('evt', handler);
    bus.destroy();
    bus.emit('evt', 'data');
    expect(handler).not.toHaveBeenCalled();
  });
});`,
    keyPoints: [
      "Error Boundary per plugin is the key architectural decision — it's the same isolation model VS Code uses. A buggy extension crashes in its own sandbox, not the host app",
      "The event bus try/catch per handler prevents one plugin's broken handler from blocking others — defensive programming for untrusted code",
      "Slot-based UI injection is the pattern used by Grafana, Backstage, and WordPress Gutenberg — it decouples the host layout from plugin content",
      "onActivate returning a cleanup function mirrors React's useEffect pattern — plugins get a chance to tear down event subscriptions and timers",
      "Lazy loading via dynamic import() means plugins only load when needed — combine with React.lazy + Suspense for loading states on the slot level",
    ],
    followUp:
      "How would you add plugin permissions (e.g., plugin X can only write to shared state key 'theme')? How would you handle plugin dependencies (plugin B requires plugin A)? How would you version the PluginAPI for backward compatibility?",
  },
  {
    id: 10,
    category: "Architecture",
    difficulty: "Expert",
    title: "Optimistic Mutation Queue with Conflict Resolution",
    timeEstimate: "30 min",
    description:
      "Build an optimistic mutation system that queues multiple mutations, applies them instantly to the UI, sends them to the server in order, and handles partial failures with surgical rollback — without reverting mutations that succeeded. Handle the case where two mutations affect the same entity and the server returns a different result than expected (conflict).",
    realWorld:
      "React 19's useOptimistic hook (now stable) implements the basic version of this. TanStack Query's onMutate/onError/onSettled pattern handles optimistic updates with rollback. TkDodo (React Query maintainer) wrote an April 2025 deep-dive on concurrent optimistic updates and the edge cases with query cancellation. Apollo Client, Linear, and Notion all implement mutation queues with conflict resolution for their real-time collaborative UIs.",
    requirements: [
      "Queue mutations and apply each one optimistically to local state immediately",
      "Send mutations to server sequentially (preserve ordering)",
      "On success: commit the optimistic state (server confirmed)",
      "On failure: rollback ONLY the failed mutation, keep successful ones applied",
      "Handle conflicts: if server returns a different result than predicted, reconcile",
    ],
    starterCode: `// Implement:
function useOptimisticMutations(queryKey, fetcher) {
  // queryKey: identifies the data being mutated
  // fetcher: () => Promise<T> — fetches current server state
  //
  // Returns: {
  //   data: T,               // current state (with optimistic applied)
  //   mutate: (mutation) => void,
  //   pending: Mutation[],    // in-flight mutations
  //   conflicts: Conflict[],  // server disagreed with prediction
  // }
}

// Mutation shape:
// {
//   id: string,
//   optimisticUpdate: (currentData) => newData,  // client prediction
//   serverAction: (currentData) => Promise<serverResult>,
//   reconcile?: (optimistic, serverResult) => reconciledData,
// }

// Example: Todo list with reorder + toggle
// mutate({
//   id: 'toggle-5',
//   optimisticUpdate: (todos) => todos.map(t =>
//     t.id === 5 ? { ...t, done: !t.done } : t
//   ),
//   serverAction: () => api.toggleTodo(5),
//   reconcile: (optimistic, server) => server, // trust server
// });`,
    solutionCode: `function useOptimisticMutations(queryKey, fetcher) {
  const [serverData, setServerData] = useState(null);
  const [pending, setPending] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const serverDataRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    fetcher().then(data => {
      setServerData(data);
      serverDataRef.current = data;
    });
  }, [queryKey]);

  // Compute optimistic view: server data + all pending mutations layered on top
  const data = useMemo(() => {
    if (!serverData) return null;
    return pending.reduce(
      (acc, mutation) => mutation.optimisticUpdate(acc),
      serverData
    );
  }, [serverData, pending]);

  // Process mutation queue sequentially
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const mutation = queueRef.current[0];

      try {
        const serverResult = await mutation.serverAction(
          serverDataRef.current
        );

        // Check for conflict: did server return something
        // different than our optimistic prediction?
        const optimisticResult = mutation.optimisticUpdate(
          serverDataRef.current
        );

        if (!deepEqual(optimisticResult, serverResult)) {
          // Conflict detected
          const reconciled = mutation.reconcile
            ? mutation.reconcile(optimisticResult, serverResult)
            : serverResult; // default: trust server

          serverDataRef.current = reconciled;
          setServerData(reconciled);
          setConflicts(prev => [...prev, {
            mutationId: mutation.id,
            expected: optimisticResult,
            received: serverResult,
            reconciled,
          }]);
        } else {
          // No conflict — commit optimistic as server truth
          serverDataRef.current = serverResult;
          setServerData(serverResult);
        }

        // Remove from pending (success)
        queueRef.current.shift();
        setPending(prev => prev.filter(m => m.id !== mutation.id));

      } catch (error) {
        // FAILED — rollback only this mutation
        queueRef.current.shift();
        setPending(prev => prev.filter(m => m.id !== mutation.id));

        // Re-fetch server state to ensure consistency
        try {
          const fresh = await fetcher();
          serverDataRef.current = fresh;
          setServerData(fresh);
        } catch {
          // If refetch fails too, remaining optimistic state
          // is still layered on top of last known server state
        }
      }
    }

    processingRef.current = false;
  }, [fetcher]);

  const mutate = useCallback((mutation) => {
    // Assign ID if missing
    const m = { ...mutation, id: mutation.id || crypto.randomUUID() };

    // Add to pending (triggers optimistic UI)
    setPending(prev => [...prev, m]);

    // Add to processing queue
    queueRef.current.push(m);

    // Start processing
    processQueue();
  }, [processQueue]);

  return { data, mutate, pending, conflicts };
}

// Simple deep equality (production would use a library)
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(key => deepEqual(a[key], b[key]));
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { deepEqual, useOptimisticMutations } from './implementation';

describe('deepEqual', () => {

  test('identical primitives are equal', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  test('different primitives are not equal', () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  test('shallow objects are compared by value', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('objects with different keys are not equal', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test('deeply nested objects are compared recursively', () => {
    const a = { x: { y: { z: [1, 2, 3] } } };
    const b = { x: { y: { z: [1, 2, 3] } } };
    const c = { x: { y: { z: [1, 2, 4] } } };
    expect(deepEqual(a, b)).toBe(true);
    expect(deepEqual(a, c)).toBe(false);
  });

  test('arrays are compared element-wise', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe('useOptimisticMutations', () => {

  test('returns data, mutate, pending, and conflicts', async () => {
    const fetcher = () => Promise.resolve([{ id: 1, text: 'Hello' }]);
    const { result } = renderHook(() =>
      useOptimisticMutations('todos', fetcher)
    );
    // Wait for initial fetch
    await act(() => new Promise(r => setTimeout(r, 50)));
    expect(result.current).toHaveProperty('data');
    expect(typeof result.current.mutate).toBe('function');
    expect(Array.isArray(result.current.pending)).toBe(true);
    expect(Array.isArray(result.current.conflicts)).toBe(true);
  });

  test('fetches initial data on mount', async () => {
    const data = [{ id: 1, done: false }];
    const fetcher = jest.fn().mockResolvedValue(data);
    const { result } = renderHook(() =>
      useOptimisticMutations('todos', fetcher)
    );
    await act(() => new Promise(r => setTimeout(r, 50)));
    expect(fetcher).toHaveBeenCalled();
    expect(result.current.data).toEqual(data);
  });
});`,
    keyPoints: [
      "The layered approach: optimistic data = serverData + pending.reduce(). Each mutation layers on top. Removing one mutation from pending surgically un-applies it without affecting others",
      "Sequential processing ensures mutations reach the server in order — this prevents race conditions where mutation B depends on mutation A's result",
      "Conflict detection compares client prediction vs server result — this is how collaborative apps detect divergence and decide whether to trust client or server",
      "On failure, only the failed mutation is removed from pending. Remaining mutations stay applied optimistically and continue processing. This is surgical rollback",
      "useOptimistic in React 19 handles the simple case but not queuing, conflict detection, or partial rollback — this is the production-grade version",
    ],
    followUp:
      "How would you add retry logic with exponential backoff? How would you handle mutations that depend on each other (mutation B needs mutation A's server result)? How does this compare to CRDT-based conflict resolution in apps like Figma or Linear?",
  },
  {
    id: 12,
    category: "Architecture",
    difficulty: "Expert",
    title: "Accessible Headless Combobox Component",
    timeEstimate: "35 min",
    description:
      "Build a fully accessible, headless combobox (autocomplete/typeahead) component that follows the WAI-ARIA Combobox pattern exactly. It must support keyboard navigation, screen reader announcements, async option loading, and work with any rendering approach (the consumer provides all JSX). This is the pattern used by Radix UI, Headless UI, and Downshift.",
    realWorld:
      "Downshift by Kent C. Dodds (2017) pioneered the headless combobox pattern in React. Radix UI, Headless UI (Tailwind Labs), React Aria (Adobe), and Ariakit all implement this exact component. The WAI-ARIA Combobox pattern is one of the most complex ARIA patterns — getting it right is a real differentiator in interviews. Companies like Stripe, Vercel, and Shopify test ARIA knowledge in senior frontend interviews.",
    requirements: [
      "WAI-ARIA compliant: role='combobox', aria-expanded, aria-activedescendant, aria-controls",
      "Keyboard navigation: ArrowUp/Down to navigate, Enter to select, Escape to close, Home/End",
      "Screen reader: announce number of results, current selection, and status changes via aria-live",
      "Headless: return props objects (getInputProps, getMenuProps, getItemProps) — consumer renders all UI",
      "Support async option loading with loading state",
    ],
    starterCode: `// Implement:
function useCombobox({
  items,
  onSelect,
  onInputChange,
  itemToString = (item) => item?.toString() ?? '',
  isOpen: controlledIsOpen,
  initialIsOpen = false,
}) {
  // Returns:
  // {
  //   isOpen: boolean,
  //   highlightedIndex: number,
  //   selectedItem: any,
  //   inputValue: string,
  //   getInputProps: () => inputHTMLAttributes,
  //   getMenuProps: () => menuHTMLAttributes,
  //   getItemProps: ({ item, index }) => itemHTMLAttributes,
  //   getLabelProps: () => labelHTMLAttributes,
  //   getToggleProps: () => buttonHTMLAttributes,
  //   openMenu: () => void,
  //   closeMenu: () => void,
  //   setInputValue: (value) => void,
  //   setHighlightedIndex: (index) => void,
  //   selectItem: (item) => void,
  //   reset: () => void,
  // }
}

// Usage (consumer controls all rendering):
// function Autocomplete({ items }) {
//   const {
//     isOpen, inputValue, highlightedIndex, selectedItem,
//     getInputProps, getMenuProps, getItemProps, getLabelProps,
//   } = useCombobox({
//     items,
//     onSelect: (item) => console.log('Selected:', item),
//     itemToString: (item) => item.name,
//   });
//
//   return (
//     <div>
//       <label {...getLabelProps()}>Search</label>
//       <input {...getInputProps()} />
//       <ul {...getMenuProps()}>
//         {isOpen && items.map((item, index) => (
//           <li
//             key={item.id}
//             {...getItemProps({ item, index })}
//             style={{
//               background: highlightedIndex === index ? '#eee' : 'white',
//               fontWeight: selectedItem === item ? 'bold' : 'normal',
//             }}
//           >
//             {item.name}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }`,
    solutionCode: `function useCombobox({
  items,
  onSelect,
  onInputChange,
  itemToString = (item) => item?.toString() ?? '',
  isOpen: controlledIsOpen,
  initialIsOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? initialIsOpen);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef({});
  const menuId = useRef('combobox-menu-' + Math.random().toString(36).slice(2));
  const inputId = useRef('combobox-input-' + Math.random().toString(36).slice(2));
  const labelId = useRef('combobox-label-' + Math.random().toString(36).slice(2));

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex].scrollIntoView?.({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        !inputRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const selectItem = useCallback((item) => {
    setSelectedItem(item);
    setInputValue(itemToString(item));
    closeMenu();
    onSelect?.(item);
  }, [itemToString, closeMenu, onSelect]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { setIsOpen(true); setHighlightedIndex(0); }
        else setHighlightedIndex(prev =>
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) { setIsOpen(true); setHighlightedIndex(items.length - 1); }
        else setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && items[highlightedIndex]) {
          selectItem(items[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        inputRef.current?.focus();
        break;
      case 'Home':
        if (isOpen) { e.preventDefault(); setHighlightedIndex(0); }
        break;
      case 'End':
        if (isOpen) { e.preventDefault(); setHighlightedIndex(items.length - 1); }
        break;
    }
  }, [isOpen, highlightedIndex, items, selectItem, closeMenu]);

  const getInputProps = useCallback(() => ({
    id: inputId.current,
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': isOpen,
    'aria-controls': menuId.current,
    'aria-activedescendant': highlightedIndex >= 0
      ? \`\${menuId.current}-item-\${highlightedIndex}\`
      : undefined,
    'aria-labelledby': labelId.current,
    autoComplete: 'off',
    ref: inputRef,
    value: inputValue,
    onChange: (e) => {
      const val = e.target.value;
      setInputValue(val);
      setIsOpen(true);
      setHighlightedIndex(0);
      onInputChange?.(val);
    },
    onKeyDown: handleKeyDown,
    onFocus: () => { if (inputValue) setIsOpen(true); },
  }), [isOpen, highlightedIndex, inputValue, handleKeyDown, onInputChange]);

  const getMenuProps = useCallback(() => ({
    id: menuId.current,
    role: 'listbox',
    'aria-labelledby': labelId.current,
    ref: menuRef,
  }), []);

  const getItemProps = useCallback(({ item, index }) => ({
    id: \`\${menuId.current}-item-\${index}\`,
    role: 'option',
    'aria-selected': highlightedIndex === index,
    ref: (el) => { itemRefs.current[index] = el; },
    onClick: () => selectItem(item),
    onMouseEnter: () => setHighlightedIndex(index),
  }), [highlightedIndex, selectItem]);

  const getLabelProps = useCallback(() => ({
    id: labelId.current,
    htmlFor: inputId.current,
  }), []);

  const getToggleProps = useCallback(() => ({
    'aria-label': 'toggle menu',
    'aria-expanded': isOpen,
    tabIndex: -1,
    onClick: () => {
      if (isOpen) closeMenu();
      else { openMenu(); inputRef.current?.focus(); }
    },
  }), [isOpen, openMenu, closeMenu]);

  return {
    isOpen, highlightedIndex, selectedItem, inputValue,
    getInputProps, getMenuProps, getItemProps, getLabelProps, getToggleProps,
    openMenu, closeMenu, setInputValue, setHighlightedIndex, selectItem,
    reset: () => {
      setSelectedItem(null);
      setInputValue('');
      closeMenu();
    },
  };
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useCombobox } from './implementation';

const items = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Banana' },
  { id: 3, name: 'Cherry' },
];

describe('useCombobox', () => {

  test('returns all expected properties', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    const hook = result.current;
    expect(typeof hook.isOpen).toBe('boolean');
    expect(typeof hook.highlightedIndex).toBe('number');
    expect(hook.selectedItem).toBeNull();
    expect(typeof hook.inputValue).toBe('string');
    expect(typeof hook.getInputProps).toBe('function');
    expect(typeof hook.getMenuProps).toBe('function');
    expect(typeof hook.getItemProps).toBe('function');
    expect(typeof hook.getLabelProps).toBe('function');
    expect(typeof hook.getToggleProps).toBe('function');
    expect(typeof hook.openMenu).toBe('function');
    expect(typeof hook.closeMenu).toBe('function');
    expect(typeof hook.setInputValue).toBe('function');
    expect(typeof hook.setHighlightedIndex).toBe('function');
    expect(typeof hook.selectItem).toBe('function');
    expect(typeof hook.reset).toBe('function');
  });

  test('getInputProps returns ARIA attributes', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    const inputProps = result.current.getInputProps();
    expect(inputProps.role).toBe('combobox');
    expect(inputProps).toHaveProperty('aria-expanded');
    expect(inputProps).toHaveProperty('aria-controls');
    expect(inputProps).toHaveProperty('aria-autocomplete');
    expect(inputProps.autoComplete).toBe('off');
  });

  test('getMenuProps returns listbox role', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    const menuProps = result.current.getMenuProps();
    expect(menuProps.role).toBe('listbox');
    expect(menuProps).toHaveProperty('id');
  });

  test('getItemProps returns option role and aria-selected', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    const itemProps = result.current.getItemProps({ item: items[0], index: 0 });
    expect(itemProps.role).toBe('option');
    expect(itemProps).toHaveProperty('aria-selected');
    expect(itemProps).toHaveProperty('id');
  });

  test('getLabelProps returns id and htmlFor', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    const labelProps = result.current.getLabelProps();
    expect(labelProps).toHaveProperty('id');
    expect(labelProps).toHaveProperty('htmlFor');
  });

  test('selectItem updates selectedItem and inputValue', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '', onSelect })
    );
    act(() => {
      result.current.selectItem(items[1]);
    });
    expect(result.current.selectedItem).toBe(items[1]);
    expect(result.current.inputValue).toBe('Banana');
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  test('openMenu and closeMenu toggle isOpen', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    expect(result.current.isOpen).toBe(false);
    act(() => { result.current.openMenu(); });
    expect(result.current.isOpen).toBe(true);
    act(() => { result.current.closeMenu(); });
    expect(result.current.isOpen).toBe(false);
  });

  test('reset clears selection and input', () => {
    const { result } = renderHook(() =>
      useCombobox({ items, itemToString: (i) => i?.name ?? '' })
    );
    act(() => { result.current.selectItem(items[0]); });
    expect(result.current.selectedItem).toBe(items[0]);
    act(() => { result.current.reset(); });
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.inputValue).toBe('');
  });
});`,
    keyPoints: [
      "aria-activedescendant is the key ARIA attribute — it tells screen readers which option is 'focused' without actually moving DOM focus from the input. This is how all major combobox implementations work",
      "The 'prop getters' pattern (getInputProps, getItemProps) was pioneered by Downshift — consumers spread props onto their elements, giving them full rendering control while the hook manages behavior",
      "Wrapping ArrowUp/Down to cycle from end→start (and vice versa) is a WCAG expectation. Home/End support is required by the WAI-ARIA combobox pattern",
      "Outside click handling with mousedown (not click) prevents the menu from closing when users interact with scrollbars inside the menu",
      "scrollIntoView({ block: 'nearest' }) ensures keyboard navigation works when the options list is scrollable — without this, highlighted items disappear off-screen",
    ],
    followUp:
      "How would you add multi-select with tag/chip rendering? How would you implement virtual scrolling for 10k+ options? How would you handle composition events (IME) for CJK input? Compare your implementation to Radix UI's combobox — what's missing?",
  },
  {
    id: 16,
    category: "Architecture",
    difficulty: "Expert",
    title: "Middleware Pipeline for React Hooks",
    timeEstimate: "25 min",
    description:
      "Build a composable middleware system for React state updates — like Express middleware but for useReducer. Each middleware can intercept dispatched actions, transform them, perform side effects (logging, analytics, persistence), short-circuit, or dispatch additional actions. Support async middleware (e.g., API calls before allowing a state transition). This is the pattern that Redux middleware, Zustand middleware, and SWR middleware all implement.",
    realWorld:
      "Redux middleware (redux-thunk, redux-saga, redux-logger) is one of the most important architecture patterns in React. Zustand's middleware API (persist, devtools, immer) uses the same composable pattern. SWR added middleware support in v2. This pattern directly maps to the interceptor/middleware pattern in Express, Koa, and Axios. Understanding middleware composition is critical for senior architects building extensible state management.",
    requirements: [
      "applyMiddleware(...middlewares) enhances a useReducer with a middleware pipeline",
      "Middleware signature: (store) => (next) => (action) => result (same as Redux)",
      "Support async middleware that can delay or prevent state updates",
      "Middleware can dispatch additional actions (thunk-like behavior)",
      "Built-in middlewares: logger, persist (localStorage), and devtools connector",
    ],
    starterCode: `// Implement:
function useReducerWithMiddleware(reducer, initialState, ...middlewares) {
  // Returns [state, enhancedDispatch]
  // where enhancedDispatch runs actions through the middleware chain
}

// Middleware signature (same as Redux):
// (storeAPI) => (next) => (action) => {
//   // Before: transform action, log, check conditions
//   const result = next(action); // call next middleware or reducer
//   // After: log new state, persist, trigger side effects
//   return result;
// }

// Example middlewares:
// const loggerMiddleware = (store) => (next) => (action) => {
//   console.log('dispatching', action);
//   const result = next(action);
//   console.log('next state', store.getState());
//   return result;
// };
//
// const thunkMiddleware = (store) => (next) => (action) => {
//   if (typeof action === 'function') {
//     return action(store.dispatch, store.getState);
//   }
//   return next(action);
// };
//
// const persistMiddleware = (key) => (store) => (next) => (action) => {
//   const result = next(action);
//   localStorage.setItem(key, JSON.stringify(store.getState()));
//   return result;
// };
//
// Usage:
// const [state, dispatch] = useReducerWithMiddleware(
//   todoReducer,
//   initialTodos,
//   loggerMiddleware,
//   thunkMiddleware,
//   persistMiddleware('todos')
// );
// dispatch({ type: 'ADD_TODO', payload: 'Learn middleware' });
// dispatch((dispatch, getState) => {   // thunk!
//   fetch('/api/todos').then(r => r.json())
//     .then(todos => dispatch({ type: 'SET_TODOS', payload: todos }));
// });`,
    solutionCode: `function useReducerWithMiddleware(reducer, initialState, ...middlewares) {
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);

  // Keep stateRef in sync — this allows middleware to read
  // current state without stale closures
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const enhancedDispatch = useMemo(() => {
    // Build the store API that middleware receives
    const storeAPI = {
      getState: () => stateRef.current,
      dispatch: (...args) => enhancedDispatch(...args), // allows middleware to dispatch
    };

    // Compose middleware chain (right to left, like Redux)
    // Each middleware wraps the next one
    let chain = middlewares.map(mw => mw(storeAPI));

    // The innermost function is the raw dispatch
    let dispatch = rawDispatch;

    // Apply middleware chain from right to left
    // So the first middleware in the array is the outermost wrapper
    for (let i = chain.length - 1; i >= 0; i--) {
      dispatch = chain[i](dispatch);
    }

    return dispatch;
  }, [rawDispatch, ...middlewares]);

  // Handle circular reference: enhancedDispatch references itself
  // through storeAPI.dispatch. We use a ref to break the cycle.
  const dispatchRef = useRef(enhancedDispatch);
  dispatchRef.current = enhancedDispatch;

  const stableDispatch = useCallback(
    (action) => dispatchRef.current(action),
    []
  );

  return [state, stableDispatch];
}

// --- Built-in Middlewares ---

const loggerMiddleware = (store) => (next) => (action) => {
  console.group(
    typeof action === 'object' ? action.type : 'thunk'
  );
  console.log('prev state', store.getState());
  console.log('action', action);
  const result = next(action);
  console.log('next state', store.getState());
  console.groupEnd();
  return result;
};

const thunkMiddleware = (store) => (next) => (action) => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return next(action);
};

const persistMiddleware = (key) => (store) => (next) => (action) => {
  const result = next(action);
  try {
    localStorage.setItem(key, JSON.stringify(store.getState()));
  } catch (e) {
    console.warn('Persist failed:', e);
  }
  return result;
};

const asyncMiddleware = (store) => (next) => async (action) => {
  if (action.meta?.async) {
    store.dispatch({ type: action.type + '_PENDING' });
    try {
      const result = await action.payload;
      store.dispatch({
        type: action.type + '_FULFILLED',
        payload: result,
      });
    } catch (error) {
      store.dispatch({
        type: action.type + '_REJECTED',
        payload: error.message,
      });
    }
    return;
  }
  return next(action);
};`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useReducerWithMiddleware } from './implementation';

function counterReducer(state, action) {
  switch (action.type) {
    case 'INCREMENT': return { count: state.count + 1 };
    case 'DECREMENT': return { count: state.count - 1 };
    case 'SET': return { count: action.payload };
    default: return state;
  }
}

describe('useReducerWithMiddleware', () => {

  test('works as basic useReducer without middleware', () => {
    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 })
    );
    expect(result.current[0]).toEqual({ count: 0 });
    act(() => { result.current[1]({ type: 'INCREMENT' }); });
    expect(result.current[0]).toEqual({ count: 1 });
  });

  test('middleware can observe actions (logger pattern)', () => {
    const log = [];
    const loggerMiddleware = (store) => (next) => (action) => {
      log.push({ action: action.type, prevState: store.getState() });
      const result = next(action);
      log.push({ nextState: store.getState() });
      return result;
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 }, loggerMiddleware)
    );
    act(() => { result.current[1]({ type: 'INCREMENT' }); });
    expect(log.length).toBe(2);
    expect(log[0].action).toBe('INCREMENT');
  });

  test('middleware can transform actions', () => {
    const doubleMiddleware = (store) => (next) => (action) => {
      if (action.type === 'INCREMENT') {
        next(action);
        return next(action);
      }
      return next(action);
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 }, doubleMiddleware)
    );
    act(() => { result.current[1]({ type: 'INCREMENT' }); });
    expect(result.current[0]).toEqual({ count: 2 });
  });

  test('middleware can short-circuit (block) actions', () => {
    const blockMiddleware = (store) => (next) => (action) => {
      if (action.type === 'DECREMENT') return; // block
      return next(action);
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 5 }, blockMiddleware)
    );
    act(() => { result.current[1]({ type: 'DECREMENT' }); });
    expect(result.current[0]).toEqual({ count: 5 });
    act(() => { result.current[1]({ type: 'INCREMENT' }); });
    expect(result.current[0]).toEqual({ count: 6 });
  });

  test('multiple middlewares compose in order (first wraps outermost)', () => {
    const order = [];
    const mw1 = (store) => (next) => (action) => {
      order.push('mw1-before');
      const result = next(action);
      order.push('mw1-after');
      return result;
    };
    const mw2 = (store) => (next) => (action) => {
      order.push('mw2-before');
      const result = next(action);
      order.push('mw2-after');
      return result;
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 }, mw1, mw2)
    );
    act(() => { result.current[1]({ type: 'INCREMENT' }); });
    expect(order).toEqual(['mw1-before', 'mw2-before', 'mw2-after', 'mw1-after']);
  });

  test('thunk-like middleware enables function actions', () => {
    const thunkMiddleware = (store) => (next) => (action) => {
      if (typeof action === 'function') {
        return action(store.dispatch, store.getState);
      }
      return next(action);
    };

    const { result } = renderHook(() =>
      useReducerWithMiddleware(counterReducer, { count: 0 }, thunkMiddleware)
    );
    act(() => {
      result.current[1]((dispatch, getState) => {
        dispatch({ type: 'SET', payload: 42 });
      });
    });
    expect(result.current[0]).toEqual({ count: 42 });
  });
});`,
    keyPoints: [
      "The middleware signature (store) => (next) => (action) is a triple-nested closure — each layer captures different context. This currying pattern is identical to Redux middleware and enables composition",
      "Right-to-left composition means the first middleware in the array is the outermost wrapper — it sees the action first and the final state last. This matches Redux's applyMiddleware behavior exactly",
      "stateRef solves the stale closure problem — middleware needs to read current state, but the useReducer state is captured at render time. A ref always has the latest value",
      "thunkMiddleware checks if action is a function — if so, call it with dispatch+getState instead of passing to the reducer. This is redux-thunk in 4 lines",
      "The self-referencing dispatch (storeAPI.dispatch calls enhancedDispatch) enables middleware to dispatch new actions that also flow through the full middleware chain — this is how async patterns like sagas work",
    ],
    followUp:
      "How would you add middleware ordering/priority? How would you implement a saga-like pattern with generator functions? How does Zustand's middleware differ from Redux middleware architecturally?",
  },
  {
    id: 18,
    category: "Architecture",
    difficulty: "Expert",
    title: "Real-Time Collaborative State with Conflict Resolution",
    timeEstimate: "35 min",
    description:
      "Build a collaborative state hook where multiple users edit the same data simultaneously through WebSocket events. Implement a Last-Writer-Wins (LWW) register with vector clocks for conflict detection, an operation queue for offline support, and automatic reconnection with state reconciliation. This is a simplified version of the architecture used by Figma, Google Docs, and Linear.",
    realWorld:
      "Figma uses a custom CRDT-like system for real-time collaboration. Google Docs uses Operational Transform (OT). Linear, Notion, and Liveblocks implement LWW registers with vector clocks. Yjs and Automerge are popular CRDT libraries in the JS ecosystem. The local-first movement (Martin Kleppmann's work) has made this a hot topic — Figma's CTO Evan Wallace gave a widely-viewed talk on their approach. This is increasingly asked in senior/staff interviews at companies building collaborative products.",
    requirements: [
      "useCollaborativeState connects to a WebSocket and syncs state across clients",
      "Vector clocks for causality tracking — detect concurrent edits",
      "Last-Writer-Wins conflict resolution with field-level granularity",
      "Offline queue: buffer operations when disconnected, replay on reconnect",
      "Optimistic local updates with remote reconciliation",
    ],
    starterCode: `// Implement:
function useCollaborativeState({
  roomId,
  initialState,
  userId,
  wsUrl,
}) {
  // Returns: {
  //   state: T,                    // merged collaborative state
  //   update: (path, value) => void, // update a field
  //   peers: string[],             // connected peer IDs
  //   isConnected: boolean,
  //   pendingOps: number,          // unconfirmed local operations
  //   conflicts: Conflict[],       // detected concurrent edits
  // }
}

// Vector clock: { [userId]: number }
// Each user increments their counter on every operation
// Used to determine causal ordering:
//   - A happened-before B if A's clock <= B's clock for all users
//   - A and B are concurrent if neither happened-before the other

// Operation shape:
// {
//   userId: string,
//   path: string,         // e.g., 'title' or 'items.0.done'
//   value: any,
//   clock: VectorClock,
//   timestamp: number,    // wall clock for LWW tiebreaker
// }

// Usage:
// function CollaborativeDoc() {
//   const { state, update, peers, conflicts } = useCollaborativeState({
//     roomId: 'doc-123',
//     initialState: { title: '', body: '', color: 'blue' },
//     userId: 'user-randy',
//     wsUrl: 'wss://collab.example.com',
//   });
//
//   return (
//     <div>
//       <span>{peers.length} editing</span>
//       <input
//         value={state.title}
//         onChange={e => update('title', e.target.value)}
//       />
//       <textarea
//         value={state.body}
//         onChange={e => update('body', e.target.value)}
//       />
//     </div>
//   );
// }`,
    solutionCode: `// --- Vector Clock utilities ---
function createClock(userId) {
  return { [userId]: 0 };
}

function incrementClock(clock, userId) {
  return { ...clock, [userId]: (clock[userId] || 0) + 1 };
}

function mergeClock(a, b) {
  const result = { ...a };
  for (const [user, count] of Object.entries(b)) {
    result[user] = Math.max(result[user] || 0, count);
  }
  return result;
}

function happenedBefore(a, b) {
  // a happened before b if all of a's entries are <= b's
  // and at least one is strictly less
  let allLessOrEqual = true;
  let strictlyLess = false;
  for (const user of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const aVal = a[user] || 0;
    const bVal = b[user] || 0;
    if (aVal > bVal) allLessOrEqual = false;
    if (aVal < bVal) strictlyLess = true;
  }
  return allLessOrEqual && strictlyLess;
}

function areConcurrent(a, b) {
  return !happenedBefore(a, b) && !happenedBefore(b, a);
}

// --- Collaborative State Hook ---
function useCollaborativeState({ roomId, initialState, userId, wsUrl }) {
  const [state, setState] = useState(initialState);
  const [peers, setPeers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingOps, setPendingOps] = useState(0);
  const [conflicts, setConflicts] = useState([]);

  const clockRef = useRef(createClock(userId));
  const stateRef = useRef(initialState);
  const queueRef = useRef([]); // offline operation queue
  const wsRef = useRef(null);

  // Deep set by path
  const setPath = (obj, path, value) => {
    const result = structuredClone(obj);
    const keys = path.split('.');
    let target = result;
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    return result;
  };

  const getPath = (obj, path) =>
    path.split('.').reduce((o, k) => o?.[k], obj);

  // Apply a remote operation with conflict detection
  const applyOp = useCallback((op) => {
    const localClock = clockRef.current;

    if (areConcurrent(op.clock, localClock)) {
      // Concurrent edit detected!
      const localValue = getPath(stateRef.current, op.path);

      // LWW: higher timestamp wins
      if (op.timestamp > Date.now() - 1000) {
        // Remote wins (newer) — apply it
        setConflicts(prev => [...prev, {
          path: op.path,
          localValue,
          remoteValue: op.value,
          winner: 'remote',
          resolvedAt: Date.now(),
        }]);
      } else {
        // Local wins — ignore remote
        setConflicts(prev => [...prev, {
          path: op.path,
          localValue,
          remoteValue: op.value,
          winner: 'local',
          resolvedAt: Date.now(),
        }]);
        return; // don't apply
      }
    }

    // Apply the operation
    const newState = setPath(stateRef.current, op.path, op.value);
    stateRef.current = newState;
    setState(newState);

    // Merge clocks
    clockRef.current = mergeClock(clockRef.current, op.clock);
  }, []);

  // Local update
  const update = useCallback((path, value) => {
    // Increment our clock
    clockRef.current = incrementClock(clockRef.current, userId);

    const op = {
      userId,
      path,
      value,
      clock: { ...clockRef.current },
      timestamp: Date.now(),
      roomId,
    };

    // Optimistic local update
    const newState = setPath(stateRef.current, path, value);
    stateRef.current = newState;
    setState(newState);

    // Send or queue
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'op', ...op }));
    } else {
      queueRef.current.push(op);
      setPendingOps(prev => prev + 1);
    }
  }, [userId, roomId]);

  // WebSocket connection with reconnection
  useEffect(() => {
    let reconnectTimer;
    let ws;

    function connect() {
      ws = new WebSocket(\`\${wsUrl}?room=\${roomId}&user=\${userId}\`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Flush offline queue
        while (queueRef.current.length > 0) {
          const op = queueRef.current.shift();
          ws.send(JSON.stringify({ type: 'op', ...op }));
        }
        setPendingOps(0);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'op':
            if (msg.userId !== userId) applyOp(msg);
            break;
          case 'peers':
            setPeers(msg.peers.filter(p => p !== userId));
            break;
          case 'sync':
            // Full state sync on reconnect
            stateRef.current = msg.state;
            setState(msg.state);
            clockRef.current = msg.clock;
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect with exponential backoff
        reconnectTimer = setTimeout(connect, 2000 + Math.random() * 1000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [roomId, userId, wsUrl, applyOp]);

  return { state, update, peers, isConnected, pendingOps, conflicts };
}`,
    testCode: `import { createClock, incrementClock, mergeClock, happenedBefore, areConcurrent } from './implementation';

describe('Vector Clock Utilities', () => {

  test('createClock initializes a clock for a user with count 0', () => {
    const clock = createClock('alice');
    expect(clock).toEqual({ alice: 0 });
  });

  test('incrementClock increments the specified user counter', () => {
    const clock = createClock('alice');
    const next = incrementClock(clock, 'alice');
    expect(next.alice).toBe(1);
    const next2 = incrementClock(next, 'alice');
    expect(next2.alice).toBe(2);
  });

  test('incrementClock initializes counter for new user', () => {
    const clock = { alice: 3 };
    const next = incrementClock(clock, 'bob');
    expect(next.bob).toBe(1);
    expect(next.alice).toBe(3);
  });

  test('incrementClock does not mutate original clock', () => {
    const clock = { alice: 1 };
    incrementClock(clock, 'alice');
    expect(clock.alice).toBe(1);
  });

  test('mergeClock takes max of each user counter', () => {
    const a = { alice: 3, bob: 2 };
    const b = { alice: 1, bob: 5, carol: 1 };
    const merged = mergeClock(a, b);
    expect(merged.alice).toBe(3);
    expect(merged.bob).toBe(5);
    expect(merged.carol).toBe(1);
  });

  test('happenedBefore returns true when a strictly precedes b', () => {
    const a = { alice: 1, bob: 1 };
    const b = { alice: 2, bob: 2 };
    expect(happenedBefore(a, b)).toBe(true);
    expect(happenedBefore(b, a)).toBe(false);
  });

  test('happenedBefore returns false for identical clocks', () => {
    const a = { alice: 2, bob: 3 };
    const b = { alice: 2, bob: 3 };
    expect(happenedBefore(a, b)).toBe(false);
  });

  test('areConcurrent detects concurrent edits', () => {
    const a = { alice: 3, bob: 2 };
    const b = { alice: 2, bob: 4 };
    expect(areConcurrent(a, b)).toBe(true);
  });

  test('areConcurrent returns false when one happened before the other', () => {
    const a = { alice: 1, bob: 1 };
    const b = { alice: 2, bob: 2 };
    expect(areConcurrent(a, b)).toBe(false);
  });
});`,
    keyPoints: [
      "Vector clocks track causality: if Alice's clock is {alice:3, bob:2} and Bob's is {alice:2, bob:4}, their edits are concurrent — neither fully 'happened before' the other. This is how distributed systems detect conflicts without a central server",
      "Last-Writer-Wins (LWW) with field-level granularity means concurrent edits to DIFFERENT fields both apply, but concurrent edits to the SAME field use timestamp as tiebreaker. This is simpler than OT or CRDTs but works well for most collaborative UIs",
      "The offline queue pattern: buffer operations while disconnected, replay them on reconnect. The server can then determine final ordering. This is the same pattern Linear and Notion use for offline-first editing",
      "Optimistic local updates with remote reconciliation: local changes apply instantly, remote operations merge in via applyOp. If a conflict arises, the resolution is deterministic (same algorithm on all clients)",
      "Auto-reconnection with jitter (Math.random()) prevents thundering herd — when a server restarts, all clients reconnecting at exactly the same time would overwhelm it. Adding randomized delay spreads the load",
    ],
    followUp:
      "How would you implement Operational Transform instead of LWW for text editing? How do CRDTs (Yjs, Automerge) differ from this approach? How would you add presence indicators (cursors, selections) using the same WebSocket? How does Figma's approach differ from Google Docs'?",
  },
  {
    id: 19,
    category: "Architecture",
    difficulty: "Expert",
    title: "Custom React Reconciler (Mini Renderer)",
    timeEstimate: "35 min",
    description:
      "Build a minimal custom React renderer using the `react-reconciler` package that targets an in-memory tree (like rendering to Canvas, terminal, or PDF). Implement the host config methods (createInstance, appendChild, removeChild, commitUpdate) so that standard React components with state, effects, and context render into your custom target. This demonstrates deep understanding of React's architecture — the separation between reconciliation (diffing) and rendering (committing).",
    realWorld:
      "React Native, React Three Fiber (3D), Ink (terminal), react-pdf, and react-figma are all custom React renderers built on react-reconciler. The React team's official repo documents this package. Nitin Tulswani's 'Making a custom React renderer' tutorial series is the canonical guide. Vadim Demedes (Ink creator) built 'reconciled' as a simplified wrapper. Understanding the reconciler is what separates senior engineers who USE React from those who truly UNDERSTAND React's architecture.",
    requirements: [
      "Implement a HostConfig for react-reconciler targeting an in-memory tree",
      "createInstance, createTextInstance, appendChild, removeChild, insertBefore",
      "commitUpdate to handle prop changes on existing nodes",
      "Support React features: useState, useEffect, context, children",
      "render(element, container) function that returns the serialized tree",
    ],
    starterCode: `// Implement a React renderer that outputs to an in-memory tree structure
// This is the same architecture as React Native, Ink, react-three-fiber

import Reconciler from 'react-reconciler';

// Your "host environment" — like the DOM is for react-dom
// but this is a simple in-memory tree
class TreeNode {
  constructor(type, props) {
    this.type = type;
    this.props = props;
    this.children = [];
    this.parent = null;
    this.text = null;
  }
}

// Implement the host config — these are the methods React calls
// to create, update, and manage your host environment
const hostConfig = {
  // CREATION
  createInstance(type, props, rootContainer, hostContext, fiber) {
    // Create a new TreeNode for host elements like <box>, <text>
  },
  createTextInstance(text, rootContainer, hostContext, fiber) {
    // Create a node for raw text content
  },

  // TREE OPERATIONS
  appendChild(parent, child) {},
  appendChildToContainer(container, child) {},
  insertBefore(parent, child, beforeChild) {},
  removeChild(parent, child) {},
  removeChildFromContainer(container, child) {},

  // UPDATES
  prepareUpdate(instance, type, oldProps, newProps) {
    // Return a diff/payload if props changed, null if no update needed
  },
  commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    // Apply the diff to the instance
  },
  commitTextUpdate(textInstance, oldText, newText) {},

  // REQUIRED STUBS
  supportsMutation: true,
  getRootHostContext() { return {}; },
  getChildHostContext() { return {}; },
  shouldSetTextContent(type, props) { return false; },
  finalizeInitialChildren() { return false; },
  prepareForCommit() { return null; },
  resetAfterCommit(container) {},
  getPublicInstance(instance) { return instance; },
  clearContainer(container) {},
};

// Create the reconciler and render function
// const reconciler = Reconciler(hostConfig);
// function render(element, container) { ... }
//
// Usage:
// const container = new TreeNode('root', {});
// render(
//   <box layout="vertical" padding={10}>
//     <text bold>Hello World</text>
//     <text color="blue">Rendered by custom reconciler!</text>
//   </box>,
//   container
// );
// console.log(serialize(container));
// // → { type: 'root', children: [
// //     { type: 'box', props: { layout: 'vertical', padding: 10 },
// //       children: [
// //         { type: 'text', props: { bold: true }, children: ['Hello World'] },
// //         { type: 'text', props: { color: 'blue' }, children: ['Rendered by...'] }
// //       ]
// //     }
// //   ]}`,
    solutionCode: `class TreeNode {
  constructor(type, props = {}) {
    this.type = type;
    this.props = { ...props };
    this.children = [];
    this.parent = null;
    this.text = null;
    delete this.props.children; // managed by React
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  insertBefore(child, beforeChild) {
    child.parent = this;
    const idx = this.children.indexOf(beforeChild);
    if (idx !== -1) {
      this.children.splice(idx, 0, child);
    } else {
      this.children.push(child);
    }
  }

  serialize() {
    if (this.text !== null) return this.text;
    return {
      type: this.type,
      props: Object.keys(this.props).length > 0 ? this.props : undefined,
      children: this.children.length > 0
        ? this.children.map(c => c.serialize())
        : undefined,
    };
  }
}

const hostConfig = {
  supportsMutation: true,

  createInstance(type, props) {
    return new TreeNode(type, props);
  },

  createTextInstance(text) {
    const node = new TreeNode('#text');
    node.text = text;
    return node;
  },

  appendChild(parent, child) { parent.appendChild(child); },
  appendChildToContainer(container, child) { container.appendChild(child); },
  insertBefore(parent, child, before) { parent.insertBefore(child, before); },
  insertInContainerBefore(container, child, before) {
    container.insertBefore(child, before);
  },
  removeChild(parent, child) { parent.removeChild(child); },
  removeChildFromContainer(container, child) { container.removeChild(child); },

  prepareUpdate(instance, type, oldProps, newProps) {
    const diff = {};
    let hasChanges = false;

    // Check for changed/new props
    for (const key of Object.keys(newProps)) {
      if (key === 'children') continue;
      if (!Object.is(oldProps[key], newProps[key])) {
        diff[key] = newProps[key];
        hasChanges = true;
      }
    }
    // Check for removed props
    for (const key of Object.keys(oldProps)) {
      if (key === 'children') continue;
      if (!(key in newProps)) {
        diff[key] = undefined;
        hasChanges = true;
      }
    }
    return hasChanges ? diff : null;
  },

  commitUpdate(instance, updatePayload) {
    for (const [key, value] of Object.entries(updatePayload)) {
      if (value === undefined) delete instance.props[key];
      else instance.props[key] = value;
    }
  },

  commitTextUpdate(textInstance, oldText, newText) {
    textInstance.text = newText;
  },

  getRootHostContext() { return {}; },
  getChildHostContext(parentCtx) { return parentCtx; },
  shouldSetTextContent() { return false; },
  finalizeInitialChildren() { return false; },
  prepareForCommit() { return null; },
  resetAfterCommit(container) {
    // This fires after every commit — use it to trigger
    // re-renders to your actual target (canvas, terminal, etc.)
    if (container._onCommit) container._onCommit(container);
  },
  getPublicInstance(instance) { return instance; },
  clearContainer(container) { container.children = []; },
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  isPrimaryRenderer: true,
  getCurrentEventPriority: () => 99, /* DefaultEventPriority */
  supportsPersistence: false,
  supportsHydration: false,
  preparePortalMount() {},
  getInstanceFromNode() { return null; },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() { return null; },
  detachDeletedInstance() {},
};

const reconciler = Reconciler(hostConfig);

function render(element, container, callback) {
  // Create a root fiber — this is what ReactDOM.createRoot does
  if (!container._rootFiber) {
    container._rootFiber = reconciler.createContainer(
      container,  // containerInfo
      0,          // tag (LegacyRoot = 0)
      null,       // hydrationCallbacks
      false,      // isStrictMode
      null,       // concurrentUpdatesByDefaultOverride
      '',         // identifierPrefix
      (err) => console.error(err), // onRecoverableError
      null,       // transitionCallbacks
    );
  }

  // Schedule an update on the root fiber
  reconciler.updateContainer(element, container._rootFiber, null, callback);
  return container;
}`,
    testCode: `import { TreeNode } from './implementation';

describe('TreeNode', () => {

  test('constructor sets type and props', () => {
    const node = new TreeNode('box', { padding: 10 });
    expect(node.type).toBe('box');
    expect(node.props.padding).toBe(10);
    expect(node.children).toEqual([]);
    expect(node.parent).toBeNull();
  });

  test('constructor strips children from props', () => {
    const node = new TreeNode('box', { children: ['a', 'b'], color: 'red' });
    expect(node.props.children).toBeUndefined();
    expect(node.props.color).toBe('red');
  });

  test('appendChild adds child and sets parent', () => {
    const parent = new TreeNode('root', {});
    const child = new TreeNode('text', {});
    parent.appendChild(child);
    expect(parent.children).toContain(child);
    expect(child.parent).toBe(parent);
  });

  test('removeChild removes child and clears parent', () => {
    const parent = new TreeNode('root', {});
    const child = new TreeNode('text', {});
    parent.appendChild(child);
    parent.removeChild(child);
    expect(parent.children).not.toContain(child);
    expect(child.parent).toBeNull();
  });

  test('insertBefore places child before the specified sibling', () => {
    const parent = new TreeNode('root', {});
    const a = new TreeNode('a', {});
    const b = new TreeNode('b', {});
    const c = new TreeNode('c', {});
    parent.appendChild(a);
    parent.appendChild(c);
    parent.insertBefore(b, c);
    expect(parent.children[0]).toBe(a);
    expect(parent.children[1]).toBe(b);
    expect(parent.children[2]).toBe(c);
    expect(b.parent).toBe(parent);
  });

  test('insertBefore appends if beforeChild is not found', () => {
    const parent = new TreeNode('root', {});
    const a = new TreeNode('a', {});
    const orphan = new TreeNode('orphan', {});
    const newChild = new TreeNode('new', {});
    parent.appendChild(a);
    parent.insertBefore(newChild, orphan);
    expect(parent.children[parent.children.length - 1]).toBe(newChild);
  });

  test('serialize produces correct tree structure', () => {
    const root = new TreeNode('root', {});
    const box = new TreeNode('box', { padding: 5 });
    const text = new TreeNode('#text', {});
    text.text = 'Hello';
    box.appendChild(text);
    root.appendChild(box);
    const serialized = root.serialize();
    expect(serialized.type).toBe('root');
    expect(serialized.children[0].type).toBe('box');
    expect(serialized.children[0].props.padding).toBe(5);
    expect(serialized.children[0].children[0]).toBe('Hello');
  });

  test('serialize returns text string for text nodes', () => {
    const node = new TreeNode('#text', {});
    node.text = 'world';
    expect(node.serialize()).toBe('world');
  });
});`,
    keyPoints: [
      "The host config is the contract between React's reconciler and your target environment. createInstance is your 'document.createElement', appendChild is your 'node.appendChild'. React calls these during the commit phase",
      "prepareUpdate returns a diff object (or null for no changes) — this is the optimization that prevents unnecessary mutations. commitUpdate then applies only the diff, not a full replacement",
      "resetAfterCommit fires after every batch of mutations — this is where real renderers trigger actual output (Ink redraws the terminal, react-three-fiber triggers a canvas render)",
      "The reconciler handles ALL of React's features (hooks, context, Suspense, concurrent rendering) — your host config only handles the 'last mile' of turning React's decisions into your target format",
      "This is the same architecture pattern used by React Native (bridge to native views), react-three-fiber (bridge to Three.js scene graph), and Ink (bridge to terminal ANSI output)",
    ],
    followUp:
      "How would you add event handling to your renderer (onClick, onHover)? How would you implement partial updates for a Canvas renderer (only redraw changed regions)? How does React Three Fiber handle the Three.js scene graph as a render target?",
  },
  {
    id: 20,
    category: "Architecture",
    difficulty: "Expert",
    title: "Server-Driven UI Renderer",
    timeEstimate: "30 min",
    description:
      "Build a Server-Driven UI (SDUI) system where the server sends a JSON descriptor of the entire page layout, and the React client dynamically renders it using a component registry. Support layout components (Stack, Grid), action handlers (navigation, API calls), conditional rendering based on user data, and graceful fallbacks for unknown component types. This is the architecture Airbnb's Ghost Platform, Instagram, and Shopify use to ship UI changes without app updates.",
    realWorld:
      "Airbnb's Ghost Platform (detailed in their engineering blog) powers the majority of their app's screens using SDUI. Instagram, Uber (10x feature velocity), Lyft, Spotify, and DoorDash all use server-driven UI. Facebook Messenger's Project Lightspeed used SDUI to massively reduce their codebase. The Dec 2025 article 'What Airbnb, Netflix, and Lyft Learned Building Dynamic Mobile Experiences' documents the state of the art. Shopify uses SDUI for their storefront builder. This pattern is critical for A/B testing, personalization, and cross-platform consistency.",
    requirements: [
      "Component registry: map string types to React components",
      "Recursive rendering: components can contain children descriptors",
      "Action system: handle navigation, API calls, analytics events from server config",
      "Graceful degradation: unknown component types render a fallback, never crash",
      "Conditional rendering: show/hide components based on user data or feature flags",
    ],
    starterCode: `// Implement:
function createSDUIRenderer(registry) {
  // registry: { [typeName]: React.ComponentType }
  //
  // Returns: {
  //   SDUIRoot: React component that renders a full SDUI response,
  //   registerComponent: (name, component) => void,
  //   ActionProvider: context provider for action handlers,
  // }
}

// Server response shape:
// {
//   screen: {
//     type: 'ScrollView',
//     props: { padding: 16 },
//     children: [
//       {
//         type: 'Hero',
//         props: { title: 'Welcome', imageUrl: '...' },
//         conditions: [{ field: 'user.isPro', equals: true }],
//       },
//       {
//         type: 'ProductGrid',
//         props: { columns: 2 },
//         children: [
//           {
//             type: 'ProductCard',
//             props: { name: 'Widget', price: 29.99 },
//             actions: {
//               onPress: { type: 'navigate', route: '/product/123' },
//               onAddToCart: { type: 'api', endpoint: '/cart/add', body: { id: 123 } },
//             },
//           },
//         ],
//       },
//       {
//         type: 'UnknownFutureComponent',  // client doesn't know this yet
//         props: { data: '...' },
//         fallback: { type: 'Text', props: { text: 'Update app for new feature' } },
//       },
//     ],
//   },
// }

// Usage:
// const { SDUIRoot, registerComponent, ActionProvider } = createSDUIRenderer({
//   ScrollView: ScrollViewComponent,
//   Hero: HeroComponent,
//   ProductGrid: ProductGridComponent,
//   ProductCard: ProductCardComponent,
//   Text: TextComponent,
// });
//
// <ActionProvider handlers={{ navigate: router.push, api: apiClient.post }}>
//   <SDUIRoot response={serverResponse} userData={user} />
// </ActionProvider>`,
    solutionCode: `const ActionContext = createContext(null);

function createSDUIRenderer(initialRegistry = {}) {
  const registry = new Map(Object.entries(initialRegistry));

  function registerComponent(name, component) {
    registry.set(name, component);
  }

  // Evaluate conditions against user data
  function evaluateConditions(conditions, userData) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = condition.field.split('.').reduce(
        (obj, key) => obj?.[key], userData
      );

      if ('equals' in condition) return value === condition.equals;
      if ('notEquals' in condition) return value !== condition.notEquals;
      if ('in' in condition) return condition.in.includes(value);
      if ('exists' in condition) return condition.exists ? value != null : value == null;
      if ('gt' in condition) return value > condition.gt;
      if ('lt' in condition) return value < condition.lt;
      return true;
    });
  }

  // Wrap actions into callable functions
  function useActions(actionMap) {
    const handlers = useContext(ActionContext);

    return useMemo(() => {
      if (!actionMap || !handlers) return {};

      const bound = {};
      for (const [eventName, action] of Object.entries(actionMap)) {
        bound[eventName] = async (...args) => {
          try {
            const handler = handlers[action.type];
            if (!handler) {
              console.warn('No handler for action type:', action.type);
              return;
            }

            // Pass the full action config to the handler
            await handler(action, ...args);

            // Fire analytics if specified
            if (action.analytics && handlers.track) {
              handlers.track(action.analytics);
            }
          } catch (error) {
            console.error('SDUI action error:', error);
            if (action.onError && handlers[action.onError.type]) {
              handlers[action.onError.type](action.onError);
            }
          }
        };
      }
      return bound;
    }, [actionMap, handlers]);
  }

  // The recursive renderer — the heart of SDUI
  function SDUINode({ descriptor, userData }) {
    // Check conditions
    if (!evaluateConditions(descriptor.conditions, userData)) {
      return null;
    }

    // Look up component in registry
    let Component = registry.get(descriptor.type);

    // Unknown component — use fallback or default
    if (!Component) {
      if (descriptor.fallback) {
        return <SDUINode descriptor={descriptor.fallback} userData={userData} />;
      }
      // Never crash on unknown types — log and skip
      console.warn('Unknown SDUI component:', descriptor.type);
      return null;
    }

    // Bind actions to event handlers
    const actions = useActions(descriptor.actions);

    // Recursively render children
    const children = descriptor.children?.map((child, index) => (
      <SDUINode
        key={child.key || child.id || index}
        descriptor={child}
        userData={userData}
      />
    ));

    // Merge props + bound actions
    const props = {
      ...descriptor.props,
      ...actions,
      ...(descriptor.style ? { style: descriptor.style } : {}),
    };

    return (
      <ErrorBoundary fallback={
        descriptor.fallback
          ? <SDUINode descriptor={descriptor.fallback} userData={userData} />
          : null
      }>
        <Component {...props}>
          {children}
        </Component>
      </ErrorBoundary>
    );
  }

  function SDUIRoot({ response, userData = {} }) {
    if (!response?.screen) return null;
    return <SDUINode descriptor={response.screen} userData={userData} />;
  }

  function ActionProvider({ handlers, children }) {
    const value = useMemo(() => handlers, [handlers]);
    return (
      <ActionContext.Provider value={value}>
        {children}
      </ActionContext.Provider>
    );
  }

  return { SDUIRoot, registerComponent, ActionProvider, SDUINode };
}

// Simple ErrorBoundary for per-component isolation
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    console.error('SDUI component error:', error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}`,
    testCode: `import React from 'react';
import { render, screen } from '@testing-library/react';
import { createSDUIRenderer, evaluateConditions } from './implementation';

describe('evaluateConditions', () => {

  test('returns true when conditions is null or empty', () => {
    expect(evaluateConditions(null, {})).toBe(true);
    expect(evaluateConditions([], {})).toBe(true);
    expect(evaluateConditions(undefined, {})).toBe(true);
  });

  test('equals condition matches value', () => {
    const conditions = [{ field: 'user.isPro', equals: true }];
    expect(evaluateConditions(conditions, { user: { isPro: true } })).toBe(true);
    expect(evaluateConditions(conditions, { user: { isPro: false } })).toBe(false);
  });

  test('notEquals condition works', () => {
    const conditions = [{ field: 'status', notEquals: 'banned' }];
    expect(evaluateConditions(conditions, { status: 'active' })).toBe(true);
    expect(evaluateConditions(conditions, { status: 'banned' })).toBe(false);
  });

  test('in condition checks array membership', () => {
    const conditions = [{ field: 'role', in: ['admin', 'editor'] }];
    expect(evaluateConditions(conditions, { role: 'admin' })).toBe(true);
    expect(evaluateConditions(conditions, { role: 'viewer' })).toBe(false);
  });

  test('exists condition checks for presence', () => {
    const conditions = [{ field: 'profile.avatar', exists: true }];
    expect(evaluateConditions(conditions, { profile: { avatar: 'url' } })).toBe(true);
    expect(evaluateConditions(conditions, { profile: {} })).toBe(false);
  });

  test('multiple conditions are ANDed together', () => {
    const conditions = [
      { field: 'age', gt: 18 },
      { field: 'role', equals: 'member' },
    ];
    expect(evaluateConditions(conditions, { age: 25, role: 'member' })).toBe(true);
    expect(evaluateConditions(conditions, { age: 25, role: 'guest' })).toBe(false);
    expect(evaluateConditions(conditions, { age: 16, role: 'member' })).toBe(false);
  });
});

describe('createSDUIRenderer', () => {

  test('renders registered components from descriptor', () => {
    const Text = ({ text }) => <span data-testid="text">{text}</span>;
    const { SDUIRoot, ActionProvider } = createSDUIRenderer({ Text });

    const response = {
      screen: { type: 'Text', props: { text: 'Hello' } },
    };

    render(
      <ActionProvider handlers={{}}>
        <SDUIRoot response={response} userData={{}} />
      </ActionProvider>
    );
    expect(screen.getByTestId('text').textContent).toBe('Hello');
  });

  test('renders fallback for unknown component types', () => {
    const Text = ({ text }) => <span data-testid="fallback-text">{text}</span>;
    const { SDUIRoot, ActionProvider } = createSDUIRenderer({ Text });

    const response = {
      screen: {
        type: 'UnknownWidget',
        props: {},
        fallback: { type: 'Text', props: { text: 'Fallback shown' } },
      },
    };

    render(
      <ActionProvider handlers={{}}>
        <SDUIRoot response={response} userData={{}} />
      </ActionProvider>
    );
    expect(screen.getByTestId('fallback-text').textContent).toBe('Fallback shown');
  });
});`,
    keyPoints: [
      "The component registry (Map<string, Component>) is the bridge between server descriptors and React components — this is exactly how Airbnb's Ghost Platform resolves SectionComponentType to renderers",
      "Recursive rendering (SDUINode renders children as SDUINodes) enables arbitrarily nested layouts from a flat JSON response — the server controls the entire component tree depth",
      "Graceful degradation (never crash on unknown types) is a MUST — Airbnb's Dec 2025 best practices emphasize 'never crash on unknown components, always log for analytics'. Old app versions will receive new component types they don't understand",
      "The action system (navigate, api, track) decouples behavior from components — the server says WHAT happens (navigate to /product/123), the client decides HOW (router.push, deep link, etc.)",
      "ErrorBoundary per component prevents one broken component from crashing the entire screen — this is how Instagram and Airbnb isolate failures in their SDUI systems",
    ],
    followUp:
      "How would you add versioning so the server knows which components each client version supports? How would you implement lazy loading for components not in the initial bundle? How does this pattern interact with React Server Components?",
  },
  {
    id: 22,
    category: "Architecture",
    difficulty: "Expert",
    title: "Resilient Error Boundary with Retry and Recovery",
    timeEstimate: "25 min",
    description:
      "Build a production-grade ErrorBoundary that goes beyond React's basic getDerivedStateFromError. Support: automatic retry with exponential backoff, manual retry via reset callback, error reporting to monitoring services, fallback component props (pass error + retry to fallback), granular recovery (reset only the failed subtree), and error deduplication to prevent flood-reporting the same error.",
    realWorld:
      "Every production React app needs error boundaries. React's docs recommend them at route boundaries and around feature modules. Sentry's React SDK wraps ErrorBoundary with automatic error reporting. react-error-boundary (by Brian Vaughn, ex-React core team) is the most popular implementation with 4M+ weekly npm downloads. Facebook Messenger wraps each conversation panel in an independent error boundary. Next.js has built-in error.js boundary files. Vercel, Shopify, and Stripe all use multi-layered error boundary strategies.",
    requirements: [
      "Catch render errors AND event handler errors (via error event listener)",
      "Automatic retry with configurable exponential backoff and max attempts",
      "Manual retry: pass resetErrorBoundary to fallback component",
      "Error reporting hook: onError callback with error, errorInfo, and componentStack",
      "Error deduplication: don't report the same error multiple times within a window",
    ],
    starterCode: `// Implement:
// <ErrorBoundary
//   fallback={({ error, resetErrorBoundary, retryCount }) => (
//     <div>
//       <h2>Something went wrong</h2>
//       <pre>{error.message}</pre>
//       <button onClick={resetErrorBoundary}>Try Again</button>
//       <span>Retry {retryCount}/3</span>
//     </div>
//   )}
//   onError={(error, info) => Sentry.captureException(error)}
//   maxRetries={3}
//   retryDelay={(attempt) => Math.min(1000 * 2 ** attempt, 10000)}
//   resetKeys={[userId]}  // reset when these values change
// >
//   <UserProfile />
// </ErrorBoundary>

// Also implement a hook for catching async errors:
// function useErrorBoundary() {
//   // Returns: { showBoundary: (error) => void }
//   // Allows event handlers and async code to trigger
//   // the nearest error boundary
// }

// And a utility for nested boundaries:
// <ErrorBoundary fallback={<AppCrashScreen />}>
//   <Header />
//   <ErrorBoundary fallback={<FeatureError />}>
//     <DashboardWidget />
//   </ErrorBoundary>
//   <ErrorBoundary fallback={<FeatureError />}>
//     <ChatWidget />
//   </ErrorBoundary>
// </ErrorBoundary>`,
    solutionCode: `const ErrorBoundaryContext = createContext(null);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      retryCount: 0,
      retryTimer: null,
    };
    this.reportedErrors = new Set(); // deduplication
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
    this.handleWindowError = this.handleWindowError.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Deduplicate: don't report same error message within window
    const errorKey = error.message + (errorInfo?.componentStack?.slice(0, 200) || '');
    if (!this.reportedErrors.has(errorKey)) {
      this.reportedErrors.add(errorKey);

      // Clear dedup after 60s
      setTimeout(() => this.reportedErrors.delete(errorKey), 60000);

      // Report to monitoring
      this.props.onError?.(error, {
        componentStack: errorInfo?.componentStack,
        retryCount: this.state.retryCount,
        timestamp: Date.now(),
      });
    }

    // Auto-retry with exponential backoff
    this.scheduleRetry();
  }

  componentDidUpdate(prevProps) {
    // Reset when resetKeys change (e.g., route change, user change)
    if (this.state.error && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currKeys = this.props.resetKeys || [];
      const hasChanged = currKeys.some((key, i) => !Object.is(key, prevKeys[i]));
      if (hasChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.state.retryTimer) clearTimeout(this.state.retryTimer);
    window.removeEventListener('error', this.handleWindowError);
  }

  componentDidMount() {
    // Optionally catch unhandled errors in event handlers
    if (this.props.catchWindowErrors) {
      window.addEventListener('error', this.handleWindowError);
    }
  }

  handleWindowError(event) {
    // Only catch if it originated from our subtree
    // (simplified — production would check DOM containment)
    if (this.props.catchWindowErrors) {
      this.setState({ error: event.error || new Error(event.message) });
    }
  }

  scheduleRetry() {
    const maxRetries = this.props.maxRetries ?? 0;
    const retryCount = this.state.retryCount;

    if (maxRetries > 0 && retryCount < maxRetries) {
      const delayFn = this.props.retryDelay ||
        ((attempt) => Math.min(1000 * Math.pow(2, attempt), 10000));
      const delay = delayFn(retryCount);

      const timer = setTimeout(() => {
        this.setState(prev => ({
          error: null,
          errorInfo: null,
          retryCount: prev.retryCount + 1,
          retryTimer: null,
        }));
      }, delay);

      this.setState({ retryTimer: timer });
    }
  }

  resetErrorBoundary() {
    if (this.state.retryTimer) clearTimeout(this.state.retryTimer);
    this.setState({
      error: null,
      errorInfo: null,
      retryCount: 0,
      retryTimer: null,
    });
    this.props.onReset?.({
      reason: 'manual',
      retryCount: this.state.retryCount,
    });
  }

  render() {
    const { error, retryCount } = this.state;
    const contextValue = {
      showBoundary: (err) => this.setState({ error: err }),
      resetBoundary: this.resetErrorBoundary,
    };

    if (error) {
      const { fallback: Fallback } = this.props;

      if (typeof Fallback === 'function') {
        return (
          <ErrorBoundaryContext.Provider value={contextValue}>
            <Fallback
              error={error}
              resetErrorBoundary={this.resetErrorBoundary}
              retryCount={retryCount}
            />
          </ErrorBoundaryContext.Provider>
        );
      }
      return Fallback || null;
    }

    return (
      <ErrorBoundaryContext.Provider value={contextValue}>
        {this.props.children}
      </ErrorBoundaryContext.Provider>
    );
  }
}

// Hook: allows async/event code to trigger nearest boundary
function useErrorBoundary() {
  const ctx = useContext(ErrorBoundaryContext);
  if (!ctx) {
    throw new Error('useErrorBoundary must be inside an ErrorBoundary');
  }
  return {
    showBoundary: ctx.showBoundary,
    resetBoundary: ctx.resetBoundary,
  };
}`,
    testCode: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, useErrorBoundary } from './implementation';

function ThrowingChild({ shouldThrow = true }) {
  if (shouldThrow) throw new Error('Test error');
  return <div data-testid="child">OK</div>;
}

describe('ErrorBoundary', () => {

  // Suppress console.error for expected errors
  const origError = console.error;
  beforeAll(() => { console.error = jest.fn(); });
  afterAll(() => { console.error = origError; });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary fallback={() => <div>Error</div>}>
        <div data-testid="content">Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('content').textContent).toBe('Hello');
  });

  test('renders fallback when child throws', () => {
    render(
      <ErrorBoundary fallback={({ error }) => <div data-testid="fallback">{error.message}</div>}>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('fallback').textContent).toBe('Test error');
  });

  test('fallback receives resetErrorBoundary function', () => {
    render(
      <ErrorBoundary fallback={({ resetErrorBoundary }) => (
        <button data-testid="retry" onClick={resetErrorBoundary}>Retry</button>
      )}>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('retry')).toBeTruthy();
  });

  test('fallback receives retryCount', () => {
    render(
      <ErrorBoundary fallback={({ retryCount }) => (
        <div data-testid="count">{retryCount}</div>
      )}>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('count')).toBeTruthy();
  });

  test('calls onError callback when child throws', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary fallback={() => <div>Error</div>} onError={onError}>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('Test error');
  });

  test('nested error boundaries isolate failures', () => {
    render(
      <ErrorBoundary fallback={() => <div data-testid="outer-fallback">Outer Error</div>}>
        <div data-testid="sibling">Sibling OK</div>
        <ErrorBoundary fallback={() => <div data-testid="inner-fallback">Inner Error</div>}>
          <ThrowingChild />
        </ErrorBoundary>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('inner-fallback').textContent).toBe('Inner Error');
    expect(screen.getByTestId('sibling').textContent).toBe('Sibling OK');
  });
});`,
    keyPoints: [
      "ErrorBoundaries MUST be class components — React only exposes getDerivedStateFromError and componentDidCatch for classes. There is no hook equivalent. This is one of the last valid uses of class components in React",
      "resetKeys pattern (reset when external values change) is from react-error-boundary — when a user navigates to a new route, the boundary should auto-clear rather than showing a stale error",
      "useErrorBoundary hook bridges async code to the boundary — React's error boundaries only catch synchronous render errors. Event handlers and promises need to manually trigger the boundary via context",
      "Error deduplication (Set with TTL) prevents flooding Sentry/monitoring when a component error-loops during retries — without this, auto-retry can generate thousands of duplicate reports",
      "Exponential backoff (1s, 2s, 4s, 8s, capped at 10s) is the standard retry pattern — it prevents overwhelming a failing backend while giving transient errors time to resolve",
    ],
    followUp:
      "How would you add a global error boundary that catches unhandled promise rejections? How does Next.js error.js work under the hood? How would you implement error boundary analytics (which components fail most, recovery rate)?",
  },
  {
    id: 24,
    category: "Architecture",
    difficulty: "Expert",
    title: "Permission-Guarded Component Tree (RBAC)",
    timeEstimate: "25 min",
    description:
      "Build a declarative Role-Based Access Control (RBAC) system for React that controls component visibility, feature access, and action permissions. Support hierarchical roles (Admin > Manager > User), fine-grained permissions (can:edit:posts), a <Can> guard component, a usePermission hook, and optimistic permission checking that doesn't block rendering. This is the authorization layer every SaaS product needs.",
    realWorld:
      "CASL (by Sergii Stotskyi) is the most popular React authorization library, used by thousands of companies. Auth0, Clerk, and WorkOS provide React SDKs with permission-checking components. AWS IAM's policy model (Principal, Action, Resource) is the industry standard that frontend RBAC mirrors. Stripe Dashboard, Linear, Notion, and every multi-tenant SaaS implements component-level permission guards. The <Can> component pattern was popularized by CASL and adopted by the React community.",
    requirements: [
      "PermissionProvider: inject user roles/permissions into the tree via context",
      "<Can> component: declarative guard that shows/hides children based on permissions",
      "usePermission hook: returns { can, cannot } functions for imperative checks",
      "Hierarchical roles: Admin inherits all Manager permissions, Manager inherits User, etc.",
      "Resource-level permissions: can('edit', 'Post', { authorId }) with conditions",
    ],
    starterCode: `// Implement:
// <PermissionProvider
//   user={{ id: 'u1', roles: ['manager'], teamId: 't1' }}
//   permissions={[
//     { action: 'read', resource: 'Post' },
//     { action: 'edit', resource: 'Post', condition: { authorId: 'u1' } },
//     { action: 'delete', resource: 'Post', condition: { authorId: 'u1' } },
//     { action: 'manage', resource: 'Team', condition: { teamId: 't1' } },
//   ]}
//   roleHierarchy={{ admin: ['manager'], manager: ['user'], user: [] }}
// >
//   <App />
// </PermissionProvider>

// Guard component:
// <Can action="edit" resource="Post" data={{ authorId: currentPost.authorId }}>
//   <EditButton />
// </Can>
//
// <Can action="delete" resource="Post" data={post}
//   fallback={<span>No permission</span>}
// >
//   <DeleteButton />
// </Can>

// Hook:
// const { can, cannot } = usePermission();
// if (can('manage', 'Team', { teamId: team.id })) {
//   showAdminPanel();
// }

// Implement the permission engine, provider, guard, and hook.`,
    solutionCode: `const PermissionContext = createContext(null);

// --- Permission Engine ---
class PermissionEngine {
  constructor(user, permissions, roleHierarchy = {}) {
    this.user = user;
    this.roleHierarchy = roleHierarchy;

    // Expand permissions based on role hierarchy
    this.permissions = this.expandPermissions(permissions);
  }

  // Get all roles including inherited ones
  getEffectiveRoles(roles) {
    const effective = new Set();
    const queue = [...roles];

    while (queue.length > 0) {
      const role = queue.shift();
      if (effective.has(role)) continue;
      effective.add(role);

      // Add inherited roles
      const inherits = this.roleHierarchy[role] || [];
      queue.push(...inherits);
    }

    return effective;
  }

  expandPermissions(permissions) {
    // 'manage' action implies all CRUD actions
    const expanded = [];
    for (const perm of permissions) {
      expanded.push(perm);
      if (perm.action === 'manage') {
        for (const action of ['create', 'read', 'edit', 'delete', 'list']) {
          expanded.push({ ...perm, action });
        }
      }
    }
    return expanded;
  }

  // Check if a condition matches the data
  matchCondition(condition, data, user) {
    if (!condition) return true;
    if (!data) return false;

    return Object.entries(condition).every(([key, value]) => {
      // Support dynamic references like { authorId: '\$user.id' }
      const resolvedValue = typeof value === 'string' && value.startsWith('\$user.')
        ? value.slice(6).split('.').reduce((o, k) => o?.[k], user)
        : value;

      // Support dot notation in data access
      const dataValue = key.split('.').reduce((o, k) => o?.[k], data);
      return Object.is(dataValue, resolvedValue);
    });
  }

  can(action, resource, data) {
    // Check if user has any matching permission
    return this.permissions.some(perm => {
      // Action match (or wildcard)
      if (perm.action !== '*' && perm.action !== action) return false;

      // Resource match (or wildcard)
      if (perm.resource !== '*' && perm.resource !== resource) return false;

      // Condition match
      if (perm.condition && !this.matchCondition(perm.condition, data, this.user)) {
        return false;
      }

      return true;
    });
  }

  cannot(action, resource, data) {
    return !this.can(action, resource, data);
  }
}

// --- Provider ---
function PermissionProvider({ user, permissions, roleHierarchy, children }) {
  const engine = useMemo(
    () => new PermissionEngine(user, permissions, roleHierarchy),
    [user, permissions, roleHierarchy]
  );

  const contextValue = useMemo(() => ({
    engine,
    user,
    can: (action, resource, data) => engine.can(action, resource, data),
    cannot: (action, resource, data) => engine.cannot(action, resource, data),
  }), [engine, user]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

// --- Hook ---
function usePermission() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermission must be inside PermissionProvider');
  return {
    can: ctx.can,
    cannot: ctx.cannot,
    user: ctx.user,
  };
}

// --- Guard Component ---
function Can({
  action,
  resource,
  data,
  children,
  fallback = null,
  passThrough = false, // if true, render children but pass 'allowed' prop
}) {
  const { can } = usePermission();
  const allowed = can(action, resource, data);

  if (passThrough) {
    // Render children with 'allowed' prop — useful for disabled states
    return typeof children === 'function'
      ? children(allowed)
      : React.cloneElement(React.Children.only(children), { disabled: !allowed });
  }

  return allowed ? children : fallback;
}

// --- Inverse guard ---
function Cannot({ action, resource, data, children, fallback = null }) {
  const { cannot } = usePermission();
  return cannot(action, resource, data) ? children : fallback;
}`,
    testCode: `import { PermissionEngine } from './implementation';

describe('PermissionEngine', () => {

  const user = { id: 'u1', roles: ['manager'], teamId: 't1' };
  const permissions = [
    { action: 'read', resource: 'Post' },
    { action: 'edit', resource: 'Post', condition: { authorId: 'u1' } },
    { action: 'delete', resource: 'Post', condition: { authorId: 'u1' } },
    { action: 'manage', resource: 'Team', condition: { teamId: 't1' } },
  ];
  const roleHierarchy = { admin: ['manager'], manager: ['user'], user: [] };

  test('can() returns true for a matching permission', () => {
    const engine = new PermissionEngine(user, permissions, roleHierarchy);
    expect(engine.can('read', 'Post')).toBe(true);
  });

  test('cannot() returns true when permission is missing', () => {
    const engine = new PermissionEngine(user, permissions, roleHierarchy);
    expect(engine.cannot('delete', 'User')).toBe(true);
  });

  test('condition-based permission matches when data satisfies condition', () => {
    const engine = new PermissionEngine(user, permissions, roleHierarchy);
    expect(engine.can('edit', 'Post', { authorId: 'u1' })).toBe(true);
  });

  test('condition-based permission fails when data does not match', () => {
    const engine = new PermissionEngine(user, permissions, roleHierarchy);
    expect(engine.can('edit', 'Post', { authorId: 'other-user' })).toBe(false);
  });

  test('manage action expands to CRUD actions', () => {
    const engine = new PermissionEngine(user, permissions, roleHierarchy);
    expect(engine.can('create', 'Team', { teamId: 't1' })).toBe(true);
    expect(engine.can('read', 'Team', { teamId: 't1' })).toBe(true);
    expect(engine.can('edit', 'Team', { teamId: 't1' })).toBe(true);
    expect(engine.can('delete', 'Team', { teamId: 't1' })).toBe(true);
  });

  test('manage expansion respects conditions', () => {
    const engine = new PermissionEngine(user, permissions, roleHierarchy);
    expect(engine.can('edit', 'Team', { teamId: 'other-team' })).toBe(false);
  });

  test('wildcard action matches any action', () => {
    const superPerms = [{ action: '*', resource: 'Post' }];
    const engine = new PermissionEngine(user, superPerms);
    expect(engine.can('read', 'Post')).toBe(true);
    expect(engine.can('delete', 'Post')).toBe(true);
    expect(engine.can('anything', 'Post')).toBe(true);
  });

  test('wildcard resource matches any resource', () => {
    const superPerms = [{ action: 'read', resource: '*' }];
    const engine = new PermissionEngine(user, superPerms);
    expect(engine.can('read', 'Post')).toBe(true);
    expect(engine.can('read', 'Team')).toBe(true);
    expect(engine.can('edit', 'Post')).toBe(false);
  });
});`,
    keyPoints: [
      "The permission engine separates authorization logic from React — it's a pure class that can be tested independently, reused on the server, and shared across components. CASL uses the same architecture",
      "'manage' action expanding to all CRUD actions mirrors CASL's convention and simplifies admin role definitions — one permission rule covers create, read, edit, delete, and list",
      "Condition matching with dynamic $user references (authorId: '$user.id') enables row-level security — a user can edit THEIR posts but not others', all declared in the permission set",
      "Role hierarchy traversal (BFS queue) handles multi-level inheritance — Admin → Manager → User means Admin gets all permissions from every level. This matches AWS IAM's role inheritance model",
      "passThrough mode on <Can> renders children as disabled instead of hidden — this is better UX in many cases because users can SEE the feature exists but understand they need different permissions to use it",
    ],
    followUp:
      "How would you add Attribute-Based Access Control (ABAC) with complex boolean expressions? How would you sync permissions with a backend authorization service in real-time? How would you handle permission caching and invalidation when roles change mid-session?",
  },
  {
    id: 29,
    category: "Architecture",
    difficulty: "Expert",
    title: "Roving Tabindex Keyboard Navigation Manager",
    timeEstimate: "30 min",
    description:
      "Build a reusable roving tabindex system for composite widgets (toolbars, menus, listboxes, grids) following WAI-ARIA Authoring Practices Guide keyboard interaction patterns. Only the currently active item in the group has tabindex=\"0\" while all siblings have tabindex=\"-1\", enabling a single Tab stop for the entire widget. Must handle Arrow key navigation, Home/End keys, wrapping at boundaries, skipping disabled items, and typeahead character search to jump to items by their text content.",
    realWorld:
      "The WAI-ARIA Authoring Practices Guide (APG) specifies roving tabindex as the recommended pattern for composite widgets. Radix UI's RovingFocusGroup component implements this pattern and a keyboard navigation audit (Discussion #2232) uncovered edge-case bugs around disabled items and wrapping. Adobe's React Aria library, led by Devon Govett, provides useFocusManager which documents the roving tabindex pattern extensively. Downshift by Kent C. Dodds uses the same focus management strategy for combobox and select components.",
    requirements: [
      "useRovingTabindex hook: manages which item in a group has tabindex='0' vs tabindex='-1'",
      "Arrow key navigation (Up/Down for vertical, Left/Right for horizontal) with optional wrapping",
      "Home/End keys jump to first/last non-disabled item in the group",
      "Disabled items are skipped during keyboard navigation but remain in the DOM",
      "Typeahead search: typing characters jumps to the next item whose text starts with that character, with a debounced reset timer",
    ],
    starterCode: `// Implement a roving tabindex system:
// const { getRovingProps, focusedIndex, setFocusedIndex } = useRovingTabindex({
//   items: [
//     { id: 'bold', label: 'Bold', disabled: false },
//     { id: 'italic', label: 'Italic', disabled: false },
//     { id: 'strike', label: 'Strikethrough', disabled: true },
//     { id: 'underline', label: 'Underline', disabled: false },
//   ],
//   orientation: 'horizontal', // or 'vertical'
//   wrap: true,
//   onSelect: (item) => console.log('Selected:', item),
// });

// Usage in a Toolbar:
// function Toolbar() {
//   const items = [
//     { id: 'bold', label: 'Bold' },
//     { id: 'italic', label: 'Italic' },
//     { id: 'strike', label: 'Strikethrough', disabled: true },
//     { id: 'underline', label: 'Underline' },
//   ];
//   const { getRovingProps, focusedIndex } = useRovingTabindex({
//     items,
//     orientation: 'horizontal',
//     wrap: true,
//   });
//
//   return (
//     <div role="toolbar" aria-label="Text formatting">
//       {items.map((item, index) => (
//         <button
//           key={item.id}
//           {...getRovingProps(index)}
//           aria-disabled={item.disabled}
//         >
//           {item.label}
//         </button>
//       ))}
//     </div>
//   );
// }

// Requirements:
// 1. Only one item has tabindex="0" at a time
// 2. Arrow keys move focus, skipping disabled items
// 3. Home/End go to first/last enabled item
// 4. Typeahead: typing 'u' jumps to 'Underline'
// 5. Works for toolbars, menus, listboxes, tab lists`,
    solutionCode: `function useRovingTabindex({
  items,
  orientation = 'horizontal',
  wrap = true,
  onSelect,
  initialIndex = 0,
  typeaheadTimeout = 500,
}) {
  // Find first non-disabled index for initialization
  const firstEnabled = items.findIndex(item => !item.disabled);
  const [focusedIndex, setFocusedIndex] = useState(
    items[initialIndex]?.disabled ? firstEnabled : initialIndex
  );
  const itemRefs = useRef([]);
  const typeaheadBuffer = useRef('');
  const typeaheadTimer = useRef(null);

  // Keep refs array in sync with items length
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // Focus the active element when focusedIndex changes
  useEffect(() => {
    const el = itemRefs.current[focusedIndex];
    if (el && document.activeElement !== el) {
      el.focus();
    }
  }, [focusedIndex]);

  const findNextEnabled = useCallback((startIndex, direction) => {
    const len = items.length;
    let index = startIndex + direction;
    let steps = 0;

    while (steps < len) {
      if (wrap) {
        index = ((index % len) + len) % len;
      } else if (index < 0 || index >= len) {
        return startIndex; // Don't move if no wrapping
      }

      if (!items[index]?.disabled) return index;
      index += direction;
      steps++;
    }
    return startIndex; // All items disabled
  }, [items, wrap]);

  const findFirstEnabled = useCallback(() => {
    return items.findIndex(item => !item.disabled);
  }, [items]);

  const findLastEnabled = useCallback(() => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (!items[i].disabled) return i;
    }
    return -1;
  }, [items]);

  const handleTypeahead = useCallback((char) => {
    clearTimeout(typeaheadTimer.current);
    typeaheadBuffer.current += char.toLowerCase();

    // Search from current index forward
    const searchStr = typeaheadBuffer.current;
    const len = items.length;
    for (let offset = 1; offset <= len; offset++) {
      const idx = (focusedIndex + offset) % len;
      const label = (items[idx]?.label || '').toLowerCase();
      if (!items[idx]?.disabled && label.startsWith(searchStr)) {
        setFocusedIndex(idx);
        break;
      }
    }

    typeaheadTimer.current = setTimeout(() => {
      typeaheadBuffer.current = '';
    }, typeaheadTimeout);
  }, [items, focusedIndex, typeaheadTimeout]);

  // Cleanup typeahead timer
  useEffect(() => {
    return () => clearTimeout(typeaheadTimer.current);
  }, []);

  const handleKeyDown = useCallback((e) => {
    const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

    switch (e.key) {
      case nextKey: {
        e.preventDefault();
        setFocusedIndex(prev => findNextEnabled(prev, 1));
        break;
      }
      case prevKey: {
        e.preventDefault();
        setFocusedIndex(prev => findNextEnabled(prev, -1));
        break;
      }
      case 'Home': {
        e.preventDefault();
        const first = findFirstEnabled();
        if (first !== -1) setFocusedIndex(first);
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = findLastEnabled();
        if (last !== -1) setFocusedIndex(last);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (onSelect && !items[focusedIndex]?.disabled) {
          onSelect(items[focusedIndex]);
        }
        break;
      }
      default: {
        // Typeahead: single printable character
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleTypeahead(e.key);
        }
      }
    }
  }, [orientation, findNextEnabled, findFirstEnabled, findLastEnabled,
      onSelect, items, focusedIndex, handleTypeahead]);

  const getRovingProps = useCallback((index) => ({
    ref: (el) => { itemRefs.current[index] = el; },
    tabIndex: index === focusedIndex ? 0 : -1,
    onKeyDown: handleKeyDown,
    onClick: () => {
      if (!items[index]?.disabled) {
        setFocusedIndex(index);
        if (onSelect) onSelect(items[index]);
      }
    },
    'data-roving-active': index === focusedIndex ? '' : undefined,
  }), [focusedIndex, handleKeyDown, items, onSelect]);

  return { getRovingProps, focusedIndex, setFocusedIndex };
}

// --- Demo Toolbar ---
function Toolbar() {
  const items = [
    { id: 'bold', label: 'Bold' },
    { id: 'italic', label: 'Italic' },
    { id: 'strike', label: 'Strikethrough', disabled: true },
    { id: 'underline', label: 'Underline' },
    { id: 'link', label: 'Link' },
  ];
  const [selected, setSelected] = useState(null);
  const { getRovingProps, focusedIndex } = useRovingTabindex({
    items,
    orientation: 'horizontal',
    wrap: true,
    onSelect: setSelected,
  });

  return (
    <div>
      <div role="toolbar" aria-label="Formatting" style={{ display: 'flex', gap: 4 }}>
        {items.map((item, i) => (
          <button
            key={item.id}
            {...getRovingProps(i)}
            aria-disabled={item.disabled || undefined}
            style={{
              padding: '6px 12px',
              opacity: item.disabled ? 0.4 : 1,
              outline: i === focusedIndex ? '2px solid #3b82f6' : 'none',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {selected && <p>Last selected: {selected.label}</p>}
    </div>
  );
}`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { useRovingTabindex } from './implementation';

const items = [
  { id: 'bold', label: 'Bold', disabled: false },
  { id: 'italic', label: 'Italic', disabled: false },
  { id: 'strike', label: 'Strikethrough', disabled: true },
  { id: 'underline', label: 'Underline', disabled: false },
];

describe('useRovingTabindex', () => {

  test('returns getRovingProps, focusedIndex, and setFocusedIndex', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ items, orientation: 'horizontal' })
    );
    expect(typeof result.current.getRovingProps).toBe('function');
    expect(typeof result.current.focusedIndex).toBe('number');
    expect(typeof result.current.setFocusedIndex).toBe('function');
  });

  test('getRovingProps returns tabIndex 0 for focused, -1 for others', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ items, orientation: 'horizontal' })
    );
    const focused = result.current.focusedIndex;
    const propsActive = result.current.getRovingProps(focused);
    const propsOther = result.current.getRovingProps(focused === 0 ? 1 : 0);
    expect(propsActive.tabIndex).toBe(0);
    expect(propsOther.tabIndex).toBe(-1);
  });

  test('getRovingProps returns ref, onKeyDown, and onClick', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ items, orientation: 'horizontal' })
    );
    const props = result.current.getRovingProps(0);
    expect(typeof props.ref).toBe('function');
    expect(typeof props.onKeyDown).toBe('function');
    expect(typeof props.onClick).toBe('function');
  });

  test('initializes to first non-disabled item', () => {
    const disabledFirst = [
      { id: 'a', label: 'A', disabled: true },
      { id: 'b', label: 'B', disabled: false },
      { id: 'c', label: 'C', disabled: false },
    ];
    const { result } = renderHook(() =>
      useRovingTabindex({ items: disabledFirst, orientation: 'horizontal', initialIndex: 0 })
    );
    expect(result.current.focusedIndex).toBe(1);
  });

  test('setFocusedIndex updates the focused item', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ items, orientation: 'horizontal' })
    );
    act(() => {
      result.current.setFocusedIndex(3);
    });
    expect(result.current.focusedIndex).toBe(3);
    expect(result.current.getRovingProps(3).tabIndex).toBe(0);
  });

  test('default focusedIndex is 0 when first item is enabled', () => {
    const { result } = renderHook(() =>
      useRovingTabindex({ items, orientation: 'horizontal' })
    );
    expect(result.current.focusedIndex).toBe(0);
  });
});`,
    keyPoints: [
      "Roving tabindex keeps the entire composite widget as a single Tab stop — pressing Tab moves focus INTO the widget (to the active item), and pressing Tab again moves focus OUT. Arrow keys handle intra-widget navigation. This is the WAI-ARIA APG recommended pattern",
      "The findNextEnabled helper with modular arithmetic handles wrapping seamlessly — when direction is +1 and index exceeds length, modulo wraps to 0, and when direction is -1, the ((n % len) + len) % len formula handles negative indices correctly",
      "Typeahead search collects characters into a buffer and resets after a configurable timeout — this matches native OS behavior where typing 'un' quickly in a listbox jumps to 'Underline'. The search starts from the current index to enable cycling through items with the same prefix",
      "Separating the hook from the component means it works with any element type — buttons in a toolbar, li elements in a menu, div elements in a listbox, or cells in a grid. The getRovingProps pattern (similar to Downshift's getItemProps) composes ref, tabIndex, and event handlers",
      "The useEffect that calls el.focus() when focusedIndex changes is critical — without it, only the tabIndex attributes update but the browser's actual focus doesn't move. This is a common bug in roving tabindex implementations that Radix UI's Discussion #2232 specifically addressed",
    ],
    followUp:
      "How would you extend this to support 2D grid navigation (arrow keys for rows AND columns)? How would you handle dynamic items that mount/unmount (like a virtualized list)? How would you integrate this with a screen reader's virtual cursor mode?",
  },
  {
    id: 30,
    category: "Architecture",
    difficulty: "Expert",
    title: "Retry Queue with Exponential Backoff and Circuit Breaker",
    timeEstimate: "35 min",
    description:
      "Build a request retry system with exponential backoff, jitter, maximum retry limits, and a circuit breaker pattern that stops attempting requests after N consecutive failures for a cooldown period. Integrate the system into React via a useRetry hook that exposes request state, manual retry triggers, and circuit breaker status. Must support AbortController for cancellation and navigator.onLine for offline detection.",
    realWorld:
      "AWS SDK v3 uses exponential backoff with jitter as its default retry strategy, documented in the AWS Architecture Blog's 'Exponential Backoff And Jitter' post by Marc Brooker. Stripe's API returns Retry-After headers that clients must respect. Netflix's Hystrix library popularized the circuit breaker pattern for microservices, and frontend teams have adapted it for API calls. TanStack Query's retry mechanism uses exponential backoff internally with configurable retryDelay functions. The navigator.onLine API combined with online/offline events enables network-aware retry behavior.",
    requirements: [
      "Exponential backoff with configurable base delay, multiplier, and maximum delay cap",
      "Full jitter (random value between 0 and calculated delay) to prevent thundering herd",
      "Circuit breaker: after N consecutive failures, enter 'open' state and reject immediately for a cooldown period, then transition to 'half-open' to test with one request",
      "AbortController integration: abort pending retries on unmount or manual cancellation",
      "Offline detection: pause retry queue when navigator.onLine is false, resume on 'online' event",
    ],
    starterCode: `// Implement a retry system with circuit breaker:

// const circuitBreaker = createCircuitBreaker({
//   failureThreshold: 5,   // Open after 5 consecutive failures
//   cooldownMs: 30000,     // Stay open for 30 seconds
// });

// const { execute, state, abort, reset } = useRetry({
//   fn: () => fetch('/api/data').then(r => {
//     if (!r.ok) throw new Error(r.status);
//     return r.json();
//   }),
//   retryConfig: {
//     maxRetries: 3,
//     baseDelay: 1000,
//     multiplier: 2,
//     maxDelay: 10000,
//     jitter: true,
//   },
//   circuitBreaker,
// });

// state = {
//   status: 'idle' | 'pending' | 'retrying' | 'success' | 'failed' | 'circuit-open',
//   data: any,
//   error: Error | null,
//   attempt: number,
//   nextRetryIn: number | null,
//   circuitState: 'closed' | 'open' | 'half-open',
// }

// Usage:
// function DataFetcher() {
//   const { execute, state, abort } = useRetry({ ... });
//   return (
//     <div>
//       <button onClick={execute} disabled={state.status === 'pending'}>
//         Fetch Data
//       </button>
//       {state.status === 'retrying' && (
//         <p>Retry attempt {state.attempt}, next in {state.nextRetryIn}ms</p>
//       )}
//       {state.status === 'circuit-open' && (
//         <p>Circuit breaker open — too many failures. Cooling down...</p>
//       )}
//       <button onClick={abort}>Cancel</button>
//     </div>
//   );
// }`,
    solutionCode: `// --- Circuit Breaker ---
function createCircuitBreaker({ failureThreshold = 5, cooldownMs = 30000 } = {}) {
  let state = 'closed'; // closed | open | half-open
  let failures = 0;
  let openedAt = null;
  const listeners = new Set();

  const notify = () => listeners.forEach(fn => fn(getState()));

  function getState() {
    // Auto-transition from open to half-open after cooldown
    if (state === 'open' && Date.now() - openedAt >= cooldownMs) {
      state = 'half-open';
    }
    return { state, failures, openedAt };
  }

  function recordSuccess() {
    failures = 0;
    state = 'closed';
    openedAt = null;
    notify();
  }

  function recordFailure() {
    failures++;
    if (failures >= failureThreshold) {
      state = 'open';
      openedAt = Date.now();
    }
    notify();
  }

  function canExecute() {
    const current = getState();
    return current.state === 'closed' || current.state === 'half-open';
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function reset() {
    failures = 0;
    state = 'closed';
    openedAt = null;
    notify();
  }

  return { getState, recordSuccess, recordFailure, canExecute, subscribe, reset };
}

// --- Backoff calculation ---
function calculateDelay({ attempt, baseDelay, multiplier, maxDelay, jitter }) {
  const exponential = baseDelay * Math.pow(multiplier, attempt);
  const capped = Math.min(exponential, maxDelay);
  return jitter ? Math.random() * capped : capped;
}

// --- useRetry hook ---
function useRetry({ fn, retryConfig = {}, circuitBreaker }) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    multiplier = 2,
    maxDelay = 10000,
    jitter = true,
  } = retryConfig;

  const [state, dispatch] = useReducer((prev, action) => {
    switch (action.type) {
      case 'START': return { ...prev, status: 'pending', attempt: 0, error: null, nextRetryIn: null };
      case 'RETRY': return { ...prev, status: 'retrying', attempt: action.attempt, nextRetryIn: action.delay };
      case 'SUCCESS': return { ...prev, status: 'success', data: action.data, error: null, nextRetryIn: null };
      case 'FAILED': return { ...prev, status: 'failed', error: action.error, nextRetryIn: null };
      case 'CIRCUIT_OPEN': return { ...prev, status: 'circuit-open', error: action.error };
      case 'CIRCUIT_UPDATE': return { ...prev, circuitState: action.circuitState };
      case 'RESET': return { status: 'idle', data: null, error: null, attempt: 0, nextRetryIn: null, circuitState: prev.circuitState };
      default: return prev;
    }
  }, { status: 'idle', data: null, error: null, attempt: 0, nextRetryIn: null, circuitState: 'closed' });

  const abortRef = useRef(null);
  const isOnline = useRef(navigator.onLine);
  const onlineResolve = useRef(null);

  // Track circuit breaker state changes
  useEffect(() => {
    if (!circuitBreaker) return;
    return circuitBreaker.subscribe(({ state: cbState }) => {
      dispatch({ type: 'CIRCUIT_UPDATE', circuitState: cbState });
    });
  }, [circuitBreaker]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      isOnline.current = true;
      if (onlineResolve.current) {
        onlineResolve.current();
        onlineResolve.current = null;
      }
    };
    const handleOffline = () => { isOnline.current = false; };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function waitForOnline(signal) {
    if (isOnline.current) return Promise.resolve();
    return new Promise((resolve, reject) => {
      onlineResolve.current = resolve;
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  }

  const execute = useCallback(async () => {
    // Check circuit breaker
    if (circuitBreaker && !circuitBreaker.canExecute()) {
      dispatch({ type: 'CIRCUIT_OPEN', error: new Error('Circuit breaker is open') });
      return;
    }

    // Create new AbortController
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'START' });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (controller.signal.aborted) return;

      try {
        // Wait for online if offline
        await waitForOnline(controller.signal);

        const result = await fn(controller.signal);
        if (controller.signal.aborted) return;

        if (circuitBreaker) circuitBreaker.recordSuccess();
        dispatch({ type: 'SUCCESS', data: result });
        return result;
      } catch (err) {
        if (err.name === 'AbortError') return;

        if (circuitBreaker) circuitBreaker.recordFailure();

        // Check if circuit just opened
        if (circuitBreaker && !circuitBreaker.canExecute()) {
          dispatch({ type: 'CIRCUIT_OPEN', error: err });
          return;
        }

        if (attempt === maxRetries) {
          dispatch({ type: 'FAILED', error: err });
          return;
        }

        const delay = calculateDelay({ attempt, baseDelay, multiplier, maxDelay, jitter });
        dispatch({ type: 'RETRY', attempt: attempt + 1, delay: Math.round(delay) });

        // Wait with abort support
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }).catch(() => {});

        if (controller.signal.aborted) return;
      }
    }
  }, [fn, maxRetries, baseDelay, multiplier, maxDelay, jitter, circuitBreaker]);

  const abort = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    dispatch({ type: 'RESET' });
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (circuitBreaker) circuitBreaker.reset();
    dispatch({ type: 'RESET' });
  }, [circuitBreaker]);

  // Abort on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  return { execute, state, abort, reset };
}`,
    testCode: `import { createCircuitBreaker, calculateDelay } from './implementation';

describe('Circuit Breaker', () => {

  test('starts in closed state', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    expect(cb.getState().state).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  test('remains closed below failure threshold', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState().state).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  test('opens after reaching failure threshold', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState().state).toBe('open');
    expect(cb.canExecute()).toBe(false);
  });

  test('resets failure count on success', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, cooldownMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getState().state).toBe('closed');
    expect(cb.getState().failures).toBe(0);
  });

  test('reset() restores to closed state', () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 50000 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState().state).toBe('open');
    cb.reset();
    expect(cb.getState().state).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  test('subscribe notifies on state changes', () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
    const listener = jest.fn();
    const unsub = cb.subscribe(listener);
    cb.recordFailure();
    expect(listener).toHaveBeenCalledTimes(1);
    cb.recordFailure();
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
    cb.reset();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('calculateDelay', () => {

  test('calculates exponential delay', () => {
    const delay = calculateDelay({ attempt: 0, baseDelay: 1000, multiplier: 2, maxDelay: 30000, jitter: false });
    expect(delay).toBe(1000);
    const delay2 = calculateDelay({ attempt: 3, baseDelay: 1000, multiplier: 2, maxDelay: 30000, jitter: false });
    expect(delay2).toBe(8000);
  });

  test('caps delay at maxDelay', () => {
    const delay = calculateDelay({ attempt: 10, baseDelay: 1000, multiplier: 2, maxDelay: 10000, jitter: false });
    expect(delay).toBe(10000);
  });

  test('jitter produces value between 0 and capped delay', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateDelay({ attempt: 2, baseDelay: 1000, multiplier: 2, maxDelay: 10000, jitter: true });
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(4000);
    }
  });
});`,
    keyPoints: [
      "The circuit breaker state machine has three states: 'closed' (normal), 'open' (rejecting all requests), and 'half-open' (allowing one test request). The open-to-half-open transition is time-based, checked lazily in canExecute() rather than with a timer — this avoids unnecessary timers and matches the Hystrix pattern",
      "Full jitter (Math.random() * cappedDelay) prevents the thundering herd problem — if 1000 clients all fail at the same time, their retries will spread across the full delay window instead of all hitting the server at exactly baseDelay * 2^attempt. AWS's Marc Brooker showed this outperforms both no-jitter and equal-jitter strategies",
      "AbortController integration is threaded through every async boundary — the fetch call, the delay timer between retries, and the offline wait. This ensures calling abort() or unmounting the component immediately cancels all pending work without memory leaks or state updates on unmounted components",
      "The offline detection uses a Promise-based waitForOnline gate: when navigator.onLine is false, the retry loop pauses on an unresolved Promise that resolves when the 'online' event fires. This is cleaner than polling and respects the abort signal for cancellation",
      "The useReducer state machine makes state transitions predictable and debuggable — every dispatch maps to exactly one transition. The 'retrying' state carries both the attempt number and nextRetryIn delay, giving the UI everything it needs to show a countdown or progress indicator",
    ],
    followUp:
      "How would you add a global retry queue that serializes retries across multiple hooks to prevent overwhelming a recovering server? How would you implement Stripe-style Retry-After header support? How would you add request deduplication so concurrent callers share one in-flight request?",
  },
  {
    id: 31,
    category: "Architecture",
    difficulty: "Expert",
    title: "Dependency Injection Container for React",
    timeEstimate: "30 min",
    description:
      "Build a dependency injection container that allows registering services (API clients, loggers, analytics providers, feature flag evaluators) and injecting them into React components via hooks. Support scoped overrides for testing (swap a real API client for a mock), lazy initialization (services created on first use), and singleton vs transient lifetime management. The container should be hierarchical — child providers can override parent registrations without affecting siblings.",
    realWorld:
      "Angular's hierarchical injector system inspired this pattern adapted for React's context model. InversifyJS and tsyringe are popular DI containers in the TypeScript ecosystem. NestJS uses constructor-based DI on the backend, and teams at Spotify adapted this pattern for their Backstage developer portal's plugin service architecture. Testing libraries like MSW (Mock Service Worker) use service replacement patterns that are essentially DI. Martin Fowler's 'Inversion of Control Containers and the Dependency Injection pattern' remains the canonical reference.",
    requirements: [
      "createContainer(): creates a DI container with register(), resolve(), and createScope() methods",
      "Lifetime management: 'singleton' (one instance per container), 'transient' (new instance per resolve), and 'scoped' (one instance per scope)",
      "Lazy initialization: services are not instantiated until first resolved, with circular dependency detection",
      "React integration: <ServiceProvider> component and useService(token) hook that resolves from the nearest provider",
      "Scoped overrides: child <ServiceProvider> can override specific registrations for testing or feature branches without affecting parent or sibling scopes",
    ],
    starterCode: `// Implement a DI container for React:

// const container = createContainer();
//
// // Register services with different lifetimes
// container.register('logger', () => new ConsoleLogger(), { lifetime: 'singleton' });
// container.register('api', (resolve) => new ApiClient(resolve('logger')), { lifetime: 'singleton' });
// container.register('analytics', () => new AnalyticsService(), { lifetime: 'transient' });
// container.register('requestId', () => crypto.randomUUID(), { lifetime: 'scoped' });
//
// // React integration:
// function App() {
//   return (
//     <ServiceProvider container={container}>
//       <Dashboard />
//       {/* Override for testing */}
//       <ServiceProvider overrides={{ api: () => new MockApiClient() }}>
//         <TestSandbox />
//       </ServiceProvider>
//     </ServiceProvider>
//   );
// }
//
// function Dashboard() {
//   const api = useService('api');      // Resolves ApiClient singleton
//   const logger = useService('logger'); // Same ConsoleLogger instance
//   // ...
// }
//
// function TestSandbox() {
//   const api = useService('api');    // MockApiClient (overridden)
//   const logger = useService('logger'); // Still ConsoleLogger (inherited from parent)
// }

// Implement createContainer, ServiceProvider, and useService.`,
    solutionCode: `// --- DI Container ---
function createContainer() {
  const registrations = new Map();
  const singletons = new Map();

  function register(token, factory, options = {}) {
    const { lifetime = 'transient' } = options;
    registrations.set(token, { factory, lifetime });
    // Clear cached singleton if re-registering
    if (lifetime !== 'singleton') singletons.delete(token);
  }

  function resolve(token, scopeInstances, resolving = new Set()) {
    // Circular dependency detection
    if (resolving.has(token)) {
      throw new Error('Circular dependency detected: ' + [...resolving, token].join(' -> '));
    }

    const registration = registrations.get(token);
    if (!registration) {
      throw new Error('No registration found for token: ' + String(token));
    }

    const { factory, lifetime } = registration;

    // Singleton: one instance for the entire container
    if (lifetime === 'singleton') {
      if (!singletons.has(token)) {
        resolving.add(token);
        const resolver = (dep) => resolve(dep, scopeInstances, new Set(resolving));
        singletons.set(token, factory(resolver));
        resolving.delete(token);
      }
      return singletons.get(token);
    }

    // Scoped: one instance per scope
    if (lifetime === 'scoped') {
      if (scopeInstances && scopeInstances.has(token)) {
        return scopeInstances.get(token);
      }
      resolving.add(token);
      const resolver = (dep) => resolve(dep, scopeInstances, new Set(resolving));
      const instance = factory(resolver);
      resolving.delete(token);
      if (scopeInstances) scopeInstances.set(token, instance);
      return instance;
    }

    // Transient: new instance every time
    resolving.add(token);
    const resolver = (dep) => resolve(dep, scopeInstances, new Set(resolving));
    const instance = factory(resolver);
    resolving.delete(token);
    return instance;
  }

  function createScope() {
    const scopeInstances = new Map();
    const childRegistrations = new Map(registrations);
    const childSingletons = new Map(singletons);

    const child = {
      register(token, factory, options = {}) {
        const { lifetime = 'transient' } = options;
        childRegistrations.set(token, { factory, lifetime });
      },

      resolve(token, parentScopeInstances, resolving = new Set()) {
        if (resolving.has(token)) {
          throw new Error('Circular dependency detected: ' + [...resolving, token].join(' -> '));
        }

        const registration = childRegistrations.get(token);
        if (!registration) {
          throw new Error('No registration found for token: ' + String(token));
        }

        const { factory, lifetime } = registration;

        if (lifetime === 'singleton') {
          // Singletons: check child first, then parent
          if (!childSingletons.has(token)) {
            if (singletons.has(token) && registrations.get(token) === registration) {
              return singletons.get(token); // Inherited, use parent's instance
            }
            resolving.add(token);
            const resolver = (dep) => child.resolve(dep, scopeInstances, new Set(resolving));
            childSingletons.set(token, factory(resolver));
            resolving.delete(token);
          }
          return childSingletons.get(token);
        }

        if (lifetime === 'scoped') {
          if (scopeInstances.has(token)) return scopeInstances.get(token);
          resolving.add(token);
          const resolver = (dep) => child.resolve(dep, scopeInstances, new Set(resolving));
          const instance = factory(resolver);
          resolving.delete(token);
          scopeInstances.set(token, instance);
          return instance;
        }

        resolving.add(token);
        const resolver = (dep) => child.resolve(dep, scopeInstances, new Set(resolving));
        const instance = factory(resolver);
        resolving.delete(token);
        return instance;
      },

      createScope() {
        // Nested scopes inherit from child
        return createContainer.call({ registrations: childRegistrations, singletons: childSingletons });
      },
    };

    return child;
  }

  return { register, resolve, createScope };
}

// --- React Integration ---
const DIContext = createContext(null);

function ServiceProvider({ container, overrides, children }) {
  const parent = useContext(DIContext);

  const scopedContainer = useMemo(() => {
    // If overrides provided, create a child scope
    const base = container || (parent ? parent.createScope() : createContainer());
    if (!overrides) return base;

    const scope = base.createScope ? base.createScope() : base;
    Object.entries(overrides).forEach(([token, factory]) => {
      scope.register(token, factory, { lifetime: 'singleton' });
    });
    return scope;
  }, [container, overrides, parent]);

  return (
    <DIContext.Provider value={scopedContainer}>
      {children}
    </DIContext.Provider>
  );
}

function useService(token) {
  const container = useContext(DIContext);
  if (!container) {
    throw new Error('useService must be used within a <ServiceProvider>');
  }

  // Memoize the resolved instance for singletons and scoped services
  return useMemo(() => container.resolve(token), [container, token]);
}

// --- Example services ---
// class ConsoleLogger {
//   log(...args) { console.log('[LOG]', ...args); }
// }
//
// class ApiClient {
//   constructor(logger) { this.logger = logger; }
//   async fetch(url) {
//     this.logger.log('Fetching:', url);
//     return fetch(url).then(r => r.json());
//   }
// }`,
    testCode: `import { createContainer } from './implementation';

describe('Dependency Injection Container', () => {

  test('register and resolve a transient service', () => {
    const container = createContainer();
    container.register('greeting', () => 'hello');
    expect(container.resolve('greeting')).toBe('hello');
  });

  test('transient lifetime creates a new instance each time', () => {
    const container = createContainer();
    container.register('obj', () => ({ id: Math.random() }), { lifetime: 'transient' });
    const a = container.resolve('obj');
    const b = container.resolve('obj');
    expect(a).not.toBe(b);
    expect(a.id).not.toBe(b.id);
  });

  test('singleton lifetime returns the same instance', () => {
    const container = createContainer();
    container.register('single', () => ({ id: Math.random() }), { lifetime: 'singleton' });
    const a = container.resolve('single');
    const b = container.resolve('single');
    expect(a).toBe(b);
  });

  test('factory receives a resolver for dependencies', () => {
    const container = createContainer();
    container.register('logger', () => ({ log: jest.fn() }), { lifetime: 'singleton' });
    container.register('api', (resolve) => ({
      logger: resolve('logger'),
      fetch: jest.fn(),
    }), { lifetime: 'singleton' });
    const api = container.resolve('api');
    expect(api.logger).toBe(container.resolve('logger'));
  });

  test('throws on unregistered token', () => {
    const container = createContainer();
    expect(() => container.resolve('unknown')).toThrow();
  });

  test('detects circular dependencies', () => {
    const container = createContainer();
    container.register('a', (resolve) => resolve('b'));
    container.register('b', (resolve) => resolve('a'));
    expect(() => container.resolve('a')).toThrow(/[Cc]ircular/);
  });

  test('createScope inherits parent registrations', () => {
    const container = createContainer();
    container.register('val', () => 42, { lifetime: 'singleton' });
    const scope = container.createScope();
    expect(scope.resolve('val')).toBe(42);
  });

  test('scoped override does not affect parent', () => {
    const container = createContainer();
    container.register('svc', () => 'real', { lifetime: 'singleton' });
    const scope = container.createScope();
    scope.register('svc', () => 'mock', { lifetime: 'singleton' });
    expect(scope.resolve('svc')).toBe('mock');
    expect(container.resolve('svc')).toBe('real');
  });
});`,
    keyPoints: [
      "The three lifetime scopes map to real DI patterns: 'singleton' shares one instance across the entire container (database connections, loggers), 'transient' creates a fresh instance every resolve (request-scoped IDs, stateless utilities), and 'scoped' creates one instance per scope (per-request context in a server, per-test instance in tests)",
      "Circular dependency detection uses a Set that tracks tokens being resolved in the current call stack — if the same token appears twice during resolution, it throws immediately with the full dependency chain. This prevents infinite loops and gives developers a clear error message showing the cycle path",
      "The hierarchical scope model (createScope()) copies the parent's registrations into a child Map — the child can override specific tokens without mutating the parent. This mirrors Angular's hierarchical injector and enables test isolation: override 'api' in a test scope, and the real ApiClient remains untouched in production",
      "Lazy initialization is inherent in the factory pattern — the factory function is stored but not called until resolve() is first invoked. This means registering 50 services at app startup has zero cost until each service is actually needed by a component",
      "The useService hook memoizes on [container, token] so a component only re-resolves when its scope changes (provider swap) or it asks for a different token. For singletons, this always returns the same reference, preventing unnecessary re-renders",
    ],
    followUp:
      "How would you add disposal/cleanup (like IDisposable) so scoped services clean up resources when the scope is destroyed? How would you implement async service factories for services that need to initialize asynchronously (database connections, remote config)? How would you add decorator/middleware support so every resolved service can be wrapped transparently (logging, caching)?",
  },
  {
    id: 35,
    category: "Architecture",
    difficulty: "Expert",
    title: "Multi-Tab State Synchronization (BroadcastChannel)",
    timeEstimate: "30 min",
    description:
      "Build a cross-tab state synchronization system using the BroadcastChannel API that keeps selected state consistent across all open browser tabs. Implement leader election so one tab owns write authority, conflict resolution when a new tab claims leadership, selective sync (only specified state slices are shared), and graceful degradation when BroadcastChannel is unavailable. The system must integrate with React via a hook that feels like useState but syncs across tabs.",
    realWorld:
      "Figma synchronizes canvas selections and presence indicators across tabs of the same file. Auth0 and Clerk both use cross-tab messaging to sync authentication state — when a user logs out in one tab, all tabs reflect it immediately. Firebase's JavaScript SDK uses BroadcastChannel internally for cross-tab auth state management (see firebase/firebase-js-sdk#4857). Zustand offers a cross-tab persist middleware by Abdulhak Adeyinka. TanStack Query synchronizes cache invalidation across tabs so a mutation in one tab refetches in others.",
    requirements: [
      "useSyncedState(channel, key, initialValue) hook that syncs state across tabs via BroadcastChannel",
      "Leader election: tabs negotiate which tab is the leader (source of truth for writes); if the leader tab closes, a new leader is elected",
      "Selective sync: only state keys explicitly marked for sync are broadcast; local-only state stays isolated",
      "Conflict resolution: when two tabs attempt simultaneous writes, the leader's value wins and is broadcast to followers",
      "Graceful degradation: when BroadcastChannel is not supported, the hook falls back to local-only state with no errors",
    ],
    starterCode: `// Implement cross-tab state sync with leader election:

function createTabSync(channelName) {
  // Creates a sync manager for the given channel
  // Returns: {
  //   useSyncedState(key, initialValue) — hook for synced state
  //   useIsLeader() — hook that returns true if this tab is the leader
  //   destroy() — cleanup
  // }
}

// Leader election protocol:
// 1. New tab broadcasts { type: 'ELECTION', tabId, timestamp }
// 2. Existing leader responds { type: 'LEADER_ACK', leaderId }
// 3. If no ACK within 200ms, new tab declares itself leader
// 4. When leader tab unloads (beforeunload), broadcasts { type: 'LEADER_RESIGN' }
// 5. Remaining tabs run a new election

// State sync protocol:
// { type: 'STATE_UPDATE', key, value, tabId, timestamp }
// { type: 'STATE_REQUEST', key, tabId } — new tab requests current state
// { type: 'STATE_RESPONSE', key, value, timestamp } — leader responds

// Usage:
// const sync = createTabSync('my-app');
//
// function App() {
//   const [theme, setTheme] = sync.useSyncedState('theme', 'light');
//   const [user, setUser] = sync.useSyncedState('user', null);
//   const isLeader = sync.useIsLeader();
//
//   // theme and user sync across all tabs
//   // setTheme('dark') in one tab updates all tabs
//   // isLeader is true for exactly one tab
//   return (
//     <div>
//       <p>Theme: {theme} {isLeader ? '(Leader)' : '(Follower)'}</p>
//       <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
//         Toggle Theme
//       </button>
//     </div>
//   );
// }`,
    solutionCode: `function createTabSync(channelName) {
  const tabId = Math.random().toString(36).slice(2, 10);
  let channel = null;
  let isLeader = false;
  const stateStore = new Map();      // key -> { value, timestamp }
  const listeners = new Map();       // key -> Set<callback>
  const leaderListeners = new Set(); // callbacks for leader changes
  let electionTimer = null;

  // --- BroadcastChannel setup ---
  try {
    channel = new BroadcastChannel(channelName);
  } catch {
    // BroadcastChannel not supported — degrade gracefully
    console.warn('[TabSync] BroadcastChannel not supported, local-only mode');
  }

  function broadcast(message) {
    if (channel) channel.postMessage({ ...message, tabId });
  }

  function notifyListeners(key, value) {
    const cbs = listeners.get(key);
    if (cbs) cbs.forEach(cb => cb(value));
  }

  function notifyLeaderChange() {
    leaderListeners.forEach(cb => cb(isLeader));
  }

  // --- Leader election ---
  function startElection() {
    broadcast({ type: 'ELECTION', timestamp: Date.now() });
    clearTimeout(electionTimer);
    electionTimer = setTimeout(() => {
      // No ACK received — declare self as leader
      isLeader = true;
      broadcast({ type: 'LEADER_ANNOUNCE', timestamp: Date.now() });
      notifyLeaderChange();
    }, 200);
  }

  if (channel) {
    channel.onmessage = (event) => {
      const msg = event.data;
      if (msg.tabId === tabId) return; // ignore own messages

      switch (msg.type) {
        case 'ELECTION':
          if (isLeader) {
            broadcast({ type: 'LEADER_ACK', leaderId: tabId });
          }
          break;

        case 'LEADER_ACK':
          // Another tab is already leader — cancel our election
          clearTimeout(electionTimer);
          isLeader = false;
          notifyLeaderChange();
          break;

        case 'LEADER_ANNOUNCE':
          clearTimeout(electionTimer);
          isLeader = false;
          notifyLeaderChange();
          break;

        case 'LEADER_RESIGN':
          // Leader left — start a new election
          startElection();
          break;

        case 'STATE_UPDATE': {
          const current = stateStore.get(msg.key);
          // Accept if newer or if sender is leader
          if (!current || msg.timestamp >= current.timestamp) {
            stateStore.set(msg.key, {
              value: msg.value,
              timestamp: msg.timestamp,
            });
            notifyListeners(msg.key, msg.value);
          }
          break;
        }

        case 'STATE_REQUEST':
          // Only leader responds to state requests
          if (isLeader && stateStore.has(msg.key)) {
            const entry = stateStore.get(msg.key);
            broadcast({
              type: 'STATE_RESPONSE',
              key: msg.key,
              value: entry.value,
              timestamp: entry.timestamp,
            });
          }
          break;

        case 'STATE_RESPONSE': {
          const cur = stateStore.get(msg.key);
          if (!cur || msg.timestamp > cur.timestamp) {
            stateStore.set(msg.key, {
              value: msg.value,
              timestamp: msg.timestamp,
            });
            notifyListeners(msg.key, msg.value);
          }
          break;
        }
      }
    };

    // Register unload handler for leader resignation
    window.addEventListener('beforeunload', () => {
      if (isLeader) broadcast({ type: 'LEADER_RESIGN' });
    });

    // Kick off election on creation
    startElection();
  } else {
    // No BroadcastChannel — this tab is always "leader"
    isLeader = true;
  }

  // --- React hooks ---
  function useSyncedState(key, initialValue) {
    const [value, setLocalValue] = useState(() => {
      const existing = stateStore.get(key);
      if (existing) return existing.value;
      stateStore.set(key, { value: initialValue, timestamp: Date.now() });
      return initialValue;
    });

    useEffect(() => {
      const cb = (newVal) => setLocalValue(newVal);
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(cb);

      // Request current state from leader
      broadcast({ type: 'STATE_REQUEST', key });

      return () => {
        listeners.get(key).delete(cb);
        if (listeners.get(key).size === 0) listeners.delete(key);
      };
    }, [key]);

    const setValue = useCallback((updater) => {
      setLocalValue(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const timestamp = Date.now();
        stateStore.set(key, { value: next, timestamp });
        broadcast({ type: 'STATE_UPDATE', key, value: next, timestamp });
        return next;
      });
    }, [key]);

    return [value, setValue];
  }

  function useIsLeader() {
    const [leader, setLeader] = useState(isLeader);
    useEffect(() => {
      const cb = (val) => setLeader(val);
      leaderListeners.add(cb);
      return () => leaderListeners.delete(cb);
    }, []);
    return leader;
  }

  function destroy() {
    if (channel) {
      if (isLeader) broadcast({ type: 'LEADER_RESIGN' });
      channel.close();
    }
    clearTimeout(electionTimer);
    stateStore.clear();
    listeners.clear();
    leaderListeners.clear();
  }

  return { useSyncedState, useIsLeader, destroy };
}

// --- Usage ---
// const sync = createTabSync('my-app');
// function App() {
//   const [theme, setTheme] = sync.useSyncedState('theme', 'light');
//   const isLeader = sync.useIsLeader();
//   return (
//     <div style={{ background: theme === 'dark' ? '#222' : '#fff' }}>
//       <p>{isLeader ? 'Leader Tab' : 'Follower Tab'}</p>
//       <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
//         Toggle: {theme}
//       </button>
//     </div>
//   );
// }`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { createTabSync } from './implementation';

// Mock BroadcastChannel for test environment
class MockBroadcastChannel {
  constructor(name) { this.name = name; this.onmessage = null; }
  postMessage() {}
  close() {}
}
if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = MockBroadcastChannel;
}

describe('Multi-Tab State Synchronization', () => {

  test('createTabSync returns useSyncedState, useIsLeader, and destroy', () => {
    const sync = createTabSync('test-channel-1');
    expect(typeof sync.useSyncedState).toBe('function');
    expect(typeof sync.useIsLeader).toBe('function');
    expect(typeof sync.destroy).toBe('function');
    sync.destroy();
  });

  test('useSyncedState returns [value, setter] tuple with initial value', () => {
    const sync = createTabSync('test-channel-2');
    const { result } = renderHook(() => sync.useSyncedState('theme', 'light'));
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBe('light');
    expect(typeof result.current[1]).toBe('function');
    sync.destroy();
  });

  test('useSyncedState setter updates local state', () => {
    const sync = createTabSync('test-channel-3');
    const { result } = renderHook(() => sync.useSyncedState('color', 'blue'));
    act(() => {
      result.current[1]('red');
    });
    expect(result.current[0]).toBe('red');
    sync.destroy();
  });

  test('useSyncedState setter supports functional updates', () => {
    const sync = createTabSync('test-channel-4');
    const { result } = renderHook(() => sync.useSyncedState('count', 0));
    act(() => {
      result.current[1](prev => prev + 1);
    });
    expect(result.current[0]).toBe(1);
    act(() => {
      result.current[1](prev => prev + 10);
    });
    expect(result.current[0]).toBe(11);
    sync.destroy();
  });

  test('useIsLeader returns a boolean', () => {
    const sync = createTabSync('test-channel-5');
    const { result } = renderHook(() => sync.useIsLeader());
    expect(typeof result.current).toBe('boolean');
    sync.destroy();
  });

  test('destroy can be called without error', () => {
    const sync = createTabSync('test-channel-6');
    expect(() => sync.destroy()).not.toThrow();
  });

  test('multiple synced states are independent', () => {
    const sync = createTabSync('test-channel-7');
    const { result: r1 } = renderHook(() => sync.useSyncedState('a', 1));
    const { result: r2 } = renderHook(() => sync.useSyncedState('b', 2));
    expect(r1.current[0]).toBe(1);
    expect(r2.current[0]).toBe(2);
    act(() => { r1.current[1](10); });
    expect(r1.current[0]).toBe(10);
    expect(r2.current[0]).toBe(2);
    sync.destroy();
  });
});`,
    keyPoints: [
      "Leader election via timeout (broadcast ELECTION, wait 200ms for ACK, declare self leader if none) is a simplified Bully algorithm — the same approach used by distributed systems, adapted for browser tabs where latency is near-zero",
      "The beforeunload event triggers LEADER_RESIGN so remaining tabs can immediately elect a new leader instead of waiting for a heartbeat timeout — this provides near-instant failover when the leader tab closes",
      "Timestamp-based conflict resolution (last-write-wins) is intentionally simple — in a browser tab context, sub-millisecond conflicts are practically impossible, making this sufficient without vector clocks or CRDTs",
      "Graceful degradation wraps the BroadcastChannel constructor in try/catch — if the API is unavailable (older browsers, some WebView contexts), the system falls back to local-only state with the tab as its own leader, maintaining the exact same API surface",
      "Selective sync is achieved by design — only keys accessed via useSyncedState() are broadcast. Regular useState in the same app remains completely local, giving developers explicit control over what crosses tab boundaries",
    ],
    followUp:
      "How would you add heartbeat-based health checks so follower tabs detect a frozen (not closed) leader tab? How would you implement optimistic locking so a follower's write can be rejected by the leader? How would you extend this to use SharedWorker for more reliable cross-tab communication?",
  },
  {
    id: 36,
    category: "Architecture",
    difficulty: "Expert",
    title: "Isomorphic Data Loader with Streaming Support",
    timeEstimate: "35 min",
    description:
      "Build a data loading system that works identically on server and client, supports progressive streaming (render shell immediately, fill in data as it arrives), serializes server-fetched data into the HTML so the client can hydrate without refetching, and integrates with React Suspense for loading boundaries. The loader must handle parallel data fetching, waterfall prevention, and error boundaries for individual data segments.",
    realWorld:
      "Remix loaders by Ryan Florence and Michael Jackson pioneered this pattern — each route defines a loader() that runs on the server and serializes data for the client. Next.js App Router adopted the same idea with server-side fetch() and React Server Components streaming. Dan Abramov's RFC for React Server Components describes the React Flight protocol that serializes component trees with embedded data. The Vercel blog post 'How React 18 Improves Application Performance' details how streaming SSR with renderToPipeableStream progressively sends HTML chunks as data resolves.",
    requirements: [
      "createLoader(fetchFn) — define a loader that can run on both server and client, calling fetchFn to get data",
      "useLoaderData(loader) hook — on the server, suspends until data is ready; on the client, reads from the serialized cache first, then falls back to client-side fetch",
      "Server serialization: after server render, embed fetched data as a JSON script tag (<script id='__LOADER_DATA__'>) so the client hydrates with zero refetch",
      "Streaming support: multiple loaders can resolve independently — React Suspense boundaries show fallbacks for pending loaders while resolved ones render immediately",
      "Deduplication: if the same loader is used by multiple components in one render, the fetch runs only once",
    ],
    starterCode: `// Implement an isomorphic data loader with streaming:

// Server-side context provider
// <LoaderProvider isServer={true}>
//   <App />
// </LoaderProvider>

// Define loaders (can be shared between server and client):
// const userLoader = createLoader(async (params) => {
//   const res = await fetch(\`/api/users/\${params.id}\`);
//   return res.json();
// });
//
// const postsLoader = createLoader(async (params) => {
//   const res = await fetch(\`/api/users/\${params.id}/posts\`);
//   return res.json();
// });

// Use in components — works on both server and client:
// function UserProfile({ userId }) {
//   const user = useLoaderData(userLoader, { id: userId });
//   return <h1>{user.name}</h1>;
// }
//
// function UserPosts({ userId }) {
//   const posts = useLoaderData(postsLoader, { id: userId });
//   return posts.map(p => <article key={p.id}>{p.title}</article>);
// }
//
// // With Suspense boundaries for streaming:
// function UserPage({ userId }) {
//   return (
//     <div>
//       <Suspense fallback={<Skeleton />}>
//         <UserProfile userId={userId} />
//       </Suspense>
//       <Suspense fallback={<PostsSkeleton />}>
//         <UserPosts userId={userId} />
//       </Suspense>
//     </div>
//   );
// }

// Server render:
// const html = renderToString(
//   <LoaderProvider isServer={true}>
//     <UserPage userId="123" />
//   </LoaderProvider>
// );
// // Append serialized loader data as script tag
// const fullHtml = html + getSerializedLoaderData();

// Client hydrate:
// hydrateRoot(
//   document.getElementById('root'),
//   <LoaderProvider isServer={false}
//     serializedData={window.__LOADER_DATA__}>
//     <UserPage userId="123" />
//   </LoaderProvider>
// );`,
    solutionCode: `const LoaderContext = createContext(null);
let loaderIdCounter = 0;

function createLoader(fetchFn) {
  const id = \`loader_\${++loaderIdCounter}\`;
  return { id, fetchFn };
}

function LoaderProvider({ isServer, serializedData, children }) {
  const cacheRef = useRef(new Map());
  const pendingRef = useRef(new Map());

  // On client, hydrate from serialized data
  useEffect(() => {
    if (!isServer && serializedData) {
      Object.entries(serializedData).forEach(([key, entry]) => {
        cacheRef.current.set(key, {
          status: 'resolved',
          value: entry.value,
          timestamp: entry.timestamp,
        });
      });
    }
  }, []);

  // Eagerly hydrate from serialized data (sync, before first render)
  if (!isServer && serializedData && cacheRef.current.size === 0) {
    Object.entries(serializedData).forEach(([key, entry]) => {
      cacheRef.current.set(key, {
        status: 'resolved',
        value: entry.value,
        timestamp: entry.timestamp,
      });
    });
  }

  const ctx = useMemo(() => ({
    isServer,
    cache: cacheRef.current,
    pending: pendingRef.current,
    fetch(loader, params) {
      const cacheKey = \`\${loader.id}:\${JSON.stringify(params)}\`;

      // Return cached result if available
      const cached = cacheRef.current.get(cacheKey);
      if (cached && cached.status === 'resolved') return cached.value;
      if (cached && cached.status === 'rejected') throw cached.error;

      // Deduplication: reuse in-flight promise
      if (pendingRef.current.has(cacheKey)) {
        throw pendingRef.current.get(cacheKey);
      }

      // Start fetch — throw the promise for Suspense
      const promise = loader.fetchFn(params)
        .then(value => {
          cacheRef.current.set(cacheKey, {
            status: 'resolved',
            value,
            timestamp: Date.now(),
          });
          pendingRef.current.delete(cacheKey);
          return value;
        })
        .catch(error => {
          cacheRef.current.set(cacheKey, {
            status: 'rejected',
            error,
            timestamp: Date.now(),
          });
          pendingRef.current.delete(cacheKey);
          throw error;
        });

      pendingRef.current.set(cacheKey, promise);
      throw promise; // Suspense integration
    },
    getSerializedData() {
      const data = {};
      cacheRef.current.forEach((entry, key) => {
        if (entry.status === 'resolved') {
          data[key] = { value: entry.value, timestamp: entry.timestamp };
        }
      });
      return data;
    },
  }), [isServer]);

  return (
    <LoaderContext.Provider value={ctx}>
      {children}
    </LoaderContext.Provider>
  );
}

function useLoaderData(loader, params = {}) {
  const ctx = useContext(LoaderContext);
  if (!ctx) throw new Error('useLoaderData must be inside LoaderProvider');

  // This may throw a promise (for Suspense) or return data
  return ctx.fetch(loader, params);
}

// Utility: extract serialized data after server render
function getSerializedLoaderData(ctx) {
  const data = ctx.getSerializedData();
  return \`<script>window.__LOADER_DATA__ = \${JSON.stringify(data).replace(/</g, '\\\\u003c')}</script>\`;
}

// Hook to prefetch data without reading it (fire-and-forget)
function usePrefetch(loader, params = {}) {
  const ctx = useContext(LoaderContext);
  useEffect(() => {
    const cacheKey = \`\${loader.id}:\${JSON.stringify(params)}\`;
    if (!ctx.cache.has(cacheKey) && !ctx.pending.has(cacheKey)) {
      const promise = loader.fetchFn(params).then(value => {
        ctx.cache.set(cacheKey, {
          status: 'resolved', value, timestamp: Date.now(),
        });
        ctx.pending.delete(cacheKey);
      });
      ctx.pending.set(cacheKey, promise);
    }
  }, [loader, JSON.stringify(params)]);
}

// Hook to invalidate and refetch a loader
function useInvalidateLoader(loader, params = {}) {
  const ctx = useContext(LoaderContext);
  return useCallback(() => {
    const cacheKey = \`\${loader.id}:\${JSON.stringify(params)}\`;
    ctx.cache.delete(cacheKey);
    ctx.pending.delete(cacheKey);
    // Trigger a re-render by updating a sentinel
  }, [loader, JSON.stringify(params), ctx]);
}

// --- Demo ---
// const userLoader = createLoader(async ({ id }) => {
//   const res = await fetch(\`/api/users/\${id}\`);
//   return res.json();
// });
//
// function Profile({ userId }) {
//   const user = useLoaderData(userLoader, { id: userId });
//   return <h1>{user.name}</h1>;
// }
//
// function App() {
//   return (
//     <LoaderProvider isServer={false}
//       serializedData={window.__LOADER_DATA__}>
//       <Suspense fallback={<p>Loading...</p>}>
//         <Profile userId="123" />
//       </Suspense>
//     </LoaderProvider>
//   );
// }`,
    testCode: `import { renderHook, act } from '@testing-library/react';
import { createLoader, useLoaderData, LoaderProvider } from './implementation';
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

describe('Isomorphic Data Loader', () => {

  test('createLoader returns an object with id and fetchFn', () => {
    const fetchFn = jest.fn();
    const loader = createLoader(fetchFn);
    expect(loader).toHaveProperty('id');
    expect(loader).toHaveProperty('fetchFn', fetchFn);
    expect(typeof loader.id).toBe('string');
  });

  test('each createLoader call produces a unique id', () => {
    const a = createLoader(jest.fn());
    const b = createLoader(jest.fn());
    expect(a.id).not.toBe(b.id);
  });

  test('useLoaderData throws without LoaderProvider', () => {
    const loader = createLoader(async () => 'data');
    expect(() => {
      renderHook(() => useLoaderData(loader, {}));
    }).toThrow();
  });

  test('useLoaderData resolves data from fetchFn via Suspense', async () => {
    const loader = createLoader(async () => ({ name: 'Alice' }));

    function Inner() {
      const data = useLoaderData(loader, {});
      return <div data-testid="result">{data.name}</div>;
    }

    render(
      <LoaderProvider isServer={false}>
        <Suspense fallback={<div data-testid="loading">Loading</div>}>
          <Inner />
        </Suspense>
      </LoaderProvider>
    );

    expect(screen.getByTestId('loading')).toBeTruthy();
    const result = await screen.findByTestId('result');
    expect(result.textContent).toBe('Alice');
  });

  test('deduplication: same loader+params only fetches once', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ val: 1 });
    const loader = createLoader(fetchFn);

    function A() {
      useLoaderData(loader, { id: 'x' });
      return null;
    }
    function B() {
      useLoaderData(loader, { id: 'x' });
      return null;
    }

    render(
      <LoaderProvider isServer={false}>
        <Suspense fallback={<div>Loading</div>}>
          <A />
          <B />
        </Suspense>
      </LoaderProvider>
    );

    // Wait for resolution
    await act(() => new Promise(r => setTimeout(r, 50)));
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test('LoaderProvider hydrates from serializedData without refetch', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ val: 'fresh' });
    const loader = createLoader(fetchFn);
    const cacheKey = \\\`\\\${loader.id}:\\\${JSON.stringify({ id: '1' })}\\\`;

    const serializedData = {
      [cacheKey]: { value: { val: 'cached' }, timestamp: Date.now() },
    };

    function Inner() {
      const data = useLoaderData(loader, { id: '1' });
      return <div data-testid="result">{data.val}</div>;
    }

    render(
      <LoaderProvider isServer={false} serializedData={serializedData}>
        <Suspense fallback={<div>Loading</div>}>
          <Inner />
        </Suspense>
      </LoaderProvider>
    );

    expect(screen.getByTestId('result').textContent).toBe('cached');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});`,
    keyPoints: [
      "Throwing promises for Suspense integration is the core pattern React uses internally — when useLoaderData throws a promise, the nearest Suspense boundary catches it, shows the fallback, and re-renders when the promise resolves",
      "Deduplication via the pending Map ensures that if UserProfile and UserAvatar both call useLoaderData(userLoader, { id: '123' }), only one network request fires. The same in-flight promise is thrown for both, and both resolve together",
      "Server-to-client serialization via a JSON script tag is exactly what Remix and Next.js do — the server fetches data, renders HTML, then embeds the raw data so the client can hydrate without refetching. The < escape (\\u003c) prevents XSS via script injection in serialized data",
      "The cache-key strategy (loader.id + JSON.stringify(params)) creates a unique identity for each loader+params combination, enabling fine-grained caching. This mirrors TanStack Query's queryKey pattern",
      "Streaming works because each Suspense boundary resolves independently — React 18's renderToPipeableStream sends the shell HTML immediately, then streams in each resolved Suspense boundary as its data arrives. Multiple loaders behind separate boundaries naturally parallelize",
    ],
    followUp:
      "How would you add stale-while-revalidate caching so the client shows stale data immediately while refetching in the background? How would you implement route-level prefetching that starts fetching data for the next page on link hover? How would you handle streaming errors where one loader fails but others succeed?",
  },
];
