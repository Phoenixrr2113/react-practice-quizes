import { useState, useCallback } from 'react';
import type { Challenge } from '@/types/challenge';

export function useChallenge() {
  const [current, setCurrent] = useState<Challenge | null>(null);
  const start = useCallback((c: Challenge) => setCurrent(c), []);
  const goBack = useCallback(() => setCurrent(null), []);
  return { current, start, goBack };
}
