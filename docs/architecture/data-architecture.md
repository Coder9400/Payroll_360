# Data Architecture

This document describes the core database design and Entity-Relationship architecture for Payroll_360. The application relies on PostgreSQL provided by Supabase.

## Entity-Relationship Diagram (ERD)

The following diagram highlights the key tables and their relationships across the HR, Time Off, and Payroll modules.

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
    
    %% Table Definitions
    TENANTS {
        uuid id PK
        string name
        string domain
    }
    
    EMPLOYEES {
        uuid id PK
        uuid user_id FK
        uuid department_id FK
        uuid job_position_id FK
        string employee_code
        string email
        string employment_status
    }
    
    CONTRACTS {
        uuid id PK
        uuid employee_id FK
        uuid salary_structure_id FK
        numeric wage
        string status
    }
    
    PAYRUNS {
        uuid id PK
        date start_date
        date end_date
        string status
    }
    
    PAYSLIPS {
        uuid id PK
        uuid payrun_id FK
        uuid employee_id FK
        numeric net_pay
        numeric gross_pay
    }
```

## Data Isolation (Multi-Tenancy)

Data isolation is strictly enforced to ensure that users belonging to one organization (Tenant) cannot access data from another.

1. **Tenant ID:** Every table in the system (except system-wide lookup tables) contains a `tenant_id` column.
2. **Row-Level Security (RLS):** Supabase RLS policies are applied at the database layer. Every query must pass through a policy that checks if the record's `tenant_id` matches the `tenant_id` of the authenticated user making the request.
3. **Application Layer Scope:** The Node.js backend implements an abstraction `withTenant(query, tenantId)` that automatically appends a `.eq('tenant_id', tenantId)` filter to all database queries to provide defense-in-depth against RLS misconfigurations.
