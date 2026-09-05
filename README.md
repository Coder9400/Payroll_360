# PeoplePay360 - Comprehensive HR & Payroll Solution

PeoplePay360 is a modern, scalable, and intelligent HR & Payroll platform designed for seamless multi-developer collaboration, real-time payroll processing, attendance tracking, employee lifecycle management, and AI-driven insights.

---

## 🏗️ Project Architecture

```
PeoplePay360/
├── frontend/               # Frontend Single Page / SSR Client Application
├── backend/                # RESTful API Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Environment & Database Client Configuration
│   │   ├── controllers/    # API Request Controllers
│   │   ├── middleware/     # Error Handling, Logging, and Security Middleware
│   │   ├── routes/         # Express API Route Registries
│   │   ├── services/       # Core Business Logic Layer
│   │   ├── repositories/   # Data Access & Database Query Layer
│   │   ├── validators/     # Input Request Validation
│   │   └── utils/          # Standard Response, Logging & Error Helpers
│   ├── .env.example        # Environment Variables Template
│   └── package.json        # Backend Dependencies & Scripts
├── database/
│   ├── migrations/         # PostgreSQL Schema Migrations
│   └── seeds/              # Seed Fixtures & Initialization Data
├── docs/
│   └── INTEGRATION.md      # Multi-developer Integration & Contribution Guide
├── .gitignore              # Repository Git Ignore Rules
└── README.md               # Main Project Documentation
```

---

## 🚀 Quick Start

### 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(Ensure you update `.env` with your Supabase credentials)*

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Verify health endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```

---

## 🛠️ Technology Stack

- **Backend Runtime:** Node.js (v18+)
- **Web Framework:** Express.js
- **Database:** Supabase PostgreSQL
- **Authentication & RBAC:** Supabase Auth + Granular RBAC (5 Roles, 9 Permission Modules)
- **Security:** Helmet, CORS, Bearer JWT Validation
- **AI Integration (Upcoming):** Mistral AI

---

## 📖 Developer Documentation

- [docs/INTEGRATION.md](file:///docs/INTEGRATION.md) — Multi-developer integration, API conventions, error formats, and workflows.
- [docs/AUTHENTICATION_RBAC.md](file:///docs/AUTHENTICATION_RBAC.md) — Authentication architecture, 5-tier role hierarchy, module permission matrix, and middleware reference.

---

## 🔒 Security

Secrets and credentials must **never** be committed to version control. All sensitive keys are managed via environment variables.