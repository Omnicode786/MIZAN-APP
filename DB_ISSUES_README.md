# MIZAN Database Warning and Slow Query Notes

## What The Terminal Warnings Mean

The `db.slow_query` lines are structured observability logs from `src/lib/prisma.ts`.
They do not always mean a query is logically broken. In local development, MIZAN often talks to a remote Neon database, so a single healthy query can take 400-500ms because of network round trip or Neon cold-start latency.

The real issue in the pasted logs was not one bad SQL statement. It was repeated small queries:

- repeated user/profile lookups
- repeated case access checks
- repeated `COUNT(*)` queries for section totals
- four separate case section requests on the same page
- a full route refresh after a simple case title/status save

Those repeated round trips made the terminal noisy and made the case workspace feel slower.

## What Was Fixed

### 1. User/Profile Query Projection

File: `src/lib/auth.ts`

`getCurrentUserWithProfile()` now selects only the fields the app actually uses for session/profile work. It no longer fetches `passwordHash`, profile timestamps, or full profile rows during normal authenticated page/API requests.

The function is request-cached and now fetches only the profile for the active role:

- client sessions load `ClientProfile`
- lawyer sessions load `LawyerProfile`
- admin sessions do not load client/lawyer profile rows

This prevents layout and page components from repeating the same user/profile query inside one server render.

Benefit:

- less sensitive data loaded into memory
- smaller DB payloads
- smaller Prisma result objects

### 2. Bundled Case Workspace Sections Endpoint

File: `src/app/api/cases/[id]/sections/route.ts`

The workspace now has one bundled API endpoint for first-page section data:

- documents
- timeline events
- evidence items
- activity logs
- totals from the case `_count`

This replaces the frontend pattern where the page called four separate endpoints at once.

Benefit:

- one auth/profile lookup instead of four
- one case access check instead of four
- one `_count` projection instead of four separate `COUNT(*)` queries
- parallel section reads inside one request

### 3. Frontend Section Loading Reduced

File: `src/components/workspace/case-workspace-live.tsx`

`loadCaseSections()` now calls:

`/api/cases/:id/sections?documentsLimit=20&timelineLimit=50&evidenceLimit=50&activityLimit=30`

instead of calling:

- `/api/cases/:id/documents`
- `/api/cases/:id/timeline`
- `/api/cases/:id/evidence`
- `/api/cases/:id/activity`

The old endpoints still exist for future pagination or direct section loading.

### 4. Existing Section Endpoints Optimized

Files:

- `src/app/api/cases/[id]/documents/route.ts`
- `src/app/api/cases/[id]/timeline/route.ts`
- `src/app/api/cases/[id]/evidence/route.ts`
- `src/app/api/cases/[id]/activity/route.ts`

Each endpoint now:

- validates access once through the case query
- gets the relevant total from `_count`
- avoids an extra `prisma.model.count()` query
- keeps lean `select` projections

### 5. Case PATCH Route Optimized

File: `src/app/api/cases/[id]/route.ts`

The case update route no longer calls `getAccessibleCase()`, which loaded a broad case workspace shape just to check access. It now performs a lean access query:

`select: { id: true }`

The frontend also no longer calls `router.refresh()` after a simple case field save, because the edited fields are already in local state.

Benefit:

- fewer auth/profile calls
- no unnecessary full workspace reload after saving title/status/stage/priority/description

### 6. Initial Case Detail Payload Trimmed

File: `src/lib/data-access.ts`

The initial case detail query now keeps smaller first-load limits for large relation buckets:

- deadlines: 25
- drafts: 6
- draft versions: 2 per draft
- comments/internal notes: 15
- agent action reviews: 12
- consultations: 10
- assistant messages: 6 per thread
- debate turns: 20 per session
- risk scores: explicitly limited

Benefit:

- smaller payloads
- less relation fan-out
- less memory work during page render

### 7. Slow Query Threshold Tuned

File: `src/lib/prisma.ts`

Default slow query thresholds are now:

- production: `500ms`
- local/dev: `1000ms`

You can override with:

```env
DB_SLOW_QUERY_MS=750
```

This keeps real production warnings visible while avoiding local Neon round-trip spam.

### 8. Transient Connection Retry

File: `src/lib/prisma.ts`

Remote Neon/Postgres connections can be closed while the dev server is idle or while HMR is recompiling. The app now retries safe read operations when Prisma reports transient connection failures such as:

- `Server has closed the connection`
- `Connection reset`
- `An existing connection was forcibly closed by the remote host`
- Prisma connection codes such as `P1001`, `P1002`, `P1008`, `P1017`, and `P2024`

Only read operations are retried automatically:

- `findUnique`
- `findFirst`
- `findMany`
- `count`
- `aggregate`
- `groupBy`

Database writes are not retried automatically because retrying creates/updates/deletes after a dropped connection can duplicate side effects.

Transient Prisma connection events are logged as `db.connection_transient` or `db.transient_retry` instead of scary application errors when the retry can recover.

### 9. Assistant Message Relation Load Fixed

Files:

- `src/app/client/assistant/page.tsx`
- `src/lib/data-access.ts`

The assistant pages no longer use nested Prisma relation loading for `AssistantThread.messages`, because Prisma can batch relation reads into a query shaped like:

`WHERE "threadId" IN (...) ORDER BY "createdAt" DESC OFFSET ...`

That can fetch too many messages when many threads exist. The app now:

- loads assistant threads without messages
- fetches recent messages with a Postgres window function
- limits messages to 6 per thread
- keeps the UI response shape unchanged

## Why This Was A DB Issue

The database itself was not necessarily missing indexes for every warning. The schema already has important indexes for high-frequency case workspace access:

- `Case.clientProfileId, updatedAt`
- `CaseAssignment.lawyerProfileId, status, updatedAt`
- `Document.caseId, createdAt`
- `TimelineEvent.caseId, eventDate`
- `EvidenceItem.caseId, createdAt`
- `ActivityLog.caseId, createdAt`
- `AssistantThread.caseId, updatedAt`

The issue was mostly access-path inefficiency:

- too many separate HTTP requests
- each request repeating the same auth and authorization queries
- repeated counts for the same case
- broad access helper used in a route that only needed `id`
- local slow-query threshold set below typical remote Neon round-trip latency

## Remaining Notes

Some first queries after idling may still be slow on Neon because serverless compute can wake from idle. That is expected behavior for remote serverless Postgres.

If workspace traffic grows much larger, the next practical optimizations are:

- cursor pagination for long activity/timeline/history lists
- lazy loading for drafts, agent action reviews, consultations, assistant threads, and debate sessions
- Redis or Vercel KV for safe per-user dashboard summary caching
- Neon read replica for read-heavy reporting
- background jobs for document/OCR/AI processing

## How To Verify

Run:

```bash
npm run lint
npm run build
```

Then open a case workspace and confirm:

- the first workspace section load calls `/api/cases/:id/sections`
- the terminal no longer prints four repeated auth/profile/access/count bursts for one workspace page
- saving case fields does not trigger a full page reload
- document, timeline, evidence, and activity panels still render
