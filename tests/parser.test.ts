import { describe, it, expect, vi } from 'vitest';
import { parsePromise, parseDate, PromiseParser, type LlmProvider } from '../src/capture/parser.js';

const REF = new Date('2026-02-27T12:00:00Z');

describe('parseDate', () => {
  it('parses "tomorrow"', () => {
    expect(parseDate('by tomorrow', REF)).toBe('2026-02-28');
  });

  it('parses "next Friday"', () => {
    expect(parseDate('by next friday', REF)).toBe('2026-03-06');
  });

  it('parses "Feb 25"', () => {
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

describe('parsePromise (regex fallback)', () => {
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

describe('PromiseParser (LLM-powered)', () => {
  it('uses LLM provider when available', async () => {
    const mockLlm: LlmProvider = {
      complete: vi.fn().mockResolvedValue(JSON.stringify({
        what: 'send contract',
        who: 'John',
        dueDate: '2026-03-15',
      })),
    };

    const parser = new PromiseParser(mockLlm);
    const result = await parser.parse('Promised to send contract to John by Mar 15', REF);

    expect(result.what).toBe('send contract');
    expect(result.who).toBe('John');
    expect(result.dueDate).toBe('2026-03-15');
    expect(mockLlm.complete).toHaveBeenCalledOnce();
  });

  it('handles LLM response wrapped in markdown code block', async () => {
    const mockLlm: LlmProvider = {
      complete: vi.fn().mockResolvedValue('```json\n{"what": "buy groceries", "who": "self", "dueDate": null}\n```'),
    };

    const parser = new PromiseParser(mockLlm);
    const result = await parser.parse('Buy groceries', REF);

    expect(result.what).toBe('buy groceries');
    expect(result.who).toBe('self');
    expect(result.dueDate).toBeNull();
  });

  it('falls back to regex when LLM fails', async () => {
    const mockLlm: LlmProvider = {
      complete: vi.fn().mockRejectedValue(new Error('API error')),
    };

    const parser = new PromiseParser(mockLlm);
    const result = await parser.parse('Send report to John by tomorrow', REF);

    expect(result.who).toBe('John');
    expect(result.dueDate).toBe('2026-02-28');
  });

  it('falls back to regex when LLM returns invalid JSON', async () => {
    const mockLlm: LlmProvider = {
      complete: vi.fn().mockResolvedValue('I cannot parse this'),
    };

    const parser = new PromiseParser(mockLlm);
    const result = await parser.parse('Send report by tomorrow', REF);

    expect(result.who).toBe('self');
    expect(result.dueDate).toBe('2026-02-28');
  });

  it('uses regex fallback when no LLM provider given', async () => {
    const parser = new PromiseParser();
    const result = await parser.parse('Follow up with Sarah by next friday', REF);

    expect(result.who).toBe('Sarah');
    expect(result.dueDate).toBe('2026-03-06');
  });
});
