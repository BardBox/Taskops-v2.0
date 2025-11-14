import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Task {
  id: string;
  task_name: string;
  status: string;
  urgency: string;
  assignee_id: string;
  assigned_by_id: string;
  created_at: string;
}

interface UserPreferences {
  notifications_in_app: boolean;
  notifications_task_assigned: boolean;
  notifications_task_completed: boolean;
  notifications_task_updated: boolean;
}

export const useTaskNotifications = (userId: string | undefined) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch user preferences
    const fetchPreferences = async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("notifications_in_app, notifications_task_assigned, notifications_task_completed, notifications_task_updated")
        .eq("user_id", userId)
        .single();

      if (data) {
        setPreferences(data);
      } else {
        // Default to all enabled if no preferences set
        setPreferences({
          notifications_in_app: true,
          notifications_task_assigned: true,
          notifications_task_completed: true,
          notifications_task_updated: true,
        });
      }
    };

    fetchPreferences();
  }, [userId]);

  useEffect(() => {
    if (!userId || !preferences || !preferences.notifications_in_app) {
      return;
    }

    // Set up realtime subscription
    const taskChannel = supabase
      .channel("task-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          const newTask = payload.new as Task;

          // Check if task is assigned to current user
          if (newTask.assignee_id === userId && preferences.notifications_task_assigned) {
            // Fetch assignor name
            const { data: assignorProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", newTask.assigned_by_id)
              .single();

            const assignorName = assignorProfile?.full_name || "Someone";

            toast.info(`New Task Assigned`, {
              description: `${assignorName} assigned you "${newTask.task_name}"`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          const oldTask = payload.old as Task;
          const newTask = payload.new as Task;

          // Only notify if task belongs to current user
          if (newTask.assignee_id !== userId) return;

          // Check if status changed to completed
          if (
            oldTask.status !== "Approved" &&
            newTask.status === "Approved" &&
            preferences.notifications_task_completed
          ) {
            toast.success(`Task Completed`, {
              description: `"${newTask.task_name}" has been approved`,
              duration: 5000,
            });
          }
          // Check for other updates
          else if (
            (oldTask.status !== newTask.status ||
              oldTask.urgency !== newTask.urgency) &&
            preferences.notifications_task_updated
          ) {
            let description = `"${newTask.task_name}" has been updated`;
            
            if (oldTask.status !== newTask.status) {
              description = `Status changed to "${newTask.status}"`;
            } else if (oldTask.urgency !== newTask.urgency) {
              description = `Urgency changed to "${newTask.urgency}"`;
            }

            toast.info(`Task Updated`, {
              description,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    setChannel(taskChannel);

    return () => {
      if (taskChannel) {
        supabase.removeChannel(taskChannel);
      }
    };
  }, [userId, preferences]);

  return { preferences };
};
