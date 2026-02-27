/**
 * Capture Service — orchestrates promise capture from raw text.
 *
 * Flow: raw text → PromiseParser (LLM or regex) → store → confirmation
 *
 * @example
 * ```ts
 * const store = new CsvPromiseStore('data/promises.csv');
 * const parser = new PromiseParser(myLlmProvider);
 * const service = new CaptureService(store, parser);
 *
 * const result = await service.capture("Send contract to John by Friday");
 * console.log(result.message); // 'Tracked: "send contract" → John due 2026-02-28 ✓'
 * ```
 */

import { randomUUID } from 'node:crypto';
import type { TrackedPromise, PromiseStore } from '../types.js';
import { PromiseParser, type LlmProvider } from './parser.js';

export interface CaptureResult {
  promise: TrackedPromise;
  message: string;
  needsDate: boolean;
}

export class CaptureService {
  private parser: PromiseParser;

  /**
   * @param store - Storage backend implementing PromiseStore
   * @param parserOrLlm - A PromiseParser instance, an LlmProvider, or omit for regex fallback
   */
  constructor(
    private store: PromiseStore,
    parserOrLlm?: PromiseParser | LlmProvider,
  ) {
    if (parserOrLlm instanceof PromiseParser) {
      this.parser = parserOrLlm;
    } else {
      this.parser = new PromiseParser(parserOrLlm);
    }
  }

  /**
   * Capture a promise from raw natural language text.
   * Parses, stores, and returns a confirmation message.
   */
  async capture(rawText: string, referenceDate: Date = new Date()): Promise<CaptureResult> {
    const parsed = await this.parser.parse(rawText, referenceDate);

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

  /** Update the due date for a previously captured promise. */
  async setDueDate(id: string, dueDate: string): Promise<void> {
    await this.store.update(id, { dueDate });
  }
}
