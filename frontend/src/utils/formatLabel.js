/**
 * Human-readable labels for backend enum / snake_case values.
 */

const EMPLOYEE_TYPE_LABELS = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

const STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  PROBATION: 'Probation',
  TERMINATED: 'Terminated',
};

export function formatEnum(value) {
  if (value == null || value === '') return '';
  const key = String(value).toUpperCase().replace(/\s+/g, '_');
  if (EMPLOYEE_TYPE_LABELS[key]) return EMPLOYEE_TYPE_LABELS[key];
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function employeeTypeOptions() {
  return Object.entries(EMPLOYEE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
}

export function statusOptions() {
  return Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
}
