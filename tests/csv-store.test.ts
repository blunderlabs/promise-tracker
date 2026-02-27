import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CsvPromiseStore } from '../src/store/csv-store.js';
import { rm } from 'node:fs/promises';
import type { TrackedPromise } from '../src/types.js';

const TEST_FILE = 'data/test-promises.csv';

function makePromise(overrides: Partial<TrackedPromise> = {}): TrackedPromise {
  return {
    id: 'test-1',
    what: 'send contract',
    who: 'John',
    dueDate: '2026-03-01',
    status: 'open',
    createdAt: '2026-02-27T12:00:00.000Z',
    ...overrides,
  };
}

describe('CsvPromiseStore', () => {
  let store: CsvPromiseStore;

  beforeEach(async () => {
    store = new CsvPromiseStore(TEST_FILE);
    try { await rm(TEST_FILE); } catch {}
  });

  afterEach(async () => {
    try { await rm(TEST_FILE); } catch {}
  });

  it('should add and retrieve a promise', async () => {
    const p = makePromise();
    await store.add(p);
    const result = await store.getById('test-1');
    expect(result).not.toBeNull();
    expect(result!.what).toBe('send contract');
    expect(result!.who).toBe('John');
  });

  it('should return null for missing id', async () => {
    expect(await store.getById('nonexistent')).toBeNull();
  });

  it('should getAll', async () => {
    await store.add(makePromise({ id: 'a' }));
    await store.add(makePromise({ id: 'b' }));
    const all = await store.getAll();
    expect(all).toHaveLength(2);
  });

  it('should filter by status', async () => {
    await store.add(makePromise({ id: 'a', status: 'open' }));
    await store.add(makePromise({ id: 'b', status: 'done' }));
    expect(await store.getByStatus('open')).toHaveLength(1);
    expect(await store.getByStatus('done')).toHaveLength(1);
  });

  it('should filter by due date', async () => {
    await store.add(makePromise({ id: 'a', dueDate: '2026-03-01' }));
    await store.add(makePromise({ id: 'b', dueDate: '2026-03-02' }));
    expect(await store.getDueOn('2026-03-01')).toHaveLength(1);
  });

  it('should find overdue promises', async () => {
    await store.add(makePromise({ id: 'a', dueDate: '2026-02-25', status: 'open' }));
    await store.add(makePromise({ id: 'b', dueDate: '2026-03-15', status: 'open' }));
    await store.add(makePromise({ id: 'c', dueDate: '2026-02-20', status: 'done' }));
    const overdue = await store.getOverdue('2026-02-27');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('a');
  });

  it('should update a promise', async () => {
    await store.add(makePromise());
    await store.update('test-1', { status: 'done', completedAt: '2026-02-28T00:00:00.000Z' });
    const p = await store.getById('test-1');
    expect(p!.status).toBe('done');
    expect(p!.completedAt).toBe('2026-02-28T00:00:00.000Z');
  });

  it('should delete a promise', async () => {
    await store.add(makePromise());
    await store.delete('test-1');
    expect(await store.getById('test-1')).toBeNull();
  });

  it('should throw on update/delete of missing id', async () => {
    await expect(store.update('x', {})).rejects.toThrow();
    await expect(store.delete('x')).rejects.toThrow();
  });
});
