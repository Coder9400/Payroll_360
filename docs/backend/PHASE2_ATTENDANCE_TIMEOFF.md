# Phase 2 — Attendance & Time Off Operations API

## Architecture Overview

Phase 2 extends the Phase 1 HR Master Data layer with operational HR functionality.

```
Employee
   │
   ├── Working Schedule (Phase 1)
   │       └── working_schedule_days (per day rules)
   │
   ├── Attendance (Phase 2)
   │       ├── check_in / check_out
   │       ├── worked_hours (calculated)
   │       ├── status: PRESENT | LATE | HALF_DAY | OVERTIME | MISSING_CHECKOUT | CORRECTED
   │       ├── expected_start/end/hours (snapshot from schedule)
   │       └── Correction audit trail
   │
   └── Time Off (Phase 2)
           ├── Time Off Type (Phase 1)
           ├── Allocation (balance pool)
           │       ├── allocated_amount
           │       ├── approved_amount
           │       ├── taken_amount
           │       └── remaining_amount
           └── Request
                   ├── start_date / end_date
                   ├── duration (working-day calculated)
                   ├── status: DRAFT → PENDING → APPROVED | REFUSED; APPROVED → CANCELLED
                   └── Approval workflow
```

---

## Database Schema

### `attendance`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID FK | Employee reference |
| attendance_date | DATE | Work date (unique per employee) |
| check_in | TIMESTAMPTZ | Check-in timestamp (UTC) |
| check_out | TIMESTAMPTZ | Check-out timestamp (UTC) |
| worked_hours | NUMERIC(5,2) | Calculated by backend |
| status | VARCHAR(30) | PRESENT/LATE/HALF_DAY/OVERTIME/MISSING_CHECKOUT/CORRECTED |
| expected_start | TIME | Snapshot from schedule |
| expected_end | TIME | Snapshot from schedule |
| expected_hours | NUMERIC(5,2) | Snapshot from schedule |
| break_minutes | INTEGER | Break duration from schedule |
| overtime_hours | NUMERIC(5,2) | Calculated when worked > expected |
| is_manual_edit | BOOLEAN | TRUE if corrected by HR |
| correction_reason | TEXT | Required for corrections |
| notes | TEXT | Optional notes |
| created_by | UUID FK | User who created |
| updated_by | UUID FK | Last updater |

**Constraint:** `UNIQUE(employee_id, attendance_date)` — one record per employee per day.

### `time_off_allocations`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID FK | Employee |
| time_off_type_id | UUID FK | Leave type |
| allocated_amount | NUMERIC(8,2) | Granted amount |
| approved_amount | NUMERIC(8,2) | Set on approval = allocated_amount |
| taken_amount | NUMERIC(8,2) | Consumed by approved requests |
| remaining_amount | NUMERIC(8,2) | approved - taken (non-negative constraint) |
| valid_from | DATE | Allocation start |
| valid_to | DATE | Allocation expiry (NULL = never) |
| status | VARCHAR(30) | DRAFT/PENDING_APPROVAL/APPROVED/REFUSED/EXPIRED/CANCELLED |

**Balance:** `remaining_amount = approved_amount - taken_amount`

### `time_off_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID FK | Employee |
| time_off_type_id | UUID FK | Leave type |
| start_date | DATE | Request start |
| end_date | DATE | Request end |
| duration | NUMERIC(8,2) | **Working days** (not calendar days) |
| unit | VARCHAR(10) | DAYS or HOURS |
| status | VARCHAR(20) | DRAFT/PENDING/APPROVED/REFUSED/CANCELLED |
| approved_by | UUID FK | Approving user |

---

## Business Rules

### Attendance

#### Worked Hours Calculation
```
worked_hours = (check_out - check_in) in minutes / 60 - break_minutes / 60
Minimum: 0 (never negative)
```

Example: 9:00 → 18:00 with 60min break = `(9*60)/60 - 1 = 8 hours`

#### Schedule Integration
At check-in, the backend snapshots the employee's `working_schedule_days` entry for that day-of-week:
- `expected_start`, `expected_end`, `break_minutes`
- `expected_hours` = `(end - start) - break_minutes` in hours

#### Status Determination
1. If `worked_hours > expected_hours` → **OVERTIME**
2. Else if `check_in (UTC)` > `expected_start` → **LATE**
3. Else if `worked_hours < expected_hours * 0.5` → **HALF_DAY**
4. Else → **PRESENT**
5. `is_manual_edit = true` always sets → **CORRECTED**

#### Late Detection
Compares check_in UTC hours against `expected_start` (treated as UTC).
If check-in time exceeds expected start: `LATE`.

#### Missing Checkout
Any record with `check_in != null AND check_out IS NULL` has status `MISSING_CHECKOUT`.
Never auto-fills checkout time.

#### Overtime
`overtime_hours = worked_hours - expected_hours` when `worked > expected`.

#### Absence Detection
Absence is NOT stored as a DB row. It is derived:
- Employee scheduled for a day (working_schedule_days.is_working_day = true)
- No attendance record exists
- No approved time off exists
→ **ABSENT**

#### Corrections
- Only users with `attendance:update` permission can correct
- `is_manual_edit = true` is set automatically
- `correction_reason` is required (min 5 chars)
- `updated_by` is recorded

---

### Time Off

#### Duration Calculation
Requests iterate each calendar day from `start_date` to `end_date` inclusive and count only working days according to the employee's schedule.

```
Mon-Fri schedule:
Friday Sept 11 → Monday Sept 14
= 2 working days (Sat/Sun excluded)
```

For `HOURS` unit types, duration is the requested hours value (no day conversion applied).

#### Allocation Selection Strategy: Earliest Expiry First
When multiple APPROVED allocations exist for the same type:
1. Filter: `valid_from ≤ start_date`, not expired, `remaining >= required`
2. Sort by `valid_to ASC` (null = Infinity = last priority)
3. Select first

#### Balance Management
Balance update is transactionally safe via **Optimistic Concurrency Control**:
```sql
UPDATE time_off_allocations
SET taken_amount = taken + required,
    remaining_amount = remaining - required
WHERE id = :id
  AND remaining_amount >= required  -- CRITICAL: prevents race condition
```
If 0 rows updated → concurrent approval detected → error thrown.

#### Approval Workflow
```
Request Created (DRAFT/PENDING)
   ↓
HR reviews
   ↓
APPROVED:
  1. Check overlap with existing approved requests
  2. If requires_allocation: consumeAllocationBalance()
  3. Update request status
  ↓
REFUSED:
  - No balance consumed
  - refusal_reason stored

CANCELLATION (of APPROVED request):
  1. Update request → CANCELLED
  2. If requires_allocation: restoreAllocationBalance()
  (Balance restoration: taken_amount decremented, remaining restored)
```

#### State Transitions
**Requests:**
```
DRAFT → PENDING | CANCELLED
PENDING → APPROVED | REFUSED | CANCELLED
APPROVED → CANCELLED
REFUSED → (terminal)
CANCELLED → (terminal)
```

**Allocations:**
```
DRAFT → PENDING_APPROVAL | CANCELLED
PENDING_APPROVAL → APPROVED | REFUSED | CANCELLED
APPROVED → EXPIRED | CANCELLED
REFUSED → (terminal)
EXPIRED → (terminal)
CANCELLED → (terminal)
```

---

## API Endpoints

### Attendance

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/api/v1/attendance/check-in` | `attendance:create` | Employee check-in (HR can specify employee_id) |
| POST | `/api/v1/attendance/check-out` | `attendance:create` | Employee check-out |
| GET | `/api/v1/attendance` | `attendance:read_own` | List attendance (HR: all, Employee: own) |
| GET | `/api/v1/attendance/:id` | `attendance:read_own` | Get attendance record |
| PUT | `/api/v1/attendance/:id` | `attendance:update` | Correct attendance (HR/Admin only) |
| GET | `/api/v1/employees/:id/attendance` | `attendance:read_own` | Employee attendance history |

### Time Off Allocations

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/api/v1/time-off/allocations` | `leave:create` | Create allocation (HR) |
| GET | `/api/v1/time-off/allocations` | `leave:read` | List allocations (HR) |
| GET | `/api/v1/time-off/allocations/:id` | `leave:read` | Get allocation |
| PUT | `/api/v1/time-off/allocations/:id` | `leave:update` | Update allocation |
| DELETE | `/api/v1/time-off/allocations/:id` | `leave:delete` | Delete allocation |
| POST | `/api/v1/time-off/allocations/:id/approve` | `leave:approve` | Approve allocation |
| POST | `/api/v1/time-off/allocations/:id/refuse` | `leave:approve` | Refuse allocation |

### Time Off Requests

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/api/v1/time-off/requests` | `leave:create` | Create request |
| GET | `/api/v1/time-off/requests` | `leave:read_own` | List requests (HR: all, Employee: own) |
| GET | `/api/v1/time-off/requests/:id` | `leave:read_own` | Get request |
| PUT | `/api/v1/time-off/requests/:id` | `leave:update` | Update DRAFT request |
| DELETE | `/api/v1/time-off/requests/:id` | `leave:delete` | Delete DRAFT/CANCELLED request |
| POST | `/api/v1/time-off/requests/:id/approve` | `leave:approve` | Approve request |
| POST | `/api/v1/time-off/requests/:id/refuse` | `leave:approve` | Refuse request |
| POST | `/api/v1/time-off/requests/:id/cancel` | `leave:create` | Cancel request (employee: own; HR: any) |

### Employee Queries

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/api/v1/employees/:id/attendance` | `attendance:read_own` | Employee attendance |
| GET | `/api/v1/employees/:id/time-off/balances` | `leave:read_own` | Employee leave balances |
| GET | `/api/v1/employees/:id/time-off` | `leave:read_own` | Employee leave requests |

### Time Off Types
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/time-off/types` | List time off types (Phase 1 data) |

---

## RBAC Summary

| Permission | EMPLOYEE | HR_MANAGER | HR_PAYROLL_MANAGER | HR_PAYROLL_USER | ADMIN |
|-----------|----------|------------|-------------------|-----------------|-------|
| attendance:read_own | ✅ | ✅ | ✅ | ✅ | ✅ |
| attendance:read | ❌ | ✅ | ✅ | ✅ | ✅ |
| attendance:create | ✅ (own) | ✅ | ✅ | ❌ | ✅ |
| attendance:update | ❌ | ✅ | ✅ | ❌ | ✅ |
| leave:read_own | ✅ | ✅ | ✅ | ❌ | ✅ |
| leave:read | ❌ | ✅ | ✅ | ❌ | ✅ |
| leave:create | ✅ (own) | ✅ | ✅ | ❌ | ✅ |
| leave:approve | ❌ | ✅ | ✅ | ❌ | ✅ |

---

## API Response Format

All endpoints use the existing Phase 1 format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

**Paginated list:**
```json
{
  "success": true,
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_TIME_OFF_BALANCE",
    "message": "Employee does not have enough remaining allocation"
  }
}
```

---

## Domain Error Codes

### Attendance
- `ATTENDANCE_NOT_FOUND`
- `ATTENDANCE_ALREADY_EXISTS`
- `CHECKOUT_WITHOUT_CHECKIN`
- `INVALID_ATTENDANCE_TIME`
- `ALREADY_CHECKED_OUT`
- `ATTENDANCE_CORRECTION_NOT_ALLOWED`
- `NO_OPEN_ATTENDANCE_SESSION`
- `EMPLOYEE_NOT_FOUND`

### Time Off
- `TIME_OFF_TYPE_NOT_FOUND`
- `ALLOCATION_NOT_FOUND`
- `ALLOCATION_EXPIRED`
- `INSUFFICIENT_TIME_OFF_BALANCE`
- `TIME_OFF_REQUEST_OVERLAP`
- `INVALID_TIME_OFF_STATE`
- `TIME_OFF_APPROVAL_NOT_ALLOWED`
- `TIME_OFF_REQUEST_NOT_FOUND`
- `TIME_OFF_SELF_APPROVAL_NOT_ALLOWED`
- `NO_VALID_ALLOCATION_FOUND`

---

## Example Scenarios

### Check-In Example
```http
POST /api/v1/attendance/check-in
Authorization: Bearer <token>

{}
```
Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "attendance_date": "2026-09-07",
    "check_in": "2026-09-07T03:30:00Z",
    "check_out": null,
    "status": "MISSING_CHECKOUT",
    "expected_start": "09:00",
    "expected_end": "18:00",
    "expected_hours": 8.0,
    "break_minutes": 60
  }
}
```

### Time Off Request + Approval Example
1. Employee creates request → `PENDING`
2. HR approves: overlap check + balance consumption → `APPROVED`
3. Balance: `taken_amount += 3`, `remaining_amount -= 3`
4. If employee cancels: `remaining_amount += 3` (restored)

---

## Concurrency Protection

The balance update uses a WHERE clause guard:
```sql
UPDATE time_off_allocations
SET remaining_amount = remaining_amount - :required
WHERE id = :id AND remaining_amount >= :required
```
If two concurrent approvals run simultaneously, only one succeeds. The other receives "0 rows affected" and throws `INSUFFICIENT_TIME_OFF_BALANCE`.

---

## Migration Order
```
001_initial_setup.sql
002_auth_rbac_schema.sql
003_hr_master_data.sql      (Phase 1)
004_attendance_time_off.sql (Phase 2)
```

Seed order:
```
001_initial_seed.sql
002_roles_and_permissions_seed.sql
003_hr_master_data_seed.sql
004_phase2_seed.sql
```
