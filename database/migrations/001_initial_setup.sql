-- =============================================================================
-- Migration: 001_initial_setup.sql
-- Description: Initial PostgreSQL extensions and common database utility functions
-- Project: PeoplePay360 HR & Payroll
-- =============================================================================

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension for secure hashing and cryptographic helpers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable function to automatically update updated_at timestamp column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: Business entity tables (employees, payroll, departments, attendance, etc.)
-- will be introduced in subsequent migration files during Phase 2.
