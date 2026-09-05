# Testing Strategy

## Unit Tests
- Salary rules
- Payroll formulas
- Contract selection
- Leave balance calculation
- Attendance calculations
- Schedule calculations

## Integration Tests
- API + database
- Authentication
- Employee workflows
- Time Off workflows
- Payroll workflows

## End-to-End Tests
### Scenario 1
Employee → Contract → Schedule → Attendance → Salary Structure → Payrun → Payslip → Validate → Mark Paid → PDF
### Scenario 2
Time Off Type → Allocation → Employee Request → Approval → Balance Reduction
