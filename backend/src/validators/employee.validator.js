/**
 * Employee input validator
 */

const AppError = require('../utils/appError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;

const VALID_STATUSES = ['active', 'inactive', 'on_leave', 'terminated', 'probation'];

/**
 * Validate employee create/update payload.
 * @param {object} body
 * @param {boolean} [isUpdate=false]
 * @returns {object} Cleaned and validated payload
 */
const validateEmployee = (body, isUpdate = false) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    departmentId,
    positionId,
    managerId,
    dateOfJoining,
    employmentStatus,
    bankName,
    bankAccountNo,
    bankIfscCode,
  } = body || {};

  if (!isUpdate) {
    // Required on creation
    if (!firstName || !String(firstName).trim()) {
      throw new AppError('firstName is required', 400, 'VALIDATION_ERROR');
    }
    if (!lastName || !String(lastName).trim()) {
      throw new AppError('lastName is required', 400, 'VALIDATION_ERROR');
    }
    if (!email || !String(email).trim()) {
      throw new AppError('email is required', 400, 'VALIDATION_ERROR');
    }
    if (!dateOfJoining) {
      throw new AppError('dateOfJoining is required', 400, 'VALIDATION_ERROR');
    }
  }

  // Email format
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) {
      throw new AppError('email is not a valid email address', 400, 'VALIDATION_ERROR');
    }
  }

  // Date format
  if (dateOfJoining !== undefined) {
    if (!DATE_RE.test(dateOfJoining) || isNaN(Date.parse(dateOfJoining))) {
      throw new AppError('dateOfJoining must be a valid date in YYYY-MM-DD format', 400, 'VALIDATION_ERROR');
    }
  }

  // Status
  if (employmentStatus !== undefined) {
    if (!VALID_STATUSES.includes(employmentStatus)) {
      throw new AppError(
        `employmentStatus must be one of: ${VALID_STATUSES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  // UUID fields
  const uuidFields = { departmentId, positionId, managerId };
  for (const [fieldName, val] of Object.entries(uuidFields)) {
    if (val !== undefined && val !== null) {
      if (typeof val !== 'string' || !UUID_RE.test(val)) {
        throw new AppError(`${fieldName} must be a valid UUID`, 400, 'VALIDATION_ERROR');
      }
    }
  }

  return {
    firstName: firstName ? String(firstName).trim() : undefined,
    lastName:  lastName  ? String(lastName).trim()  : undefined,
    email:     email     ? String(email).trim().toLowerCase() : undefined,
    phone:     phone     ? String(phone).trim() : null,
    departmentId: departmentId || null,
    positionId:   positionId   || null,
    managerId:    managerId    || null,
    dateOfJoining: dateOfJoining || undefined,
    employmentStatus: employmentStatus || undefined,
    bankName:      bankName      ? String(bankName).trim()      : undefined,
    bankAccountNo: bankAccountNo ? String(bankAccountNo).trim() : undefined,
    bankIfscCode:  bankIfscCode  ? String(bankIfscCode).trim()  : undefined,
  };
};

/**
 * Validate status-only patch payload.
 * @param {object} body
 * @returns {{ status: string }}
 */
const validateStatusPatch = (body) => {
  const { status } = body || {};
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new AppError(
      `status is required and must be one of: ${VALID_STATUSES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return { status };
};

module.exports = { validateEmployee, validateStatusPatch, VALID_STATUSES };
