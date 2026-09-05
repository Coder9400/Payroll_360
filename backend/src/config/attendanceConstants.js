/**
 * Attendance Domain Constants
 * Centralizes all status values and error codes for the Attendance module.
 */

/**
 * Attendance record statuses
 */
const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  HALF_DAY: 'HALF_DAY',
  OVERTIME: 'OVERTIME',
  MISSING_CHECKOUT: 'MISSING_CHECKOUT',
  CORRECTED: 'CORRECTED',
};

/**
 * Domain-specific error codes for Attendance operations
 */
const ATTENDANCE_ERRORS = {
  NOT_FOUND: 'ATTENDANCE_NOT_FOUND',
  ALREADY_EXISTS: 'ATTENDANCE_ALREADY_EXISTS',
  CHECKOUT_WITHOUT_CHECKIN: 'CHECKOUT_WITHOUT_CHECKIN',
  INVALID_CHECKOUT_TIME: 'INVALID_ATTENDANCE_TIME',
  ALREADY_CHECKED_OUT: 'ALREADY_CHECKED_OUT',
  CORRECTION_NOT_ALLOWED: 'ATTENDANCE_CORRECTION_NOT_ALLOWED',
  NO_OPEN_SESSION: 'NO_OPEN_ATTENDANCE_SESSION',
  EMPLOYEE_NOT_FOUND: 'EMPLOYEE_NOT_FOUND',
  NOT_A_WORKING_DAY: 'NOT_A_WORKING_DAY',
};

/**
 * Determines if an attendance status can be transitioned to another.
 * Used for manual correction validation.
 */
const VALID_MANUAL_STATUSES = Object.values(ATTENDANCE_STATUS);

module.exports = {
  ATTENDANCE_STATUS,
  ATTENDANCE_ERRORS,
  VALID_MANUAL_STATUSES,
};
