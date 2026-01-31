-- Repair migration for task_edit_history
-- Ensures all required columns exist, even if table was created previously
-- 1. Add 'version_snapshot' column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_edit_history'
        AND column_name = 'version_snapshot'
) THEN
ALTER TABLE public.task_edit_history
ADD COLUMN version_snapshot TEXT;
END IF;
END $$;
-- 2. Add 'change_description' column if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'task_edit_history'
        AND column_name = 'change_description'
) THEN
ALTER TABLE public.task_edit_history
ADD COLUMN change_description TEXT;
END IF;
END $$;
-- 3. Ensure RLS policies exist (idempotent checks)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'task_edit_history'
        AND policyname = 'Users can view history of tasks they can see'
) THEN CREATE POLICY "Users can view history of tasks they can see" ON public.task_edit_history FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.tasks
            WHERE tasks.id = task_edit_history.task_id
        )
    );
END IF;
END $$;
-- 4. Re-apply the trigger logic (just to be safe)
CREATE OR REPLACE FUNCTION log_task_edits() RETURNS TRIGGER AS $$
DECLARE current_user_id UUID;
BEGIN current_user_id := auth.uid();
-- If no user, skip logging to avoid FK errors
IF current_user_id IS NULL THEN RETURN NEW;
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
if NEW.revision_comment IS NOT NULL THEN
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
if NEW.revision_reference_link IS NOT NULL THEN
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