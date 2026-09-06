# Payroll_360: AI-Powered HR & Payroll Management System

Welcome to **Payroll_360**, a comprehensive, multi-tenant Human Resources and Payroll Management platform. It streamlines core HR operations—such as employee management, attendance tracking, and time-off requests—and features an advanced **AI Payroll Agent** capable of interacting with HR managers in natural language to orchestrate complex payroll calculations and reports.

---

## 🚀 Features

- **Multi-Tenant Architecture**: Securely manage multiple organizations within a single database instance using strict Row-Level Security (RLS).
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (Admin, HR Manager, Payroll Admin, Employee) to ensure users only see and mutate what they are authorized to.
- **Dynamic Payroll Engine**: An advanced mathematical evaluation engine that processes dynamic Salary Rules (e.g., Basic Pay, HRA, PF) based on real-time attendance and contract data.
- **AI HR Assistant**: Integrated with Large Language Models (Gemini/OpenAI) to provide a conversational interface for running payroll, fetching insights, and analyzing salary structures.
- **Time Off & Attendance**: Automated tracking of Paid Time Off (PTO), Sick Leave, and daily attendance records with manager approval workflows.
- **Secure Document Viewer**: Embedded, non-downloadable PDF viewer for company policies (supports `<iframe>` integrations with dynamic headers).

---

## 🏗️ System Architecture

Payroll_360 follows a decoupled architecture, consisting of a React SPA (Frontend), a Node.js/Express API (Backend), and a Supabase PostgreSQL database.

### System Context Diagram

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

### Container Diagram

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

---

## 🔐 Security & Data Flow

### Authentication & Authorization

Identity is managed by Supabase Auth (JWT). Authorization is managed by the Node.js backend using a custom RBAC middleware (`requirePermission`).

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant FE as React Frontend
    participant Auth as Supabase Auth
    participant API as Node.js Backend
    participant DB as Postgres DB

    User->>FE: Enters credentials
    FE->>Auth: Authenticate (email, password)
    Auth-->>FE: Returns session & JWT
    FE->>FE: Stores JWT in local storage

    User->>FE: Navigates to Dashboard
    FE->>API: GET /api/employees (Authorization: Bearer <JWT>)
    
    API->>API: auth.middleware intercepts request
    API->>Auth: Validate JWT
    Auth-->>API: Returns decoded user info
    
    API->>DB: Fetch user roles & permissions (cache)
    DB-->>API: Returns roles
    
    API->>API: Check route permission requirements (e.g., employee:read)
    alt Has Permission
        API->>DB: Execute business logic with RLS (tenant_id)
        DB-->>API: Return isolated data
        API-->>FE: HTTP 200 OK
    else Lacks Permission
        API-->>FE: HTTP 403 Forbidden
    end
```

---

## 🤖 AI Agent Integration Flow

The standout feature of Payroll_360 is the AI Payroll Agent. The agent interacts with the backend by executing predefined, heavily sandboxed "tools" (e.g., `fetch_salary_rules.js`, `fetch_employee.js`) instead of directly executing SQL, ensuring strict compliance with Tenant Isolation policies.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend (Express)
    participant Agent Service
    participant Gemini/OpenAI

    User->>Frontend: Types prompt ("Run payroll for Alice")
    Frontend->>Backend: POST /api/ai/chat (prompt, tenantId)
    
    Backend->>Agent Service: Queue prompt for background processing
    Backend-->>Frontend: HTTP 202 Accepted (jobId)
    
    Frontend->>Frontend: Show typing indicator
    
    loop Every 2 seconds (Polling)
        Frontend->>Backend: GET /api/ai/chat/status/:jobId
        Backend-->>Frontend: HTTP 200 OK (status: "processing")
    end
    
    Agent Service->>Gemini/OpenAI: Send Prompt + Tools
    Gemini/OpenAI-->>Agent Service: Tool Request (fetch_employee)
    Agent Service->>Agent Service: Execute Tool (reads DB securely)
    Agent Service->>Gemini/OpenAI: Send Tool Result
    Gemini/OpenAI-->>Agent Service: Final Text Response
    
    Agent Service->>Agent Service: Mark job as "completed"
    
    Frontend->>Backend: GET /api/ai/chat/status/:jobId
    Backend-->>Frontend: HTTP 200 OK (status: "completed", response: "Payroll processed!")
    
    Frontend->>Frontend: Render response to User
```

---

## 🧮 Payroll Engine Logic

The Payroll Engine (`src/services/payrollEngine.service.js`) dynamically computes net pay by evaluating a sequence of rules against an employee's context.

```mermaid
flowchart TD
    Start([Start Payroll Run]) --> FetchEmployees[Fetch active employees in Payrun]
    
    FetchEmployees --> Iterate[For Each Employee]
    
    Iterate --> FetchContract[Fetch Active Contract & Salary Structure]
    FetchContract --> FetchAttendance[Fetch Attendance & Time Off Data]
    
    FetchAttendance --> BaseSalary[Initialize Local Scope: Basic Salary, Days Worked]
    
    BaseSalary --> FetchRules[Fetch Salary Rules (ordered by sequence)]
    
    FetchRules --> EvaluateRule{Evaluate Condition}
    
    EvaluateRule --"True"--> CalcAmount[Calculate Amount (Fixed / Percentage / Code)]
    CalcAmount --> ApplyAmount[Add to Gross / Deductions]
    ApplyAmount --> NextRule[Next Rule]
    
    EvaluateRule --"False"--> NextRule
    
    NextRule --> MoreRules{More Rules?}
    MoreRules --"Yes"--> EvaluateRule
    
    MoreRules --"No"--> Finalize[Calculate Net Pay]
    Finalize --> StorePayslip[(Store in `payslips`)]
    
    StorePayslip --> MoreEmployees{More Employees?}
    MoreEmployees --"Yes"--> Iterate
    MoreEmployees --"No"--> Complete([Complete Payrun])
```

---

## 🗄️ Database Entity-Relationship Diagram (ERD)

The PostgreSQL database uses UUIDs, enforces Foreign Key constraints, and includes full Audit Trails (`created_at`, `updated_at`, `created_by`, `updated_by`).

```mermaid
erDiagram
    TENANTS ||--o{ EMPLOYEES : "has"
    TENANTS ||--o{ USERS : "has"

    USERS ||--|| PROFILES : "has"
    USERS ||--o{ USER_ROLES : "assigned"
    
    EMPLOYEES ||--|| PROFILES : "links to"
    EMPLOYEES }o--|| DEPARTMENTS : "belongs to"
    EMPLOYEES }o--|| JOB_POSITIONS : "holds"
    EMPLOYEES ||--o{ CONTRACTS : "has"
    
    EMPLOYEES ||--o{ ATTENDANCE : "logs"
    EMPLOYEES ||--o{ TIME_OFF_ALLOCATIONS : "receives"
    EMPLOYEES ||--o{ TIME_OFF_REQUESTS : "requests"
    
    CONTRACTS ||--|| SALARY_STRUCTURES : "uses"
    SALARY_STRUCTURES ||--o{ SALARY_RULES : "contains"
    
    EMPLOYEES ||--o{ PAYRUN_EMPLOYEES : "included in"
    PAYRUNS ||--o{ PAYRUN_EMPLOYEES : "processes"
    PAYRUN_EMPLOYEES ||--o{ PAYSLIPS : "generates"
```

---

## 🛠️ Tech Stack

**Frontend:**
- React 18, Vite
- Tailwind CSS
- React Router DOM
- Axios
- Lucide React (Icons)

**Backend:**
- Node.js, Express
- Supabase JS SDK (Database & Auth)
- Zod (Request Validation)
- Math.js (Payroll rule evaluation)
- LangChain / Google Vertex AI SDK (AI Agent)

**Database:**
- PostgreSQL (Supabase)
- Row-Level Security (RLS)

---

## 📖 Further Documentation
More detailed architectural insights can be found in the `/docs` directory:
- `docs/architecture/` - System, Data, and Security Architecture.
- `docs/backend/` - Node.js API logic and Engine rules.
- `docs/frontend/` - React UI component structure.
- `docs/integration/` - External LLM and API flow documentation.
