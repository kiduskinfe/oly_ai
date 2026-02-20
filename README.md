# OLY AI — Enterprise AI Assistant for ERPNext

**Version:** 1.0.0  
**License:** MIT  
**Publisher:** OLY Technologies (kidus@oly.et)  
**Requires:** Frappe >= 15.0.0, ERPNext >= 15.0.0  
**Codebase:** ~12,100 lines Python · ~3,900 lines JS · ~1,000 lines CSS · 133 tests  

Enterprise-grade, provider-agnostic AI assistant for ERPNext. Delivers AI-powered chat, document intelligence, customer service automation, voice I/O, image generation, and cross-app integration — all directly inside the Desk UI without modifying any core code.

---

## Table of Contents

1. [Overview](#overview)
2. [Features at a Glance](#features-at-a-glance)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Configuration Guide](#configuration-guide)
6. [AI Settings — Complete Reference](#ai-settings--complete-reference)
7. [Supported Providers](#supported-providers)
8. [AI Chat Interface](#ai-chat-interface)
9. [Document AI (DocType Hooks)](#document-ai-doctype-hooks)
10. [AI Tools — 18 Built-in Capabilities](#ai-tools--18-built-in-capabilities)
11. [RAG — Retrieval-Augmented Generation](#rag--retrieval-augmented-generation)
12. [Streaming & Real-Time](#streaming--real-time)
13. [Voice — Speech-to-Text & Text-to-Speech](#voice--speech-to-text--text-to-speech)
14. [Image Generation](#image-generation)
15. [Customer Service Automation](#customer-service-automation)
16. [Cross-App Integration](#cross-app-integration)
17. [Memory System](#memory-system)
18. [Workflow Automation](#workflow-automation)
19. [Security & Access Control](#security--access-control)
20. [Cost Control & Budget Management](#cost-control--budget-management)
21. [Caching](#caching)
22. [Audit Logging](#audit-logging)
23. [PII Data Masking](#pii-data-masking)
24. [AI Prompt Templates](#ai-prompt-templates)
25. [API Reference](#api-reference)
26. [DocTypes Reference](#doctypes-reference)
27. [File Structure](#file-structure)
28. [Testing](#testing)
29. [Switching to Self-Hosted AI](#switching-to-self-hosted-ai)
30. [Troubleshooting](#troubleshooting)
31. [Changelog](#changelog)
32. [Uninstall](#uninstall)

---

## Overview

OLY AI turns your ERPNext installation into an AI-powered workspace. Instead of switching between tools, employees get intelligent assistance right where they work — on every form, in every workflow.

**Key differentiators:**
- **Provider-agnostic** — OpenAI, Anthropic, Ollama, vLLM, LiteLLM. Switch by changing one setting.
- **Zero core changes** — Pure hooks, whitelisted methods, and custom DocTypes. Safe to install/uninstall.
- **Enterprise features** — RBAC, budget limits, rate limiting, PII masking, audit logging, response caching.
- **Omnichannel AI** — Same AI brain answers on Desk, Email, Frappe Chat, and Telegram.
- **43 DocType hooks** — AI buttons on ERPNext, HRMS, Marketing Suite, Oly, and Webshop forms.

---

## Features at a Glance

### AI Chat & Interaction
| Feature | Description |
|---------|-------------|
| **AI Chat Panel** | Full conversation UI with session management, search, pinning |
| **3 Modes** | Ask (read-only Q&A), Agent (read + tools), Execute (write actions) |
| **Streaming** | Real-time token-by-token streaming with Server-Sent Events |
| **@Mention DocTypes** | Type `@Lead` or `@SO-2024-001` to inject live document context |
| **Message Editing** | Edit any sent message and regenerate AI response |
| **Retry / Regenerate** | Retry failed or unsatisfactory responses with one click |
| **Share Chat** | Share sessions with other users for collaborative AI conversations |
| **Export** | Export conversations to Markdown or JSON |
| **Tab Filters** | Filter sessions by All / Pinned / Shared |
| **Model Catalog** | Browse available models with capability badges and pricing |

### Document Intelligence
| Feature | Description |
|---------|-------------|
| **Summarize** | One-click document summary with next steps |
| **Triage** | Auto-classify priority, category, routing |
| **Suggest Reply** | Draft professional replies based on document context |
| **Draft** | Generate emails, proposals, reports from document data |
| **Classify** | Categorize with confidence scores and sentiment |
| **Ask AI...** | Free-text custom prompts on any document |
| **Global AI Button** | AI Assist button appears on all 43 hooked DocType forms |

### Customer Service Automation
| Feature | Description |
|---------|-------------|
| **Email Auto-Response** | AI drafts reply suggestions for incoming customer emails |
| **Telegram AI Bridge** | Auto-respond to Telegram messages via bot integration |
| **Frappe Chat AI** | Auto-reply to guest messages, draft responses for agents |
| **SLA Monitor** | Scheduled check every 30 min for overdue/at-risk Issues |
| **Sentiment Analysis** | Detect positive/negative/neutral tone + urgency scoring |

### Enterprise Features
| Feature | Description |
|---------|-------------|
| **RAG Pipeline** | Hybrid BM25 + vector search over indexed documents |
| **Voice I/O** | Whisper speech-to-text + TTS with 6 voice options |
| **Image Generation** | DALL-E 3 integration with content safety filters |
| **File Upload & Parsing** | Parse PDF, DOCX, XLSX, CSV, images for AI context |
| **Web Search** | DuckDuckGo integration for real-time web queries |
| **Web Page Reader** | Fetch and parse any URL for AI analysis |
| **Code Execution** | Sandboxed Python execution with timeout and safety guards |
| **PII Masking** | Auto-detect and mask sensitive data before sending to LLM |
| **Workflow Engine** | Rule-based automations triggered by document events |
| **Cross-Session Memory** | AI remembers user preferences and past interactions |
| **Access Control (RBAC)** | Role-based tiers controlling which AI features users access |
| **Budget Management** | Monthly caps, daily limits, per-user tracking |
| **Response Caching** | Redis-backed cache reducing API costs 60–80% |
| **Audit Logging** | Every AI call logged with user, tokens, cost, timing |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frappe Desk UI                                │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐ │
│  │ 43 DocType│ │ AI Chat  │ │ Ask AI   │ │ Dashboard │ │   Voice   │ │
│  │ AI Buttons│ │  Panel   │ │  Page    │ │   Page    │ │   I/O     │ │
│  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘ └─────┬─────┘ │
│        └─────────────┴────────────┴─────────────┴─────────────┘       │
│                              │  frappe.xcall() / SSE                   │
└──────────────────────────────┼────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    oly_ai — Frappe Custom App                         │
│                                                                       │
│  ┌──────────────────────── API Layer ─────────────────────────────┐   │
│  │ gateway.py │ chat.py │ stream.py │ train.py │ voice.py │ etc. │   │
│  └──────────────────────────┬────────────────────────────────────┘   │
│                              │                                        │
│  ┌────────────────── Core Services ──────────────────────────────┐   │
│  │ provider.py    │ tools.py (18)  │ rag/          │ memory.py   │   │
│  │ context.py     │ file_parser.py │ web_reader.py │ cache.py    │   │
│  │ cost_tracker.py│ pii_filter.py  │ sentiment.py  │ access.py   │   │
│  └──────────────────────────┬────────────────────────────────────┘   │
│                              │                                        │
│  ┌────────── Automation Layer ────────────────────────────────────┐   │
│  │ email_handler.py │ telegram_handler.py │ sla_monitor.py       │   │
│  │ workflow_engine.py │ notifications.py                          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌────────── External Integrations ──────────────────────────────┐   │
│  │ Frappe Chat (chat app) → oly_ai.api.gateway.ask_erp()        │   │
│  │ Oly Telegram Hub → oly.telegram.bot_handler.send_message()    │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
              ┌──────────────────────────────────┐
              │       LLM Provider               │
              │  OpenAI │ Anthropic │ Self-hosted │
              │  (GPT-4o, Claude 3.5, Llama 3.1) │
              └──────────────────────────────────┘
```

---

## Installation

### New install

```bash
cd /path/to/frappe-bench
bench get-app https://github.com/kiduskinfe/oly_ai.git
bench --site your-site install-app oly_ai
bench build --app oly_ai
bench restart
```

### Verify installation

```bash
bench --site your-site list-apps
# Should show: ... oly_ai
```

Visit `/app/ai-settings` to configure your provider and API key.

---

## Configuration Guide

### Step 1: Open AI Settings
Navigate to **AI Settings** (`/app/ai-settings`) in the Desk.

### Step 2: Choose Provider
Select one of:
- **OpenAI** — GPT-4o, GPT-4o-mini, GPT-5.2, o1, o3
- **Anthropic** — Claude 3.5 Sonnet, Claude 4 Opus
- **Custom (OpenAI Compatible)** — Ollama, vLLM, LiteLLM, or any OpenAI-compatible endpoint

### Step 3: Enter API Key
Paste your API key. Stored encrypted via Frappe's Password field.

### Step 4: Set Model
Default model name (e.g. `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `llama3.1`).

### Step 5: Configure Budget & Limits
- **Monthly Budget (USD)** — AI calls stop when reached. 0 = unlimited.
- **Daily Request Limit** — Per-user daily cap. 0 = unlimited.
- **Rate Limit per Minute** — Sliding window throttle. 0 = disabled.

### Step 6: Enable Features
- **Enable Live Data Queries** — Let AI search and read ERP data (respects permissions)
- **Enable Execute Mode** — Let AI propose document creation/updates (requires approval)
- **Enable Telegram AI** — Auto-respond to incoming Telegram messages
- **Enable Email Auto-Response** — Generate AI draft replies for incoming emails

### Step 7: Save
Click Save. AI buttons appear on all 43 hooked DocType forms immediately.

---

## AI Settings — Complete Reference

### Provider Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Provider Type | Select | OpenAI | OpenAI / Anthropic / Custom (OpenAI Compatible) |
| API Key | Password | — | Your provider API key (encrypted at rest) |
| Base URL | Data | Auto | Override for self-hosted endpoints |
| Default Model | Data | gpt-4o-mini | Primary model for all AI calls |
| Embedding Model | Data | text-embedding-3-small | Model for RAG embeddings |
| Embedding Base URL | Data | — | Separate endpoint for embedding provider |

### Parameters Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Max Tokens | Int | 2048 | Maximum output tokens per call |
| Temperature | Float | 0.3 | 0 = deterministic, 1 = creative |
| Top P | Float | 1.0 | Nucleus sampling threshold |
| Timeout (seconds) | Int | 30 | Max wait time for AI response |

### Execution & Data Access
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Live Data Queries | Check | ✅ | AI can search/read ERP data |
| Enable Execute Mode | Check | ❌ | AI can propose writes (with approval) |
| Require Approval | Check | ✅ | All AI actions need explicit approval |
| Warn on Dangerous Actions | Check | ✅ | Extra warnings for Submit/Cancel/Delete |
| Max Records per Query | Int | 100 | Cap on records fetched per tool call |
| Max Tool Rounds | Int | 10 | Max tool-call rounds per request (1-25) |

### Budget & Rate Limits
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Monthly Budget (USD) | Currency | 100 | Monthly spending cap (0 = unlimited) |
| Daily Request Limit | Int | 100 | Per-user daily cap (0 = unlimited) |
| Rate Limit per Minute | Int | 0 | Per-user sliding window (0 = disabled) |
| Budget Warning Threshold (%) | Int | 80 | Alert admins at this % of budget |

### Training (RAG)
| Field | Type | Description |
|-------|------|-------------|
| DocTypes to Index | Table | Which DocTypes the AI should learn from |
| Training Actions | HTML | Buttons: Reindex All, Clear All, Discover DocTypes |
| Index Statistics | HTML | Live document/embedding counts |

### Access Control
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable RBAC | Check | ❌ | Restrict AI features by user role |
| Access Levels | Table | — | Map roles to AI tiers (viewer/user/power/admin) |

### Customer Service AI
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Email Auto-Response | Check | ❌ | AI draft replies for incoming emails |
| Auto-Response DocTypes | Table | — | Which doctypes trigger email drafts |
| Enable Telegram AI | Check | ✅ | AI auto-respond to Telegram messages |

### Caching
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Caching | Check | ✅ | Cache identical requests (Redis) |
| Cache TTL (hours) | Int | 4 | How long cached responses are valid |

### Logging & Audit
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Audit Logging | Check | ✅ | Log every AI call to AI Audit Log |
| Enable Cost Tracking | Check | ✅ | Track token usage and costs |
| Log Prompts | Check | ❌ | Store full prompts (privacy-sensitive) |
| Log Responses | Check | ✅ | Store AI responses in audit log |

### Branding
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Brand Gradient Start | Color | #f97316 | AI icon gradient start color |
| Brand Gradient End | Color | #ea580c | AI icon gradient end color |

---

## Supported Providers

### OpenAI
```
Provider Type: OpenAI
API Key: sk-...
Default Model: gpt-4o-mini  (or gpt-4o, gpt-5.2, o1, o3-mini)
```
Supports: chat, streaming, tool calling, vision, embeddings, image generation, TTS, STT.

### Anthropic (Claude)
```
Provider Type: Anthropic
API Key: sk-ant-...
Default Model: claude-3-5-sonnet-20241022  (or claude-3-opus, claude-4)
```
Supports: chat, streaming, tool calling, vision. Embeddings via OpenAI-compatible endpoint.

### Custom (OpenAI Compatible)
```
Provider Type: Custom (OpenAI Compatible)
API Key: (any value, or your server's auth token)
Base URL: http://your-server:11434/v1
Default Model: llama3.1
```
Works with: **Ollama**, **vLLM**, **LiteLLM**, **LocalAI**, **text-generation-webui**, and any OpenAI-compatible API. No code changes needed.

---

## AI Chat Interface

The AI Chat is a full-featured conversational interface accessible from:
- **Navbar button** — "Ask ERP" icon in the top bar (global)
- **Ask AI page** — `/app/ask-ai` standalone page

### Sessions
- Persistent conversation sessions stored in `AI Chat Session` DocType
- Create, rename, pin, delete sessions
- Search across all sessions and messages
- Share sessions with other users
- Export to Markdown or JSON

### 3 Modes

| Mode | Capabilities | Use Case |
|------|-------------|----------|
| **Ask** | Read-only Q&A, RAG search | "What's our return policy?" |
| **Agent** | Ask + all read tools + web search + file analysis | "Show me overdue invoices over $10K" |
| **Execute** | Agent + create/update/submit/cancel/delete tools | "Create a Sales Order for Customer X" |

### @Mention DocType Context
Type `@` in the chat to inject live document context:
- `@Lead` — injects Lead doctype schema and recent records
- `@SO-2024-001` — injects the specific Sales Order document data

### Features
- Real-time streaming with SSE (Server-Sent Events)
- File upload with automatic parsing (PDF, DOCX, XLSX, CSV, images)
- Image generation via "generate image of..." prompts
- Voice input (Whisper STT) and voice output (TTS)
- Message editing with AI re-generation
- Retry button on failed/unsatisfactory responses
- Model switching mid-conversation
- Tab filters: All / Pinned / Shared

---

## Document AI (DocType Hooks)

AI Assist buttons appear on **43 DocType forms** across 5 apps. Each button opens a contextual AI dialog with the document's data pre-loaded.

### ERPNext Core (17 DocTypes)
Lead, Opportunity, Issue, Quotation, Task, Project, Sales Order, Sales Invoice, Employee, Purchase Order, Purchase Invoice, Leave Application, Customer, Supplier, Expense Claim, Journal Entry, Payment Entry

### Marketing Suite (9 DocTypes)
Content, Ad Campaign, Insight, Research, Competitor, Influencer, Brand Profile, Media Outlet, Sponsor

### HRMS (9 DocTypes)
Job Applicant, Job Opening, Appraisal, Employee Grievance, Interview Feedback, Salary Slip, Payroll Entry, Travel Request, Goal

### Oly Custom App (6 DocTypes)
Letter, Daily Work Report, Telegram Chat, Call Log, Feedback, Job Scorecard

### Webshop (2 DocTypes)
Website Item, Item Review

### Available AI Actions per DocType
Each DocType can support any combination of: **Summarize**, **Triage**, **Suggest Reply**, **Draft**, **Classify**, **Ask AI...**

The global AI button injection makes adding AI to new DocTypes trivial — just create a JS hook file.

---

## AI Tools — 18 Built-in Capabilities

Tools are the AI's hands. In **Agent** and **Execute** modes, the AI can call tools to interact with your ERP data.

### Read Tools (available in Agent + Execute modes)

| # | Tool | Description |
|---|------|-------------|
| 1 | `search_documents` | Search any DocType with filters, fields, order, and limits |
| 2 | `get_document` | Fetch a specific document by name with all fields |
| 3 | `count_documents` | Count documents matching filters |
| 4 | `get_report` | Run built-in or custom Frappe reports |
| 5 | `get_list_summary` | Aggregated summaries (sum, avg, count) with grouping |
| 6 | `web_search` | Search the web via DuckDuckGo |
| 7 | `analyze_file` | Parse uploaded files (PDF, DOCX, XLSX, CSV, images) |
| 8 | `read_webpage` | Fetch and extract content from any URL |
| 9 | `run_code` | Execute Python code in a sandboxed environment |
| 10 | `analyze_sentiment` | Analyze text sentiment and urgency |

### Write Tools (available in Execute mode only)

| # | Tool | Description |
|---|------|-------------|
| 11 | `create_document` | Create a new document in any DocType |
| 12 | `update_document` | Update fields on an existing document |
| 13 | `submit_document` | Submit a draft document |
| 14 | `cancel_document` | Cancel a submitted document |
| 15 | `delete_document` | Delete a document |
| 16 | `send_communication` | Send emails via Frappe Communication |
| 17 | `add_comment` | Add a comment to any document |

### Custom Tools

| # | Tool | Description |
|---|------|-------------|
| 18 | Custom Tools | User-defined tools via `AI Custom Tool` DocType |

Every tool call:
- Respects Frappe permissions (`frappe.has_permission`)
- Is logged in the audit trail
- Respects `max_records_per_query` limits
- Can be disabled via settings

---

## RAG — Retrieval-Augmented Generation

RAG gives the AI knowledge about your business data by indexing documents into a searchable vector store.

### How It Works
1. **Index** — Documents are converted to text, chunked, and embedded via your embedding model
2. **Store** — Embeddings stored in `AI Document Index` DocType (no external vector DB needed)
3. **Retrieve** — On each query, hybrid BM25 + cosine similarity search finds relevant chunks
4. **Augment** — Top results are injected into the LLM prompt as context

### Hybrid Search (BM25 + Vector)
- **BM25** — Traditional keyword matching (fast, handles exact terms)
- **Vector** — Semantic similarity via embeddings (handles paraphrasing)
- **Fusion** — Reciprocal Rank Fusion combines both approaches for best accuracy

### Managing the Index
- **Discover DocTypes** — Auto-finds all indexable DocTypes across all installed apps
- **Index DocType** — Full-index a DocType with configurable batch size
- **Auto-Index** — Hook on `on_update`, `after_insert`, `on_trash` for real-time index updates
- **Scheduled Reindex** — Daily background job for stale documents
- **Clear Index** — Per-DocType or global index clearing

### Settings
- Configure indexed DocTypes in AI Settings → Training section
- Set embedding model (`text-embedding-3-small` by default)
- Min similarity score threshold: 0.7

---

## Streaming & Real-Time

The AI supports true streaming responses via Server-Sent Events (SSE).

### How It Works
1. Client calls `send_message_stream()` — returns a `task_id`
2. Server processes in background, publishing chunks to Redis pub/sub
3. Client polls `frappe.realtime` for `ai_stream_chunk` events
4. Supports tool calling within streams — tool calls are interleaved with text
5. Respects configurable `max_tool_rounds` per request

### Streaming with Tools
When the AI decides to call a tool mid-stream:
1. Stream pauses with a `tool_call` event
2. Tool executes server-side
3. Result is fed back to the LLM
4. Stream resumes with the tool-augmented response
5. Repeats up to `max_tool_rounds` times (default: 10)

---

## Voice — Speech-to-Text & Text-to-Speech

### Speech-to-Text (STT)
- Uses OpenAI Whisper API
- Supports: WAV, MP3, M4A, WEBM, OGG, FLAC
- Max file size: 25 MB
- Automatic language detection
- Endpoint: `oly_ai.api.voice.voice_to_text`

### Text-to-Speech (TTS)
- Uses OpenAI TTS API
- 6 voices: `alloy`, `echo`, `fable`, `nova`, `onyx`, `shimmer`
- Output format: MP3
- Endpoint: `oly_ai.api.voice.text_to_speech`

### Integration
- Microphone button in chat panel for voice input
- Speaker button on AI responses for voice output
- Works on desktop and mobile browsers

---

## Image Generation

### DALL-E 3 Integration
- Triggered by natural language: "generate image of...", "create a picture of..."
- Sizes: 1024x1024, 1024x1792, 1792x1024
- Quality: standard or hd
- Content safety filters with configurable banned terms
- Generated images saved to Frappe File Manager
- Endpoint: `oly_ai.api.chat.generate_image`

---

## Customer Service Automation

### Email Auto-Response (`email_handler.py`)
**Hook:** `Communication → after_insert`

When a customer sends an email linked to a supported DocType (Issue, Lead, Opportunity, Sales Order, etc.):
1. AI analyzes the email content + document context + sentiment
2. Generates a professional draft reply
3. Posts the draft as a **Comment** on the document (does NOT auto-send)
4. Notifies document owner and assignees via Notification Log

Enable in AI Settings → Customer Service AI → Enable Email Auto-Response.

### Telegram AI Bridge (`telegram_handler.py`)
**Hook:** `Telegram Message → after_insert`

When a customer sends a Telegram message:
1. Guard checks: incoming text, bot-handled chat, AI enabled, not a /command
2. Builds multi-turn conversation history (last 20 messages)
3. Enriches with ERP context (customer orders, issues, lead info)
4. Calls LLM with Telegram-optimized system prompt
5. Sends reply via Telegram Bot API (Markdown with plain-text fallback)
6. Saves outgoing message to Telegram Message doctype
7. Race-safe: re-checks `is_bot_handling` at execution time

Enable in AI Settings → Customer Service AI → Enable Telegram AI.

### Frappe Chat AI (via `chat` app)
The Chat app's `ai.py` module calls `oly_ai.api.gateway.ask_erp()`:
- Auto-reply to guest messages (configurable)
- Draft responses for agents (human reviews before sending)
- Conversation history context from Chat Message records

### SLA Monitor (`sla_monitor.py`)
**Scheduler:** Every 30 minutes

1. Finds overdue Issues (past SLA resolution time)
2. Finds at-risk Issues (approaching SLA deadline)
3. For high-priority breaches, generates AI escalation suggestions
4. Sends notifications to assignees and System Managers

### Sentiment Analysis (`sentiment.py`)
- Weighted keyword matching for positive/negative/neutral detection
- Urgency scoring (low/normal/high/critical)
- Available as AI tool (`analyze_sentiment`) and internal API
- Used by email handler and SLA monitor for context enrichment

---

## Cross-App Integration

OLY AI integrates with **all installed Frappe apps** — not just ERPNext.

### Supported Apps & DocType Hooks

| App | DocType Hooks | Examples |
|-----|:------------:|---------|
| **ERPNext** | 17 | Lead, Sales Order, Invoice, Customer, Supplier... |
| **HRMS** | 9 | Job Applicant, Appraisal, Salary Slip, Leave... |
| **Marketing Suite** | 9 | Content, Ad Campaign, Competitor, Research... |
| **Oly** | 6 | Letter, Telegram Chat, Call Log, Feedback... |
| **Webshop** | 2 | Website Item, Item Review |
| **Chat** | — | Direct gateway integration (ask_erp) |
| **Total** | **43** | All auto-discover via `discover_doctypes` |

### Auto-Discovery
The `discover_doctypes` API scans all installed apps and suggests indexable DocTypes. No manual configuration needed — install a new app, run discover, and the AI learns about it.

---

## Memory System

### Cross-Session Memory (`long_term_memory.py`)
- AI remembers user preferences, past interactions, and important facts
- Stored in `AI User Memory` DocType (per-user)
- Memory scoring — more relevant memories are weighted higher
- Memories are injected into system prompts for personalized responses

### Session Memory (`memory.py`)
- In-session conversation context management
- Automatic context window management to stay within token limits
- Message history truncation with importance-based retention

---

## Workflow Automation

### AI Workflow Engine (`workflow_engine.py`)
- Rule-based automations triggered by document events
- Configurable via `AI Workflow` and `AI Workflow Step` DocTypes
- Scheduler runs every 15 minutes
- Can trigger AI actions (summarize, classify, notify) automatically

---

## Security & Access Control

### Role-Based Access Control (RBAC)
Enable in AI Settings → Access Control.

| Tier | Capabilities |
|------|-------------|
| **Viewer** | Read AI responses only (no tool calls) |
| **User** | Ask mode + basic tools |
| **Power** | Agent mode + all read tools |
| **Admin** | Execute mode + write tools + settings |

Map Frappe roles to tiers via the Access Levels table.

### Permission Enforcement
- Every tool call checks `frappe.has_permission()` for the target document
- Users can only AI-assist documents they already have access to
- Write tools (create, update, delete) require explicit Execute mode + approval
- AI Settings accessible only to System Manager

### Data Safety
- **No auto-writes** (in Ask/Agent mode) — all outputs are read-only suggestions
- **Approval workflow** — Execute mode actions require explicit user approval
- **API key encryption** — Stored as Frappe Password field (encrypted at rest)
- **Prompt redaction** — Prompts not logged by default (opt-in via settings)
- **PII masking** — Sensitive data can be masked before sending to LLM

### Rate Limiting
- Per-user per-minute sliding window
- Daily request limits per user
- Monthly budget cap (global)
- Configurable warning thresholds

---

## Cost Control & Budget Management

### How Costs Are Tracked
Every AI call logs: input tokens, output tokens, estimated cost (based on model pricing).

### Budget Enforcement
1. **Monthly cap** — All AI calls stop when monthly spend reaches the limit
2. **Daily per-user** — Individual users capped at N requests/day
3. **Rate limit** — Per-minute sliding window prevents burst abuse
4. **Warning alerts** — Admins notified at configurable threshold (default 80%)

### Scheduled Tasks
| Task | Schedule | Purpose |
|------|----------|---------|
| Reset Daily Counters | Daily | Clear per-user daily request counts |
| Daily Digest | Daily | Send usage summary to admins |
| Weekly Report | Weekly | Generate detailed weekly usage report |

### Typical Monthly Costs
| Usage Level | Model | Estimated Cost |
|-------------|-------|:-------------:|
| Light (50 req/day) | gpt-4o-mini | ~$5–15/mo |
| Medium (200 req/day) | gpt-4o-mini | ~$20–60/mo |
| Heavy (500 req/day) | gpt-4o | ~$100–300/mo |
| Self-hosted | llama3.1 | $0 (hardware cost only) |

---

## Caching

### How It Works
- Identical requests (same prompt + model + mode) return cached responses
- Cache key: hash of system prompt + user messages + model
- Stored in Redis via Frappe's cache API
- Configurable TTL (default: 4 hours)

### Cost Savings
Typical workplaces have many repeated questions. Caching reduces API costs by 60–80%.

---

## Audit Logging

### DocType: AI Audit Log
Every AI call creates an audit record with:

| Field | Description |
|-------|-------------|
| User | Who made the request |
| Feature | Summarize, Triage, Ask AI, etc. |
| DocType / Name | Target document (if applicable) |
| Model | LLM model used |
| Tokens In / Out | Input and output token counts |
| Cost (USD) | Estimated cost |
| Response Time | Milliseconds |
| Status | Success / Error / Cached |
| Prompt | Full prompt (if logging enabled) |
| Response | AI response (if logging enabled) |

### Viewing Audit Logs
Navigate to `/app/ai-audit-log` to view, filter, and export logs.

---

## PII Data Masking

### How It Works (`pii_filter.py`)
Before sending prompts to external LLM providers:
1. **Detect** — Regex patterns match emails, phone numbers, credit cards, SSNs, IBAN, IP addresses
2. **Mask** — Replace detected PII with placeholders (`[EMAIL_1]`, `[PHONE_2]`)
3. **Restore** — After LLM responds, placeholders are replaced back with original values

### Supported PII Types
- Email addresses
- Phone numbers (international formats)
- Credit card numbers
- Social Security Numbers (SSN)
- IBAN numbers
- IP addresses (v4 and v6)
- Custom patterns (extensible)

---

## AI Prompt Templates

### DocType: AI Prompt Template
Pre-built templates control how the AI responds for each action type.

| Field | Description |
|-------|-------------|
| Template Name | Unique identifier |
| Feature | Summarize / Triage / Suggest Reply / Draft / Classify / Ask AI |
| System Prompt | Instructions for the AI's behavior |
| User Prompt Template | Template with `{doctype}`, `{question}` placeholders |
| Is Standard | Whether it's a system default |

### Template Resolution Order
1. DocType-specific template (e.g., "Lead Summarize")
2. Feature default (e.g., "Default Summarize")
3. Built-in fallback

### Default Templates (6)
Created automatically on install:
1. **Default Summarize** — Key facts, status, next steps (3-5 bullets)
2. **Default Triage** — Priority, category, routing, risk factors
3. **Default Suggest Reply** — Professional reply draft
4. **Default Draft** — Content generation (emails, reports)
5. **Default Classify** — Categories, tags, sentiment, urgency
6. **Default Ask AI** — General ERP Q&A assistant

---

## API Reference

### Gateway (`oly_ai.api.gateway`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `ai_assist(doctype, name, feature, custom_prompt)` | User | Run AI action on a specific document |
| `ask_erp(question)` | User | General Q&A with RAG context |
| `get_ai_status()` | User | Check if AI is configured and get usage stats |

### Chat (`oly_ai.api.chat`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `get_sessions(search, limit, offset, filter_type)` | User | List chat sessions with filters |
| `create_session(title)` | User | Create a new chat session |
| `get_messages(session_name)` | User | Get messages for a session |
| `send_message(session_name, message, model, mode, file_urls)` | User | Send message and get AI response |
| `edit_message(session_name, message_idx, new_content, model, mode)` | User | Edit a message and regenerate |
| `regenerate_response(session_name, message_idx, model, mode)` | User | Retry AI response for a message |
| `rename_session(session_name, title)` | User | Rename a chat session |
| `delete_session(session_name)` | User | Delete a chat session |
| `pin_session(session_name)` | User | Toggle pin/unpin a session |
| `search_messages(query, limit)` | User | Full-text search across all sessions |
| `get_model_catalog()` | User | List available models with metadata |
| `generate_image(session_name, prompt, size, quality)` | User | Generate image via DALL-E |
| `share_session(session_name, users)` | User | Share session with other users |
| `unshare_session(session_name, unshare_user)` | User | Remove a user from shared session |
| `get_shared_users(session_name)` | User | List users a session is shared with |
| `get_doctype_suggestions(query)` | User | Autocomplete for @mention DocTypes |
| `get_document_suggestions(doctype, query)` | User | Autocomplete for @mention documents |
| `export_conversation(session_name, format)` | User | Export to Markdown or JSON |

### Streaming (`oly_ai.api.stream`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `send_message_stream(session_name, message, model, mode, file_urls)` | User | Stream AI response via SSE with tool calling |

### Training / RAG (`oly_ai.api.train`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `discover_doctypes()` | System Manager | Auto-discover all indexable DocTypes |
| `index_doctype_full(doctype, limit)` | System Manager | Full-index a DocType |
| `index_single_document(doctype, name)` | System Manager | Index one document |
| `get_index_stats()` | System Manager | Get embedding counts per DocType |
| `clear_all_index_data()` | System Manager | Clear entire vector index |
| `clear_doctype_index(doctype)` | System Manager | Clear index for one DocType |

### Voice (`oly_ai.api.voice`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `voice_to_text(audio_file)` | User | Transcribe audio to text (Whisper) |
| `text_to_speech(text, voice)` | User | Convert text to speech audio |

### Dashboard (`oly_ai.api.dashboard`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `get_dashboard_data(from_date, to_date)` | System Manager | Usage stats, costs, top users |

### Actions (`oly_ai.api.actions`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `get_pending_actions(session_name)` | User | List pending AI action requests |
| `approve_action(action_name)` | User | Approve a pending AI action |
| `reject_action(action_name, reason)` | User | Reject a pending AI action |
| `approve_all(session_name)` | User | Approve all pending actions in a session |
| `reject_all(session_name, reason)` | User | Reject all pending actions in a session |

---

## DocTypes Reference

### Core DocTypes

| DocType | Type | Description |
|---------|------|-------------|
| **AI Settings** | Single | Global configuration (provider, budget, features) |
| **AI Chat Session** | Document | Persistent conversation sessions |
| **AI Chat Message** | Child Table | Messages within a session |
| **AI Chat Shared User** | Child Table | Users a session is shared with |
| **AI Audit Log** | Document | Per-call audit trail |
| **AI Action Request** | Document | Pending write actions awaiting approval |
| **AI Document Index** | Document | RAG vector embeddings storage |
| **AI Indexed DocType** | Child Table | DocTypes selected for indexing |
| **AI User Memory** | Document | Cross-session user memory storage |
| **AI Prompt Template** | Document | Customizable prompt templates |
| **AI Custom Tool** | Document | User-defined AI tools |
| **AI Workflow** | Document | Automated AI workflow definitions |
| **AI Workflow Step** | Child Table | Steps within a workflow |
| **AI Access Level** | Child Table | Role-to-tier mapping for RBAC |

---

## File Structure

```
oly_ai/
├── hooks.py                           # App hooks (43 doctype_js, schedulers, doc_events)
├── boot.py                            # Extend bootinfo (branding colors)
├── setup.py                           # Post-install: seed 6 prompt templates
│
├── api/                               # Whitelisted API endpoints
│   ├── gateway.py         (296 L)     # ai_assist(), ask_erp(), get_ai_status()
│   ├── chat.py          (1,898 L)     # Sessions, messages, images, share, @mention, export
│   ├── stream.py          (496 L)     # SSE streaming with tool calling
│   ├── train.py           (323 L)     # RAG indexing, discover, reindex schedulers
│   ├── voice.py           (175 L)     # Whisper STT + OpenAI TTS
│   ├── dashboard.py        (95 L)     # Usage dashboard data
│   └── actions.py         (187 L)     # Approve/reject AI action requests
│
├── core/                              # Core business logic
│   ├── provider.py        (733 L)     # LLM abstraction (OpenAI, Anthropic, Custom)
│   ├── tools.py         (1,281 L)     # 18 AI tools + custom tool execution
│   ├── context.py                     # Document context builder (fields + comms + comments)
│   ├── cache.py                       # Redis response caching
│   ├── cost_tracker.py    (205 L)     # Budget enforcement + cost tracking
│   ├── access_control.py  (186 L)     # RBAC tier system
│   ├── memory.py                      # In-session context management
│   ├── long_term_memory.py (386 L)    # Cross-session user memory + scoring
│   ├── file_parser.py    (292 L)      # PDF, DOCX, XLSX, CSV, image parsing
│   ├── web_reader.py     (231 L)      # URL fetching and content extraction
│   ├── pii_filter.py     (229 L)      # PII detection and masking
│   ├── sentiment.py       (181 L)     # Sentiment + urgency analysis
│   ├── email_handler.py   (299 L)     # Email auto-response drafts
│   ├── telegram_handler.py (374 L)    # Telegram AI auto-respond bridge
│   ├── sla_monitor.py    (271 L)      # SLA breach detection + AI escalation
│   ├── workflow_engine.py (434 L)     # Rule-based AI workflow automation
│   ├── notifications.py   (236 L)     # Daily digest + notification system
│   ├── utils.py                       # Shared utilities
│   └── rag/
│       ├── indexer.py     (187 L)     # Document → embedding indexing
│       └── retriever.py   (292 L)     # Hybrid BM25 + vector retrieval
│
├── oly_ai/                            # Frappe module (DocTypes + Pages)
│   ├── doctype/
│   │   ├── ai_settings/              # Singleton settings (provider, budget, features)
│   │   ├── ai_chat_session/          # Persistent chat sessions
│   │   ├── ai_chat_message/          # Chat messages (child table)
│   │   ├── ai_chat_shared_user/      # Shared session users (child table)
│   │   ├── ai_audit_log/             # Per-call audit trail
│   │   ├── ai_action_request/        # Pending write actions for approval
│   │   ├── ai_document_index/        # RAG vector embeddings
│   │   ├── ai_indexed_doctype/       # DocType indexing config (child table)
│   │   ├── ai_user_memory/           # Cross-session memory store
│   │   ├── ai_prompt_template/       # Customizable prompt templates
│   │   ├── ai_custom_tool/           # User-defined AI tools
│   │   ├── ai_workflow/              # AI workflow definitions
│   │   ├── ai_workflow_step/         # Workflow steps (child table)
│   │   └── ai_access_level/          # RBAC role-tier mapping (child table)
│   └── page/
│       ├── ask_ai/                    # Standalone AI chat page
│       ├── ai_dashboard/             # Usage analytics dashboard
│       └── ai_usage_dashboard/       # Detailed usage metrics
│
├── public/
│   ├── css/
│   │   └── ai_panel.css   (1,031 L)  # AI panel styles + responsive design
│   └── js/
│       ├── oly_ai.bundle.js (1,774 L) # Chat UI, voice, images, @mention, share
│       └── doctype_hooks/             # 43 per-doctype AI button hooks
│           ├── lead.js                # ERPNext (17 files)
│           ├── content.js             # Marketing Suite (9 files)
│           ├── job_applicant.js       # HRMS (9 files)
│           ├── letter.js              # Oly (6 files)
│           ├── website_item.js        # Webshop (2 files)
│           └── ...
│
├── tests/
│   └── test_security.py (1,622 L)     # 133 tests across 24 test classes
│
└── features/                          # Feature modules (reserved)
```

---

## Testing

### Test Suite: 133 Tests, 24 Classes

| Test Class | Tests | What It Covers |
|-----------|:-----:|----------------|
| TestCostTracker | 6 | Budget enforcement, daily limits, spend tracking |
| TestInputValidation | 8 | Prompt injection, XSS, oversized inputs |
| TestWorkflowConditionalSafety | 3 | Workflow condition sandboxing |
| TestSQLInjectionPrevention | 4 | SQL injection in tool parameters |
| TestAccessControl | 6 | RBAC tiers, permission checks |
| TestRateLimiter | 4 | Per-minute sliding window rate limits |
| TestModelAllowlist | 3 | Model name validation |
| TestNPlusOneOptimization | 3 | Query performance, batch fetching |
| TestWebSearchTool | 4 | DuckDuckGo search integration |
| TestAnalyzeFileTool | 3 | File upload and parsing |
| TestFileParser | 4 | PDF, DOCX, XLSX, CSV parsing |
| TestRAGRetriever | 4 | Vector retrieval, scoring |
| TestConfigurableToolRounds | 3 | Tool round limits |
| TestWebReader | 4 | URL fetching and content extraction |
| TestRunCode | 5 | Sandboxed code execution safety |
| TestPIIFilter | 5 | PII detection and masking |
| TestConversationExport | 3 | Markdown and JSON export |
| TestHybridRAG | 4 | BM25 + vector fusion retrieval |
| TestSentimentAnalysis | 4 | Sentiment + urgency detection |
| TestEmailHandler | 8 | Email auto-response guards and generation |
| TestDynamicSystemPrompt | 4 | Dynamic company-aware system prompts |
| TestSLAMonitor | 5 | SLA breach detection and notifications |
| TestCrossAppIntegration | 13 | Cross-app hooks, discover, tools validation |
| TestTelegramHandler | 24 | Telegram AI bridge — guards, LLM, send, retry |

### Running Tests
```bash
# All tests
bench --site your-site run-tests --app oly_ai

# Specific test class
bench --site your-site run-tests --app oly_ai --module oly_ai.tests.test_security
```

---

## Switching to Self-Hosted AI

### Step 1: Set Up Your AI Server
Run Ollama, vLLM, LiteLLM, or any OpenAI-compatible server.

```bash
# Example: Ollama
ollama serve
ollama pull llama3.1
```

### Step 2: Update AI Settings
```
Provider Type: Custom (OpenAI Compatible)
Base URL: http://your-server:11434/v1
Default Model: llama3.1
API Key: (any non-empty value)
```

### Step 3: Save
No code changes needed. All features (chat, tools, streaming, RAG) work identically.

### Embedding Note
For RAG, you'll need an embedding endpoint. Options:
- Run a separate embedding model in Ollama (`nomic-embed-text`)
- Use OpenAI for embeddings only (set Embedding Base URL separately)
- Use any OpenAI-compatible embedding server

### Compatible Self-Hosted Servers
| Server | GPU Required | Notes |
|--------|:----------:|-------|
| Ollama | Optional | Easiest setup, supports quantized models |
| vLLM | Yes | High-throughput, production-grade |
| LiteLLM | No (proxy) | Routes to 100+ providers, unified API |
| LocalAI | Optional | CPU-friendly, supports many formats |

---

## Troubleshooting

### "No module named 'oly_ai'"
```bash
cd /path/to/frappe-bench/apps/oly_ai
/path/to/frappe-bench/env/bin/pip install -e .
```

### "App oly_ai not in apps.txt"
```bash
echo "oly_ai" >> sites/apps.txt
```

### AI buttons don't appear
```bash
bench build --app oly_ai
bench --site your-site clear-cache
# Hard reload browser (Ctrl+Shift+R)
```

### "AI request timed out"
Increase `Timeout (seconds)` in AI Settings. Default is 30s. Self-hosted models may need 60–120s.

### "Monthly budget exceeded"
Check actual spend in AI Audit Log list view. Reset via `bench --site your-site console`:
```python
frappe.db.set_single_value("AI Settings", "current_month_spend", 0)
frappe.db.commit()
```

### "AI API error: 401 Unauthorized"
- Verify API key in AI Settings
- OpenAI keys start with `sk-`
- Anthropic keys start with `sk-ant-`
- Custom: check if your server requires authentication

### Telegram AI not responding
1. Check `enable_telegram_ai` is on in AI Settings
2. Verify Telegram Hub is configured (Oly app → Telegram Hub Settings)
3. Ensure chat has `is_bot_handling = 1` (default for new chats)
4. Check Error Log for "AI Telegram Response" entries

### Email auto-response not generating
1. Enable `enable_auto_response` in AI Settings
2. Ensure the email is linked to a supported DocType
3. Check the reference document's doctype is in the allowed list
4. Check Error Log for "AI Auto Response" entries

### Cache not working
```bash
bench --site your-site console
>>> import frappe
>>> frappe.cache().ping()   # Should return True
```

---

## Changelog

### v1.0.0 (February 2026)

**Telegram AI Bridge**
- Auto-respond to incoming Telegram messages via LLM
- Multi-turn conversation history (20 messages)
- ERP context enrichment (customer orders, issues, lead info)
- Markdown/plain-text fallback, race-safe agent-claim detection
- AI Settings: Customer Service AI section with toggle controls

**Sprint 3 — Customer Service & Cross-App Integration**
- Email auto-response handler (AI draft replies for incoming customer emails)
- SLA Monitor (scheduled every 30 min, detects overdue/at-risk Issues, AI escalation)
- Sentiment analysis module + `analyze_sentiment` tool
- Dynamic system prompts (runtime company/app context)
- 26 new cross-app DocType hooks (Marketing Suite 9, HRMS 9, Oly 6, Webshop 2)

**Sprint 2 — Enterprise Capabilities**
- Web page reader tool
- Conversation export (Markdown/JSON)
- Per-user budget limits
- Hybrid BM25 + vector RAG retrieval
- Sandboxed code execution tool
- PII data masking filter

**Sprint 1 — Provider Parity & Intelligence**
- Anthropic streaming + tool calling + vision support
- File upload + parsing (PDF, DOCX, XLSX, CSV, images)
- Web search tool (DuckDuckGo)
- Configurable tool round limits (1-25)
- RAG NumPy optimization

**Security Hardening (2 rounds)**
- SQL injection prevention in tool parameters
- Budget enforcement on every call path
- Per-minute rate limiting (sliding window)
- RBAC access control enforcement
- Input validation and sanitization
- 29 security-focused tests

**Feature Sprints**
- Message editing + retry with regeneration
- @Mention DocType context injection (`@Lead`, `@SO-001`)
- Share sessions with other users
- Tab filters (All / Pinned / Shared)
- Mobile-responsive UI polish
- Cross-session memory with scoring
- Dashboard date picker

**Core (v0.1.0 → v1.0.0)**
- AI Chat Panel with persistent sessions
- 3 modes: Ask, Agent, Execute
- SSE streaming with multi-round tool calling
- 18 AI tools (read + write + web + code + sentiment)
- RAG pipeline with hybrid search
- Voice I/O (Whisper STT + TTS, 6 voices)
- Image generation (DALL-E 3)
- Workflow engine with scheduled execution
- 43 DocType hooks across 5 apps
- Response caching (Redis, 60-80% cost savings)
- Full audit logging with cost tracking
- 6 customizable prompt templates (seeded on install)
- AI branding (configurable gradient colors)
- Model catalog with capability badges

---

## Uninstall

Safe removal — no core ERPNext changes to undo:

```bash
bench --site your-site uninstall-app oly_ai
bench pip uninstall oly_ai
# Remove the app directory
rm -rf apps/oly_ai
```

This removes all DocTypes (AI Settings, AI Audit Log, AI Chat Session, etc.) and their data. Back up audit logs and chat sessions first if needed.
