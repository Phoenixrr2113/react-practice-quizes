import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at 0 seconds and inactive', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('increments each second when started', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    expect(result.current.isActive).toBe(true);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(3);
  });

  it('pauses correctly', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.seconds).toBe(2);

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(2);
  });

  it('resets to 0 and stops', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.seconds).toBe(5);

    act(() => result.current.reset());
    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('toggle switches between active and inactive', () => {
    const { result } = renderHook(() => useTimer());

    act(() => result.current.toggle());
    expect(result.current.isActive).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isActive).toBe(false);
  });
});
