# Promise Tracker

Track commitments, get proactive reminders, and review what you kept vs. broke.

## Overview

A lightweight, personal system to capture promises, remind you proactively, and build trust through systematic follow-through.

## Getting Started

```bash
npm install
npm run build
npm test
```

## Architecture

```
src/
├── types.ts              # Core types (TrackedPromise, PromiseStore interface)
├── capture/
│   ├── parser.ts         # Natural language parser for promise extraction
│   └── service.ts        # Capture orchestration service
└── store/
    └── csv-store.ts      # CSV-based PromiseStore implementation
```

### Core Types (`src/types.ts`)

- **`TrackedPromise`** — A commitment with: `what`, `who`, `dueDate`, `status`, timestamps
- **`PromiseStore`** — Interface for storage backends (add, get, update, delete, query)
- **`Status`** — `open` → `done` | `broken` | `expired` (no reverse transitions)

### Capture Parser (`src/capture/parser.ts`)

Extracts structured data from natural language:

```
"Promised to send contract to John by Feb 25"
→ { what: "send contract", who: "John", dueDate: "2026-02-25" }
```

Handles: tomorrow, next Friday, end of month, explicit dates, missing fields (defaults `who` to "self").

### CSV Store (`src/store/csv-store.ts`)

File-based storage using `data/promises.csv`. Auto-creates the directory and file with headers on first use.

Implements full CRUD + query methods: `getByStatus()`, `getDueOn()`, `getOverdue()`.

### Capture Service (`src/capture/service.ts`)

Orchestrates: raw text → parser → create promise → store → confirmation message.

Returns a `needsDate` flag when the parser can't extract a due date.

## Testing

```bash
npm test          # Run all tests
npm run build     # Type-check and compile
```

23 tests covering CSV store CRUD, parser extraction, and end-to-end capture flow.

## Storage

**Phase 1:** Local CSV (`data/promises.csv`)
**Phase 2:** Google Sheets (swap via `PromiseStore` interface, no logic changes)

## Links

- [Project Board](https://github.com/orgs/blunderlabs/projects/1)
- [PRD & Docs](https://github.com/blunderlabs/forge/tree/main/docs/promise-tracker)

## License

Private
