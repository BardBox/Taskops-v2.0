import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import { playNotificationSound } from "@/utils/notificationSounds";
import { showBrowserNotification, getNotificationPermission } from "@/utils/browserNotifications";

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
  notifications_sound_enabled: boolean;
  notifications_sound_volume: number;
  notifications_sound_type: string;
}

// Helper function to get all PO and PM user IDs
const getManagerUserIds = async (): Promise<string[]> => {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["project_owner", "project_manager"]);
  
  return data?.map(r => r.user_id) || [];
};

// Helper function to create notifications for managers and assignee
const createNotifications = async (
  assigneeId: string,
  title: string,
  message: string,
  taskId: string,
  actorId: string,
  type: string = "info"
) => {
  // Fetch actor information
  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", actorId)
    .maybeSingle();

  const managerIds = await getManagerUserIds();
  const recipientIds = [...new Set([assigneeId, ...managerIds])]; // Deduplicate in case assignee is also a manager
  
  const notifications = recipientIds.map(recipientId => ({
    user_id: recipientId,
    title,
    message,
    type,
    task_id: taskId,
    actor_id: actorId,
    actor_name: actorProfile?.full_name || "Unknown User",
    actor_avatar_url: actorProfile?.avatar_url || null,
  }));
  
  await supabase.from("notifications" as any).insert(notifications);
};

export const useTaskNotifications = (userId: string | undefined) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Fetch user preferences
    const fetchPreferences = async () => {
      const { data } = await supabase
        .from("user_preferences" as any)
        .select("notifications_in_app, notifications_task_assigned, notifications_task_completed, notifications_task_updated, notifications_sound_enabled, notifications_sound_volume, notifications_sound_type")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setPreferences(data as any);
      } else {
        // Default to all enabled if no preferences set
        setPreferences({
          notifications_in_app: true,
          notifications_task_assigned: true,
          notifications_task_completed: true,
          notifications_task_updated: true,
          notifications_sound_enabled: true,
          notifications_sound_volume: 0.7,
          notifications_sound_type: "default",
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
              .maybeSingle();

            const assignorName = assignorProfile?.full_name || "Someone";

            // Store notification in database for assignee and all managers
            await createNotifications(
              newTask.assignee_id,
              "New Task Assigned",
              `${assignorName} assigned you "${newTask.task_name}"`,
              newTask.id,
              newTask.assigned_by_id,
              "info"
            );

            // Show toast notification
            toast.info(`New Task Assigned`, {
              description: `${assignorName} assigned you "${newTask.task_name}"`,
              duration: 5000,
            });

            // Show browser notification
            if (getNotificationPermission() === "granted") {
              showBrowserNotification({
                title: "New Task Assigned",
                body: `${assignorName} assigned you "${newTask.task_name}"`,
                tag: `task-${newTask.id}`,
              });
            }

            // Play notification sound
            if (preferences.notifications_sound_enabled) {
              playNotificationSound(
                preferences.notifications_sound_type as any,
                preferences.notifications_sound_volume
              );
            }
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

          // Check if status changed to completed - notify assignee and managers
          if (
            oldTask.status !== "Approved" &&
            newTask.status === "Approved" &&
            preferences.notifications_task_completed
          ) {
            // Store notification in database for assignee and all managers
            await createNotifications(
              oldTask.assignee_id,
              "Task Completed",
              `"${oldTask.task_name}" has been approved`,
              oldTask.id,
              newTask.assignee_id, // The assignee completed their own task
              "success"
            );

            // Show toast/browser notifications only to current user if they're the assignee
            if (newTask.assignee_id === userId) {
              toast.success(`Task Completed`, {
                description: `"${newTask.task_name}" has been approved`,
                duration: 5000,
              });

              // Show browser notification
              if (getNotificationPermission() === "granted") {
                showBrowserNotification({
                  title: "Task Completed",
                  body: `"${newTask.task_name}" has been approved`,
                  tag: `task-${newTask.id}`,
                });
              }

              // Play notification sound
              if (preferences.notifications_sound_enabled) {
                playNotificationSound(
                  preferences.notifications_sound_type as any,
                  preferences.notifications_sound_volume
                );
              }
            }
          }
          // Check for other updates
          else if (
            (oldTask.status !== newTask.status ||
              oldTask.urgency !== newTask.urgency) &&
            preferences.notifications_task_updated
          ) {
            let description = `"${newTask.task_name}" has been updated`;
            
            if (oldTask.status !== newTask.status) {
              description = `"${newTask.task_name}" status changed to "${newTask.status}"`;
            } else if (oldTask.urgency !== newTask.urgency) {
              description = `"${newTask.task_name}" urgency changed to "${newTask.urgency}"`;
            }

            // Fetch the user who made the update (could be anyone with permission)
            // We'll default to assignee but fetch their profile properly
            const { data: updaterProfile } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", newTask.assignee_id)
              .maybeSingle();

            // Store notification in database for assignee and all managers
            await createNotifications(
              newTask.assignee_id,
              "Task Updated",
              description,
              newTask.id,
              updaterProfile?.id || newTask.assignee_id,
              "info"
            );

            // Also notify collaborators
            const { data: collabs } = await supabase
              .from("task_collaborators")
              .select("user_id")
              .eq("task_id", newTask.id);

            if (collabs && collabs.length > 0) {
              const collabNotifications = collabs.map(c => ({
                user_id: c.user_id,
                title: "Collaborated Task Updated",
                message: description,
                type: "info",
                task_id: newTask.id,
                actor_id: updaterProfile?.id || newTask.assignee_id,
                actor_name: updaterProfile?.full_name || "Unknown User",
                actor_avatar_url: updaterProfile?.avatar_url || null,
              }));
              await supabase.from("notifications").insert(collabNotifications);
            }

            // Show toast/browser notifications only to current user if they're involved
            const managerIds = await getManagerUserIds();
            const isInvolved = newTask.assignee_id === userId || 
                               collabs?.some(c => c.user_id === userId) ||
                               managerIds.includes(userId);

            if (isInvolved) {
              const updaterName = updaterProfile?.full_name || "Someone";
              
              toast.info(`Task Updated`, {
                description: `${updaterName}: ${description}`,
                duration: 5000,
              });

              // Show browser notification
              if (getNotificationPermission() === "granted") {
                showBrowserNotification({
                  title: "Task Updated",
                  body: `${updaterName}: ${description}`,
                  tag: `task-${newTask.id}`,
                });
              }

              // Play notification sound
              if (preferences.notifications_sound_enabled) {
                playNotificationSound(
                  preferences.notifications_sound_type as any,
                  preferences.notifications_sound_volume
                );
              }
            }
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
