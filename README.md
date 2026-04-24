# MIZAN

**MIZAN** is a full-stack AI-powered legal-tech platform for clients and lawyers.  
It is designed as a **legal case operating system**, not a generic chatbot.

MIZAN helps clients organize legal problems, upload documents, understand evidence gaps, generate legal drafts, request lawyer review, and track case progress. Lawyers get a professional workspace to review assigned matters, send proposals, verify AI drafts, manage deadlines, add internal notes, and stress-test legal arguments using AI debate mode.

The platform is built around one clear idea:

> Turn messy legal problems into structured, lawyer-ready case files.

---

## Core Product Vision

Most people do not know:

- what evidence matters
- what legal step comes next
- whether their case is complete
- when to involve a lawyer
- how to organize documents, screenshots, agreements, notices, and deadlines

MIZAN solves this by combining:

- structured case management
- document intelligence
- Pakistani-law-aware AI assistance
- lawyer discovery
- request and proposal workflows
- legal drafting
- evidence organization
- deadline tracking
- AI case readiness analysis
- lawyer-side debate simulation

AI is not treated as a replacement for lawyers.  
AI is used as an assistant for extraction, organization, drafting, scoring, search, and workflow recommendations.

---

## User Roles

MIZAN supports two primary roles:

### 1. Client / Normal User

Clients use MIZAN to create and manage their own legal matters.

Client capabilities include:

- creating an account
- logging in securely
- creating legal cases
- editing and deleting their own cases
- uploading documents and evidence
- viewing AI-generated document summaries
- reviewing case readiness and evidence gaps
- tracking deadlines and next steps
- generating legal drafts
- asking document-aware legal questions
- searching public lawyer profiles
- sending case requests to selected lawyers
- reviewing lawyer proposals
- approving or declining proposals
- unlocking contact information only after approval
- viewing shared comments and case activity

### 2. Lawyer

Lawyers use LawSphere as a professional legal workspace.

Lawyer capabilities include:

- lawyer dashboard
- viewing assigned client cases
- editing and enhancing their lawyer profile
- controlling whether their profile is public
- receiving case requests from clients
- reviewing case evidence and AI summaries
- sending proposals with fee, probability, and notes
- adding private internal notes
- commenting on shared case channels
- managing deadlines
- reviewing and verifying AI-generated drafts
- running AI debate mode against opposing counsel
- viewing debate scorecards and weakness analysis
- using AI pre-briefs and case context for faster review

---

## What MIZAN Does

MIZAN includes these major product modules.

---

## 1. Case Management

Cases are the center of the platform.

Each case can include:

- title
- category
- status
- priority
- stage
- description
- linked documents
- evidence items
- timeline events
- deadlines
- drafts
- lawyer assignments
- comments
- internal lawyer notes
- activity logs
- AI assistant threads
- debate sessions
- risk and readiness scores

The platform supports database-backed CRUD operations for cases, not static UI cards.

---

## 2. Smart Document Intake

Users can upload legal files and supporting evidence.

Supported upload use cases include:

- contracts
- screenshots
- notices
- agreements
- payment proofs
- emails
- PDFs
- DOC/DOCX-style records
- images
- dispute evidence

When a document is uploaded, MIZAN can generate:

- AI summary
- probable legal category
- extracted tags
- evidence item
- timeline entry
- clause/risk metadata
- suggested deadlines
- roadmap actions
- case agent analysis

This turns document upload into a real workflow trigger.

---

## 3. Evidence Vault

Uploaded material becomes part of the case evidence vault.

Evidence records can include:

- source type
- summary
- searchable text
- extracted entities
- evidence strength
- linked document
- tags
- timestamps
- case association

The evidence vault helps clients and lawyers organize proof in a structured way instead of leaving files scattered.

---

## 4. Investigation-Style Evidence Search

MIZAN includes a search interface for evidence and documents.

Users can search across:

- document names
- AI summaries
- extracted text
- evidence labels
- searchable evidence text
- tags
- case categories
- parties and names
- payments
- dates
- threats
- notices
- clauses

This is designed to feel like an investigation console, not a generic chat search.

The search respects user permissions:

- clients only search their own cases
- lawyers only search assigned cases

---

## 5. AI Legal Assistance

MIZAN includes a Gemini-powered AI assistance layer.

The assistant can answer:

- case-specific questions
- document-specific questions
- general legal workflow questions
- evidence-readiness questions
- draft-improvement questions
- next-step questions

AI responses are grounded in:

- uploaded case data
- document summaries
- extracted text
- evidence records
- timeline events
- deadlines
- Pakistani-law starter data

The assistant is designed to provide structured reasoning, including:

- issue summary
- relevant legal context
- evidence considerations
- risk areas
- suggested next steps
- confidence notes

AI output is separated from lawyer-verified output.

---

## 6. Pakistani-Law Starter Data

MIZAN includes a local Pakistani-law starter dataset.

The grounding files are located at:

```txt
src/lib/pakistan-law/pakistan-law.json
src/lib/pakistan-law/retrieval.ts
```

---

## Language Support

MIZAN supports three system-wide language modes:

- English
- Urdu
- Roman Urdu

The active UI preference is stored locally in the browser under:

```txt
lawsphere-language
```

No mandatory database migration is required. The app reads this local preference in client components, applies it to the root document, and sends it with AI-related requests.

Urdu mode applies:

- `lang="ur"`
- `dir="rtl"`
- `data-language="ur"`
- Noto Nastaliq Urdu font
- right-aligned inputs, textareas, and selects where appropriate

English and Roman Urdu remain left-to-right. Roman Urdu uses `lang="en"` with `data-language="roman-ur"` so the UI stays LTR while AI responses use Pakistani Roman Urdu wording.

AI routes receive the language preference and add provider prompt instructions through:

```txt
src/lib/language.ts
```

The language-aware AI flows include:

- AI assistant chat
- document summaries during upload
- case analysis prompts
- draft generation
- debate opposition turns
- debate scorecards
- on-demand AI output translation

Evidence search also includes Urdu query expansion so terms such as `ادائیگی`, `معاہدہ`, `نوٹس`, `ثبوت`, and `وکیل` can match relevant English stored content like payment, contract, notice, evidence, and lawyer.

No `User.preferredLanguage` field is currently required. If persistent account-level language is added later, create a Prisma migration explicitly, for example:

```bash
npx prisma migrate dev --name add-user-preferred-language
```
