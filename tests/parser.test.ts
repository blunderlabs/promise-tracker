import { describe, it, expect } from 'vitest';
import { parsePromise, parseDate } from '../src/capture/parser.js';

const REF = new Date('2026-02-27T12:00:00Z');

describe('parseDate', () => {
  it('parses "tomorrow"', () => {
    expect(parseDate('by tomorrow', REF)).toBe('2026-02-28');
  });

  it('parses "next Friday"', () => {
    // 2026-02-27 is a Friday, so next Friday = 2026-03-06
    expect(parseDate('by next friday', REF)).toBe('2026-03-06');
  });

  it('parses "Feb 25"', () => {
    // Feb 25 2026 is past ref date, so bumps to 2027
    expect(parseDate('by Feb 25', REF)).toBe('2027-02-25');
  });

  it('parses "Mar 15"', () => {
    expect(parseDate('by Mar 15', REF)).toBe('2026-03-15');
  });

  it('parses "end of month"', () => {
    expect(parseDate('by end of month', REF)).toBe('2026-02-28');
  });

  it('parses ISO date', () => {
    expect(parseDate('by 2026-04-01', REF)).toBe('2026-04-01');
  });

  it('returns null for no date', () => {
    expect(parseDate('send the thing', REF)).toBeNull();
  });
});

describe('parsePromise', () => {
  it('extracts what, who, dueDate from full sentence', () => {
    const r = parsePromise('Promised to send contract to John by Mar 15', REF);
    expect(r.who).toBe('John');
    expect(r.dueDate).toBe('2026-03-15');
    expect(r.what).toContain('send contract');
  });

  it('extracts "with" person', () => {
    const r = parsePromise('Follow up with Sarah about demo by next friday', REF);
    expect(r.who).toBe('Sarah');
    expect(r.dueDate).toBe('2026-03-06');
  });

  it('defaults who to self', () => {
    const r = parsePromise('Send report by tomorrow', REF);
    expect(r.who).toBe('self');
    expect(r.dueDate).toBe('2026-02-28');
  });

  it('returns null dueDate when no date present', () => {
    const r = parsePromise('Send report to John', REF);
    expect(r.who).toBe('John');
    expect(r.dueDate).toBeNull();
  });
});
