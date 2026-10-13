import { describe, expect, it } from 'vitest';
import { intParam, listParam, oneOf } from '@/lib/api';

describe('API param helpers', () => {
  it('clamps integers and falls back on junk', () => {
    expect(intParam('5', { min: 1, max: 10, fallback: 2 })).toBe(5);
    expect(intParam('abc', { min: 1, max: 10, fallback: 2 })).toBe(2);
    expect(intParam('999', { min: 1, max: 10, fallback: 2 })).toBe(10);
    expect(intParam('-4', { min: 1, max: 10, fallback: 2 })).toBe(1);
    expect(intParam(null, { min: 1, max: 10, fallback: 3 })).toBe(3);
  });

  it('accepts only allowed values', () => {
    expect(oneOf('updated', ['created', 'updated'] as const, 'created')).toBe('updated');
    expect(oneOf('DROP TABLE', ['created', 'updated'] as const, 'created')).toBe('created');
  });

  it('parses de-duplicated, capped lists', () => {
    expect(listParam('a, b,a,,c', 2)).toEqual(['a', 'b']);
    expect(listParam(null)).toEqual([]);
  });
});
