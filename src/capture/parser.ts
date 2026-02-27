/**
 * Promise Parser — LLM-powered natural language extraction
 *
 * Parses free-form text into structured promise data (what, who, dueDate)
 * using an LLM via a configurable provider. Falls back to a regex-based
 * parser if no LLM provider is configured.
 *
 * @example
 * ```ts
 * const parser = new PromiseParser(myLlmProvider);
 * const result = await parser.parse("Send contract to John by Friday");
 * // { what: "send contract", who: "John", dueDate: "2026-02-28" }
 * ```
 */

export interface ParsedPromise {
  what: string;
  who: string;
  dueDate: string | null; // YYYY-MM-DD or null
}

/**
 * LLM provider interface — implement this to plug in any LLM backend.
 * The provider receives a system prompt + user message and returns the
 * LLM's text response.
 */
export interface LlmProvider {
  complete(systemPrompt: string, userMessage: string): Promise<string>;
}

const SYSTEM_PROMPT = `You are a promise parser. Extract structured data from the user's message.

Return ONLY valid JSON with these fields:
- "what": the commitment/action (string, concise)
- "who": person promised to (string, default "self" if not mentioned)
- "dueDate": deadline in YYYY-MM-DD format (string or null if no date mentioned)

Today's date is {{TODAY}}.

Rules:
- "tomorrow" = today + 1 day
- "next Friday" = the coming Friday
- "end of month" = last day of current month
- "by Friday" = this coming Friday (or next week's if today is Friday)
- If no person is mentioned, use "self"
- If no date is mentioned, set dueDate to null
- Keep "what" concise — strip filler words like "I promised to", "need to", etc.

Examples:
User: "Promised to send contract to John by Feb 25"
{"what": "send contract", "who": "John", "dueDate": "2026-02-25"}

User: "Follow up with Sarah about the demo next Friday"
{"what": "follow up about the demo", "who": "Sarah", "dueDate": "2026-02-28"}

User: "Buy groceries"
{"what": "buy groceries", "who": "self", "dueDate": null}`;

// ── Regex fallback (used when no LLM provider is configured) ──────────

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDayOfWeek(dayName: string, from: Date): Date {
  const target = DAYS.indexOf(dayName.toLowerCase());
  if (target === -1) return from;
  const current = from.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  const result = new Date(from);
  result.setDate(result.getDate() + diff);
  return result;
}

/** Parse a date string using regex heuristics (fallback when no LLM). */
export function parseDate(text: string, referenceDate: Date = new Date()): string | null {
  const lower = text.toLowerCase();

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }

  if (/\bend of (?:the )?month\b/.test(lower)) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    return fmt(d);
  }

  if (/\bend of (?:the )?week\b/.test(lower)) {
    return fmt(nextDayOfWeek('sunday', referenceDate));
  }

  const nextDayMatch = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDayMatch) {
    return fmt(nextDayOfWeek(nextDayMatch[1], referenceDate));
  }

  const monthDayMatch = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/);
  if (monthDayMatch) {
    const month = MONTHS[monthDayMatch[1]];
    const day = parseInt(monthDayMatch[2]);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : referenceDate.getFullYear();
    const d = new Date(year, month, day);
    if (!monthDayMatch[3] && d < referenceDate) d.setFullYear(d.getFullYear() + 1);
    return fmt(d);
  }

  const dayMonthMatch = lower.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = MONTHS[dayMonthMatch[2]];
    const d = new Date(referenceDate.getFullYear(), month, day);
    if (d < referenceDate) d.setFullYear(d.getFullYear() + 1);
    return fmt(d);
  }

  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

/** Parse a promise using regex heuristics (fallback when no LLM). */
export function parsePromiseRegex(text: string, referenceDate: Date = new Date()): ParsedPromise {
  const cleaned = text.trim();
  const dueDate = parseDate(cleaned, referenceDate);

  let who = 'self';
  const toMatch = cleaned.match(/\b(?:to|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (toMatch) {
    who = toMatch[1];
  }

  let what = cleaned
    .replace(/^(?:promised?\s+(?:to\s+)?|i\s+(?:need\s+to|have\s+to|should)\s+)/i, '')
    .replace(/\s+by\s+.*$/i, '')
    .trim();

  if (!what) what = cleaned;

  return { what, who, dueDate };
}

/**
 * Promise parser with LLM-powered extraction and regex fallback.
 *
 * Usage:
 * - With LLM: `new PromiseParser(llmProvider)` — uses AI for accurate parsing
 * - Without LLM: `new PromiseParser()` — falls back to regex heuristics
 */
export class PromiseParser {
  private llm: LlmProvider | null;

  constructor(llmProvider?: LlmProvider) {
    this.llm = llmProvider ?? null;
  }

  /**
   * Parse natural language into a structured promise.
   * Uses LLM if available, regex fallback otherwise.
   */
  async parse(text: string, referenceDate: Date = new Date()): Promise<ParsedPromise> {
    if (!this.llm) {
      return parsePromiseRegex(text, referenceDate);
    }

    const today = fmt(referenceDate);
    const prompt = SYSTEM_PROMPT.replace('{{TODAY}}', today);

    try {
      const response = await this.llm.complete(prompt, text);

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('LLM returned no JSON, falling back to regex');
        return parsePromiseRegex(text, referenceDate);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        what: parsed.what ?? text,
        who: parsed.who ?? 'self',
        dueDate: parsed.dueDate ?? null,
      };
    } catch (err) {
      console.warn('LLM parsing failed, falling back to regex:', err);
      return parsePromiseRegex(text, referenceDate);
    }
  }
}

// Default export for backward compatibility
export function parsePromise(text: string, referenceDate: Date = new Date()): ParsedPromise {
  return parsePromiseRegex(text, referenceDate);
}
