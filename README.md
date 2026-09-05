# PeoplePay360
**An Integrated Human Resource and Payroll Operations Platform**

## 1. Project Overview
PeoplePay360 is an integrated Human Resource and Payroll Operations Platform designed to streamline the complete lifecycle of employee management and payroll processing. 
The system transforms operational HR data (attendance, contracts, schedules, time off) directly into accurate payroll computations. It moves beyond simple CRUD operations by enforcing the complex business rules that connect an employee's daily HR activities with their final payslip.

Target users include Employees, HR Managers, HR Payroll Users, HR Payroll Managers, and System Admins.

## 2. Product Vision
The complete lifecycle managed by PeoplePay360:
`Employee` → `Contract` → `Working Schedule` → `Attendance / Time Off` → `Salary Structure` → `Salary Rules` → `Payrun` → `Payslip` → `Validation` → `Payment` → `PDF / Email` → `Dashboard / Reporting`

Every transition ensures that real operational data drives payroll, eliminating disjointed manual data entry.

## 3. System Goals
- Unified HR workflow
- Historical contract management
- Period-specific payroll processing
- Working schedule calculation
- Attendance exception handling
- Time-off allocation and approval
- Configurable salary computation
- Ordered salary-rule execution
- Payroll validation
- Payslip generation
- Payroll history
- Reporting
- Role-based permissions
- Real-time dashboard aggregation

## 4. User Roles

### Employee
Permissions:
- View own employee information
- View own attendance
- Create attendance entries where permitted
- View own leave balance
- Create Time Off Requests
- View own payslips where applicable
Must NOT have: Payroll administration, Salary configuration, Employee administration, HR management privileges.

### HR Manager
Permissions: Employee CRUD, Attendance CRUD, Contract CRUD, Working Schedule CRUD, Time Off management, Approve/refuse Time Off Requests.
Must NOT have payroll administration access.

### HR Payroll User
Includes HR Manager permissions plus:
- Create Payruns
- Read Payruns
- Update Payruns
- Read Payslips
- Create/update Payslips as permitted
- Read Salary Structures
- Read Salary Rules
Salary configuration should remain read-only.

### HR Payroll Manager
Includes HR Payroll User permissions plus:
- Full Payrun CRUD
- Full Payslip CRUD
- Salary Structure CRUD
- Salary Rule CRUD
- Payroll configuration management

### Admin
Full system access across all HR and payroll modules, user management, role management, permission management, system administration.

## 5. Functional Modules
- Employee, Contract, Working Schedule, Attendance, Time Off (Type, Allocation, Request)
- Salary Structure, Salary Rule, Payrun, Payslip, Payroll Dashboard
- Notifications / Email, PDF Generation, Authentication, Authorization, Reporting

*TBD — Implementation Decision*: Specific technologies for frontend, backend, and integration responsibilities of each module are to be decided.

## 6. Core Business Rules
- **Contract Selection**: Payroll must use the contract applicable to the selected payroll period. Prevents concurrent contracts.
- **Working Schedule**: Defines weekly hours, daily start/end times. Drives attendance expectations.
- **Attendance**: Calculates worked hours from actual check-in/out timestamps. Handles exceptions (late, absent, missing check-out).
- **Time Off**: Follows Type → Allocation → Request → Approval → Balance Update flow.

## 7. Payroll Engine
The engine computes salaries dynamically:
`Payrun` → `Selected Employees` → `Applicable Contract` → `Salary Structure` → `Ordered Salary Rules` → `Salary Components` → `Gross` → `Deductions` → `Net Salary` → `Payslip`

Salary structures and rules are configuration-driven and must actively drive payslip computation.

## 8. Payrun Workflow
Step 1: Define Salary Structure, Payroll Period, Scope.
Step 2: Identify eligible employees, filter employees, explicit employee selection.
Execution: `Create Payrun` → `Compute` → `Review` → `Warnings` → `Validate` → `Mark Paid` → `Send Payslips`

## 9. Payroll Warnings
Warnings surfaced before finalization: missing bank information, missing employee information, missing contract, invalid contract period, duplicate payslip, invalid salary structure, invalid salary rule, attendance anomalies, missing required payroll information.

## 10. Payslip
Contains Context (Employee, Contract, Period, Attendance), Salary Components (Basic, Allowances, Gross, Deductions, Contributions, Net), and Status.

## 11. PDF and Email
- **PDF**: Individual payslip printing or bulk generation.
- **Bulk Email**: `Payrun` → `Select Payslips` → `Generate PDFs` → `Generate Emails` → `Attach Payslip` → `Send` → `Track Result`.

## 12. Dashboard
Aggregates live KPIs, charts (Salary Cost by Dept, Net Salary Trends), operational alerts, and HR overviews (Attendance, Time Off). Derived from live system records.

## Documentation Navigation
- [Architecture](docs/README.md#architecture)
- [Frontend](docs/frontend/README.md)
- [Backend](docs/backend/README.md)
- [Integration](docs/integration/README.md)
