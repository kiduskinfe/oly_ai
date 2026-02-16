# OLY AI — AI Assistant for ERPNext

**Version:** 0.1.0  
**License:** MIT  
**Publisher:** OLY Technologies (kidus@oly.et)  
**Requires:** Frappe >= 15.0.0, ERPNext >= 15.0.0  

Provider-agnostic AI assistant for ERPNext. Adds AI-powered summaries, triage, suggested replies, draft content, and Q&A directly inside the Desk UI — without modifying any core ERPNext code.

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Installation](#installation)
4. [Configuration Guide](#configuration-guide)
5. [AI Settings — All Fields](#ai-settings--all-fields)
6. [Supported Providers](#supported-providers)
7. [API Reference](#api-reference)
8. [DocType JS Hooks](#doctype-js-hooks)
9. [AI Prompt Templates](#ai-prompt-templates)
10. [Cost Control & Budget Management](#cost-control--budget-management)
11. [Caching](#caching)
12. [Audit Logging](#audit-logging)
13. [Switching to Self-Hosted AI](#switching-to-self-hosted-ai)
14. [File Structure](#file-structure)
15. [Security & Permissions](#security--permissions)
16. [Troubleshooting](#troubleshooting)
17. [Roadmap](#roadmap)
18. [Uninstall](#uninstall)

---

## Features

| Feature | Description | DocTypes |
|---------|-------------|----------|
| **Summarize** | One-click document summary with next steps | Lead, Opportunity, Issue, Quotation, Task, Project, Sales Order, Sales Invoice |
| **Triage** | Auto-classify priority, category, routing | Lead, Opportunity, Issue |
| **Suggest Reply** | Draft professional replies based on context | Lead, Issue |
| **Draft** | Generate content (emails, proposals, notes) | Lead, Opportunity, Quotation, Task, Project, Sales Order |
| **Classify** | Categorize documents with confidence scores | Opportunity, Issue |
| **Ask AI...** | Custom free-text prompt on any document | All hooked doctypes |
| **Ask ERP** | Global Q&A about SOPs, policies, and how-to | Navbar button (global) |
| **Cost Tracking** | Per-user token usage, daily/monthly limits | AI Settings |
| **Response Cache** | Redis-backed cache to reduce API costs 60–80% | Automatic |
| **Audit Log** | Every AI call logged with user, tokens, cost, timing | AI Audit Log |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Frappe Desk UI                         │
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐  │
│  │  Lead    │ │  Issue  │ │ Quotn.  │ │  Ask ERP 🤖   │  │
│  │ AI Btns  │ │ AI Btns │ │ AI Btns │ │  (navbar)     │  │
│  └────┬─────┘ └────┬────┘ └────┬────┘ └──────┬────────┘  │
│       │            │           │              │           │
│       └────────────┴───────────┴──────────────┘           │
│                        │                                  │
│              frappe.xcall()                               │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│              oly_ai — Custom Frappe App                   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              API Gateway (gateway.py)                │  │
│  │  • Permission check (frappe.has_permission)          │  │
│  │  • Budget check (daily/monthly limits)               │  │
│  │  • Context builder (doc fields + comms + comments)   │  │
│  │  • Prompt template resolution                        │  │
│  │  • Cache check (Redis)                               │  │
│  │  • Audit logging                                     │  │
│  │  • Cost tracking                                     │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │           LLM Provider (provider.py)                 │  │
│  │  • OpenAI API        → api.openai.com/v1             │  │
│  │  • Anthropic API     → api.anthropic.com             │  │
│  │  • Custom endpoint   → your-server:11434/v1          │  │
│  │  • Embeddings        → for RAG (Phase 2)             │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                 │
│  ┌─────────┐ ┌──────────┤ ┌──────────────┐               │
│  │  Cache   │ │  Cost    │ │  Audit Log   │               │
│  │ (Redis)  │ │ Tracker  │ │  (DocType)   │               │
│  └─────────┘ └──────────┘ └──────────────┘               │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │   LLM Provider       │
              │ (OpenAI / Anthropic  │
              │  / Ollama / vLLM)    │
              └──────────────────────┘
```

**Key design principles:**
- **No core edits** — all functionality via hooks, whitelisted APIs, and custom DocTypes
- **Upgrade-safe** — clean install/uninstall, survives `bench update`
- **Draft-first** — AI never auto-writes to documents; all suggestions require human action
- **Permission-respecting** — every API call checks `frappe.has_permission` before reading data
- **Provider-agnostic** — swap LLM providers by changing 2 fields in Settings

---

## Installation

### New install
```bash
cd /path/to/frappe-bench

# Get the app
bench get-app /path/to/oly_ai   # or: bench get-app https://github.com/your-org/oly_ai.git

# Install pip package
./env/bin/pip install -e apps/oly_ai

# Install on site
bench --site your-site install-app oly_ai

# Build assets
bench build --app oly_ai

# Migrate (creates DB tables)
bench --site your-site migrate
```

### Verify installation
```bash
bench --site your-site console
>>> "oly_ai" in frappe.get_installed_apps()
True
>>> frappe.db.exists("DocType", "AI Settings")
'AI Settings'
```

---

## Configuration Guide

### Step 1: Open AI Settings
Navigate to the URL bar and type `AI Settings`, or go to:
```
/app/ai-settings
```

### Step 2: Choose Provider
| Provider | When to use |
|----------|-------------|
| **OpenAI** | Best quality + speed. Recommended for most use cases. |
| **Anthropic** | Alternative to OpenAI. Good for long-context tasks. |
| **Custom (OpenAI Compatible)** | Self-hosted (Ollama, vLLM, LiteLLM). Full data privacy. |

### Step 3: Enter API Key
- **OpenAI:** Get from https://platform.openai.com/api-keys
- **Anthropic:** Get from https://console.anthropic.com/settings/keys
- **Custom:** Your server's auth token (or any value if no auth)

### Step 4: Set Model
| Model | Provider | Cost/1M tokens (in→out) | Best for |
|-------|----------|------------------------|----------|
| `gpt-4o-mini` | OpenAI | $0.15 → $0.60 | Most ERP tasks (recommended) |
| `gpt-4o` | OpenAI | $2.50 → $10.00 | Complex reasoning, drafting |
| `claude-3-5-haiku-20241022` | Anthropic | $0.80 → $4.00 | Fast + cheap |
| `claude-3-5-sonnet-20241022` | Anthropic | $3.00 → $15.00 | High quality |
| `llama3.1` | Self-hosted | $0 | Data privacy (needs GPU) |

### Step 5: Set Budget & Limits
- **Monthly Budget Cap:** e.g. $100. AI calls stop when exceeded.
- **Daily Request Limit per User:** e.g. 100 requests/user/day.

### Step 6: Save
Click Save. AI Assist buttons will now appear on supported documents.

---

## AI Settings — All Fields

### Provider Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Provider Type | Select | OpenAI | `OpenAI`, `Anthropic`, or `Custom (OpenAI Compatible)` |
| API Key | Password | — | Your provider's API key (stored encrypted) |
| Base URL | Data | Auto | Override for custom endpoints. Required for Custom provider. |
| Default Model | Data | gpt-4o-mini | Model identifier string |
| Embedding Model | Data | text-embedding-3-small | For RAG/embeddings (Phase 2) |
| Embedding Base URL | Data | — | If embeddings use a different endpoint |

### Parameters Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Max Tokens | Int | 2048 | Maximum output tokens per AI call |
| Temperature | Float | 0.3 | 0 = deterministic, 1 = creative. 0.3 recommended for ERP. |
| Top P | Float | 1.0 | Nucleus sampling parameter |
| Timeout (seconds) | Int | 30 | Max wait time for AI response |

### Budget Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Monthly Budget Cap (USD) | Currency | 100 | AI stops when exceeded. 0 = unlimited. |
| Daily Request Limit per User | Int | 100 | Per-user daily cap. 0 = unlimited. |
| Current Month Spend (USD) | Currency | — | Auto-calculated (read-only) |
| Total Requests Today | Int | — | Auto-calculated (read-only) |

### Cache Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Response Caching | Check | Yes | Cache identical requests in Redis |
| Cache TTL (hours) | Int | 4 | How long cached responses are valid |

### Logging Section
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Audit Logging | Check | Yes | Log every AI call to AI Audit Log DocType |
| Enable Cost Tracking | Check | Yes | Track token usage and estimated costs |
| Log Prompts | Check | No | Store full prompts (may contain sensitive data) |
| Log Responses | Check | Yes | Store AI responses in audit log |

---

## Supported Providers

### OpenAI
- **Base URL:** `https://api.openai.com/v1` (auto-set)
- **Auth:** Bearer token via API Key
- **Endpoint:** `/chat/completions`
- **Models:** gpt-4o-mini, gpt-4o, gpt-4-turbo
- **Embeddings:** text-embedding-3-small, text-embedding-3-large

### Anthropic (Claude)
- **Base URL:** `https://api.anthropic.com` (auto-set)
- **Auth:** `x-api-key` header
- **Endpoint:** `/v1/messages`
- **Models:** claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229
- **Note:** Uses Anthropic's native message format (auto-converted internally)

### Custom (OpenAI Compatible)
Works with any server that implements the OpenAI chat completions API:
- **Ollama:** `http://your-server:11434/v1`
- **vLLM:** `http://your-server:8000/v1`
- **LiteLLM:** `http://your-server:4000/v1`
- **LocalAI:** `http://your-server:8080/v1`
- **text-generation-webui:** `http://your-server:5000/v1`

---

## API Reference

All API endpoints are whitelisted Frappe methods, callable via `frappe.xcall()` from JS or via REST API.

### `oly_ai.api.gateway.ai_assist`

Main AI gateway for document-level AI features.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `doctype` | str | Yes | Document type (e.g. "Lead", "Issue") |
| `name` | str | Yes | Document name |
| `feature` | str | Yes | `Summarize`, `Triage`, `Suggest Reply`, `Draft`, `Classify` |
| `custom_prompt` | str | No | Additional instructions for the AI |

**Returns:**
```json
{
  "content": "AI response text (markdown)",
  "model": "gpt-4o-mini",
  "cached": false,
  "cost": 0.0012,
  "tokens": 450,
  "response_time": 1.5
}
```

**Request flow:**
1. Permission check → `frappe.has_permission(doctype, "read", name)`
2. Budget check → daily limit + monthly cap
3. Context extraction → doc fields + communications + comments
4. Prompt resolution → template or default
5. Cache check → Redis lookup
6. LLM call → provider API
7. Cost tracking → token count + estimated cost
8. Cache store → save response
9. Audit log → record everything
10. Return response

**Example (JS):**
```javascript
frappe.xcall("oly_ai.api.gateway.ai_assist", {
    doctype: "Lead",
    name: "LEAD-00042",
    feature: "Summarize"
}).then(r => console.log(r.content));
```

**Example (REST):**
```bash
curl -X POST https://your-site/api/method/oly_ai.api.gateway.ai_assist \
  -H "Authorization: token api_key:api_secret" \
  -H "Content-Type: application/json" \
  -d '{"doctype": "Lead", "name": "LEAD-00042", "feature": "Summarize"}'
```

### `oly_ai.api.gateway.ask_erp`

General Q&A about the ERP system, SOPs, and policies.

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | str | Yes | User's question in natural language |

**Returns:**
```json
{
  "content": "AI answer (markdown)",
  "model": "gpt-4o-mini",
  "cached": false,
  "cost": 0.0008
}
```

**Example (JS):**
```javascript
frappe.xcall("oly_ai.api.gateway.ask_erp", {
    question: "What is our leave policy for new employees?"
}).then(r => console.log(r.content));
```

### `oly_ai.api.gateway.get_ai_status`

Get current AI usage stats (for dashboards).

**Returns:**
```json
{
  "provider": "OpenAI",
  "model": "gpt-4o-mini",
  "monthly_budget": 100,
  "current_spend": 42.50,
  "daily_limit": 100,
  "requests_today": 23,
  "caching_enabled": true
}
```

---

## DocType JS Hooks

AI Assist buttons are added to these doctypes automatically on form load:

| DocType | Available Features |
|---------|-------------------|
| **Lead** | Summarize, Triage, Suggest Reply, Draft, Ask AI... |
| **Opportunity** | Summarize, Triage, Draft, Classify, Ask AI... |
| **Issue** | Summarize, Triage, Suggest Reply, Classify, Ask AI... |
| **Quotation** | Summarize, Draft, Ask AI... |
| **Task** | Summarize, Draft, Ask AI... |
| **Project** | Summarize, Draft, Ask AI... |
| **Sales Order** | Summarize, Draft, Ask AI... |
| **Sales Invoice** | Summarize, Ask AI... |

### Adding AI to a new DocType
Create a new JS file at `oly_ai/public/js/doctype_hooks/your_doctype.js`:
```javascript
frappe.ui.form.on("Your DocType", {
    refresh(frm) {
        if (frm.doc.docstatus < 2) {
            oly_ai.add_ai_buttons(frm, [
                "Summarize",
                "Triage",        // optional
                "Suggest Reply", // optional
                "Draft",         // optional
                "Classify",      // optional
            ]);
        }
    },
});
```

Then add to `hooks.py`:
```python
doctype_js = {
    ...
    "Your DocType": "public/js/doctype_hooks/your_doctype.js",
}
```

Run `bench build --app oly_ai` after adding.

---

## AI Prompt Templates

Prompt Templates let you customize the AI's behavior per feature and per doctype — without changing code.

### DocType: AI Prompt Template

| Field | Description |
|-------|-------------|
| Template Name | Unique identifier |
| Feature | Summarize, Triage, Suggest Reply, Draft, Classify, Custom |
| DocType | Specific to a DocType, or blank for global |
| Enabled | On/Off toggle |
| Model Override | Use a different model for this template |
| Temperature Override | Different creativity level |
| Max Tokens Override | Different output length |
| System Prompt | Instructions for the AI (supports `{doctype}`, `{name}` placeholders) |
| User Prompt Template | The actual request (supports `{doctype}`, `{name}` placeholders) |
| Context Fields | Comma-separated field names to include (blank = all) |
| Include Communications | Include linked emails/messages |
| Include Comments | Include document comments |
| Max Context Length | Character limit for context |

### Template Resolution Order
1. **DocType-specific template** — matches feature + doctype
2. **Global template** — matches feature only (no doctype set)
3. **Built-in default** — hardcoded fallback prompts per feature

### Example: Custom Lead Summary Template
```
Template Name: Lead Summary - Sales
Feature: Summarize
DocType: Lead
System Prompt: You are a senior sales analyst at OLY Technologies. Summarize this
  Lead focusing on: 1) Buying intent signals, 2) Budget indicators, 3) Timeline,
  4) Competition risk, 5) Recommended next action. Be concise and actionable.
User Prompt: Analyze this {doctype} and provide a sales-focused summary.
Context Fields: lead_name,company_name,source,status,notes
Include Communications: Yes
Max Context Length: 6000
```

---

## Cost Control & Budget Management

### How costs are tracked
Every AI call records:
- Input tokens (prompt size)
- Output tokens (response size)
- Estimated cost in USD (based on model pricing table)

### Model pricing table (built-in)
| Model | Input $/1M tokens | Output $/1M tokens |
|-------|-------------------|---------------------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4-turbo | $10.00 | $30.00 |
| text-embedding-3-small | $0.02 | $0 |
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-5-haiku | $0.80 | $4.00 |
| claude-3-opus | $15.00 | $75.00 |
| Self-hosted (any) | $0 | $0 |

### Budget enforcement
- **Monthly cap:** When `current_month_spend >= monthly_budget_usd`, all AI calls return a "Budget Exceeded" error instead of calling the API. Users see a clear message.
- **Daily per-user limit:** When a user exceeds `daily_request_limit`, they get a "Rate Limited" error. Other users are unaffected.

### Scheduled tasks
| Task | Frequency | What it does |
|------|-----------|-------------|
| `reset_daily_counters` | Daily | Resets the "requests today" counter to 0 |
| `generate_weekly_usage_report` | Weekly | Logs a summary of usage per user to `frappe.log` |

### Typical monthly costs
| Users | Requests/day | Model | Est. monthly cost |
|-------|-------------|-------|-------------------|
| 5–10 | 50–100 | gpt-4o-mini | $15–40 |
| 10–30 | 100–500 | gpt-4o-mini | $40–150 |
| 30–100 | 500–2000 | mixed | $150–500 |

---

## Caching

### How it works
1. A SHA-256 hash is generated from the messages + model + feature.
2. Before calling the API, the gateway checks Redis for this hash.
3. If found (and not expired), the cached response is returned instantly at $0 cost.
4. If not found, the API is called and the response is cached for future use.

### Cache invalidation
- **TTL-based:** Responses expire after `cache_ttl_hours` (default: 4 hours).
- **Manual:** Call `oly_ai.core.cache.clear_cache()` from console to clear all AI caches.

### Cost savings
With caching enabled, identical requests (same document, same feature) reuse cached responses. In practice this reduces API costs by **60–80%** because:
- Multiple users viewing the same Lead get the same summary
- Refreshing a form doesn't re-call the API
- Common "Ask ERP" questions are answered from cache

---

## Audit Logging

### DocType: AI Audit Log

Every AI call creates an audit log entry with:

| Field | Description |
|-------|-------------|
| User | Who made the call |
| Feature | Summarize, Triage, etc. |
| Reference DocType | e.g. Lead, Issue |
| Reference Name | e.g. LEAD-00042 |
| Model Used | e.g. gpt-4o-mini |
| Status | Success, Error, Cached, Rate Limited, Budget Exceeded |
| Input Tokens | Prompt token count |
| Output Tokens | Response token count |
| Estimated Cost (USD) | Calculated from model pricing |
| Response Time (seconds) | API latency |
| Cached | Whether response was served from cache |
| Prompt | Full prompt text (if "Log Prompts" enabled) |
| Response | Full AI response (if "Log Responses" enabled) |
| Error Message | Error details (if status = Error) |

### Viewing audit logs
Go to: `/app/ai-audit-log`

Filter by user, feature, status, date range to analyze usage patterns.

### Privacy note
By default, prompts are **not** logged (they may contain document data). Responses are logged. Toggle "Log Prompts" in AI Settings if you need full traceability.

---

## Switching to Self-Hosted AI

When your API costs exceed ~$300/month, or you need full data privacy, switch to a self-hosted model.

### Step 1: Set up your AI server
```bash
# Example: Ollama on a GPU server
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve  # Starts on port 11434
ollama pull llama3.1
```

### Step 2: Update AI Settings
| Field | Value |
|-------|-------|
| Provider Type | Custom (OpenAI Compatible) |
| Base URL | `http://your-gpu-server:11434/v1` |
| Default Model | `llama3.1` |
| API Key | `ollama` (any value) |

### Step 3: Save
That's it. No code changes. All features (Summarize, Triage, etc.) work the same.

### Compatible self-hosted servers
| Server | Install | Default Port | Notes |
|--------|---------|-------------|-------|
| Ollama | `curl -fsSL https://ollama.ai/install.sh \| sh` | 11434 | Easiest setup |
| vLLM | `pip install vllm` | 8000 | Best throughput |
| LiteLLM | `pip install litellm` | 4000 | Multi-model proxy |
| LocalAI | Docker image | 8080 | CPU-friendly |

### Recommended GPU for self-hosted
| GPU | VRAM | Models | Monthly VPS cost |
|-----|------|--------|-----------------|
| RTX 3090 | 24 GB | Up to 13B | ~$150 |
| RTX 4090 | 24 GB | Up to 70B (quantized) | ~$200 |
| A10G | 24 GB | Up to 70B (quantized) | ~$250 |

---

## File Structure

```
oly_ai/
├── README.md                          # This file
├── license.txt                        # MIT License
├── pyproject.toml                     # Python package config
├── .gitignore
└── oly_ai/
    ├── __init__.py                    # Version: 0.1.0
    ├── hooks.py                       # Frappe hooks (JS, scheduler, fixtures)
    ├── modules.txt                    # Module: "Oly AI"
    ├── patches.txt                    # Migration patches
    │
    ├── api/                           # Whitelisted API endpoints
    │   ├── __init__.py
    │   └── gateway.py                 # ai_assist(), ask_erp(), get_ai_status()
    │
    ├── core/                          # Core engine
    │   ├── __init__.py
    │   ├── provider.py                # LLMProvider class (OpenAI/Anthropic/Custom)
    │   ├── cache.py                   # Redis response caching
    │   ├── cost_tracker.py            # Token tracking, budget enforcement, reports
    │   └── context.py                 # Document context builder (fields + comms)
    │
    ├── features/                      # Feature-specific logic (Phase 2)
    │   └── __init__.py
    │
    ├── config/                        # Frappe config
    │   ├── __init__.py
    │   └── desktop.py                 # Module registration
    │
    ├── oly_ai/                        # DocTypes (Frappe module)
    │   ├── __init__.py
    │   └── doctype/
    │       ├── ai_settings/           # Singleton settings (provider, budget, cache)
    │       ├── ai_audit_log/          # Per-call audit trail
    │       └── ai_prompt_template/    # Customizable prompt templates
    │
    ├── public/
    │   ├── css/
    │   │   └── ai_panel.css           # AI dialog styles
    │   └── js/
    │       ├── oly_ai.bundle.js       # Main JS (AI panel, Ask ERP, navbar)
    │       └── doctype_hooks/         # Per-doctype AI button hooks
    │           ├── lead.js
    │           ├── opportunity.js
    │           ├── issue.js
    │           ├── quotation.js
    │           ├── task.js
    │           ├── project.js
    │           ├── sales_order.js
    │           └── sales_invoice.js
    │
    └── templates/                     # Page templates (Phase 2)
        └── pages/
```

---

## Security & Permissions

### Access control
- **AI Settings:** Only `System Manager` can read/write (API keys are encrypted via Password field).
- **AI Audit Log:** Only `System Manager` can read. No one can create/delete manually.
- **AI Prompt Template:** Only `System Manager` can create/edit.
- **AI Assist buttons:** Visible to all users with `read` permission on the target document.
- **Data access:** The gateway checks `frappe.has_permission(doctype, "read", name)` before extracting any document data. Users can only AI-assist documents they can already see.

### Data safety
- **No auto-writes:** AI never creates, updates, or deletes any document. All outputs are suggestions that require user action (copy, comment, or manual entry).
- **No core edits:** The app uses only hooks, whitelisted methods, and custom DocTypes. Safe to install/uninstall.
- **API key encryption:** Stored as Frappe Password field (encrypted at rest).
- **Prompt redaction:** By default, prompts are NOT stored in audit logs. Enable "Log Prompts" only if your data policy allows it.

### What data leaves your server?
When using external providers (OpenAI/Anthropic):
- Document fields included in the context
- Communications and comments linked to the document
- Your custom prompts

**Mitigations:**
- Use `context_fields` in Prompt Templates to limit which fields are sent
- Set `max_context_length` to cap data volume
- Switch to self-hosted for full data privacy

---

## Troubleshooting

### "No module named 'oly_ai'"
```bash
cd /path/to/frappe-bench/apps/oly_ai
/path/to/frappe-bench/env/bin/pip install -e .
```

### "App oly_ai not in apps.txt"
```bash
echo "oly_ai" >> /path/to/frappe-bench/sites/apps.txt
```

### AI buttons don't appear
```bash
bench build --app oly_ai
bench --site your-site clear-cache
# Reload the browser (Ctrl+Shift+R)
```

### "AI request timed out"
Increase `Timeout (seconds)` in AI Settings. Default is 30s. Self-hosted models may need 60–120s.

### "Monthly budget exceeded" but spend seems low
Check `AI Audit Log` for actual spend. The counter in AI Settings is updated incrementally and may drift. The budget check uses the actual sum from audit logs.

### "AI API error: 401 Unauthorized"
- Double-check your API key in AI Settings
- For OpenAI: ensure the key starts with `sk-`
- For Custom: check if your server requires authentication

### Cache not working
```bash
bench --site your-site console
>>> import frappe
>>> frappe.cache().ping()   # Should return True
```

---

## Roadmap

### Phase 1 (current)
- [x] Provider-agnostic LLM client
- [x] AI Assist on 8 doctypes
- [x] Ask ERP (global Q&A)
- [x] Cost tracking + budget enforcement
- [x] Response caching
- [x] Audit logging
- [x] Prompt templates

### Phase 2 (planned)
- [ ] RAG pipeline (embed Wiki/SOP content for context-aware Ask ERP)
- [ ] Standalone "Ask ERP" page with conversation history
- [ ] Usage dashboard with charts
- [ ] Default prompt template seeds
- [ ] Email integration (AI-drafted replies in Communication)
- [ ] Background job for batch summaries

### Phase 3 (future)
- [ ] Agent actions with approval workflows
- [ ] n8n/webhook integration for external automations
- [ ] Multi-language prompt templates
- [ ] A/B testing for prompts
- [ ] Evaluation datasets + regression tests

---

## Uninstall

Safe removal — no core changes to undo:
```bash
bench --site your-site uninstall-app oly_ai
/path/to/frappe-bench/env/bin/pip uninstall oly_ai
# Remove from apps.txt if needed
# Remove apps/oly_ai directory
```

This removes all DocTypes (AI Settings, AI Audit Log, AI Prompt Template) and their data. Back up audit logs first if needed.
