-- Fix security definer views by explicitly setting SECURITY INVOKER
-- This ensures views use the querying user's permissions and respect RLS

-- Recreate filtered tasks view with SECURITY INVOKER
CREATE OR REPLACE VIEW taskops_filtered_tasks 
WITH (security_invoker = true)
AS
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

-- Recreate productivity score view with SECURITY INVOKER
CREATE OR REPLACE VIEW taskops_productivity
WITH (security_invoker = true)
AS
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