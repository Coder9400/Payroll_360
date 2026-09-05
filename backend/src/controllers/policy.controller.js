const { supabase, supabaseAdmin } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');
const { withTenant } = require('../utils/tenantScope');

const db = supabaseAdmin || supabase;

exports.getPolicies = async (req, res, next) => {
  try {
    const { data, error } = await withTenant(
      db.from('company_policies')
        .select(`
          id, title, description, pdf_url, version, updated_at,
          policy_acknowledgments (
            id, acknowledged_at, employee_id
          )
        `)
        .eq('is_active', true),
      req.user.tenantId
    );

    if (error) throw new AppError(error.message, 500);

    const employeeId = req.user.employee?.id;

    const policies = data.map(policy => {
      // Find if current employee acknowledged
      const ack = policy.policy_acknowledgments?.find(a => a.employee_id === employeeId);
      
      return {
        id: policy.id,
        title: policy.title,
        description: policy.description,
        pdfUrl: policy.pdf_url,
        version: policy.version,
        updatedAt: policy.updated_at,
        isAcknowledged: !!ack,
        acknowledgedAt: ack ? ack.acknowledged_at : null,
      };
    });

    return successResponse(res, policies, 'Policies retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.getPolicyById = async (req, res, next) => {
  try {
    const { data, error } = await withTenant(
      db.from('company_policies')
        .select(`
          id, title, description, pdf_url, version, updated_at,
          policy_acknowledgments (
            id, acknowledged_at, employee_id
          )
        `)
        .eq('id', req.params.id)
        .single(),
      req.user.tenantId
    );

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Policy not found', 404);
      throw new AppError(error.message, 500);
    }

    const employeeId = req.user.employee?.id;
    const ack = data.policy_acknowledgments?.find(a => a.employee_id === employeeId);

    const policy = {
      id: data.id,
      title: data.title,
      description: data.description,
      pdfUrl: data.pdf_url,
      version: data.version,
      updatedAt: data.updated_at,
      isAcknowledged: !!ack,
      acknowledgedAt: ack ? ack.acknowledged_at : null,
    };

    return successResponse(res, policy, 'Policy retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.acknowledgePolicy = async (req, res, next) => {
  try {
    if (!req.user.employee?.id) {
      throw new AppError('Only employees can acknowledge policies', 403);
    }

    const { error } = await withTenant(
      db.from('policy_acknowledgments').insert({
        policy_id: req.params.id,
        employee_id: req.user.employee.id,
        tenant_id: req.user.tenantId
      }),
      req.user.tenantId
    );

    if (error) {
      if (error.code === '23505') {
        // Already acknowledged
        return successResponse(res, null, 'Policy already acknowledged');
      }
      throw new AppError(error.message, 500);
    }

    return successResponse(res, null, 'Policy acknowledged successfully');
  } catch (error) {
    next(error);
  }
};
