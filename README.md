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
- [Key Features at a Glance](#key-features-at-a-glance)
- [Platform Map](#platform-map)
- [Feature Matrix](#feature-matrix)
- [How MIZAN works](#how-mizan-works)
- [Core Modules and Features](#core-modules-and-features)
- [AI and Legal Intelligence](#ai-and-legal-intelligence)
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
- [Product Behavior Notes](#product-behavior-notes)
- [Security and Permission Model](#security-and-permission-model)
- [Common Development Tasks](#common-development-tasks)
- [Troubleshooting](#troubleshooting)
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

## Key Features at a Glance

### For Clients
- **Smart Case Creation** - Create cases through natural language or structured forms with AI-powered analysis
- **Intelligent Document Upload** - Upload documents once, extract everything: summaries, deadlines, timelines, evidence
- **Evidence Management** - Searchable evidence vault with automatic tagging and strength scoring
- **AI Assistant** - Ask questions about your case, get grounded answers from your documents
- **Draft Generation** - Generate initial legal documents with AI, edit and finalize with lawyers
- **Deadline Tracking** - AI-detected and manually-entered deadlines with alerts and roadmaps
- **Lawyer Discovery** - Browse public lawyer profiles, send requests, get proposals
- **Collaboration** - Share cases with lawyers, track activity, leave comments

### For Lawyers
- **Case Queue** - Review assigned matters with readiness scores and deadline alerts
- **Proposal Workflow** - Receive client requests, send proposals with fee/probability, get approvals
- **Internal Notes** - Private work product and strategy notes on assigned cases
- **Draft Review** - Review and verify AI-generated drafts before client sharing
- **Debate Mode** - Stress-test your arguments against AI opposition counsel
- **Analytics** - Track case volume, turnaround time, approval rates, performance trends
- **Advanced Search** - Investigation-style search with Urdu support and advanced filtering
- **Profile Management** - Create public profile, manage specialties, set pricing signals

### For Everyone
- **Multi-language Support** - English, Urdu, and Roman Urdu with proper RTL support
- **Dark/Light Themes** - Full theme customization with preference persistence
- **Mobile Responsive** - Works on desktop, tablet, and mobile devices
- **AI-Powered** - Gemini, OpenAI, or mock provider support
- **Legal Intelligence** - Pakistan law context, clause extraction, risk assessment
- **Secure** - Role-based access control, encrypted storage, audit logging
- **Export Ready** - Generate PDF bundles for external sharing and filing

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

### Complete Feature Breakdown

**Document & Evidence Management**
- Smart document upload with automatic text extraction
- AI-powered document summarization and classification
- Clause extraction and heatmaps
- Evidence vault with searchable records
- Timeline and deadline auto-detection
- Multi-format support (PDF, Word, images)
- Document tagging and categorization

**AI-Powered Legal Intelligence**
- Case-aware AI assistant with persistent threads
- General purpose AI assistant for clients
- Intelligent case intake agent
- Natural language case creation from client stories
- Case analysis with risk scoring
- Evidence gap identification
- Document-aware Q&A

**Drafting & Document Generation**
- AI-powered legal draft generation
- Draft versioning and history
- Lawyer review and verification workflow
- Template-based draft generation
- Real-time draft editing
- Export ready drafts

**Lawyer & Client Collaboration**
- Proposal and engagement workflow
- Shared case comments and discussions
- Lawyer-only internal notes
- Activity feed and change tracking
- Structured lawyer request system
- Approval and decline workflows
- Public lawyer directory and discovery

**Search & Investigation**
- Investigation-style multi-field search
- Cross-document evidence search
- Urdu language support with transliteration
- Advanced filtering by date, tag, clause
- Payment and amount detection
- Text and semantic search

**Legal Workflow Support**
- Case lifecycle management (DRAFT → INTAKE → ACTIVE → REVIEW → CLOSED)
- Deadline tracking and alerts
- Timeline visualization
- Debate mode with AI opposition
- Debate evaluation and scoring
- Risk assessment and case health metrics

**Data Protection & Output**
- Sensitive text redaction
- PDF export bundles
- Role-based data access
- Lawyer-only content filtering
- Secure client information handling

**User Experience**
- Dark/Light theme toggle
- Multi-language support (English, Urdu, Roman Urdu)
- RTL support for Urdu
- Responsive design
- Motion and animations
- Accessible UI components

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
| Automatic deadline extraction | No | Yes | Yes |
| Draft generation and versioning | No | Yes | Yes |
| Draft verification and approval | No | No | Yes |
| Case-aware AI assistant | No | Yes | Yes |
| General client AI assistant | No | Yes | No |
| AI case intake agent | No | Yes | No |
| Send lawyer requests | No | Yes | No |
| Send proposals | No | No | Yes |
| Approve or decline proposals | No | Yes | No |
| Lawyer-only internal notes | No | No | Yes |
| Shared case comments | No | Yes | Yes |
| Debate mode | No | No | Yes |
| Case analysis and insights | No | Yes | Yes |
| Redaction API and preview | Preview only | Yes | Yes |
| Export case bundle PDF | No | Yes | Yes |
| Activity feed and timeline | No | Yes | Yes |
| Notifications feed | No | Yes | Yes |
| Multilingual UI and AI output | Yes | Yes | Yes |
| Investigation search | No | Yes | Yes |
| Lawyer analytics | No | No | Yes |
| Public lawyer profile management | No | No | Yes |
| Theme customization | Yes | Yes | Yes |


## How MIZAN works

### 1. Upload to analysis pipeline

```mermaid
sequenceDiagram
    participant User
    participant UI as Case Workspace UI
    participant API as /api/documents/upload
    participant Storage as Cloudinary or local fallback
    participant Extract as document-pipeline/extract
    participant AI as AI provider layer
    participant DB as Prisma/PostgreSQL

    User->>UI: Upload document
    UI->>API: POST multipart form
    API->>Storage: Save original file and metadata
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

## Core Modules and Features

### User Interface & Navigation

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Landing page** | High-end product landing page with motion, product pillars, and role-based messaging | `src/app/page.tsx` uses Framer Motion, shared UI primitives, and product narrative blocks |
| **Public lawyer directory** | Searchable, filterable list of public lawyers before login | `src/app/lawyers/page.tsx` plus `PublicLawyersDirectory` backed by `lawyerProfile.isPublic` |
| **Localization** | English, Urdu, and Roman Urdu UI and AI output | `use-language`, `LanguageRuntime`, `language.ts`, RTL handling for Urdu, AI requests receive selected language |
| **Theme system** | Light and dark mode across the app | `ThemeProvider`, `mizan-theme` local storage, early theme script in `layout.tsx` |
| **Notifications** | Requests, proposals, and workflow updates feed | `Notification` model plus page at `/notifications` with role-scoped filtering |

### Authentication & User Management

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Authentication** | Signup, login, logout, session restore | API routes under `src/app/api/auth/*`, JWT cookie named `mizan_session`, middleware protection for `/client/*` and `/lawyer/*` |
| **Client profile management** | Client-specific settings like simple language mode and preferences | `ClientProfile` model with read/update via `/api/client-profile` |
| **Lawyer profile management** | Public-facing profile editor with specialties, verification, pricing signals | `LawyerProfile` with public/private visibility toggle at `/lawyer/profile` |

### Dashboard & Overview

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Client dashboard** | Matter readiness, active cases, deadlines, timeline, AI shortcuts | `src/app/client/dashboard/page.tsx` plus `getDashboardSnapshot()` with role-scoped metrics |
| **Lawyer dashboard** | Assigned matters, readiness overview, deadline cockpit, recent timeline | `src/app/lawyer/dashboard/page.tsx` plus role-scoped snapshot queries and assignment tracking |
| **Lawyer analytics** | Performance metrics, case volume, turnaround time, approval rates | `src/app/lawyer/analytics` with dashboard panels and Recharts visualizations |

### Case Management

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Case workspace** | The live operating surface for a matter | `CaseWorkspaceLive` composes uploads, comments, deadlines, drafts, AI assistant, timeline, activity, and proposals |
| **Case creation & lifecycle** | Create, edit, track status (DRAFT → INTAKE → ACTIVE → REVIEW → CLOSED) | `Case` model with stage and status fields, AI-driven readiness scoring |
| **Case search** | Investigation-style search across accessible cases by title, description | Built into `/client/cases` and `/lawyer/cases` with filtering |

### Document Intelligence

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Smart document intake** | Upload files and immediately get summaries, tags, dates, and action signals | `POST /api/documents/upload` saves files, extracts text, summarizes via AI, builds evidence, timeline, deadlines, and updates scores |
| **Document pipeline** | Automated text extraction from PDF, Word, and images | `src/lib/document-pipeline/extract` using `pdf-parse` and `mammoth` with OCR fallback |
| **Evidence vault** | Searchable evidence records tied to documents and cases | `EvidenceItem` records store summaries, extracted entities, searchable text, and strength scoring |
| **Clause heatmaps** | AI-powered extraction of important legal clauses from documents | Automatic tagging during document upload with clause type and risk assessment |

### Timeline & Deadlines

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Timeline and deadlines** | Event stream plus date tracking | Timeline events from roadmap items, AI extraction, and manual system actions; deadlines support create/update/delete |
| **Deadline tracking** | Visual deadline cockpit with status, priority, and alerts | `Deadline` model with create/update/delete via `/api/deadlines` |
| **Automatic deadline extraction** | AI detects statutory and contractual deadlines from documents | Runs during document pipeline and can be reviewed/edited by users |

### AI & Legal Intelligence

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **AI legal assistant** | Document-aware and case-aware chat with stored threads | `AssistantThread` and `AssistantMessage` persist chat history; AI answers grounded in case data and Pakistan-law context |
| **Client AI assistant page** | Separate AI workspace with general mode and case-attached mode | `src/app/client/assistant/page.tsx` with new conversations, thread selection, mode switching |
| **Case intake agent** | AI can create cases, extract structured case data, build roadmaps from natural language | `POST /api/ai/chat` with agent-mode enabled; agent runner in `src/lib/ai/agent-runner.ts` |
| **Drafting studio** | Generate, edit, verify, and version legal drafts | `Draft` plus `DraftVersion`; `POST /api/drafts/generate` creates lawyer-editable drafts with version control |
| **Debate mode** | Lawyers argue against AI opposing counsel and receive an evaluation | `DebateSession` and `DebateTurn` backed by `generateDebateOpposition()` and `evaluateDebate()` |
| **AI translation** | Markdown-preserving translation to Urdu and Roman Urdu | `POST /api/ai/translate` with language selection |
| **Case analysis** | AI performs holistic case assessment including risk scoring and evidence gaps | `POST /api/analysis/case/[id]` generates structured analysis from case context |

### Collaboration & Communication

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Comments** | Shared collaboration threads on cases with timestamps and attribution | `Comment` model with create/delete via `/api/comments` with role-scoped visibility |
| **Internal notes** | Lawyer-only strategy notes and work product | `InternalNote` model restricted to lawyer workspace with `/api/internal-notes` |
| **Activity feed** | Timestamped record of all case actions, uploads, edits, and AI outputs | `ActivityLog` model tracking user actions, timestamps, and change summaries |
| **Collaboration surface** | Shared workspace for case parties | `src/app/client/collaboration` with real-time comment and event display |

### Lawyer Workflow

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Proposal workflow** | Clients request lawyers, lawyers respond with fee/probability/notes, clients approve or decline | `CaseAssignment` with PENDING → ACCEPTED/DECLINED flow via `/api/assignments/[id]` |
| **Review workspace** | Lawyer-scoped view of assigned cases with quick actions | `src/app/lawyer/review` with readiness checks and deadline alerts |
| **Draft approval** | Lawyers approve/verify AI-generated drafts for client use | `DraftVersion` with `verifiedBy` field and approval tracking in `/lawyer/drafts` |
| **Internal notes** | Lawyer-only work surface for case strategy and notes | Lawyer workspace feature at `/lawyer/internal-notes` |

### Search & Investigation

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Investigation search** | Cross-document and cross-evidence search by text, summaries, tags, names, clauses, dates, payments, and Urdu term expansion | `POST /api/search` with role-scoped Prisma filters and Urdu-to-English NLP expansion |
| **Multi-field search** | Search by document name, evidence summary, timeline events, deadline descriptions | Indexed search across multiple entity types with relevance ranking |
| **Urdu language search** | Search in Urdu with automatic English transliteration expansion | `language.ts` with transliteration support and phonetic matching |

### Data Export & Output

| Module | What the user sees | How it works internally |
| --- | --- | --- |
| **Redaction** | Mask sensitive text before sharing with external parties | `POST /api/redactions` creates `RedactionJob` with masked output to `public/redactions` |
| **PDF exports** | Generate a compact PDF case bundle with documents, evidence, timeline | `POST /api/exports` creates `ExportBundle` using `pdf-lib` with multi-document support |
| **Export preview** | Standalone redaction preview page for masking logic validation | `/redaction` page with before/after preview UI |

## AI and Legal Intelligence

### Provider architecture

MIZAN supports three AI providers through a single abstraction:

- `gemini` - Google's advanced multimodal AI for legal analysis
- `openai` - OpenAI's GPT models for reasoning and generation
- `mock` - Local mock provider for development without API calls

The provider entry point lives in `src/lib/ai/index.ts`.

### What the AI layer does

- answers grounded case and document questions
- supports general assistant conversations with fallback to context
- performs permission-safe workflow actions when agent mode is enabled
- summarizes uploaded files with clause extraction
- generates thread titles from first-message intent
- creates draft content from case context
- generates opposition arguments for debate mode
- evaluates completed debates with scoring
- translates markdown responses into Urdu or Roman Urdu
- extracts structured data (dates, amounts, entities) from unstructured text
- identifies legal deadlines and time-sensitive information
- analyzes case strength and risk profile

### Grounding sources

Depending on the request, the AI layer can use:

- live case context built from the database (status, stage, priority, timeline)
- uploaded document summaries and extracted text
- evidence records with entity extraction
- timeline events and historical case actions
- deadlines and date-sensitive information
- drafts and previous versions for consistency
- risk scores and case health metrics
- public lawyer directory snapshot for specialist matching
- Pakistan-law starter retrieval context from `src/lib/pakistan-law`
- user's previous conversations and preferences
- case assignment and collaboration history

### Formatting strategy

The AI layer intelligently switches behavior based on the user prompt and context:

- **casual/app messages** get short natural replies with appropriate tone
- **legal or case-specific prompts** get structured markdown answers with sections, emphasis, and legal language
- **analysis or opinion requests** receive detailed breakdowns with pros/cons, risk assessment
- **translation requests** maintain all formatting while translating content
- **extraction requests** return structured JSON or bullets for easy consumption

This behavior is implemented in `src/lib/legal-ai.ts`, which also prevents prompt echoing and stores chat messages separately per thread for privacy.

### AI Safety & Guardrails

- Responses are sanitized to prevent prompt injection
- Legal disclaimers are injected when appropriate
- AI avoids making absolute legal claims
- Chat history is scoped to user + case + thread
- Provider errors are caught and logged server-side
- Responses are checked for internal metadata exposure
- All AI requests include audit logging

## Agentic AI Workflows

MIZAN's client assistant operates as an **agentic legal workflow assistant**, not only a question-answering chat.

When the user asks for help, the assistant decides whether to:

- answer normally
- ask a follow-up for missing structured information
- produce a safe approval-first workflow proposal
- execute a server-side workflow action only after the user confirms

### What agent mode can do

- **Case creation**: Convert a client story into a normalized case preview with title, category, priority, facts, evidence, timeline, deadlines, roadmap, and lawyer handoff summary
- **Approval-first writes**: Case creation, case updates, deadlines, timeline events, drafts, templates, roadmap entries, and internal notes are previewed first and saved only after the user approves
- **Timeline and deadline management**: Add dated events and deadlines to accessible cases through confirmed agent actions
- **Draft and template generation**: Generate editable legal notices, refund requests, complaint letters, handoff briefs, and template-style drafts through the existing draft/version system
- **Evidence intake agent**: Classify uploaded evidence, extract grounded parties/dates/amounts, identify contradictions, map possible timeline facts, and suggest what to upload next
- **Case roadmap agent**: Generate or persist roadmap steps for a selected case after approval
- **Case health score**: Produce a practical readiness report covering evidence strength, timeline completeness, missing party details, draft readiness, and lawyer handoff readiness
- **Lawyer handoff agent**: Prepare a structured lawyer brief from the case record without exposing other users' data
- **Hearing and meeting prep**: Generate questions, documents to carry, weak points, and likely counterarguments from the current case record
- **Case search**: Search the user's accessible cases, documents, and evidence
- **Strategy materials**: Prepare lawyer-side strategy materials on assigned matters only
- **Structured extraction**: Extract key facts, dates, amounts, parties, evidence, and draft suggestions from messy legal narratives

### Confirmation-first workflow

```mermaid
sequenceDiagram
    participant User
    participant UI as Assistant UI
    participant API as /api/ai/chat
    participant Agent as agent-runner.ts
    participant Tools as agent-tools.ts
    participant DB as Prisma/PostgreSQL

    User->>UI: "Create a case / add deadline / make a draft"
    UI->>API: Send message with thread, language, case/document context
    API->>Agent: Last 12 same-thread messages + current request
    Agent->>Agent: Decide answer, follow-up, analysis tool, or mutation proposal
    Agent-->>UI: Preview with hidden pending-action metadata
    UI-->>User: Show formatted preview + Approve / Cancel card
    User->>UI: "Yes", "yes please", "approve", "go ahead", etc.
    UI->>API: Confirmation in the same thread
    API->>Agent: Recover latest pending proposal
    Agent->>Tools: Validate role, case access, schema, and current user
    Tools->>DB: Write only after approval
    Tools->>DB: Activity log where relevant
    Agent-->>UI: Success/error response + action card
    UI->>API: Refresh workspace data
```

### Safety model

- all tool execution stays server-side
- every action runs with the current authenticated user
- client actions are scoped to the client's own matters
- lawyer actions are scoped to assigned matters
- destructive delete tools are intentionally not implemented
- write actions always require a confirmation turn before database mutation
- failed or denied actions close the pending proposal so the assistant does not loop forever asking for "yes"
- pending proposals are recovered from recent same-thread messages only, not global memory
- internal IDs, provider errors, prompts, and stack traces are not exposed to the user
- the AI remains assistive and lawyer-reviewable; it does not replace professional legal judgment
- all AI responses are logged and can be audited

### Current implementation notes

- agent decisions are handled in `src/lib/ai/agent-runner.ts`
- tool definitions and handlers live in `src/lib/ai/agent-tools.ts`
- the structured decision prompt lives in `src/lib/ai/prompts/case-intake-agent.ts`
- `/api/ai/chat` now supports normal chat and agent mode without changing the public route shape
- `/api/ai/chat` includes the latest 12 messages from the same assistant thread so confirmations and short follow-ups remain context-aware
- pending write proposals are stored inside assistant messages using hidden metadata from `src/lib/assistant-message-meta.ts`
- the client assistant renders approval cards through `src/components/workspace/client-ai-assistant.tsx`
- successful actions can return a UI action card, such as an "Open case" button after AI intake creates a new matter

### Example

If a client says:

> I paid 150,000 PKR to a vendor on 12 March. Delivery was promised by 20 March but never happened. I have screenshots and bank transfer proof. Create a case for me.

The assistant can:

1. recognize that this is an explicit case-creation request
2. extract title, category, priority, facts, evidence, dates, and suggested next steps
3. show a clean case preview and ask for confirmation
4. wait for a confirmation like "yes", "yes please", "approve", or the UI Approve button
5. create the case in the database under the current client's profile only after approval
6. add roadmap, timeline entries, evidence records, and deadlines where supported
7. return a formatted success response plus a direct case link in the chat

### AI Features Overview

#### Multiple AI Provider Support
- **Gemini**: Google's latest multimodal model for legal analysis
- **OpenAI**: GPT-4 for high-quality legal reasoning
- **Mock Provider**: Local development and testing without API calls
- **Fallback Support**: Optional fallback to mock provider if real provider fails

#### Grounding and Context
- **Case context**: Live case facts, status, stage, priority
- **Document context**: Uploaded file summaries and extracted text
- **Evidence context**: Evidence records with summaries and tags
- **Timeline context**: Historical events and deadlines
- **Drafts context**: Existing draft templates and versions
- **Risk scores**: Case health and risk assessment metrics
- **Lawyer directory**: Public lawyer information for matching
- **Pakistan law context**: Starter retrieval context from `src/lib/pakistan-law`

#### Response Formatting
The AI layer intelligently switches behavior based on context:
- **casual/app messages**: Short natural replies with emoji and personality
- **legal/case-specific prompts**: Structured markdown answers with sections and emphasis
- **analysis requests**: Detailed breakdowns with risk assessment and recommendations
- **translation requests**: Markdown-preserving translation maintaining formatting

#### AI Capabilities
- **Legal Q&A**: Answer questions grounded in case and document context
- **Document analysis**: Summarize, classify, and extract key information
- **Timeline extraction**: Automatically detect dates and legal deadlines
- **Clause identification**: Find and categorize important legal clauses
- **Draft generation**: Create initial legal documents and notices
- **Opposition generation**: Create opposing arguments for debate mode
- **Debate evaluation**: Score and evaluate debate performance
- **Translation**: Convert responses to Urdu or Roman Urdu while preserving formatting
- **Risk assessment**: Evaluate case strength and identify weaknesses
- **Evidence analysis**: Find gaps and suggest evidence collection



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
        Files[Cloudinary uploads, local exports/redactions]
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
- **Cloudinary-backed upload storage** is used when configured, with local filesystem fallback for development and generated exports/redactions.
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

| Entity | Purpose | Key Fields |
| --- | --- | --- |
| `User` | Base account with role and session identity | email, password hash, role (CLIENT/LAWYER), createdAt |
| `ClientProfile` | Client-specific settings and preferences | userId, simpleLangMode, preferences, createdAt |
| `LawyerProfile` | Public-facing lawyer profile with specialties | userId, bio, specialties[], pricing, isPublic, isVerified, rating |
| `Case` | Central matter record with readiness scores and workflow stage | title, description, clientId, stage, status, priority, healthScore, readinessScore |
| `Document` | Uploaded files with extracted text and analysis | caseId, fileName, originalPath, extractedText, summary, tags[], uploadedAt |
| `EvidenceItem` | Searchable evidence abstraction from documents or manual entry | caseId, documentId, summary, entities[], strength, searchableText, tags[] |
| `TimelineEvent` | Chronological case signals from system, AI extraction, or roadmap | caseId, eventType, description, date, importance, source |
| `Deadline` | Actionable dates with tracking and alerts | caseId, title, date, priority, status, notificationSent, createdBy |
| `Draft` / `DraftVersion` | Editable legal documents with complete version history | draftId, content, templateType, version, createdBy, verifiedBy, createdAt |
| `Comment` | Shared collaboration thread items with threading | caseId, authorId, content, parentId, createdAt |
| `InternalNote` | Lawyer-only strategy notes and work product | caseId, lawyerId, content, isPrivate, createdAt |
| `CaseAssignment` | Lawyer request / proposal / approval workflow | caseId, lawyerId, status (PENDING/ACCEPTED/DECLINED), proposal, respondedAt |
| `AssistantThread` | Persisted AI conversation container | userId, caseId, title, createdAt |
| `AssistantMessage` | Individual AI chat message with role and metadata | threadId, role (USER/ASSISTANT), content, metadata, createdAt |
| `DebateSession` | Lawyer-vs-AI argument simulation with scoring | caseId, lawyerId, topic, status, score, createdAt |
| `DebateTurn` | Individual argument exchange in debate | sessionId, speaker (LAWYER/AI), content, rebuttal, timestamp |
| `RedactionJob` | Masked output generation job tracking | caseId, documentId, maskedPath, status, createdAt |
| `ExportBundle` | Generated case bundle artifact | caseId, pdfPath, documentIds[], exportedAt |
| `Notification` | Workflow update feed item | userId, type, relatedId, message, isRead, createdAt |
| `ActivityLog` | Audit trail of all significant case actions | caseId, userId, actionType, description, timestamp |
| `RiskScore` | Case risk assessment and health metrics | caseId, evidenceGaps, riskLevel, strength, recommendations |

## Route Inventory

### Public pages

| Path | Purpose | Features |
| --- | --- | --- |
| `/` | Marketing/positioning landing page | Framer Motion animations, product pillars, call-to-action |
| `/lawyers` | Public lawyer directory before login | Search, filter, pricing signals, verification badges |
| `/login` | Login form and theme-aware auth surface | Email/password auth, theme toggle, role selection |
| `/signup` | Role-aware account creation | Client and Lawyer signup flows, validation, session creation |
| `/pricing` | Placeholder pricing page for demo storytelling | Feature pricing, plan comparison, CTA |
| `/redaction` | Public preview of masking logic used by the redaction engine | Before/after redaction demo, masking visualization |

### Shared authenticated pages

| Path | Purpose | Features |
| --- | --- | --- |
| `/search` | Investigation-style search across accessible documents and evidence | Multi-field search, Urdu support, tag filtering, date range |
| `/notifications` | Requests, proposals, deadlines, and activity updates | Notification feed, role-scoped filtering, mark as read |
| `/settings` | Present route shell for future shared settings expansion | Theme and language preferences, notification settings |

### Client workspace pages

| Path | Purpose | Features |
| --- | --- | --- |
| `/client/dashboard` | Client overview, readiness, active matters, deadlines, timeline | Case metrics, upcoming deadlines, quick actions, AI shortcuts |
| `/client/cases` | List and create cases | New case wizard, case filtering, readiness indicators |
| `/client/cases/[id]` | Live case workspace | Documents, evidence, timeline, deadlines, AI assistant, comments |
| `/client/assistant` | General and case-attached client AI workspace | New conversations, thread selection, case mode toggle |
| `/client/lawyers` | In-app lawyer discovery flow | Search, filter, send requests, view profiles |
| `/client/upload` | Upload center | Drag-and-drop upload, progress tracking, batch operations |
| `/client/drafts` | Drafting studio | Draft generation, versioning, editing, export |
| `/client/deadlines` | Deadline tracking surface | Timeline view, alert settings, bulk actions |
| `/client/evidence` | Evidence vault | Evidence search, tagging, linking, strength scoring |
| `/client/collaboration` | Shared collaboration surface | Comments, activity timeline, shared insights |
| `/client/timeline` | Case timeline surface | Event visualization, filtering by type, deadline alerts |

### Lawyer workspace pages

| Path | Purpose | Features |
| --- | --- | --- |
| `/lawyer/dashboard` | Lawyer overview, assigned matters, deadline cockpit | Assigned cases, deadline alerts, performance metrics |
| `/lawyer/cases` | Case queue | Assigned cases list, readiness overview, quick filters |
| `/lawyer/cases/[id]` | Live case workspace on assigned matters | Full case review, internal notes, drafts, proposals |
| `/lawyer/review` | Review workspace | Bulk case review, status updates, workflow actions |
| `/lawyer/drafts` | Draft approvals and verification | Draft review, approval workflow, version comparison |
| `/lawyer/deadlines` | Deadline cockpit | All deadlines, alert settings, bulk marking |
| `/lawyer/debate` | Debate mode | Start debates, AI opposition, argument exchange, evaluation |
| `/lawyer/analytics` | Lawyer analytics and summary panels | Case volume, turnaround time, approval rates, trends |
| `/lawyer/internal-notes` | Lawyer internal note surface | Private notes, strategy documents, work product |
| `/lawyer/profile` | Public profile editor | Bio, specialties, pricing, verification, photo |

### API surface

<details>
<summary><strong>Authentication (4 routes)</strong></summary>

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/signup` | POST | Create user and session with role validation |
| `/api/auth/login` | POST | Authenticate user and issue JWT session |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/auth/me` | GET | Current user session info and permissions |

</details>

<details>
<summary><strong>Cases and lawyer requests (4 routes)</strong></summary>

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/cases` | GET, POST | List cases by role, create cases as client |
| `/api/cases/[id]` | GET, PATCH, DELETE | Get, update (title, description, stage, status, priority), or delete a specific case |
| `/api/cases/[id]/share` | POST | Request lawyer review for a case, create CaseAssignment |
| `/api/assignments/[id]` | PATCH, GET | Lawyer proposal submission, client decision (ACCEPT/DECLINE) |

</details>

<details>
<summary><strong>Documents, evidence, search, and exports (5 routes)</strong></summary>

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/documents/upload` | POST | Upload, extract text, summarize, build evidence, timeline, deadlines |
| `/api/documents/[id]` | GET, DELETE | Document-level management and metadata |
| `/api/search` | POST | Investigation-style search with Urdu support, filtering, relevance ranking |
| `/api/redactions` | POST, GET | Create redacted text output for a case document |
| `/api/exports` | POST, GET | Build and retrieve PDF case bundles |

</details>

<details>
<summary><strong>AI and analysis (6 routes)</strong></summary>

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/ai/chat` | POST | Persisted AI assistant chat with optional agent-mode workflow actions |
| `/api/ai/translate` | POST | Markdown-preserving translation to Urdu/Roman Urdu |
| `/api/analysis/case/[id]` | POST | Case-level analysis with risk scoring and evidence gaps |
| `/api/drafts/generate` | POST | Generate legal drafts from live case context with versioning |
| `/api/debate/session` | POST | Start new debate sessions |
| `/api/debate/session/[id]` | GET, PATCH | Continue or finalize debate sessions with turn management |

</details>

<details>
<summary><strong>Profiles, comments, and deadlines (6 routes)</strong></summary>

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/client-profile` | GET, PATCH | Client profile read/update with preferences |
| `/api/lawyer-profile` | GET, PATCH | Lawyer profile read/update with public visibility |
| `/api/lawyers/public` | GET | Public lawyer discovery API with filtering |
| `/api/comments` | POST, GET, DELETE | Shared comments create/retrieve/delete with threading |
| `/api/internal-notes` | POST, GET, DELETE | Lawyer-only notes with privacy enforcement |
| `/api/deadlines` | POST, GET, PATCH, DELETE | Deadline create/read/update/delete with alerts |

</details>

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **App framework** | Next.js 14 App Router | React server components, unified API routes, file-based routing |
| **UI Library** | React 18 | Component rendering and state management |
| **Styling** | Tailwind CSS | Utility-first CSS framework with dark mode support |
| **Component Library** | shadcn-ui + custom components | Pre-built accessible UI components |
| **Class Utilities** | class-variance-authority | Variant-driven component styling |
| **Icons** | Lucide React | Consistent icon set across app |
| **Motion** | Framer Motion | Smooth animations and transitions |
| **Database** | PostgreSQL | Relational database for all entities |
| **ORM** | Prisma 5 | Type-safe database client with migrations |
| **Auth** | Jose | JWT signing and verification |
| **Auth Strategy** | Cookie-based JWT sessions | Secure, stateless session management |
| **Input Validation** | Zod | Runtime type validation for API inputs |
| **AI Providers** | Gemini, OpenAI | Multi-provider LLM support |
| **File Handling** | Node.js fs, local storage | File system operations for uploads |
| **PDF Generation** | pdf-lib | Creating PDF export bundles |
| **Document Parsing** | pdf-parse, mammoth | PDF text extraction and Word document parsing |
| **Charts & Dashboards** | Recharts | Interactive charts for analytics |
| **Dates** | date-fns | Date manipulation and formatting |
| **Language Support** | i18n patterns | English, Urdu, Roman Urdu translations |
| **RTL Support** | CSS logical properties | Right-to-left layout for Urdu |
| **Type Safety** | TypeScript 5 | Static type checking across codebase |
| **Linting** | ESLint | Code quality and consistency |
| **Build Tools** | Next.js built-in | Zero-config build, static generation, API routes |

### Notable Dependencies

- **date-fns**: Date parsing, formatting, and timezone handling
- **zod**: Request validation and type coercion
- **jose**: JWT creation, verification, and expiration
- **pdf-lib**: PDF manipulation and document generation
- **mammoth**: Word document (.docx) parsing
- **pdf-parse**: PDF text extraction
- **recharts**: React charts for analytics dashboards
- **framer-motion**: Animation library for UI transitions
- **lucide-react**: SVG icon library
- **class-variance-authority**: Component variant system

## Repository Structure

```
.
├── prisma/                          # Database schema and migrations
│   ├── migrations/                  # Database migration history
│   ├── schema.prisma               # Complete Prisma data model
│   └── seed.ts                     # Demo data seeding script
├── public/                         # Static assets and generated files
│   ├── exports/                    # Generated PDF case bundles
│   ├── redactions/                 # Masked text output files
│   ├── uploads/                    # Uploaded documents and files
│   └── logo assets
├── src/
│   ├── app/                        # Next.js App Router pages and API
│   │   ├── api/                    # API route handlers
│   │   │   ├── ai/                 # AI/chat endpoints
│   │   │   ├── analysis/           # Case analysis endpoints
│   │   │   ├── assignments/        # Proposal workflow
│   │   │   ├── auth/               # Authentication endpoints
│   │   │   ├── cases/              # Case management
│   │   │   ├── client-profile/     # Client settings
│   │   │   ├── comments/           # Comments and collaboration
│   │   │   ├── deadlines/          # Deadline management
│   │   │   ├── debate/             # Debate mode
│   │   │   ├── documents/          # Document upload and management
│   │   │   ├── drafts/             # Draft generation
│   │   │   ├── exports/            # PDF export
│   │   │   ├── internal-notes/     # Lawyer internal notes
│   │   │   ├── lawyer-profile/     # Lawyer settings
│   │   │   ├── lawyers/            # Public lawyer directory
│   │   │   ├── redactions/         # Text redaction
│   │   │   └── search/             # Search API
│   │   ├── client/                 # Client workspace pages
│   │   │   ├── dashboard/          # Client dashboard
│   │   │   ├── cases/              # Case list and workspace
│   │   │   ├── assistant/          # AI assistant
│   │   │   ├── lawyers/            # Lawyer discovery
│   │   │   ├── upload/             # Document upload
│   │   │   ├── drafts/             # Drafting studio
│   │   │   ├── deadlines/          # Deadline tracking
│   │   │   ├── evidence/           # Evidence vault
│   │   │   ├── collaboration/      # Collaboration space
│   │   │   └── timeline/           # Timeline view
│   │   ├── lawyer/                 # Lawyer workspace pages
│   │   │   ├── dashboard/          # Lawyer dashboard
│   │   │   ├── cases/              # Case queue
│   │   │   ├── review/             # Review workspace
│   │   │   ├── drafts/             # Draft approval
│   │   │   ├── deadlines/          # Deadline cockpit
│   │   │   ├── debate/             # Debate mode
│   │   │   ├── analytics/          # Analytics dashboards
│   │   │   ├── internal-notes/     # Internal notes
│   │   │   └── profile/            # Profile management
│   │   ├── lawyers/                # Public lawyer directory page
│   │   ├── login/                  # Login page
│   │   ├── signup/                 # Signup page
│   │   ├── pricing/                # Pricing page
│   │   ├── search/                 # Global search page
│   │   ├── redaction/              # Redaction preview page
│   │   ├── notifications/          # Notifications page
│   │   ├── settings/               # Settings page
│   │   ├── layout.tsx              # Root layout with theme
│   │   ├── page.tsx                # Landing page
│   │   └── globals.css             # Global styles
│   ├── components/                 # React components
│   │   ├── ui/                     # UI primitives
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── glass-surface.tsx
│   │   │   ├── input.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── separator.tsx
│   │   │   └── textarea.tsx
│   │   ├── workspace/              # Workspace-specific components
│   │   │   ├── case-card.tsx
│   │   │   ├── activity-feed.tsx
│   │   │   ├── assistant-panel.tsx
│   │   │   ├── app-shell.tsx
│   │   │   └── ... more components
│   │   ├── auth/                   # Authentication components
│   │   │   ├── login-form.tsx
│   │   │   └── signup-form.tsx
│   │   ├── language-toggle.tsx     # Language switcher
│   │   ├── theme-toggle.tsx        # Dark/light mode toggle
│   │   ├── logo.tsx                # Logo component
│   │   └── theme-provider.tsx      # Theme context provider
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-language.ts         # Language selection hook
│   │   └── use-liquid-border-glow.ts # Animation hook
│   ├── lib/                        # Utilities and business logic
│   │   ├── ai/                     # AI-related utilities
│   │   │   ├── index.ts            # Main AI provider abstraction
│   │   │   ├── agent-runner.ts     # Agentic workflow executor
│   │   │   ├── agent-tools.ts      # Available agent tools
│   │   │   ├── prompts/            # AI system prompts
│   │   │   └── ...                 # Provider implementations
│   │   ├── document-pipeline/      # Document processing
│   │   │   └── extract.ts          # Text extraction from PDFs/images
│   │   ├── pakistan-law/           # Pakistan legal context
│   │   │   └── retrieval.ts        # Law retrieval utilities
│   │   ├── pdf/                    # PDF utilities
│   │   │   └── generate.ts         # PDF generation
│   │   ├── api-response.ts         # Standard API response formatting
│   │   ├── assistant-message-meta.ts # Message metadata
│   │   ├── auth.ts                 # Authentication utilities
│   │   ├── case-roadmap.ts         # Case timeline logic
│   │   ├── cloudinary-storage.ts   # Optional cloud storage
│   │   ├── constants.ts            # App constants and enums
│   │   ├── data-access.ts          # Database query utilities
│   │   ├── demo-data.ts            # Demo/seed data
│   │   ├── file-storage.ts         # File upload handling
│   │   ├── language.ts             # Language utilities and translations
│   │   ├── legal-ai.ts             # Legal AI prompt and response logic
│   │   ├── liquid-border-glow.ts   # Animation utilities
│   │   ├── permissions.ts          # Permission checking utilities
│   │   ├── phrase-translations.ts  # UI phrase translations
│   │   ├── prisma.ts               # Prisma client initialization
│   │   ├── rbac.ts                 # Role-based access control
│   │   ├── session.ts              # Session management
│   │   ├── translations.ts         # Translation data
│   │   └── utils.ts                # General utilities
│   ├── types/                      # TypeScript type definitions
│   │   └── vendor.d.ts             # Third-party type definitions
│   ├── utils/                      # Component utilities
│   │   └── ai-content.tsx          # AI content rendering
│   └── middleware.ts               # Next.js middleware for auth checks
├── middleware.ts                   # Root middleware configuration
├── next.config.mjs                # Next.js configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── components.json                # shadcn-ui configuration
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

### Key Directory Purposes

| Directory | Purpose |
| --- | --- |
| `src/app/api` | All backend API route handlers organized by feature |
| `src/app/client` | Client workspace UI pages and layouts |
| `src/app/lawyer` | Lawyer workspace UI pages and layouts |
| `src/lib/ai` | AI provider abstraction, agent logic, and prompts |
| `src/lib/document-pipeline` | Document processing, OCR, and text extraction |
| `src/lib/pakistan-law` | Pakistan legal context and retrieval |
| `prisma` | Database schema, migrations, and seeding |
| Cloudinary `mizan/uploads` | Uploaded documents and images when Cloudinary is configured |
| `public/uploads` | Uploaded documents fallback for development only |
| `public/exports` | Generated PDF exports (development only) |
| `public/redactions` | Redacted document outputs (development only) |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

This will install all required Node.js packages including Next.js, React, Prisma, and UI libraries.

### 2. Create environment variables

```bash
cp .env.example .env
```

Update the values in `.env` for your local PostgreSQL instance and preferred AI provider:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mizan"
JWT_SECRET="your-secret-key-here-at-least-32-characters"
AI_PROVIDER="gemini"  # or "openai" or "mock"
GEMINI_API_KEY="your-gemini-key"
GEMINI_MODEL="gemini-1.5-flash"
CLOUDINARY_URL="cloudinary://your-api-key:your-api-secret@your-cloud-name"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_UPLOAD_FOLDER="mizan/uploads"
```

### 3. Run Prisma migrations

```bash
npm run prisma:migrate
```

This creates all database tables and relationships defined in `prisma/schema.prisma`.

### 4. Seed demo data

```bash
npm run seed
```

Creates demo accounts, cases, documents, and sample data for testing:
- Client account: `client@mizan.dev` / `demo12345`
- Lawyer accounts: `lawyer@mizan.dev` / `demo12345` and `lawyer2@mizan.dev` / `demo12345`

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Optional quality checks

```bash
npm run lint      # Run ESLint
npm run type-check  # Run TypeScript compiler
npm run build    # Build for production
```

## Development Workflow

### Running for development

```bash
npm run dev
```

The app hot-reloads on file changes. Prisma will auto-generate types when the schema changes.

### Making database changes

1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate` and name your migration
3. Prisma generates new types automatically

### Testing the full flow

1. Log in as `client@mizan.dev` (password: `demo12345`)
2. Navigate to `/client/cases`
3. Click on the demo case
4. Upload a document in the case workspace
5. Wait for AI to extract summaries and create evidence
6. Scroll down to see timeline events and deadlines
7. Click on "Request Lawyer"
8. Switch browsers or clear cookies, log in as `lawyer@mizan.dev`
9. Navigate to `/lawyer/dashboard` to see the request
10. Click to review the case and send a proposal
11. Switch back to client account and accept the proposal
12. Switch to lawyer and try debate mode

This flow exercises almost every major system in the app.

## Build & Deployment

### Production build

```bash
npm run build
npm start
```

This builds Next.js for production and starts the server on port 3000.

### Docker (optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t mizan .
docker run -p 3000:3000 --env-file .env mizan
```

### Environment for production

Ensure before deploying:
- `DATABASE_URL` points to production PostgreSQL
- `JWT_SECRET` is a long, random string (32+ chars)
- `AI_PROVIDER` is set to `gemini` or `openai`
- File storage is configured for S3 or similar
- SSL/TLS certificates are configured
- Rate limiting is enabled

## Environment Variables

The current `.env.example` defines all required and optional configuration:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/mizan`) |
| `JWT_SECRET` | Yes | - | JWT signing secret for `mizan_session` cookies (must be 32+ chars) |
| `AI_PROVIDER` | Yes | `gemini` | `gemini`, `openai`, or `mock` |
| `AI_ALLOW_MOCK_FALLBACK` | Optional | `false` | Allow fallback to mock provider when real provider fails |
| `GEMINI_API_KEY` | If using Gemini | - | Google Gemini API key from Google Cloud Console |
| `GEMINI_MODEL` | If using Gemini | `gemini-1.5-flash` | Gemini model name (e.g., `gemini-1.5-flash`, `gemini-2.5-flash`) |
| `OPENAI_API_KEY` | If using OpenAI | - | OpenAI API key from OpenAI dashboard |
| `OPENAI_MODEL` | If using OpenAI | `gpt-4-mini` | OpenAI model name (e.g., `gpt-4`, `gpt-4-mini`, `gpt-3.5-turbo`) |
| `CLOUDINARY_URL` | Recommended for uploads | - | Cloudinary connection URL, e.g. `cloudinary://api-key:api-secret@cloud-name` |
| `CLOUDINARY_CLOUD_NAME` | If using Cloudinary | - | Cloudinary cloud name; can also be derived from `CLOUDINARY_URL` |
| `CLOUDINARY_UPLOAD_FOLDER` | Optional | `mizan/uploads` | Cloudinary folder for uploaded legal documents and images |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3000` | Public app URL for external links and callbacks |

### Sample `.env` Configuration

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mizan"

# Authentication
JWT_SECRET="replace-me-with-a-long-random-secret-at-least-32-characters"

# AI Configuration
AI_PROVIDER="gemini"
AI_ALLOW_MOCK_FALLBACK="false"

# Gemini Configuration
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-1.5-flash"

# OpenAI Configuration (if using OpenAI instead of Gemini)
# OPENAI_API_KEY="your-openai-api-key-here"
# OPENAI_MODEL="gpt-4-mini"

# Cloudinary storage
CLOUDINARY_URL="cloudinary://your-api-key:your-api-secret@your-cloud-name"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_UPLOAD_FOLDER="mizan/uploads"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Getting API Keys

**For Gemini:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Gemini API
4. Create an API key in the Credentials section
5. Copy the key to `GEMINI_API_KEY`

**For OpenAI:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Go to API keys section
4. Create a new secret key
5. Copy the key to `OPENAI_API_KEY`

### Production Environment Variables

For production deployment, ensure:

```env
# Use a strong, randomly generated JWT secret
JWT_SECRET="generate-a-long-random-string-here"

# Use production database URL
DATABASE_URL="postgresql://prod-user:prod-pass@prod-host:5432/mizan"

# Disable mock fallback in production
AI_ALLOW_MOCK_FALLBACK="false"

# Set secure production app URL
NEXT_PUBLIC_APP_URL="https://your-production-domain.com"
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

### File Storage

MIZAN supports Cloudinary-backed upload storage for user documents and images. When Cloudinary is configured, uploaded files are stored remotely and the `Document` record keeps the secure URL, public id, resource type, and extraction diagnostics in `metadata`.

Local filesystem storage under `public/` is still used as a development fallback and for generated artifacts such as exports/redactions:

| Directory | Purpose | Content Type | Notes |
| --- | --- | --- | --- |
| Cloudinary `mizan/uploads` | Original uploaded files | PDF, DOCX, PNG, JPG, other supported documents | Primary upload storage when configured |
| `public/uploads` | Original uploaded files | PDF, DOCX, PNG, JPG | Development fallback only |
| `public/redactions` | Masked text outputs | PDF, TXT | Temporary redacted copies for sharing |
| `public/exports` | PDF case bundles | PDF | Complete case export with documents |

**Production recommendation:** keep uploaded originals in durable object storage such as Cloudinary, S3, Google Cloud Storage, or Cloudflare R2 for:
- Scalability and reliability
- Automatic backups
- CDN support for faster downloads
- Better security and encryption

### Database Schema

The Prisma schema is in `prisma/schema.prisma` and includes:

- **20+ core entities** supporting the complete legal workflow
- **Comprehensive relationships** with proper foreign keys and cascading rules
- **Indexed fields** for performance on common queries
- **Audit fields** (createdAt, updatedAt) on all entities
- **Status enums** for workflow states

Run `npx prisma studio` to browse your data in a visual interface.

### Migrations

Database migrations are stored in `prisma/migrations/`:

```bash
npx prisma migrate dev --name description_of_change
npx prisma migrate reset  # Reset database (dev only!)
npx prisma migrate status  # Check migration status
```

### Type Generation

After each schema change, Prisma automatically generates:

- `node_modules/.prisma/client/index.d.ts` - Full type definitions
- Runtime types for all models and queries
- Autocomplete support in TypeScript

To regenerate manually:

```bash
npx prisma generate
```

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

## Product Behavior Notes

### Language System

The app supports English, Urdu, and Roman Urdu with complete UI and AI output localization:

**Storage keys:**
- theme: `mizan-theme`
- language: `lawsphere-language`

**Urdu mode:**
- Switches the UI into RTL (right-to-left) layout
- Changes root document language attributes for accessibility
- Adjusts text direction for all components and modals
- Maintains proper font rendering for Urdu script

**AI requests:**
- Receive language instructions so summaries, debates, drafts, translations, and chat responses match selected language
- Gemini and OpenAI providers are instructed to respond in the user's selected language
- Fallback to English for unsupported language scenarios

**Translation support:**
- `/api/ai/translate` endpoint for markdown-preserving translation
- Supports translation between English, Urdu, and Roman Urdu
- Preserves markdown formatting, links, and code blocks

### Case Lifecycle & Status

**Case stages:**
- `DRAFT` - Initial case creation, not yet active
- `INTAKE` - Case opened for intake and evidence collection
- `ACTIVE` - Ready for active work, analysis complete
- `REVIEW` - Under lawyer review or escalation
- `CLOSED` - Resolved, completed, or archived

**Case status:**
- `PENDING` - Not yet started
- `IN_PROGRESS` - Actively being worked on
- `ON_HOLD` - Paused pending further information
- `COMPLETED` - Work completed
- `ARCHIVED` - Case archived

**Readiness scoring:**
- Calculated based on uploaded documents, extracted deadlines, timeline events, and evidence
- Displayed on dashboards and case cards
- Used to prioritize work and identify gaps

### AI Provider Fallback

If configured with `AI_ALLOW_MOCK_FALLBACK=true`, the app can fall back to mock AI provider:

- Useful for local development when you want UI flows working without paying for or depending on a live model
- Mock responses are realistic but deterministic
- Allows full feature testing without API costs
- Production should disable mock fallback

### Prompt Safety

The AI layer contains several safety mechanisms:

**Prompt echo detection:**
- Prevents system prompts from accidentally rendering back to users
- Sanitizes responses to remove internal instructions
- Logs suspicious patterns for monitoring

**Thread sanitization:**
- Assistant messages are filtered to remove internal metadata
- User prompts are never exposed to other users
- AI system messages are server-side only

**Response validation:**
- Markdown is validated before rendering
- Scripts and HTML injection attempts are blocked
- Links are validated and domain-checked

### Permission Model

**Client access:**
- Clients only see their own cases
- Cannot see other clients' cases or lawyer assignments
- Can see lawyer profiles marked as public
- Proposals only show their own pending requests

**Lawyer access:**
- Lawyers only see cases assigned to them
- Cannot see other lawyers' assignments
- Can see all public lawyer profiles
- Can see client profiles only on assigned matters

**Admin access:**
- Not yet implemented, future feature
- Would allow system monitoring and support

### Notification System

**Types of notifications:**
- `CASE_ASSIGNED` - Lawyer assigned to your case
- `PROPOSAL_RECEIVED` - Lawyer sent a proposal
- `PROPOSAL_ACCEPTED` - Your proposal was accepted
- `DEADLINE_ALERT` - Deadline is approaching
- `COMMENT_ADDED` - Someone commented on your case
- `DRAFT_READY` - Draft generated and ready for review
- `DEBATE_COMPLETE` - Debate session completed

**Notification delivery:**
- Notifications created in database
- Fetched on demand from `/notifications` page
- Marked as read when viewed
- Can be filtered by type or case

### Activity Logging

All significant case actions are logged for audit purposes:

- Document uploads
- Deadline changes
- Draft creation and verification
- Proposal submissions and decisions
- Comment creation
- Debate sessions
- Internal notes creation
- Case stage transitions
- User actions with timestamps

## Common Development Tasks

### Adding a new API endpoint

1. Create a route file: `src/app/api/feature/route.ts`
2. Export handler functions: `export async function GET()`, `export async function POST()`, etc.
3. Use `handleApiError()` for error handling
4. Add Zod validation for request bodies
5. Check permissions with `getRoleFromSession()`
6. Query database with Prisma
7. Return `NextResponse.json()`

Example:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/api-response';
import { getRoleFromSession } from '@/lib/session';

const requestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getRoleFromSession();
    if (!session) return handleApiError('Unauthorized', 401);

    const body = await request.json();
    const { title, description } = requestSchema.parse(body);

    const item = await prisma.item.create({
      data: {
        title,
        description,
        userId: session.userId,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Adding a UI component

1. Create component file: `src/components/my-component.tsx`
2. Use React hooks and client state
3. Import UI primitives from `src/components/ui/`
4. Add TypeScript interfaces
5. Use Tailwind for styling
6. Export as default

### Adding a database model

1. Add model to `prisma/schema.prisma`
2. Run `npm run prisma:migrate -- --name add_my_model`
3. Update related models with relationships
4. Use in API routes via Prisma client

### Testing a feature

1. Log in as appropriate role
2. Navigate to feature page
3. Check browser console for errors
4. Check server logs with `npm run dev`
5. Use Prisma Studio to inspect data: `npx prisma studio`

## Troubleshooting

### Database connection errors

```bash
# Test connection
psql $DATABASE_URL

# Reset database (dev only)
npm run prisma:migrate reset

# Check migration status
npm run prisma:migrate status
```

### AI provider errors

- Check API keys in `.env`
- Test with mock provider: `AI_PROVIDER=mock`
- Check provider rate limits
- Review logs in terminal

### TypeScript errors

```bash
# Type check
npm run type-check

# Generate Prisma types
npx prisma generate

# Clear TypeScript cache
rm -rf node_modules/.next
```

### Session/auth issues

- Clear browser cookies
- Check `JWT_SECRET` is set
- Check `mizan_session` cookie in DevTools
- Check middleware.ts configuration

### Document upload failures

- Check file size limits
- Check supported file types (PDF, DOCX, images)
- Check Cloudinary variables: `CLOUDINARY_URL`, `CLOUDINARY_CLOUD_NAME`, and `CLOUDINARY_UPLOAD_FOLDER`
- If Cloudinary is not configured, check `public/uploads` directory permissions for local fallback
- Check browser console for client errors

### AI chat not working

- Check AI provider configuration
- Check API keys are valid
- Check rate limits haven't been exceeded
- Try with mock provider for testing
- For agent actions, confirm in the same thread with the Approve button or a clear reply such as `yes`, `yes please`, `approve`, or `go ahead`
- Check server logs for `[AGENT_ACTION_CONFIRMATION_ERROR]` if a proposal shows but the database action does not complete

## Reporting Issues

If you find a bug or issue:

1. Check if it's already reported
2. Create a detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS version
   - Relevant error messages
   - Screenshots if applicable

## API Response Format

All API responses follow a standard format:

**Success responses:**
```json
{
  "data": { /* response payload */ },
  "success": true
}
```

**Error responses:**
```json
{
  "error": "Human-readable error message",
  "success": false
}
```

Errors are caught by `handleApiError()` which ensures:
- Internal errors don't leak to client
- Stack traces remain server-side
- User gets safe, actionable error messages

Before treating MIZAN as production-ready, these are the main items to tighten:

### Security & Authentication
- [ ] Set a long real `JWT_SECRET` (minimum 32 characters, random)
- [ ] Make auth cookies secure in production (Secure, HttpOnly, SameSite flags)
- [ ] Add rate limiting for authentication endpoints (signup, login, password reset)
- [ ] Implement password complexity requirements
- [ ] Add 2FA support for lawyer accounts
- [ ] Audit and lock down permission checks across all routes
- [ ] Add request validation and sanitization everywhere

### Storage & Infrastructure
- [ ] Move uploaded files, exports, and redactions to durable object storage (S3, R2, etc)
- [ ] Configure CDN for static assets
- [ ] Set up automated backup strategy for PostgreSQL
- [ ] Add database connection pooling
- [ ] Configure monitoring and alerting for uptime

### Data & Privacy
- [ ] Implement GDPR/PDPA compliance framework
- [ ] Add data retention and deletion policies
- [ ] Encrypt sensitive data at rest
- [ ] Add audit logging for all data access
- [ ] Implement data anonymization for analytics
- [ ] Add privacy policy and terms of service
- [ ] Conduct security audit and penetration testing

### Testing & Quality
- [ ] Add automated test coverage for critical routes (>80%)
- [ ] Add role permission tests for all protected routes
- [ ] Add integration tests for AI provider fallback
- [ ] Add E2E tests for core user workflows
- [ ] Load test the system with realistic traffic
- [ ] Add database migration safety checks

### Content & UX
- [ ] Replace placeholder pricing content with real pricing
- [ ] Expand the `/settings` route into a real preferences page
- [ ] Add help documentation and FAQ
- [ ] Implement chat support or support ticket system
- [ ] Add onboarding flow for new users
- [ ] Create video tutorials for key features

### Background Processing
- [ ] Harden background processing if document throughput grows
- [ ] Add document processing queue for large files
- [ ] Implement retry logic for failed processing
- [ ] Add job monitoring and alerting

### Performance & Scaling
- [ ] Add rate limits for AI-heavy endpoints
- [ ] Implement caching for expensive queries
- [ ] Add search indexing (Elasticsearch, Meilisearch, etc)
- [ ] Optimize database queries and add indexes
- [ ] Monitor and optimize frontend bundle size

### Operations
- [ ] Set up error tracking (Sentry, LogRocket, etc)
- [ ] Add performance monitoring (New Relic, Datadog, etc)
- [ ] Create runbooks for common incidents
- [ ] Set up automatic deployment and rollback procedures
- [ ] Implement feature flags for safe rollouts
- [ ] Add application health checks and status page

### Legal & Compliance
- [ ] Consult with legal advisor on liability and disclaimers
- [ ] Add clear AI limitations and disclaimers
- [ ] Verify compliance with bar association rules
- [ ] Review ethical guidelines for legal tech
- [ ] Add terms of service for AI-generated content

## What Makes MIZAN Special

MIZAN stands out in the legal-tech space by:

### **Case-First Philosophy**
- Unlike generic chatbots or document repositories, MIZAN revolves around the case as the central unit
- Every feature—documents, evidence, timelines, deadlines—connects back to a case
- Provides a unified operating system rather than a collection of tools

### **AI as Assistant, Not Replacement**
- AI summarizes, extracts, suggests, and generates—but lawyers make the decisions
- Debate mode lets lawyers stress-test arguments against AI opposition
- All AI work is reviewable, verifiable, and audit-logged

### **Pakistani Legal Context**
- Starter law retrieval context for Pakistani law
- Supports Urdu and Roman Urdu for both UI and AI output
- Understands local workflow constraints and practices

### **Complete Workflow Coverage**
- Covers the entire legal intake and case management journey:
  - Client-side: Case creation, evidence upload, AI Q&A, drafting, deadline tracking
  - Lawyer-side: Case discovery, proposal workflow, internal strategy, debate, analytics
  - Both sides: Collaboration, role-based permissions, activity tracking

### **Multi-Provider AI**
- Supports Gemini, OpenAI, and mock providers
- Can switch providers without code changes
- Includes fallback logic for reliability

### **Security-by-Design**
- Role-based access control at the route, query, and response level
- Lawyer-only data (internal notes) is stripped from client responses
- All actions are logged for audit purposes
- JWT-based sessions with cookie security

### **Developer-Friendly**
- Next.js App Router for unified code
- Prisma ORM for type-safe database access
- TypeScript throughout for safety
- Clear separation of concerns (API, business logic, UI)
- Seed data for quick local development

### **Production Considerations**
- Prepared for scaling with modular architecture
- Database migrations for safe schema evolution
- Error handling that doesn't leak internal details
- Rate limiting and security hardening roadmap

---

## Engineering Walkthrough

If you are reading this as an engineer, the best way to understand MIZAN is to:

1. **Seed the app** - `npm run seed`
2. **Log in as client** - `client@mizan.dev` / `demo12345`
3. **Open the live case workspace** - Go to `/client/cases` and click the demo case
4. **Upload a file** - Click upload, choose a document, watch AI extract everything
5. **Request a lawyer** - Click "Request Lawyer" in the case
6. **Switch to lawyer account** - Log out, log in as `lawyer@mizan.dev` / `demo12345`
7. **Review the case** - See it in `/lawyer/dashboard`, click to view full details
8. **Send a proposal** - Respond with fee, probability, and notes
9. **Switch back to client** - Accept or decline the proposal
10. **Switch to lawyer** - Run `/lawyer/debate` to see debate mode

That single loop touches:
- **Authentication** (login/session)
- **Case management** (create, update, assign)
- **Document processing** (upload, extract, summarize)
- **AI integration** (summaries, analysis, debate)
- **Workflow** (proposal system)
- **Collaboration** (shared workspace)
- **Role-based access** (client vs lawyer views)
- **Activity logging** (all actions tracked)

### Key Files to Review

For understanding the architecture:
- `src/lib/legal-ai.ts` - AI prompt and response logic
- `src/lib/ai/agent-runner.ts` - Agentic workflow executor
- `src/lib/permissions.ts` - Permission checking
- `src/lib/data-access.ts` - Database query patterns
- `prisma/schema.prisma` - Full data model
- `middleware.ts` - Authentication middleware

For understanding the UI:
- `src/components/workspace/` - Workspace components
- `src/app/client/cases/[id]/` - Client case workspace
- `src/app/lawyer/cases/[id]/` - Lawyer case workspace
- `src/app/layout.tsx` - Root layout with theme setup

For understanding the API:
- `src/app/api/ai/` - AI chat and analysis
- `src/app/api/documents/upload` - Document processing pipeline
- `src/app/api/assignments/` - Proposal workflow
