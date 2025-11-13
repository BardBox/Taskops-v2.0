-- Add new status values and update urgency naming
-- Note: We're keeping existing data intact while adding new options

-- First, let's add 'Cancelled', 'Needs Review', 'Blocked' as valid status values
-- Since status is currently a text field, we just need to ensure these are used going forward

-- Update urgency from 'Mid' to 'Medium' in existing tasks
UPDATE tasks SET urgency = 'Medium' WHERE urgency = 'Mid';

-- Create filtered tasks view for performance
CREATE OR REPLACE VIEW taskops_filtered_tasks AS
SELECT
  t.*,
  EXTRACT(YEAR FROM t.date)::int AS year,
  EXTRACT(MONTH FROM t.date)::int AS month,
  c.name as client_name,
  p_assignee.full_name as assignee_name,
  p_assigned_by.full_name as assigned_by_name,
  CASE 
    WHEN t.actual_delivery IS NULL AND CURRENT_DATE > t.deadline 
      THEN CURRENT_DATE - t.deadline
    WHEN t.actual_delivery IS NOT NULL
      THEN t.actual_delivery - t.deadline
    ELSE 0
  END AS delay_days
FROM tasks t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN profiles p_assignee ON t.assignee_id = p_assignee.id
LEFT JOIN profiles p_assigned_by ON t.assigned_by_id = p_assigned_by.id;

-- Create productivity score view
CREATE OR REPLACE VIEW taskops_productivity AS
SELECT
  assignee_id,
  assignee_name,
  COUNT(*) as total_tasks,
  SUM(
    (CASE urgency
        WHEN 'Immediate' THEN 4
        WHEN 'High' THEN 3
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 1
        ELSE 1
     END)
     *
    (CASE
        WHEN status = 'Done' AND delay_days <= 0 THEN 2
        WHEN status = 'Done' AND delay_days > 0 THEN 1
        WHEN status = 'Approved' AND delay_days <= 0 THEN 2
        WHEN status = 'Approved' AND delay_days > 0 THEN 1
        ELSE 0
    END)
  ) AS productivity_score
FROM taskops_filtered_tasks
WHERE status IN ('Done', 'Approved')
GROUP BY assignee_id, assignee_name
ORDER BY productivity_score DESC;

-- Add project_owner to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'project_owner';

-- Grant access to views
GRANT SELECT ON taskops_filtered_tasks TO authenticated;
GRANT SELECT ON taskops_productivity TO authenticated;