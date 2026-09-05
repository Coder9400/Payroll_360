-- Migration: Company Policies & Acknowledgments
-- ─────────────────────────────────────────────────────────────

-- 1. Create company_policies table
CREATE TABLE IF NOT EXISTS public.company_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    pdf_url VARCHAR(255) NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create policy_acknowledgments table
CREATE TABLE IF NOT EXISTS public.policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES public.company_policies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(policy_id, employee_id)
);

-- Row Level Security (RLS)

ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- company_policies policies:
-- HR/Admin: Full access. Employees: Read-only for active policies.
CREATE POLICY "company_policies_select_tenant"
    ON public.company_policies FOR SELECT
    USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid AND (is_active = true OR auth.uid() IN (
        SELECT user_id FROM public.user_roles ur 
        JOIN public.roles r ON ur.role_id = r.id 
        WHERE r.slug IN ('admin', 'hr_manager', 'hr_payroll_manager')
    )));

CREATE POLICY "company_policies_insert_tenant"
    ON public.company_policies FOR INSERT
    WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid AND auth.uid() IN (
        SELECT user_id FROM public.user_roles ur 
        JOIN public.roles r ON ur.role_id = r.id 
        WHERE r.slug IN ('admin', 'hr_manager', 'hr_payroll_manager')
    ));

CREATE POLICY "company_policies_update_tenant"
    ON public.company_policies FOR UPDATE
    USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid AND auth.uid() IN (
        SELECT user_id FROM public.user_roles ur 
        JOIN public.roles r ON ur.role_id = r.id 
        WHERE r.slug IN ('admin', 'hr_manager', 'hr_payroll_manager')
    ));

-- policy_acknowledgments policies:
-- HR/Admin: Read all. Employees: Read own.
CREATE POLICY "policy_acknowledgments_select_tenant"
    ON public.policy_acknowledgments FOR SELECT
    USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid AND (
        auth.uid() IN (
            SELECT user_id FROM public.user_roles ur 
            JOIN public.roles r ON ur.role_id = r.id 
            WHERE r.slug IN ('admin', 'hr_manager', 'hr_payroll_manager')
        )
        OR employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1)
    ));

-- Employees can acknowledge policies for themselves
CREATE POLICY "policy_acknowledgments_insert_tenant"
    ON public.policy_acknowledgments FOR INSERT
    WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid AND employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at_company_policies
    BEFORE UPDATE ON public.company_policies
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
