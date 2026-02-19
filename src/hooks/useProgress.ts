import { useState, useCallback, useMemo } from 'react';

export function useProgress(total: number) {
  const [completedIds, setCompletedIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('ril-completed');
    return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
  });

  const [completionTimes, setCompletionTimes] = useState<Record<number, number>>(() => {
    const stored = localStorage.getItem('ril-times');
    return stored ? (JSON.parse(stored) as Record<number, number>) : {};
  });

  const markComplete = useCallback((id: number, seconds?: number) => {
    setCompletedIds((prev) => {
      const next = new Set([...prev, id]);
      localStorage.setItem('ril-completed', JSON.stringify([...next]));
      return next;
    });
    if (seconds !== undefined) {
      setCompletionTimes((prev) => {
        const next = { ...prev, [id]: seconds };
        localStorage.setItem('ril-times', JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const resetProgress = useCallback(() => {
    setCompletedIds(new Set());
    setCompletionTimes({});
    localStorage.removeItem('ril-completed');
    localStorage.removeItem('ril-times');
  }, []);

  const progress = useMemo(
    () => Math.round((completedIds.size / total) * 100),
    [completedIds.size, total],
  );

  return { completedIds, completionTimes, markComplete, resetProgress, progress };
}
