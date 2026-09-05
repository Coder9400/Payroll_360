/**
 * Department input validator
 */

const AppError = require('../utils/appError');

/**
 * Validate department creation/update payload
 * @param {object} body - Request body
 * @param {boolean} [isUpdate=false] - If true, allows partial fields
 * @returns {{ name: string, description: string|null, headId: string|null }}
 */
const validateDepartment = (body, isUpdate = false) => {
  const { name, description, headId } = body || {};

  if (!isUpdate) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Department name is required', 400, 'VALIDATION_ERROR');
    }
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new AppError('Department name must be a non-empty string', 400, 'VALIDATION_ERROR');
    }
    if (name.trim().length > 120) {
      throw new AppError('Department name must not exceed 120 characters', 400, 'VALIDATION_ERROR');
    }
  }

  if (headId !== undefined && headId !== null) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof headId !== 'string' || !uuidRegex.test(headId)) {
      throw new AppError('headId must be a valid UUID', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    name: name ? name.trim() : undefined,
    description: description ? String(description).trim() : null,
    headId: headId || null,
  };
};

module.exports = { validateDepartment };
