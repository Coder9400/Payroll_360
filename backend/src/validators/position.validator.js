/**
 * Position input validator
 */

const AppError = require('../utils/appError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate position creation/update payload
 * @param {object} body - Request body
 * @param {boolean} [isUpdate=false] - If true, allows partial fields
 * @returns {{ title: string, description: string|null, departmentId: string|null }}
 */
const validatePosition = (body, isUpdate = false) => {
  const { title, description, departmentId } = body || {};

  if (!isUpdate) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new AppError('Position title is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      throw new AppError('Position title must be a non-empty string', 400, 'VALIDATION_ERROR');
    }
    if (title.trim().length > 120) {
      throw new AppError('Position title must not exceed 120 characters', 400, 'VALIDATION_ERROR');
    }
  }

  if (departmentId !== undefined && departmentId !== null) {
    if (typeof departmentId !== 'string' || !UUID_RE.test(departmentId)) {
      throw new AppError('departmentId must be a valid UUID', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    title: title ? title.trim() : undefined,
    description: description ? String(description).trim() : null,
    departmentId: departmentId || null,
  };
};

module.exports = { validatePosition };
