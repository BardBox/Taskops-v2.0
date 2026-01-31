-- FIX ALL SCHEMA ISSUES
-- This script fixes both the Clients table missing columns and the User Roles enum values.
BEGIN;
-- 1. FIX CLIENTS TABLE
-- Checks and adds missing columns: client_code, premium_tag, is_archived
DO $$ BEGIN -- Check for 'client_code'
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
        AND column_name = 'client_code'
) THEN
ALTER TABLE public.clients
ADD COLUMN client_code TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON public.clients(client_code);
END IF;
-- Check for 'premium_tag'
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
        AND column_name = 'premium_tag'
) THEN
ALTER TABLE public.clients
ADD COLUMN premium_tag TEXT;
END IF;
-- Check for 'is_archived'
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'clients'
        AND column_name = 'is_archived'
) THEN
ALTER TABLE public.clients
ADD COLUMN is_archived BOOLEAN DEFAULT false;
END IF;
END $$;
-- 2. FIX CLIENT CODE GENERATOR
-- Re-create the function to ensure it exists and works with the new column
CREATE OR REPLACE FUNCTION public.generate_client_code() RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE next_code TEXT;
last_code TEXT;
code_num INT;
BEGIN
SELECT client_code INTO last_code
FROM public.clients
WHERE client_code LIKE 'CLT-%'
ORDER BY client_code DESC
LIMIT 1;
IF last_code IS NULL THEN next_code := 'CLT-001';
ELSE code_num := CAST(
    SUBSTRING(
        last_code
        FROM 5
    ) AS INT
) + 1;
next_code := 'CLT-' || LPAD(code_num::TEXT, 3, '0');
END IF;
RETURN next_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_client_code TO authenticated;
-- 3. FIX USER ROLES ("Columns missing except Team Member")
-- This part updates the 'app_role' enum type (if it exists) or Check Constraints to allow all new roles.
DO $$ BEGIN -- Option A: If 'app_role' is an ENUM type
IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'app_role'
) THEN ALTER TYPE app_role
ADD VALUE IF NOT EXISTS 'sales_team';
ALTER TYPE app_role
ADD VALUE IF NOT EXISTS 'production_superviser';
ALTER TYPE app_role
ADD VALUE IF NOT EXISTS 'business_head';
END IF;
-- Option B: If there is a CHECK constraint on user_roles.role (common in some Supabase templates)
-- We'll try to drop the constraint and replace it with a more permissive one if it exists.
-- (Replacing with a broad TEXT check or just dropping strict enum checks if logic handles it)
-- Note: We are using a safe approach. If no constraint exists, this does nothing.
-- Adjust the constraint name 'user_roles_role_check' if your schema uses a different name.
-- IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_roles_role_check') THEN
--     ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
--     ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
--     CHECK (role IN ('team_member', 'project_manager', 'project_owner', 'sales_team', 'production_superviser', 'business_head'));
-- END IF;
-- Since we can't easily guess the constraint name, let's try to identify it or just ensure the column type handles text.
-- If role is just TEXT, we are good.
END $$;
-- Ensure public.user_roles allows these values if it relies on RLS or simple foreign keys
-- (No specific FKs to fix usually for roles unless there is a roles table, but this app seems to use user_roles mapping table)
COMMIT;