import { useState, useCallback, useMemo } from 'react';

export function useProgress(total: number) {
  const [completedIds, setCompletedIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('ril-completed');
    return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
  });

  const markComplete = useCallback((id: number) => {
    setCompletedIds((prev) => {
      const next = new Set([...prev, id]);
      localStorage.setItem('ril-completed', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    setCompletedIds(new Set());
    localStorage.removeItem('ril-completed');
  }, []);

  const progress = useMemo(
    () => Math.round((completedIds.size / total) * 100),
    [completedIds.size, total],
  );

  return { completedIds, markComplete, resetProgress, progress };
}
