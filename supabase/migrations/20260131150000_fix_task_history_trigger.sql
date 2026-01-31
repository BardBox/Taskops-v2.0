-- Create task_edit_history table if it doesn't exist (safety check)
CREATE TABLE IF NOT EXISTS public.task_edit_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    edited_by_id UUID NOT NULL REFERENCES public.profiles(id),
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_description TEXT,
    version_snapshot TEXT,
    -- JSON string of the task state at this version
    edited_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
-- Enable RLS
ALTER TABLE public.task_edit_history ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Users can view history of tasks they can see" ON public.task_edit_history FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.tasks
            WHERE tasks.id = task_edit_history.task_id -- Add your task visibility logic here, simplified for now:
                -- OR exists(select 1 from public.tasks where id = task_edit_history.task_id and (assignee_id = auth.uid() or assigned_by_id = auth.uid()))
        )
    );
-- Function to log task edits
CREATE OR REPLACE FUNCTION log_task_edits() RETURNS TRIGGER AS $$
DECLARE current_user_id UUID;
field_changed BOOLEAN := FALSE;
BEGIN -- Get current user ID, fallback to system if not available (e.g. edge function)
current_user_id := auth.uid();
-- If no user, we might want to skip or use a system user. 
-- For now, if no user, we skip logging to avoid FK constraint errors.
IF current_user_id IS NULL THEN RETURN NEW;
END IF;
-- Check specific fields for changes and log them
-- Status
IF OLD.status IS DISTINCT
FROM NEW.status THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description
    )
VALUES (
        NEW.id,
        current_user_id,
        'status',
        OLD.status,
        NEW.status,
        'Status updated'
    );
END IF;
-- Description (Notes)
IF OLD.notes IS DISTINCT
FROM NEW.notes THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description,
        version_snapshot
    )
VALUES (
        NEW.id,
        current_user_id,
        'notes',
        OLD.notes,
        NEW.notes,
        'Description updated',
        row_to_json(NEW)::text
    );
END IF;
-- Revision Count / Revision Request
IF OLD.revision_count IS DISTINCT
FROM NEW.revision_count THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description,
        version_snapshot
    )
VALUES (
        NEW.id,
        current_user_id,
        'revision_count',
        OLD.revision_count::text,
        NEW.revision_count::text,
        COALESCE(NEW.revision_comment, 'Revision Requested'),
        row_to_json(NEW)::text
    );
-- Also log the comment specifically if we want to show it easily
IF NEW.revision_comment IS NOT NULL THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description
    )
VALUES (
        NEW.id,
        current_user_id,
        'revision_comment',
        OLD.revision_comment,
        NEW.revision_comment,
        'Revision Comment'
    );
END IF;
IF NEW.revision_reference_link IS NOT NULL THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description
    )
VALUES (
        NEW.id,
        current_user_id,
        'revision_reference_link',
        OLD.revision_reference_link,
        NEW.revision_reference_link,
        'Revision Link'
    );
END IF;
END IF;
-- Assignee
IF OLD.assignee_id IS DISTINCT
FROM NEW.assignee_id THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description
    )
VALUES (
        NEW.id,
        current_user_id,
        'assignee_id',
        OLD.assignee_id::text,
        NEW.assignee_id::text,
        'Assignee changed'
    );
END IF;
-- Deadline
IF OLD.deadline IS DISTINCT
FROM NEW.deadline THEN
INSERT INTO public.task_edit_history (
        task_id,
        edited_by_id,
        field_name,
        old_value,
        new_value,
        change_description
    )
VALUES (
        NEW.id,
        current_user_id,
        'deadline',
        OLD.deadline::text,
        NEW.deadline::text,
        'Deadline changed'
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create Trigger
DROP TRIGGER IF EXISTS trigger_log_task_edits ON public.tasks;
CREATE TRIGGER trigger_log_task_edits
AFTER
UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_task_edits();