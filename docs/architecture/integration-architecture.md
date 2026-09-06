# Integration Architecture

Payroll_360 interfaces with external services to provide advanced capabilities beyond core CRUD operations. The primary external integration is with Large Language Models (LLMs) to power the "AI Payroll Agent."

## AI Agent Integration Architecture

The AI Payroll Agent allows HR users to converse with the system to run complex queries, manage employees, and orchestrate payroll processes using natural language.

```mermaid
flowchart TD
    subgraph Frontend
        ChatUI[AI Chat Interface]
    end

    subgraph Backend
        Router[AI Router]
        Agent[Agent Orchestrator (LangChain / SDK)]
        Tools[Agent Tools (e.g., fetch_employee)]
    end

    subgraph External
        Gemini[Gemini 1.5 Pro / Flash API]
        OpenAI[OpenAI gpt-4o API]
    end

    subgraph Database
        DB[(Supabase PostgreSQL)]
    end

    ChatUI --"WebSocket / HTTP POST (Prompt)"--> Router
    Router --> Agent
    Agent --"Construct Prompt + Tool Definitions"--> Gemini
    Gemini --"Tool Call Request"--> Agent
    Agent --> Tools
    Tools --"Execute SQL Query"--> DB
    DB --"Query Results"--> Tools
    Tools --"Tool Execution Result"--> Agent
    Agent --"Return Tool Result"--> Gemini
    Gemini --"Final Synthesized Response"--> Agent
    Agent --"Stream Response"--> ChatUI
```

## Key Integration Patterns

1. **AI Model Agnostic Strategy:** The backend orchestration layer abstracts the underlying LLM provider. The system primarily uses Google Gemini but can fallback or swap to OpenAI easily by changing environment variables (`GEMINI_API_KEY` vs `OPENAI_API_KEY`).
2. **Tool-Use (Function Calling):** The LLM is NEVER given direct SQL execution access. Instead, the backend exposes highly scoped, read/write controlled Node.js functions (e.g., `fetch_salary_rules.js`) as "Tools" to the LLM. The LLM decides *when* to call these tools, but the backend strictly validates all inputs and enforces Tenant boundaries before running the code.
3. **SSE / WebSocket Streaming:** For a seamless user experience, the LLM responses are streamed chunk-by-chunk to the React frontend using Server-Sent Events (SSE) or WebSockets.
