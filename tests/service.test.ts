import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureService } from '../src/capture/service.js';
import { CsvPromiseStore } from '../src/store/csv-store.js';
import { rm } from 'node:fs/promises';

const TEST_FILE = 'data/test-service.csv';
const REF = new Date('2026-02-27T12:00:00Z');

describe('CaptureService', () => {
  let store: CsvPromiseStore;
  let service: CaptureService;

  beforeEach(async () => {
    store = new CsvPromiseStore(TEST_FILE);
    service = new CaptureService(store);
    try { await rm(TEST_FILE); } catch {}
  });

  afterEach(async () => {
    try { await rm(TEST_FILE); } catch {}
  });

  it('captures a promise with date', async () => {
    const result = await service.capture('Send contract to John by Mar 15', REF);
    expect(result.needsDate).toBe(false);
    expect(result.promise.who).toBe('John');
    expect(result.promise.dueDate).toBe('2026-03-15');
    expect(result.message).toContain('✓');

    const stored = await store.getAll();
    expect(stored).toHaveLength(1);
  });

  it('captures a promise without date and flags needsDate', async () => {
    const result = await service.capture('Send report to John', REF);
    expect(result.needsDate).toBe(true);
    expect(result.message).toContain('When is this due?');
  });

  it('setDueDate updates the promise', async () => {
    const result = await service.capture('Send report to John', REF);
    await service.setDueDate(result.promise.id, '2026-04-01');
    const updated = await store.getById(result.promise.id);
    expect(updated!.dueDate).toBe('2026-04-01');
  });
});
