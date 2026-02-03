-- ============================================================================
-- Migration: Create project_templates table for reusable project types
-- ============================================================================
-- Create project_templates table
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE
    SET NULL
);
-- Add unique constraint on name
ALTER TABLE project_templates
ADD CONSTRAINT project_templates_name_unique UNIQUE (name);
-- Add index for active templates lookup
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON project_templates(is_active)
WHERE is_active = true;
-- Enable RLS
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
-- RLS Policies: All authenticated users can read, admins can write
CREATE POLICY "Allow authenticated read" ON project_templates FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin insert" ON project_templates FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role IN (
                    'project_owner',
                    'business_head',
                    'project_manager'
                )
        )
    );
CREATE POLICY "Allow admin update" ON project_templates FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role IN (
                    'project_owner',
                    'business_head',
                    'project_manager'
                )
        )
    );
CREATE POLICY "Allow owner delete" ON project_templates FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
            AND role = 'project_owner'
    )
);
-- ============================================================================
-- Insert common project templates
-- ============================================================================
INSERT INTO project_templates (name, description)
VALUES (
        'Branding',
        'Brand identity, logo design, and visual guidelines'
    ),
    (
        'SMO',
        'Social Media Optimization and management'
    ),
    ('SEO', 'Search Engine Optimization'),
    ('Website', 'Website development and design'),
    (
        'Application',
        'Mobile or web application development'
    ),
    (
        'Content',
        'Content creation, copywriting, and strategy'
    ),
    ('PPC', 'Pay-per-click advertising campaigns'),
    (
        'Video Production',
        'Video content creation and editing'
    ),
    (
        'Email Marketing',
        'Email campaign design and automation'
    ),
    (
        'Analytics',
        'Data analytics and reporting setup'
    ) ON CONFLICT (name) DO NOTHING;
-- ============================================================================
-- Add template_id to projects table (optional reference)
-- ============================================================================
-- Add template_id column to track which template a project came from
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES project_templates(id) ON DELETE
SET NULL;
-- Add index for template lookup
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id)
WHERE template_id IS NOT NULL;