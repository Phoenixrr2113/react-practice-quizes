import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgress } from './useProgress';

describe('useProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty completed set', () => {
    const { result } = renderHook(() => useProgress(10));
    expect(result.current.completedIds.size).toBe(0);
    expect(result.current.progress).toBe(0);
  });

  it('markComplete adds id to set', () => {
    const { result } = renderHook(() => useProgress(10));

    act(() => result.current.markComplete(1));
    expect(result.current.completedIds.has(1)).toBe(true);
    expect(result.current.completedIds.size).toBe(1);
  });

  it('calculates progress percentage correctly', () => {
    const { result } = renderHook(() => useProgress(4));

    act(() => result.current.markComplete(1));
    expect(result.current.progress).toBe(25);

    act(() => result.current.markComplete(2));
    expect(result.current.progress).toBe(50);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useProgress(10));

    act(() => result.current.markComplete(5));
    act(() => result.current.markComplete(10));

    const stored = JSON.parse(localStorage.getItem('ril-completed')!);
    expect(stored).toEqual([5, 10]);
  });

  it('restores from localStorage', () => {
    localStorage.setItem('ril-completed', JSON.stringify([1, 2, 3]));

    const { result } = renderHook(() => useProgress(10));
    expect(result.current.completedIds.size).toBe(3);
    expect(result.current.completedIds.has(1)).toBe(true);
    expect(result.current.completedIds.has(2)).toBe(true);
    expect(result.current.completedIds.has(3)).toBe(true);
    expect(result.current.progress).toBe(30);
  });

  it('resetProgress clears state and localStorage', () => {
    const { result } = renderHook(() => useProgress(10));

    act(() => result.current.markComplete(1));
    act(() => result.current.markComplete(2));
    expect(result.current.completedIds.size).toBe(2);

    act(() => result.current.resetProgress());
    expect(result.current.completedIds.size).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(localStorage.getItem('ril-completed')).toBeNull();
  });

  it('markComplete stores completion time when seconds provided', () => {
    const { result } = renderHook(() => useProgress(10));

    act(() => result.current.markComplete(1, 120));
    expect(result.current.completionTimes[1]).toBe(120);

    const stored = JSON.parse(localStorage.getItem('ril-times')!);
    expect(stored['1']).toBe(120);
  });

  it('completionTimes not set when seconds omitted', () => {
    const { result } = renderHook(() => useProgress(10));

    act(() => result.current.markComplete(1));
    expect(result.current.completionTimes[1]).toBeUndefined();
    expect(localStorage.getItem('ril-times')).toBeNull();
  });

  it('resetProgress clears completionTimes', () => {
    const { result } = renderHook(() => useProgress(10));

    act(() => result.current.markComplete(1, 90));
    expect(result.current.completionTimes[1]).toBe(90);

    act(() => result.current.resetProgress());
    expect(result.current.completionTimes).toEqual({});
    expect(localStorage.getItem('ril-times')).toBeNull();
  });

  it('restores completionTimes from localStorage', () => {
    localStorage.setItem('ril-completed', JSON.stringify([1, 2]));
    localStorage.setItem('ril-times', JSON.stringify({ 1: 45, 2: 180 }));

    const { result } = renderHook(() => useProgress(10));
    expect(result.current.completionTimes[1]).toBe(45);
    expect(result.current.completionTimes[2]).toBe(180);
  });
});
