-- Add missing roles required for Growth Engine and Admin logic
-- We cannot use IF NOT EXISTS directly with ADD VALUE in standard SQL in all versions, 
-- but Supabase migrations handle idempotency if managed correctly.

ALTER TYPE public.app_role ADD VALUE 'project_owner';
ALTER TYPE public.app_role ADD VALUE 'business_head';
ALTER TYPE public.app_role ADD VALUE 'sales_team';
