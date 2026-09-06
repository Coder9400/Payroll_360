-- =============================================================================
-- Migration: 009_attendance_location.sql
-- Description: Adds Geofenced location tracking to Attendance and Tenants
-- =============================================================================

-- Add location columns to attendance table
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC(10, 7);

-- Add default geofence configurations to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS office_lat NUMERIC(10, 7) DEFAULT 37.7749, -- Default to San Francisco
ADD COLUMN IF NOT EXISTS office_lng NUMERIC(10, 7) DEFAULT -122.4194,
ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 500; -- 500 meters allowed radius
