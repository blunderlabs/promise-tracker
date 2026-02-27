export interface ParsedPromise {
  what: string;
  who: string;
  dueDate: string | null; // YYYY-MM-DD or null
}

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

export function parseDate(text: string, referenceDate: Date = new Date()): string | null {
  const lower = text.toLowerCase();

  // "tomorrow"
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }

  // "end of month"
  if (/\bend of (?:the )?month\b/.test(lower)) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    return fmt(d);
  }

  // "end of week" → next Sunday
  if (/\bend of (?:the )?week\b/.test(lower)) {
    return fmt(nextDayOfWeek('sunday', referenceDate));
  }

  // "next Friday" etc.
  const nextDayMatch = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDayMatch) {
    return fmt(nextDayOfWeek(nextDayMatch[1], referenceDate));
  }

  // "Feb 25", "February 25", "25 Feb", "Feb 25 2026"
  const monthDayMatch = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/);
  if (monthDayMatch) {
    const month = MONTHS[monthDayMatch[1]];
    const day = parseInt(monthDayMatch[2]);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : referenceDate.getFullYear();
    const d = new Date(year, month, day);
    // If date is in the past and no year specified, bump to next year
    if (!monthDayMatch[3] && d < referenceDate) d.setFullYear(d.getFullYear() + 1);
    return fmt(d);
  }

  // "25 Feb" format
  const dayMonthMatch = lower.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = MONTHS[dayMonthMatch[2]];
    const d = new Date(referenceDate.getFullYear(), month, day);
    if (d < referenceDate) d.setFullYear(d.getFullYear() + 1);
    return fmt(d);
  }

  // YYYY-MM-DD
  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

export function parsePromise(text: string, referenceDate: Date = new Date()): ParsedPromise {
  let cleaned = text.trim();

  // Extract date portion (everything after "by ...")
  const dueDate = parseDate(cleaned, referenceDate);

  // Extract "who" — look for "to <Name>", "with <Name>"
  let who = 'self';
  const toMatch = cleaned.match(/\b(?:to|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (toMatch) {
    who = toMatch[1];
  }

  // Extract "what" — strip common prefixes and the "to/with Person" and "by date" parts
  let what = cleaned
    .replace(/^(?:promised?\s+(?:to\s+)?|i\s+(?:need\s+to|have\s+to|should)\s+)/i, '')
    .replace(/\s+by\s+.*$/i, '')  // remove "by <date>"
    .trim();

  // If what is empty, use original
  if (!what) what = cleaned;

  return { what, who, dueDate };
}
