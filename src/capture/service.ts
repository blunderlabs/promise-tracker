import { randomUUID } from 'node:crypto';
import type { TrackedPromise, PromiseStore } from '../types.js';
import { parsePromise } from './parser.js';

export interface CaptureResult {
  promise: TrackedPromise;
  message: string;
  needsDate: boolean;
}

export class CaptureService {
  constructor(private store: PromiseStore) {}

  async capture(rawText: string, referenceDate: Date = new Date()): Promise<CaptureResult> {
    const parsed = parsePromise(rawText, referenceDate);

    const promise: TrackedPromise = {
      id: randomUUID(),
      what: parsed.what,
      who: parsed.who,
      dueDate: parsed.dueDate ?? '',
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    await this.store.add(promise);

    const needsDate = !parsed.dueDate;
    const datePart = parsed.dueDate ? ` due ${parsed.dueDate}` : '';
    const message = needsDate
      ? `Tracked: "${parsed.what}" → ${parsed.who}. When is this due?`
      : `Tracked: "${parsed.what}" → ${parsed.who}${datePart} ✓`;

    return { promise, message, needsDate };
  }

  async setDueDate(id: string, dueDate: string): Promise<void> {
    await this.store.update(id, { dueDate });
  }
}
