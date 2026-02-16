# OLY AI — AI Assistant for ERPNext

Provider-agnostic AI assistant for ERPNext. Adds AI-powered summaries, triage, suggestions, and Q&A directly inside the Desk UI.

## Features
- **AI Assist buttons** on Lead, Opportunity, Issue, Quotation, Task, Project
- **Ask ERP** — RAG-powered Q&A over SOPs and Wiki
- **Provider-agnostic** — works with OpenAI, Anthropic, Ollama, vLLM (swap by changing URL)
- **Cost tracking** — per-user token usage, daily limits, monthly budget caps
- **Response caching** — avoid duplicate API calls
- **Audit logging** — every AI call logged with full context
- **Permission-safe** — respects Frappe RBAC, never auto-writes

## Installation
```bash
bench get-app /path/to/oly_ai
bench --site your-site install-app oly_ai
```

## Configuration
1. Go to **AI Settings** in the search bar
2. Set your provider (OpenAI / Anthropic / Custom)
3. Enter API key and model name
4. Set budget caps and rate limits

## Swap to Self-Hosted
Change `Base URL` to your Ollama/vLLM endpoint (e.g., `http://your-gpu-server:11434/v1`) and set `Provider Type` to "Custom (OpenAI Compatible)". No code changes needed.
