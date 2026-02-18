import { describe, it, expect } from 'vitest';
import { formatTime } from './time';

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds less than a minute', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(formatTime(65)).toBe('1:05');
  });

  it('formats 3600 seconds as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  it('pads single-digit seconds with zero', () => {
    expect(formatTime(61)).toBe('1:01');
    expect(formatTime(609)).toBe('10:09');
  });
});
