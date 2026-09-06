# System Architecture

This document describes the high-level architecture of **Payroll_360**, an AI-powered human resources and payroll management system.

## C4 Model: System Context Diagram

The system context diagram shows the overarching relationship between the users, the core Payroll_360 system, and external third-party services.

```mermaid
C4Context
    title System Context diagram for Payroll_360

    Person(admin, "Admin / HR Manager", "Manages employees, approves time-offs, and runs payroll.")
    Person(employee, "Employee", "Views payslips, requests time off, and checks attendance.")

    System(payroll360, "Payroll_360", "Core HR, Payroll, and AI Agent platform.")

    System_Ext(supabase, "Supabase", "Provides Database (PostgreSQL), Authentication, and Row-Level Security.")
    System_Ext(llm, "LLM Provider (Gemini / OpenAI)", "Provides natural language understanding for the AI HR Agent.")

    Rel(admin, payroll360, "Manages system and runs payroll using", "HTTPS")
    Rel(employee, payroll360, "Accesses personal data and requests leave using", "HTTPS")
    
    Rel(payroll360, supabase, "Reads/writes data and authenticates users via", "REST / SDK")
    Rel(payroll360, llm, "Sends queries and receives agentic actions via", "REST / WebSocket")
```

## C4 Model: Container Diagram

The container diagram breaks down the Payroll_360 system into its constituent applications and data stores.

```mermaid
C4Container
    title Container diagram for Payroll_360

    Person(user, "User", "Admin, HR, or Employee")

    Container_Boundary(payroll360, "Payroll_360") {
        Container(spa, "Single-Page Application", "React, Vite, Tailwind", "Provides all functionality to users via their web browser.")
        Container(api, "API Application", "Node.js, Express", "Handles business logic, AI agent orchestration, and payroll calculations.")
        ContainerDb(db, "Database", "PostgreSQL (Supabase)", "Stores users, employees, payroll, and attendance data.")
    }

    System_Ext(llm, "LLM Provider", "Gemini / OpenAI")

    Rel(user, spa, "Visits", "HTTPS")
    Rel(spa, api, "Makes API calls to", "JSON/HTTPS")
    Rel(spa, db, "Authenticates directly via", "Supabase Auth")
    Rel(api, db, "Reads from and writes to", "pg / SDK")
    Rel(api, llm, "Orchestrates AI tasks via", "REST")
```

## High-Level System Flow

1. **Authentication:** The user logs in via the React Frontend. The frontend authenticates directly with Supabase Auth to receive a JWT.
2. **Authorization:** The frontend includes the JWT in the `Authorization` header of REST API requests to the Node.js backend.
3. **Data Isolation (Multi-Tenancy & RBAC):** The backend verifies the JWT and enforces Row-Level Security (RLS) constraints and Role-Based Access Control before interacting with the PostgreSQL database.
4. **AI Agent Interaction:** When using the AI HR Assistant, the frontend sends a prompt to the backend. The backend delegates the prompt to an LLM provider alongside specific tooling functions (e.g., fetching employee data). The results are streamed back to the frontend.
