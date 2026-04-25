# MIZAN

<p align="center">
  <img src="./public/logo-cropped.png" alt="MIZAN logo" width="220" />
</p>

<p align="center">
  <strong>AI legal case operating system for Pakistani legal workflows</strong>
</p>

<p align="center">
  Case-first legal intake, document intelligence, evidence organization, lawyer discovery, drafting, debate, and collaboration in one Next.js app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/React-18-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI-6E56CF?style=for-the-badge" alt="Gemini and OpenAI" />
</p>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#platform-map">Platform Map</a> |
  <a href="#feature-matrix">Feature Matrix</a> |
  <a href="#agentic-ai-workflows">Agentic AI Workflows</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#route-inventory">Route Inventory</a>
</p>

> [!IMPORTANT]
> MIZAN is not designed as a generic legal chatbot. It is a case-first workflow platform where AI helps structure, summarize, search, draft, translate, and stress-test legal work, while the underlying source of truth remains the case record.

> [!NOTE]
> The codebase already includes a few demo-oriented or placeholder surfaces. The pricing page is explicitly placeholder content, the standalone redaction page is a preview harness for the masking engine, and the production hardening checklist at the end of this README calls out the main next steps before shipping broadly.

## Table of Contents

- [Overview](#overview)
- [Why MIZAN exists](#why-mizan-exists)
- [Platform Map](#platform-map)
- [Feature Matrix](#feature-matrix)
- [How MIZAN works](#how-mizan-works)
- [Core Modules](#core-modules)
- [AI and legal intelligence](#ai-and-legal-intelligence)
- [Agentic AI Workflows](#agentic-ai-workflows)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Route Inventory](#route-inventory)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [Generated Files and Storage](#generated-files-and-storage)
- [Security and Permission Model](#security-and-permission-model)
- [Production Checklist](#production-checklist)

## Overview

MIZAN is a full-stack legal-tech platform for two main user groups:

1. **Clients**, who need help turning messy legal problems into structured, evidence-backed matters.
2. **Lawyers**, who need a cleaner review workspace with faster case triage, drafting support, deadline tracking, and controlled collaboration.

The product is built around a central database-backed `Case` model. Every major workflow connects back to that case:

- documents
- evidence items
- timeline events
- deadlines
- drafts and draft versions
- comments
- lawyer-only internal notes
- AI assistant threads
- lawyer assignments and proposals
- debate sessions
- export bundles
- activity logs

In practice, that means MIZAN behaves like a **legal case operating system**, not a collection of disconnected tools.

## Why MIZAN exists

Many legal problems start the same way:

- evidence is scattered across screenshots, PDFs, WhatsApp messages, emails, and receipts
- clients do not know what matters legally
- lawyers receive incomplete or unstructured files
- deadlines are missed because nobody organized them early
- draft notices or complaints start from scratch every time

MIZAN solves this by making the workflow structured from day one:

- create a matter
- upload evidence
- extract useful context
- build a timeline
- detect deadlines
- ask grounded AI questions
- generate working drafts
- hand the case to a lawyer in a cleaner state

## Platform Map

```mermaid
flowchart LR
    Landing[Public landing page] --> Directory[Public lawyer directory]
    Landing --> Auth[Signup and login]
    Auth --> Client[Client workspace]
    Auth --> Lawyer[Lawyer workspace]

    Client --> Cases[Case workspace]
    Cases --> Upload[Document upload and extraction]
    Upload --> AI[AI summary and case reasoning]
    AI --> Evidence[Evidence vault]
    AI --> Timeline[Timeline and deadlines]
    AI --> Drafts[Drafting studio]
    AI --> Assistant[Case-aware assistant]

    Client --> Share[Structured lawyer request]
    Share --> Proposal[Proposal and approval flow]
    Proposal --> Lawyer

    Lawyer --> Review[Review workspace]
    Lawyer --> Debate[Debate mode]
    Lawyer --> Notes[Internal notes]
    Lawyer --> Profile[Public profile management]
    Lawyer --> Analytics[Analytics and dashboards]

    Evidence --> Search[Investigation-style search]
    Timeline --> Export[Export bundles]
    Upload --> Redaction[Redaction jobs]
```

## Feature Matrix

| Capability | Public | Client | Lawyer |
| --- | --- | --- | --- |
| Landing page and product narrative | Yes | Yes | Yes |
| Public lawyer directory before login | Yes | Yes | Yes |
| Signup and login | Yes | Yes | Yes |
| Create and manage cases | No | Yes | Review only on assigned matters |
| Upload documents into a case | No | Yes | Yes |
| AI document summaries | No | Yes | Yes |
| Evidence vault and case search | No | Yes | Yes |
| Timeline and deadlines | No | Yes | Yes |
| Draft generation and versioning | No | Yes | Yes |
| Case-aware AI assistant | No | Yes | Yes |
| General client AI assistant | No | Yes | No |
| Send lawyer requests | No | Yes | No |
| Send proposals | No | No | Yes |
| Approve or decline proposals | No | Yes | No |
| Lawyer-only internal notes | No | No | Yes |
| Debate mode | No | No | Yes |
| Redaction API and preview | Preview only | Yes | Yes |
| Export case bundle PDF | No | Yes | Yes |
| Notifications feed | No | Yes | Yes |
| Multilingual UI and AI output | Yes | Yes | Yes |

## How MIZAN works

### 1. Upload to analysis pipeline

```mermaid
sequenceDiagram
    participant User
    participant UI as Case Workspace UI
    participant API as /api/documents/upload
    participant Storage as public/uploads
    participant Extract as document-pipeline/extract
    participant AI as AI provider layer
    participant DB as Prisma/PostgreSQL

    User->>UI: Upload document
    UI->>API: POST multipart form
    API->>Storage: Save original file
    API->>Extract: Extract text from PDF/image/doc
    API->>AI: Summarize and classify content
    API->>API: Build clause heatmap
    API->>API: Extract timeline events
    API->>API: Extract deadlines
    API->>DB: Create Document record
    API->>DB: Create EvidenceItem
    API->>DB: Create TimelineEvent records
    API->>DB: Create Deadline records
    API->>DB: Update case health scores and stage
    DB-->>UI: Return analysis payload
    UI-->>User: Show summary, evidence, dates, and updated workspace
```

### 2. Client to lawyer handoff flow

```mermaid
flowchart TD
    A[Client creates case] --> B[Client uploads evidence]
    B --> C[Case becomes analysis-ready]
    C --> D[Client browses public lawyers]
    D --> E[Client sends lawyer request]
    E --> F[CaseAssignment status = PENDING]
    F --> G[Lawyer reviews matter]
    G --> H[Lawyer sends proposal]
    H --> I{Client decision}
    I -->|Approve| J[Assignment ACCEPTED]
    J --> K[sharedWithLawyerAt set]
    K --> L[Contact details unlocked]
    I -->|Decline| M[Assignment DECLINED]
```

### 3. Case lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT : optional saved draft matter
    DRAFT --> INTAKE : case opened for intake
    INTAKE --> ACTIVE : upload and analysis ready
    ACTIVE --> REVIEW : active workspace review
    REVIEW --> ESCALATED : formal escalation needed
    REVIEW --> CLOSED : resolved or completed
    ACTIVE --> CLOSED : resolved early
    ESCALATED --> CLOSED : outcome recorded
```

## Core Modules

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Landing page** | High-end product landing page with motion, product pillars, and role-based messaging | `src/app/page.tsx` uses Framer Motion, shared UI primitives, and product narrative blocks |
| **Public lawyer directory** | Searchable, filterable list of public lawyers before login | `src/app/lawyers/page.tsx` plus `PublicLawyersDirectory` backed by `lawyerProfile.isPublic` |
| **Authentication** | Signup, login, logout, session restore | API routes under `src/app/api/auth/*`, JWT cookie named `mizan_session`, middleware protection for `/client/*` and `/lawyer/*` |
| **Client dashboard** | Matter readiness, active cases, deadlines, timeline, AI shortcuts | `src/app/client/dashboard/page.tsx` plus `getDashboardSnapshot()` |
| **Lawyer dashboard** | Assigned matters, readiness overview, deadline cockpit, recent timeline | `src/app/lawyer/dashboard/page.tsx` plus role-scoped snapshot queries |
| **Case workspace** | The live operating surface for a matter | `CaseWorkspaceLive` composes uploads, comments, deadlines, drafts, AI assistant, timeline, activity, and proposals |
| **Smart document intake** | Upload files and immediately get summaries, tags, dates, and action signals | `POST /api/documents/upload` saves files, extracts text, summarizes via AI, builds evidence, timeline, deadlines, and updates scores |
| **Evidence vault** | Searchable evidence records tied to documents and cases | `EvidenceItem` records store summaries, extracted entities, searchable text, and strength |
| **Timeline and deadlines** | Event stream plus date tracking | Timeline events come from roadmap items, AI extraction, and manual system actions; deadlines support create/update/delete |
| **AI legal assistant** | Document-aware and case-aware chat with stored threads | `AssistantThread` and `AssistantMessage` persist chat history; AI answers are grounded in case data and Pakistan-law starter context |
| **Client AI assistant page** | Separate AI workspace with general mode and case-attached mode | `src/app/client/assistant/page.tsx` and `client-ai-assistant.tsx` manage new conversations, thread selection, and mode switching |
| **Drafting studio** | Generate, edit, verify, and version legal drafts | `Draft` plus `DraftVersion`; `POST /api/drafts/generate` creates or regenerates lawyer-editable drafts |
| **Proposal workflow** | Clients request lawyers, lawyers respond with fee/probability/notes, clients approve or decline | `CaseAssignment` plus `/api/cases/[id]/share` and `/api/assignments/[id]` |
| **Debate mode** | Lawyers argue against AI opposing counsel and receive an evaluation | `DebateSession` and `DebateTurn`, backed by `generateDebateOpposition()` and `evaluateDebate()` |
| **Investigation search** | Cross-document and cross-evidence search by text, summaries, tags, names, clauses, dates, payments, and Urdu term expansion | `POST /api/search` with role-scoped Prisma filters and Urdu-to-English expansion |
| **Redaction** | Mask sensitive text before sharing | `POST /api/redactions` creates a `RedactionJob` and writes redacted output to `public/redactions`; the standalone page previews the logic |
| **Exports** | Generate a compact PDF case bundle | `POST /api/exports` creates an `ExportBundle` using `pdf-lib` and stores a PDF in `public/exports` |
| **Notifications** | Requests, proposals, and workflow updates feed | `Notification` model plus page at `/notifications` |
| **Localization** | English, Urdu, and Roman Urdu UI and AI output | `use-language`, `LanguageRuntime`, `language.ts`, RTL handling for Urdu, AI requests receive selected language |
| **Theme system** | Light and dark mode across the app | `ThemeProvider`, `mizan-theme` local storage, early theme script in `layout.tsx` |

## AI and legal intelligence

### Provider architecture

MIZAN supports three AI providers through a single abstraction:

- `gemini`
- `openai`
- `mock`

The provider entry point lives in `src/lib/ai/index.ts`.

### What the AI layer does

- answers grounded case and document questions
- supports general assistant conversations
- performs permission-safe workflow actions when agent mode is enabled
- summarizes uploaded files
- generates thread titles from first-message intent
- creates draft content from case context
- generates opposition arguments for debate mode
- evaluates completed debates
- translates markdown responses into Urdu or Roman Urdu

### Grounding sources

Depending on the request, the AI layer can use:

- live case context built from the database
- uploaded document summaries and extracted text
- evidence records
- timeline events
- deadlines
- drafts
- risk scores
- public lawyer directory snapshot
- Pakistan-law starter retrieval context from `src/lib/pakistan-law`

### Formatting strategy

The AI layer intentionally switches behavior based on the user prompt:

- **casual/app messages** get short natural replies
- **legal or case-specific prompts** get structured markdown answers

This behavior is implemented in `src/lib/legal-ai.ts`, which also prevents prompt echoing and stores chat messages separately per thread.

## Agentic AI Workflows

MIZAN's client assistant can now operate as an **agentic legal workflow assistant**, not only a question-answering chat.

When the user explicitly asks for an action, the assistant can decide whether to:

- answer normally
- ask a follow-up for missing structured information
- execute a safe backend workflow action through the app

### What agent mode can do

- create a new case from a natural-language story
- update safe case fields such as title, description, stage, status, and priority
- add timeline events and deadlines
- generate case drafts and editable template-style documents through the existing draft system
- summarize a case, create evidence-gap lists, build roadmaps, and prepare lawyer handoff briefs
- search the user's accessible cases, documents, and evidence
- prepare lawyer-side strategy materials on assigned matters only

### How case intake works

```mermaid
flowchart LR
    User["Client message"] --> Agent["Agent decision layer"]
    Agent -->|"Needs clarification"| FollowUp["Ask follow-up question"]
    Agent -->|"Normal question"| Answer["Return grounded legal answer"]
    Agent -->|"Explicit action request"| Tool["Safe tool execution"]
    Tool --> Auth["Current user + role check"]
    Auth --> Access["Case/document access validation"]
    Access --> DB["Prisma-backed workflow write"]
    DB --> Log["Activity log where relevant"]
    Log --> Reply["Formatted assistant response + action card"]
```

### Safety model

- all tool execution stays server-side
- every action runs with the current authenticated user
- client actions are scoped to the client's own matters
- lawyer actions are scoped to assigned matters
- destructive delete tools are intentionally not implemented
- internal IDs, provider errors, prompts, and stack traces are not exposed to the user
- the AI remains assistive and lawyer-reviewable; it does not replace professional legal judgment

### Current implementation notes

- agent decisions are handled in [src/lib/ai/agent-runner.ts](C:/Users/muzam/OneDrive/Desktop/Programming/MIZAN-APP/src/lib/ai/agent-runner.ts)
- tool definitions and handlers live in [src/lib/ai/agent-tools.ts](C:/Users/muzam/OneDrive/Desktop/Programming/MIZAN-APP/src/lib/ai/agent-tools.ts)
- the structured decision prompt lives in [src/lib/ai/prompts/case-intake-agent.ts](C:/Users/muzam/OneDrive/Desktop/Programming/MIZAN-APP/src/lib/ai/prompts/case-intake-agent.ts)
- `/api/ai/chat` now supports normal chat and agent mode without changing the public route shape
- successful actions can return a UI action card, such as an "Open case" button after AI intake creates a new matter

### Example

If a client says:

> I paid 150,000 PKR to a vendor on 12 March. Delivery was promised by 20 March but never happened. I have screenshots and bank transfer proof. Create a case for me.

The assistant can:

1. recognize that this is an explicit case-creation request
2. extract title, category, priority, facts, evidence, dates, and suggested next steps
3. create the case in the database under the current client's profile
4. add roadmap and timeline entries where supported
5. add deadlines where enough structured dates are available
6. return a formatted response plus a direct case link in the chat

## Architecture

```mermaid
flowchart TB
    subgraph Frontend
        Pages[Next.js App Router pages]
        UI[shadcn-style UI and workspace components]
        State[Client state and local preferences]
    end

    subgraph Server
        Routes[Route handlers in src/app/api]
        Auth[JWT session and role checks]
        Services[lib services and document pipeline]
    end

    subgraph Data
        Prisma[Prisma ORM]
        Postgres[(PostgreSQL)]
        Files[public/uploads, redactions, exports]
    end

    subgraph AI
        Providers["Gemini | OpenAI | Mock"]
        Retrieval[Pakistan-law retrieval context]
    end

    Pages --> UI
    UI --> Routes
    State --> Pages
    Routes --> Auth
    Routes --> Services
    Services --> Prisma
    Prisma --> Postgres
    Services --> Files
    Services --> Providers
    Services --> Retrieval
```

### Architectural highlights

- **Next.js App Router** powers public pages, protected workspaces, and API routes in one codebase.
- **Prisma + PostgreSQL** persist all legal workflow entities.
- **Local file storage** is used for uploads, redactions, and PDF exports.
- **AI is server-side only** and wrapped behind safe route handlers and provider adapters.
- **Permissions are role-aware** and enforced in both route handlers and query filters.

## Data Model

The full Prisma schema is in `prisma/schema.prisma`. The core relationships look like this:

```mermaid
erDiagram
    USER ||--o| CLIENT_PROFILE : has
    USER ||--o| LAWYER_PROFILE : has
    USER ||--o{ CASE : creates
    CLIENT_PROFILE ||--o{ CASE : owns
    CASE ||--o{ DOCUMENT : contains
    CASE ||--o{ EVIDENCE_ITEM : contains
    CASE ||--o{ TIMELINE_EVENT : records
    CASE ||--o{ DEADLINE : tracks
    CASE ||--o{ DRAFT : stores
    CASE ||--o{ COMMENT : contains
    CASE ||--o{ INTERNAL_NOTE : contains
    CASE ||--o{ ACTIVITY_LOG : writes
    CASE ||--o{ RISK_SCORE : scores
    CASE ||--o{ ASSISTANT_THREAD : has
    ASSISTANT_THREAD ||--o{ ASSISTANT_MESSAGE : contains
    CASE ||--o{ DEBATE_SESSION : has
    DEBATE_SESSION ||--o{ DEBATE_TURN : contains
    CASE ||--o{ CASE_ASSIGNMENT : routes
    LAWYER_PROFILE ||--o{ CASE_ASSIGNMENT : receives
    DOCUMENT ||--o{ EVIDENCE_ITEM : seeds
    DOCUMENT ||--o{ TIMELINE_EVENT : sources
    DOCUMENT ||--o{ DEADLINE : sources
    DRAFT ||--o{ DRAFT_VERSION : versions
```

### Core entities

| Entity | Purpose |
| --- | --- |
| `User` | Base account with role and session identity |
| `ClientProfile` | Client-specific settings such as simple language mode |
| `LawyerProfile` | Public-facing lawyer profile, specialties, pricing signal, verification flag |
| `Case` | Central matter record with readiness scores and workflow stage |
| `Document` | Uploaded files plus extracted text, AI summary, metadata, and tags |
| `EvidenceItem` | Searchable evidence abstraction derived from documents or manual workflow |
| `TimelineEvent` | Chronological case signals from system, AI extraction, and roadmap |
| `Deadline` | Actionable dates, either AI-detected or manually managed |
| `Draft` / `DraftVersion` | Editable legal drafts with version history and verification state |
| `Comment` | Shared collaboration thread items |
| `InternalNote` | Lawyer-only strategy notes |
| `CaseAssignment` | Lawyer request / proposal / approval workflow |
| `AssistantThread` / `AssistantMessage` | Persisted AI conversations |
| `DebateSession` / `DebateTurn` | Lawyer-vs-AI argument simulation records |
| `RedactionJob` | Masked output generation jobs |
| `ExportBundle` | Generated case bundle artifacts |
| `Notification` | Workflow update feed |

## Route Inventory

### Public pages

| Path | Purpose |
| --- | --- |
| `/` | Marketing/positioning landing page |
| `/lawyers` | Public lawyer directory before login |
| `/login` | Login form and theme-aware auth surface |
| `/signup` | Role-aware account creation |
| `/pricing` | Placeholder pricing page for demo storytelling |
| `/redaction` | Public preview of masking logic used by the redaction engine |

### Shared authenticated pages

| Path | Purpose |
| --- | --- |
| `/search` | Investigation-style search across accessible documents and evidence |
| `/notifications` | Requests, proposals, deadlines, and activity updates |
| `/settings` | Present route shell for future shared settings expansion |

### Client workspace pages

| Path | Purpose |
| --- | --- |
| `/client/dashboard` | Client overview, readiness, active matters, deadlines, timeline |
| `/client/cases` | List and create cases |
| `/client/cases/[id]` | Live case workspace |
| `/client/assistant` | General and case-attached client AI workspace |
| `/client/lawyers` | In-app lawyer discovery flow |
| `/client/upload` | Upload center |
| `/client/drafts` | Drafting studio |
| `/client/deadlines` | Deadline tracking surface |
| `/client/evidence` | Evidence vault |
| `/client/collaboration` | Shared collaboration surface |
| `/client/timeline` | Case timeline surface |

### Lawyer workspace pages

| Path | Purpose |
| --- | --- |
| `/lawyer/dashboard` | Lawyer overview, assigned matters, deadline cockpit |
| `/lawyer/cases` | Case queue |
| `/lawyer/cases/[id]` | Live case workspace on assigned matters |
| `/lawyer/review` | Review workspace |
| `/lawyer/drafts` | Draft approvals and verification |
| `/lawyer/deadlines` | Deadline cockpit |
| `/lawyer/debate` | Debate mode |
| `/lawyer/analytics` | Lawyer analytics and summary panels |
| `/lawyer/internal-notes` | Lawyer internal note surface |
| `/lawyer/profile` | Public profile editor |

### API surface

<details>
<summary><strong>Authentication</strong></summary>

| Route | Purpose |
| --- | --- |
| `/api/auth/signup` | Create user and session |
| `/api/auth/login` | Authenticate and issue session |
| `/api/auth/logout` | Clear session |
| `/api/auth/me` | Current user session info |

</details>

<details>
<summary><strong>Cases and lawyer requests</strong></summary>

| Route | Purpose |
| --- | --- |
| `/api/cases` | List cases by role, create cases as client |
| `/api/cases/[id]` | Get, update, or delete a specific case |
| `/api/cases/[id]/share` | Request lawyer review for a case |
| `/api/assignments/[id]` | Lawyer proposal submission and client decision |

</details>

<details>
<summary><strong>Documents, evidence, search, and exports</strong></summary>

| Route | Purpose |
| --- | --- |
| `/api/documents/upload` | Upload, extract, summarize, build evidence, timeline, and deadlines |
| `/api/documents/[id]` | Document-level management |
| `/api/search` | Investigation-style search over documents and evidence |
| `/api/redactions` | Create redacted text output for a case document |
| `/api/exports` | Build a PDF case bundle |

</details>

<details>
<summary><strong>AI and analysis</strong></summary>

| Route | Purpose |
| --- | --- |
| `/api/ai/chat` | Persisted AI assistant chat with optional agent-mode workflow actions |
| `/api/ai/translate` | Markdown-preserving translation |
| `/api/analysis/case/[id]` | Case-level analysis from built case context |
| `/api/drafts/generate` | Generate legal drafts from live case context |
| `/api/debate/session` | Start debate sessions |
| `/api/debate/session/[id]` | Continue or finalize debate sessions |

</details>

<details>
<summary><strong>Profiles, comments, and deadlines</strong></summary>

| Route | Purpose |
| --- | --- |
| `/api/client-profile` | Client profile read/update |
| `/api/lawyer-profile` | Lawyer profile read/update |
| `/api/lawyers/public` | Public lawyer discovery API |
| `/api/comments` | Shared comments create/delete |
| `/api/internal-notes` | Lawyer-only notes |
| `/api/deadlines` | Deadline create/update/delete |

</details>

## Tech Stack

| Layer | Technology |
| --- | --- |
| App framework | Next.js 14 App Router |
| UI | React 18, Tailwind CSS, class-variance-authority, Lucide icons |
| Motion | Framer Motion |
| Database | PostgreSQL |
| ORM | Prisma 5 |
| Auth | JWT session via `jose`, cookie-based session |
| Validation | Zod |
| AI providers | Gemini, OpenAI, Mock fallback |
| File handling | Local filesystem storage under `public/` |
| PDF generation | `pdf-lib` |
| Document parsing | `pdf-parse`, `mammoth` |
| Charts and dashboards | Recharts |
| Dates | `date-fns` |

## Repository Structure

```text
.
|-- prisma/
|   |-- migrations/
|   |-- schema.prisma
|   `-- seed.ts
|-- public/
|   |-- exports/
|   |-- redactions/
|   |-- uploads/
|   `-- logo assets
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |-- client/
|   |   |-- lawyer/
|   |   |-- lawyers/
|   |   |-- login/
|   |   |-- pricing/
|   |   |-- redaction/
|   |   |-- search/
|   |   `-- signup/
|   |-- components/
|   |   |-- ui/
|   |   `-- workspace/
|   |-- hooks/
|   `-- lib/
|       |-- ai/
|       |-- document-pipeline/
|       |-- pakistan-law/
|       |-- pdf/
|       |-- auth.ts
|       |-- data-access.ts
|       |-- legal-ai.ts
|       `-- permissions.ts
|-- middleware.ts
|-- package.json
`-- README.md
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

```bash
cp .env.example .env
```

Update the values in `.env` for your local PostgreSQL instance and preferred AI provider.

### 3. Run Prisma migrations

```bash
npm run prisma:migrate
```

### 4. Seed demo data

```bash
npm run seed
```

### 5. Start the development server

```bash
npm run dev
```

### 6. Optional quality checks

```bash
npm run lint
npx tsc --noEmit
```

## Environment Variables

The current `.env.example` defines:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret for `mizan_session` |
| `AI_PROVIDER` | Yes | `gemini`, `openai`, or `mock` |
| `AI_ALLOW_MOCK_FALLBACK` | Optional | Allow fallback to mock provider when a real provider fails |
| `GEMINI_API_KEY` | If using Gemini | Gemini API key |
| `GEMINI_MODEL` | If using Gemini | Gemini model name, for example `gemini-1.5-flash` or `gemini-2.5-flash` |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key |
| `OPENAI_MODEL` | If using OpenAI | OpenAI model name, default is `gpt-4.1-mini` |

### Sample `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mizan"
JWT_SECRET="replace-me-with-a-long-random-secret"
AI_PROVIDER="gemini"
AI_ALLOW_MOCK_FALLBACK="false"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-1.5-flash"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

## Demo Accounts

After `npm run seed`, the app creates these demo users:

| Role | Email | Password |
| --- | --- | --- |
| Client | `client@mizan.dev` | `demo12345` |
| Lawyer | `lawyer@mizan.dev` | `demo12345` |
| Lawyer | `lawyer2@mizan.dev` | `demo12345` |

The seed also creates:

- one active demo case
- sample documents
- evidence records
- timeline events
- deadlines
- a verified draft with versions
- a pending lawyer proposal
- a completed debate session
- notifications
- AI assistant thread history

## Generated Files and Storage

MIZAN currently uses local filesystem storage under `public/`:

| Directory | Purpose |
| --- | --- |
| `public/uploads` | Original uploaded files |
| `public/redactions` | Masked text outputs |
| `public/exports` | PDF case bundles |

That makes local development simple. For production, an object store such as S3 or Cloudflare R2 would be the natural next step.

## Security and Permission Model

### Route protection

- `middleware.ts` redirects unauthenticated users away from `/client/*` and `/lawyer/*`
- shared pages like `/search` also redirect to `/login` at the page level if no user is present

### Session model

- session cookie name: `mizan_session`
- session payload contains user id, role, name, and email
- JWTs are signed with `JWT_SECRET`

### Role-aware data access

MIZAN scopes data carefully:

- clients only see their own cases
- lawyers only see cases assigned to their `LawyerProfile`
- lawyer-only internal notes are stripped from client responses
- search only indexes accessible cases for the current role
- proposal decisions are role-gated
- lawyer contact unlocks only after proposal approval

### Safe API errors

API routes use `handleApiError()` and return safe JSON messages such as:

```json
{
  "error": "Unable to process this request right now."
}
```

Provider failures are logged server-side while clients receive safe messages instead of raw stack traces or provider payloads.

## Product behavior notes

### Language system

The app supports:

- English
- Urdu
- Roman Urdu

Current storage keys:

- theme: `mizan-theme`
- language: `lawsphere-language`

Urdu mode switches the UI into RTL and changes the root document language attributes. AI requests also receive language instructions so summaries, debates, drafts, translations, and chat responses can match the selected language.

### AI provider fallback

If configured, the app can fall back to a mock AI provider. This is useful for local development when you want the UI flows working without paying for or depending on a live model.

### Prompt safety

The AI layer contains prompt-echo detection and assistant-thread sanitization so internal system prompts do not accidentally render back to the end user as if they were model answers.

## Production Checklist

Before treating MIZAN as production-ready, these are the main items to tighten:

- set a long real `JWT_SECRET`
- make auth cookies secure in production
- move uploaded files, exports, and redactions to durable object storage
- add automated test coverage for critical routes and role permissions
- replace placeholder pricing content
- expand the current `settings` route into a real preferences page
- harden background processing if document throughput grows
- add rate limits for auth and AI-heavy endpoints

---

If you are reading this as an engineer, the best way to understand MIZAN is to:

1. seed the app,
2. log in as the demo client,
3. open the live case workspace,
4. upload a file,
5. request a lawyer,
6. switch to the demo lawyer account,
7. review the same matter from the lawyer side,
8. run debate mode.

That single loop touches almost every important system in the product.
