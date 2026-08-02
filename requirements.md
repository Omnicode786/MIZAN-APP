# MIZAN In-House Local RAG AI Requirements For Codex Implementation

## Purpose

Build MIZAN's own Pakistani legal AI system that no longer depends on Gemini, OpenAI, or any paid external model API for normal operation.

This file is not a guide for the user to implement the RAG system manually.

It is a requirements checklist for what must exist, be provided, or be approved so Codex can build the complete local RAG system inside this project.

Responsibilities:

- The user provides/approves the data sources, machine resources, credentials, deployment target, and legal data permissions.
- Codex implements the app code, migrations, ingestion pipeline, local AI provider, retriever, tool integration, guardrails, evaluation scaffolding, and UI changes.
- Any licensed or private legal corpus must be supplied or authorized by the user before Codex ingests it.

The target system must keep the current MIZAN AI strengths:

- legal chat in `src/app/api/ai/chat/route.ts`
- provider routing in `src/lib/ai/index.ts`
- Pakistani legal answer shaping in `src/lib/legal-ai.ts`
- current case/document context building
- agent workflow and tool execution in `src/lib/ai/agent-runner.ts`
- all current AI tools in `src/lib/ai/agent-tools.ts`
- lawyer search recommendations using real platform data
- separate client/lawyer chat histories
- AI usage tracking, audit logs, rate limits, and permissions

The new system must add a real Retrieval-Augmented Generation layer over trusted Pakistani legal sources and private case records, with citation-grounded answers and hallucination controls.

## What Codex Needs From The User Before Building

### Hardware / Runtime Access

Codex needs one of these:

- a local Windows machine that can run Ollama models reliably, or
- a GPU server/VPS that Codex can configure, or
- a Docker-capable deployment target with enough RAM/GPU for local models.

Minimum development target:

- 32 GB RAM
- SSD storage
- Ollama installed or permission for Codex to install/configure it
- enough disk space for models, OCR cache, and vector indexes

Recommended production target:

- 64 GB RAM
- NVIDIA GPU with 16-24 GB VRAM
- Qdrant persistent volume
- Redis
- Postgres backups

### Legal Data Approval

Codex needs the user to confirm which sources may be ingested:

- official public Pakistani law sources
- official court judgment sources
- licensed legal databases, only if the user has permission
- MIZAN internal lawyer-reviewed templates
- anonymized training/evaluation examples, only if legally approved

Codex must not ingest copyrighted or private legal databases unless the user explicitly confirms permission.

### Deployment Preference

Codex needs the target mode:

- local-only development
- self-hosted single server
- production GPU worker + web app + Qdrant + Redis
- hybrid mode where local AI is primary and external APIs are optional emergency fallback

### Model Preference Approval

Codex can choose a default local stack, but the user must approve model size tradeoffs:

- smaller/faster model for lower hardware
- larger/slower model for better legal reasoning
- multilingual embedding model choice
- whether local vision is required now or OCR-only is acceptable first

## Codex Implementation Deliverables

When these requirements are fulfilled, Codex should build:

- local AI provider adapter
- `AI_PROVIDER=local`
- Ollama integration
- local embeddings integration
- Qdrant integration
- Prisma schema migrations for legal corpus/RAG traces/jobs
- ingestion worker and queue
- public Pakistani law ingestion
- private case/document ingestion
- chunking and metadata pipeline
- citation-grounded retriever
- hallucination guard
- citation verifier
- all existing MIZAN agent tools connected to RAG
- RAG-aware chat responses
- RAG-aware document analysis, drafts, debate mode, lawyer handoff, and court bundles
- retrieval trace storage
- evaluation harness
- admin/operator documentation

## Architecture Decision

Recommended stack:

| Layer | Recommended Choice | Why |
| --- | --- | --- |
| Local LLM runtime | Ollama first, vLLM later for GPU production | Ollama is easiest for local development and supports local generation/embeddings. vLLM can be added later when throughput matters. |
| Generation model | Start with a strong multilingual instruct model through Ollama; benchmark Qwen/Llama/Mistral-family legal performance before final selection | MIZAN needs English, Urdu, Roman Urdu, and Pakistani legal reasoning. Do not choose permanently without evaluations. |
| Embedding model | Ollama embedding model such as `qwen3-embedding`, `embeddinggemma`, or a local multilingual embedding model benchmarked against Pakistani legal queries | Must support English/Urdu/legal vocabulary. The same embedding model must be used for indexing and querying. |
| Vector database | Qdrant | Strong metadata filtering, payload indexes, hybrid retrieval support, and clean separation of public/private collections. |
| Relational database | Existing Postgres + Prisma | Keep canonical metadata, RBAC, audit logs, cases, documents, users, messages, and tool state here. |
| Optional one-database mode | pgvector in Postgres | Useful if avoiding another service is more important than advanced vector retrieval operations. |
| Queue/workers | Redis + BullMQ or a similar queue | OCR, chunking, embedding, ingestion, evaluation, and corpus refresh must not block web requests. |
| OCR/extraction | Existing extraction pipeline plus Tesseract/PaddleOCR/Surya-style OCR evaluation | Pakistani legal PDFs and scanned orders need robust OCR for English and Urdu. |
| Reranking | Local cross-encoder/reranker service | Needed to reduce hallucinations and improve citation quality after initial retrieval. |

Do not replace the current app with a new AI app. Build this as a local provider and RAG layer behind the existing MIZAN AI interface.

## Required Environment Variables

```env
AI_PROVIDER=local

LOCAL_AI_RUNTIME=ollama
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_MODEL=qwen-or-llama-model-selected-after-evals
LOCAL_AI_EMBEDDING_MODEL=qwen3-embedding-or-selected-local-embedder
LOCAL_AI_TIMEOUT_MS=120000
LOCAL_AI_MAX_CONTEXT_TOKENS=24000
LOCAL_AI_MAX_OUTPUT_TOKENS=2048

RAG_ENABLED=true
RAG_VECTOR_STORE=qdrant
QDRANT_URL=http://127.0.0.1:6333
QDRANT_API_KEY=
RAG_PUBLIC_COLLECTION=mizan_public_pakistan_law
RAG_PRIVATE_COLLECTION=mizan_private_case_chunks
RAG_INTERNAL_COLLECTION=mizan_internal_verified_knowledge

REDIS_URL=redis://127.0.0.1:6379
RAG_INGESTION_CONCURRENCY=2
RAG_RETRIEVAL_TOP_K=30
RAG_RERANK_TOP_K=8
RAG_MIN_SOURCE_SCORE=0.62
RAG_REQUIRE_CITATIONS=true
RAG_ABSTAIN_WHEN_UNGROUNDED=true
```

## Services Needed

### 1. Local AI Provider

Create:

- `src/lib/ai/providers/local.ts`
- local generation function equivalent to `generateGeminiInsight` / `generateOpenAIInsight`
- local vision placeholder or local OCR-only fallback until a local vision model is evaluated
- local embedding client
- provider selection support in `src/lib/ai/index.ts`

Required behavior:

- `AI_PROVIDER=local` must route all normal chat, drafting, debate, document explanation, translation, and agent planning through the local model.
- Existing `runAiTask` and `runVisionAiTask` call sites should not need rewrites.
- State must remain in MIZAN's DB, not in the model runtime.
- The model must support streaming later, but non-streaming compatibility is enough for the first implementation.
- If local model fails, show a safe service error; do not silently fall back to external APIs unless explicitly configured.

### 2. RAG Retrieval Service

Create a server-side retrieval module:

- `src/lib/rag/retriever.ts`
- `src/lib/rag/query-planner.ts`
- `src/lib/rag/context-builder.ts`
- `src/lib/rag/citation-verifier.ts`
- `src/lib/rag/hallucination-guard.ts`

Responsibilities:

1. classify user query
2. detect jurisdiction, court, statute area, language, case/document context, and role
3. retrieve from public Pakistani law corpus
4. retrieve from private user/case corpus only when authorized
5. retrieve from MIZAN internal verified templates/notes
6. retrieve platform data through existing tools when needed
7. rerank evidence
8. build a compact answer context with citations
9. reject unsupported legal claims
10. return retrieval traces for debugging and audits

### 3. Ingestion Worker

Create a background worker:

- `src/workers/rag-ingestion-worker.ts`
- `src/lib/rag/ingest/legal-source-ingest.ts`
- `src/lib/rag/ingest/private-document-ingest.ts`
- `src/lib/rag/ingest/chunking.ts`
- `src/lib/rag/ingest/embedding.ts`

It must process:

- official laws
- judgments
- rules
- notifications
- templates
- uploaded case documents
- extracted document text
- OCR text
- lawyer-reviewed internal notes

It must never block upload, chat, dashboard, or case page requests.

## Knowledge Base Requirements

### Public Pakistani Legal Corpus

Must include official and licensed sources only.

Priority sources:

- Pakistan Code / Ministry of Law and Justice
- federal acts, ordinances, rules, and regulations
- provincial law portals for Punjab, Sindh, KP, Balochistan, and Islamabad where available
- Supreme Court of Pakistan judgments
- High Court judgments and cause-law repositories
- court rules, practice directions, and notifications
- Law and Justice Commission material
- official forms and procedural references
- licensed law report data only if MIZAN has permission

Each source must store:

- source URL
- source name
- trust level
- jurisdiction
- court
- document type
- citation
- neutral citation if available
- act/statute/rule/section/article/order
- judgment date
- effective date
- repealed/superseded status
- crawl date
- text hash
- version
- license notes

### Private Case Corpus

Private case data must be indexed separately from public law.

Included:

- uploaded documents
- OCR/extracted text
- AI summaries
- evidence items
- timeline events
- deadlines
- drafts
- shared comments
- lawyer-private notes only for the lawyer who owns/has accepted access

Never expose:

- another client's documents
- lawyer private AI chat to client
- client private AI chat to lawyer
- internal lawyer strategy to client
- admin-only notes
- unaccepted case assignment data

Every private chunk must include payload filters:

- `tenantId` if multi-tenant is added later
- `userId`
- `ownerRole`
- `caseId`
- `documentId`
- `visibility`
- `createdById`
- `clientProfileId`
- `lawyerProfileId`
- `assignmentStatus`
- `sourceType`
- `isDeleted`
- `isArchived`

## Database Requirements

Add Prisma models or equivalent SQL tables.

### LegalSource

Tracks the source system.

Required fields:

- `id`
- `name`
- `baseUrl`
- `sourceType`
- `trustLevel`
- `jurisdiction`
- `licenseNotes`
- `crawlPolicy`
- `createdAt`
- `updatedAt`

### LegalDocument

Tracks each law, judgment, rule, notification, PDF, form, or verified note.

Required fields:

- `id`
- `sourceId`
- `title`
- `documentType`
- `jurisdiction`
- `court`
- `citation`
- `neutralCitation`
- `dateIssued`
- `effectiveDate`
- `url`
- `storageProvider`
- `storageBucket`
- `storageKey`
- `language`
- `textHash`
- `status`
- `metadata`
- `createdAt`
- `updatedAt`

### LegalChunk

Tracks text chunks stored in vector DB.

Required fields:

- `id`
- `legalDocumentId`
- `chunkIndex`
- `heading`
- `sectionLabel`
- `pageNumber`
- `content`
- `contentHash`
- `tokenCount`
- `language`
- `vectorStore`
- `vectorCollection`
- `vectorPointId`
- `metadata`
- `createdAt`
- `updatedAt`

### RagIngestionJob

Tracks ingestion state.

Required fields:

- `id`
- `sourceId`
- `documentId`
- `jobType`
- `status`
- `attempts`
- `error`
- `startedAt`
- `completedAt`
- `createdAt`
- `updatedAt`

### RagRetrievalTrace

Tracks what the AI retrieved for each answer.

Required fields:

- `id`
- `assistantMessageId`
- `userId`
- `caseId`
- `query`
- `retrievalMode`
- `collectionsQueried`
- `topK`
- `rerankTopK`
- `selectedChunkIds`
- `rejectedChunkIds`
- `scores`
- `guardrailDecision`
- `createdAt`

### RagEvaluationRun

Tracks quality checks.

Required fields:

- `id`
- `name`
- `model`
- `embeddingModel`
- `rerankerModel`
- `datasetVersion`
- `accuracyScore`
- `citationPrecision`
- `citationRecall`
- `abstentionAccuracy`
- `hallucinationRate`
- `latencyP50`
- `latencyP95`
- `createdAt`

## Vector Store Requirements

Use Qdrant collections:

1. `mizan_public_pakistan_law`
2. `mizan_internal_verified_knowledge`
3. `mizan_private_case_chunks`
4. optional `mizan_lawyer_profiles`

Payload indexes required:

- `jurisdiction`
- `court`
- `documentType`
- `trustLevel`
- `sourceId`
- `legalDocumentId`
- `caseId`
- `documentId`
- `userId`
- `ownerRole`
- `visibility`
- `assignmentStatus`
- `language`
- `effectiveDate`
- `dateIssued`
- `status`

Retrieval must filter before returning private results.

## Chunking Requirements

Use legal-aware chunking, not generic blind splitting only.

For statutes:

- preserve act title
- preserve section/article/order/rule number
- preserve provisos, explanations, illustrations, and amendments
- chunk size target: 700-1200 tokens
- overlap: 10-20 percent
- never split citations from the paragraph they support

For judgments:

- preserve court, bench, citation, date, parties, issue, holding, and cited statutes
- separate headnote-like material from court reasoning where possible
- tag ratio decidendi / obiter only if confidently extractable or lawyer-reviewed

For private case documents:

- preserve file name
- preserve page number
- preserve extracted/OCR confidence
- preserve table/receipt/date/payment context
- mark unreadable or low-confidence OCR chunks

## Retrieval Algorithm

Use hybrid retrieval:

1. normalize query
2. detect language and transliteration
3. expand legal synonyms
4. classify intent:
   - legal question
   - case-specific question
   - document explanation
   - drafting
   - lawyer recommendation
   - deadline/timeline/evidence query
   - workflow/tool action
5. run public law vector search
6. run public law keyword/BM25 search
7. run private case vector search if case/document context is authorized
8. run private case keyword search
9. run platform tool search if needed
10. merge results
11. deduplicate by source, section, page, and content hash
12. rerank with local reranker
13. apply authority ranking
14. apply recency/effective-date rules
15. apply permission filters again
16. build citation-pack context

Authority ranking:

1. Constitution and binding statute text
2. Supreme Court judgments
3. jurisdiction-relevant High Court judgments
4. rules, notifications, practice directions
5. official government reports
6. lawyer-reviewed MIZAN internal notes
7. private case documents
8. unverified web sources are not allowed for legal conclusions

## Hallucination Avoidance Algorithm

Every generated answer must pass these gates.

### Gate 1: Source Availability

If no relevant legal source or case source is retrieved:

- do not invent law
- say that MIZAN could not find enough grounded material
- ask for missing facts or recommend lawyer review

### Gate 2: Claim-to-Source Mapping

Every legal claim must map to at least one retrieved source.

Required output structure internally:

```json
{
  "claim": "The tenant may contest eviction if notice is defective.",
  "sourceChunkIds": ["chunk_123", "chunk_456"],
  "supportLevel": "direct | partial | weak | none"
}
```

Claims with `supportLevel=none` must be removed or rewritten as uncertainty.

### Gate 3: Jurisdiction Check

The answer must identify:

- federal vs provincial law
- court hierarchy
- city/province relevance
- whether the cited law applies to the user's province

If jurisdiction is missing and material, ask a follow-up question.

### Gate 4: Date and Validity Check

Prefer current/effective law.

Warn if:

- source may be outdated
- act is repealed/superseded
- judgment has later treatment unknown
- query involves limitation/deadline and exact dates are missing

### Gate 5: Private Fact Boundary

The AI may use private case facts only when:

- user owns the case, or
- lawyer has accepted access, or
- admin has explicit policy permission

The answer must not mix facts from another user's case.

### Gate 6: Citation Verifier

Before returning final text:

- verify every citation exists in retrieved context
- verify cited section/case name matches retrieved metadata
- remove fake citations
- mark uncertain citations as "needs lawyer verification"

### Gate 7: Contradiction Check

Run a second pass:

- compare final answer against retrieved chunks
- detect unsupported overstatements
- detect guaranteed-outcome language
- detect fabricated facts, dates, citations, court names, lawyer credentials, or fees

### Gate 8: Abstention

If confidence is low:

- answer what is known
- list what is missing
- say what cannot be concluded
- offer next steps

The model must never pretend certainty because the UI expects an answer.

## Prompt Contract

The local model must receive a strict prompt contract:

```text
You are MIZAN's Pakistani legal assistant.
Use only the supplied retrieved legal sources, MIZAN case context, and tool results.
Do not invent statutes, sections, judgments, citations, facts, fees, lawyer credentials, or outcomes.
If the sources do not support a legal claim, say so.
Every legal conclusion must cite source IDs from the retrieved context.
If jurisdiction, date, or facts are missing, ask only the minimum necessary follow-up.
Do not give destructive workflow actions without user confirmation.
```

## Current Tool Compatibility Requirements

The local RAG system must preserve these tool categories.

### Mutation Tools

- `create_case`
- `update_case`
- `add_deadline`
- `add_timeline_event`
- `create_draft`
- `create_template_document`
- `create_internal_note`
- `create_draft_review_note`
- `generate_case_roadmap`
- `create_lawyer_handoff_packet`
- `create_court_ready_bundle`
- `request_paid_consultation`

Rules:

- keep existing role restrictions
- keep confirmation flow for mutations
- keep audit logs
- never allow client to approve lawyer-only actions
- never allow lawyer to destructively alter client-owned case records without policy

### Search Tools

- `search_user_cases`
- `search_case_documents`
- `search_evidence`
- global search API
- lawyer search/recommendation

RAG upgrade:

- these tools should become retrieval sources
- returned records must include IDs and permissions
- private records must be filtered server-side before reaching the model

### Analysis Tools

- `explain_document`
- `analyze_uploaded_evidence`
- `prepare_meeting_prep`
- `generate_case_health_report`
- `summarize_case`
- `summarize_assigned_case`
- `suggest_evidence_checklist`
- `create_evidence_gap_list`
- `generate_next_steps`
- `prepare_lawyer_handoff`
- `prepare_case_brief`
- `generate_cross_examination_questions`
- `generate_opposition_arguments`
- `prepare_debate_session_context`
- `create_case_strategy_plan`

RAG upgrade:

- each analysis tool should call the retriever before generation
- each result should show citations or case-record references
- lawyer-only analysis must never be visible to clients

### Language Tools

- `translate_response`
- English
- Urdu
- Roman Urdu

RAG upgrade:

- retrieve in both English and Urdu where possible
- keep source citation titles in original language
- translate explanation, not the legal source identity

## Answer UX Requirements

AI answers should display:

- direct answer
- source-backed reasoning
- citations/source drawer
- confidence or grounding status
- missing facts
- next steps
- lawyer review warning when needed
- tool action proposal cards when the answer wants to modify workspace data

For citations, store and render:

- title
- section/page/citation
- court/jurisdiction
- source URL if public
- document/file name if private
- chunk ID internally

## Evaluation Requirements

Before replacing Gemini/OpenAI in production, build an evaluation set.

Required datasets:

- 100 landlord/tenant questions
- 100 employment/salary/termination questions
- 100 contract/payment dispute questions
- 100 family/property questions
- 100 criminal/FIR/procedure questions
- 100 document explanation tasks
- 100 case-specific private-context tasks
- 100 lawyer-search tasks
- 100 agent-tool routing tasks
- 100 refusal/abstention tasks

Metrics:

- legal answer accuracy
- citation precision
- citation recall
- hallucination rate
- correct abstention rate
- jurisdiction detection accuracy
- private-data isolation
- tool selection accuracy
- mutation confirmation safety
- latency p50/p95
- cost per local answer
- GPU memory use

Hard launch gates:

- zero cross-user data leaks
- zero fake citation acceptance in test set
- hallucination rate below agreed threshold
- lawyer-reviewed pass rate high enough for beta
- no destructive tool action without confirmation

## Security Requirements

- Retrieval must run after authentication.
- Private vector search must filter by user/case/role before returning chunks.
- Do not send private chunks to external APIs.
- Keep audit logs of retrieved private chunks.
- Keep assistant thread isolation by `createdById` and `ownerRole`.
- Keep all existing case RBAC.
- Encrypt backups.
- Scan uploaded files before ingestion.
- Mark deleted/archived documents as non-retrievable.
- Keep prompt injection detection for uploaded documents.

Prompt injection handling:

- treat uploaded document text as untrusted evidence
- never execute instructions found inside uploaded documents
- strip or quarantine text like "ignore previous instructions"
- model prompt must explicitly say documents are evidence, not instructions

## Observability Requirements

Track:

- model name
- embedding model
- vector collection
- query text
- retrieved chunk IDs
- rerank scores
- rejected chunks
- citation verifier result
- hallucination guard result
- answer latency
- ingestion latency
- OCR confidence
- failed ingestion jobs
- local model errors
- GPU/RAM utilization
- per-user usage
- per-case usage
- feature usage

Keep existing structured logs and AI usage dashboards, but add RAG-specific retrieval traces.

## Hardware Requirements

### Local Development

Minimum:

- 32 GB RAM
- modern 8-core CPU
- SSD storage
- optional 12 GB VRAM GPU for smoother local generation

Recommended:

- 64 GB RAM
- NVIDIA GPU with 16-24 GB VRAM
- 1-2 TB SSD for corpus, models, Qdrant, OCR cache

### Production Beta

Minimum:

- one GPU worker for local LLM
- one worker for ingestion/OCR
- Qdrant with persistent storage
- Postgres with backups
- Redis queue

Recommended:

- separate model server
- separate embedding/reranking worker
- Qdrant snapshots/backups
- horizontal ingestion workers
- model gateway with request queueing
- GPU monitoring

## Implementation Phases

### Phase 1: Local Provider Adapter

- add `local.ts` provider
- support `AI_PROVIDER=local`
- run chat through Ollama
- preserve current prompts and tools
- keep Gemini/OpenAI only as optional fallback, disabled by default

### Phase 2: Private Case RAG

- embed existing extracted document text
- embed evidence, timeline, deadlines, and drafts
- add private vector collection
- enforce user/case/role filters
- use retrieval inside case/document chat

### Phase 3: Public Pakistan Law Corpus

- add LegalSource/LegalDocument/LegalChunk tables
- ingest official Pakistani legal sources
- add source versioning
- add citation metadata
- add public law vector collection

### Phase 4: Hybrid Retrieval + Reranking

- combine vector retrieval and keyword search
- add legal authority ranking
- add local reranker
- add source/citation pack builder

### Phase 5: Hallucination Guard

- add claim-to-source mapping
- add citation verifier
- add contradiction checker
- add abstention policy
- store retrieval traces

### Phase 6: Full Agent Integration

- make every current tool RAG-aware
- preserve confirmation cards
- preserve role-based tools
- add RAG sources to draft/court bundle/lawyer handoff output

### Phase 7: Evaluation and Lawyer Review

- create golden datasets
- run model comparisons
- tune prompts/retrieval
- review with Pakistani lawyers
- define launch thresholds

### Phase 8: Production Hardening

- GPU queueing
- model autoscaling or batching
- Qdrant backups
- ingestion retries
- monitoring dashboards
- disaster recovery

## Acceptance Criteria

The project is complete only when:

- normal AI chat works with `AI_PROVIDER=local`
- no external API key is required for normal chat
- public legal answers cite retrieved Pakistani legal sources
- private case answers cite only authorized case records
- current AI tools still work
- lawyer search still returns real named lawyers from the database
- generated drafts/handoff/court bundles are grounded in retrieved sources
- unsupported claims are removed or marked uncertain
- fake citations are blocked
- deleted/private/orphaned records are not retrievable
- client and lawyer AI histories remain isolated
- ingestion jobs run in the background
- RAG traces are stored for each answer
- evaluation suite passes launch thresholds

## Official Reference Links

- Ollama OpenAI compatibility: https://docs.ollama.com/api/openai-compatibility
- Ollama embeddings: https://docs.ollama.com/capabilities/embeddings
- LangChain JS Ollama embeddings: https://docs.langchain.com/oss/javascript/integrations/embeddings/ollama
- Qdrant filtering and payload indexes: https://qdrant.tech/documentation/search/filtering/
- Qdrant points/payload model: https://qdrant.tech/documentation/manage-data/points/
- pgvector README: https://github.com/pgvector/pgvector
