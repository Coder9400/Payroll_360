# PeoplePay360 - Integration Guide

Welcome to the **PeoplePay360 HR & Payroll** platform integration and development guide. This document outlines project architecture, standards, conventions, and procedures to ensure clean, merge-conflict-free multi-developer collaboration.

---

## 1. Project Structure

The project is organized in a modular, decoupled architecture:

```
PeoplePay360/
├── frontend/                     # Frontend client application (React / Next.js / Vite)
│   ├── README.md
│   └── .gitkeep
├── backend/                      # Node.js + Express REST API backend
│   ├── package.json              # Backend dependencies and scripts
│   ├── .env.example              # Environment variable template
│   ├── .env                      # Local development secrets (git-ignored)
│   └── src/
│       ├── app.js                # Express app setup and middleware configuration
│       ├── server.js             # HTTP server entrypoint and lifecycle handling
│       ├── config/               # Configuration loaders (env, database clients)
│       │   ├── env.js            # Environment variable validation & parsing
│       │   └── supabase.js       # Supabase PostgreSQL client and health checks
│       ├── controllers/          # Request handlers and response orchestrators
│       │   └── health.controller.js
│       ├── middleware/           # Express middleware
│       │   ├── errorHandler.js   # Centralized error handler
│       │   ├── notFoundHandler.js# 404 Route handler
│       │   └── requestLogger.js  # HTTP request logger
│       ├── routes/               # Express routing tables
│       │   ├── index.js          # Master API router (/api)
│       │   └── health.routes.js  # Health check routes (/api/health)
│       ├── services/             # Core business logic layer
│       │   └── index.js
│       ├── repositories/         # Database access layer (Supabase PostgREST queries)
│       │   └── index.js
│       ├── validators/           # Request schema validation (Joi/Zod/custom)
│       │   └── index.js
│       └── utils/                # Shared utilities and helpers
│           ├── apiResponse.js    # Standard JSON response formatters
│           ├── appError.js       # Custom operational error class
│           └── logger.js         # Standard application logger
├── database/
│   ├── migrations/               # PostgreSQL schema migrations
│   │   └── 001_initial_setup.sql # Base extensions and functions
│   └── seeds/                    # Seed and fixture data
│       └── 001_initial_seed.sql
├── docs/
│   └── INTEGRATION.md            # This integration guide
├── .gitignore                    # Git ignore rules for node_modules, .env, etc.
└── README.md                     # Project overview and quick start
```

---

## 2. Environment Variables

All secrets and environment-specific settings must be stored in a `.env` file located inside the `backend/` directory. **Never commit `.env` to version control.**

Copy the template from `.env.example`:

```bash
cd backend
cp .env.example .env
```

### Required Variables:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Port number for the Express server | `5000` |
| `NODE_ENV` | Runtime environment | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `http://localhost:3000,http://localhost:5173` |
| `SUPABASE_URL` | Supabase project REST URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anonymous API key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret service role key (backend only) | `eyJhbGciOi...` |
| `MISTRAL_API_KEY` | Mistral AI API key (for upcoming AI features) | `your_mistral_api_key` |

---

## 3. How to Run the Backend

### Prerequisites
- **Node.js**: `v18+` or `v20+` (Tested on Node `v24`)
- **npm**: `v9+` or `v11+`

### Installation
From the repository root or backend directory:

```bash
cd backend
npm install
```

### Running in Development Mode
Starts the server with automatic restart on file changes using `nodemon`:

```bash
npm run dev
```

### Running in Production Mode
```bash
npm start
```

### Verifying Installation
Send a GET request to the health check endpoint:

```bash
curl http://localhost:5000/api/health
```

Expected output:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-05T04:35:00.000Z",
    "uptime": "1.25s",
    "environment": "development",
    "database": {
      "status": "connected",
      "message": "Supabase connection established successfully"
    },
    "version": "1.0.0"
  },
  "message": "PeoplePay360 Backend API is operational"
}
```

---

## 4. API Standards & Naming Conventions

All API endpoints must follow RESTful standards and use JSON for both request bodies and responses.

### 4.1 URL Conventions
- Always prefix routes with `/api`.
- Use plural nouns for resources: `/api/employees`, `/api/payrolls`, `/api/departments`.
- Use lowercase alphanumeric characters and hyphens for multi-word segments: `/api/payroll-runs`.
- Use standard HTTP methods:
  - `GET /api/resources` — List resources
  - `GET /api/resources/:id` — Retrieve single resource
  - `POST /api/resources` — Create resource
  - `PUT /api/resources/:id` — Full replacement of resource
  - `PATCH /api/resources/:id` — Partial update of resource
  - `DELETE /api/resources/:id` — Remove resource

### 4.2 Standard API Response Formats

All backend responses MUST conform to one of two standardized structures:

#### Success Response
HTTP Status: `200 OK`, `201 Created`, `204 No Content`

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "role": "Software Engineer"
  },
  "message": "Employee created successfully"
}
```

#### Error Response
HTTP Status: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`, `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email address is already in use"
  }
}
```

### Standard Error Codes:
- `BAD_REQUEST`: Malformed request or syntax error
- `VALIDATION_ERROR`: Input fails validation rules
- `UNAUTHORIZED`: Authentication required or invalid token
- `FORBIDDEN`: Insufficient permissions for requested resource
- `NOT_FOUND`: Resource or route does not exist
- `CONFLICT`: Conflict with current state (e.g. duplicate key)
- `INTERNAL_SERVER_ERROR`: Unhandled server exception

---

## 5. Branching & Commit Conventions

To prevent merge conflicts and maintain clean history across multiple developers:

### 5.1 Branch Naming Scheme
- `feature/<module>-<description>` (e.g. `feature/employee-crud`, `feature/payroll-calc`)
- `fix/<module>-<issue>` (e.g. `fix/auth-token-expiry`, `fix/cors-origin-issue`)
- `refactor/<module>-<description>` (e.g. `refactor/supabase-repository`)
- `docs/<description>` (e.g. `docs/api-specifications`)

### 5.2 Commit Message Convention (Conventional Commits)
Format: `<type>(<scope>): <short summary>`

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Formatting changes that do not affect code logic
- `refactor`: Code refactoring without new features or bug fixes
- `test`: Adding or updating tests
- `chore`: Build tasks, dependency updates, configuration changes

Examples:
- `feat(health): add supabase connectivity check in health controller`
- `fix(middleware): resolve CORS preflight header mismatch`
- `docs(integration): update database migration instructions`

---

## 6. Multi-Developer Workflow Guidelines

1. **Separation of Layers**: Keep controllers thin. Put business logic in `services/`, database operations in `repositories/`, and validation in `validators/`.
2. **Never hardcode secrets**: Always read configuration from `config/env.js`.
3. **Use response helpers**: Always use `sendSuccess(res, ...)` and `sendError(res, ...)` from `utils/apiResponse.js` or throw `AppError`.
4. **Database Migrations**: Add numbered SQL files to `database/migrations/` sequentially (e.g., `002_create_employees_table.sql`). Never modify an already executed migration file in a shared branch.
