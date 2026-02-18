import { useState, useEffect, useCallback } from 'react';

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setIsActive(false);
    setSeconds(0);
  }, []);
  const toggle = useCallback(() => setIsActive((a) => !a), []);

  return { seconds, isActive, start, pause, reset, toggle };
}
