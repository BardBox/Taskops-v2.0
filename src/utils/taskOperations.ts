import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures that a user has only one "In Progress" task at a time.
 * If a new task is being set to "In Progress", all other "In Progress" tasks
 * for that user will be moved to "On Hold".
 * 
 * @param userId The ID of the user (assignee)
 * @param excludeTaskId The ID of the task currently being updated (to avoid holding it)
 */
export const ensureSingleActiveTask = async (userId: string, excludeTaskId?: string) => {
    try {
        // 1. Find all active tasks for this user
        const { data: activeTasks, error } = await supabase
            .from('tasks')
            .select('id')
            .eq('assignee_id', userId)
            .eq('status', 'In Progress');

        if (error) throw error;

        if (!activeTasks || activeTasks.length === 0) return;

        // 2. Filter out the task we are currently working on
        const tasksToHold = activeTasks
            .filter(t => t.id !== excludeTaskId)
            .map(t => t.id);

        if (tasksToHold.length === 0) return;

        // 3. Update them to 'On Hold'
        const { error: updateError } = await supabase
            .from('tasks')
            .update({ status: 'On Hold' })
            .in('id', tasksToHold);

        if (updateError) throw updateError;

        console.log(`Auto-held ${tasksToHold.length} tasks for user ${userId}`);

    } catch (err) {
        console.error("Error ensuring single active task:", err);
    }
};
