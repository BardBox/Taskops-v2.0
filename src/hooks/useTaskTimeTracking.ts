import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimeTrackingRecord {
  id: string;
  task_id: string;
  user_id: string;
  is_running: boolean;
  started_at: string | null;
  paused_at: string | null;
  total_seconds: number;
  last_status: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface UseTaskTimeTrackingOptions {
  taskId?: string;
  userId?: string;
}

// Format seconds to H:MM or HH:MM format
export const formatTimeTracking = (totalSeconds: number, currentlyActive: boolean = false, startedAt: string | null = null): string => {
  let seconds = totalSeconds;

  // If currently active, add elapsed time since started_at
  if (currentlyActive && startedAt) {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    seconds += elapsed;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Format seconds to full format with labels
export const formatTimeTrackingFull = (totalSeconds: number, currentlyActive: boolean = false, startedAt: string | null = null): string => {
  let seconds = totalSeconds;

  if (currentlyActive && startedAt) {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    seconds += elapsed;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Calculate total time including live elapsed time
export const calculateTotalTime = (record: TimeTrackingRecord): number => {
  let totalSeconds = record.total_seconds;

  if (record.is_running && record.started_at) {
    const elapsed = Math.floor((Date.now() - new Date(record.started_at).getTime()) / 1000);
    totalSeconds += elapsed;
  }

  return totalSeconds;
};

export const useTaskTimeTracking = (options: UseTaskTimeTrackingOptions = {}) => {
  const { taskId, userId } = options;
  const [records, setRecords] = useState<TimeTrackingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeTracking = useCallback(async () => {
    if (!taskId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let query = supabase
        .from("task_time_tracking")
        .select(`
          *,
          profiles:user_id(full_name, avatar_url)
        `)
        .eq("task_id", taskId);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRecords((data as unknown as TimeTrackingRecord[]) || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching time tracking:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, userId]);

  useEffect(() => {
    fetchTimeTracking();
  }, [fetchTimeTracking]);

  // Subscribe to real-time updates
  // Subscribe to real-time updates for TASK TIME TRACKING
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`time-tracking-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_time_tracking",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchTimeTracking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchTimeTracking]);

  // GLOBAL SUBSCRIPTION: Listen to user_work_sessions
  // If the global session pauses/stops, we need to reflect that in task timers immediately
  useEffect(() => {
    if (!userId) return;

    const globalChannel = supabase
      .channel(`global-session-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_work_sessions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // When global session changes, re-fetch task tracking
          // The DB trigger sync_task_timers_with_work_session should have updated the task rows
          // so fetching again will show the paused state.
          fetchTimeTracking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [userId, fetchTimeTracking]);

  // Get total time for a specific user
  const getUserTotalTime = useCallback((uid: string): number => {
    const record = records.find(r => r.user_id === uid);
    if (!record) return 0;
    return calculateTotalTime(record);
  }, [records]);

  // Get total time for all users on this task
  const getTotalTime = useCallback((): number => {
    return records.reduce((total, record) => total + calculateTotalTime(record), 0);
  }, [records]);

  // Get the primary tracking record (task owner's)
  const getPrimaryRecord = useCallback((): TimeTrackingRecord | null => {
    return records[0] || null;
  }, [records]);

  // Check if any user is currently tracking
  const isAnyoneTracking = useCallback((): boolean => {
    return records.some(r => r.is_running);
  }, [records]);

  return {
    records,
    isLoading,
    error,
    refetch: fetchTimeTracking,
    getUserTotalTime,
    getTotalTime,
    getPrimaryRecord,
    isAnyoneTracking,
  };
};

// Hook for fetching time tracking for multiple tasks at once
export const useMultipleTasksTimeTracking = (taskIds: string[]) => {
  const [timeMap, setTimeMap] = useState<Map<string, TimeTrackingRecord[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (taskIds.length === 0) {
        setTimeMap(new Map());
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("task_time_tracking")
          .select(`
            *,
            profiles:user_id(full_name, avatar_url)
          `)
          .in("task_id", taskIds);

        if (error) throw error;

        const map = new Map<string, TimeTrackingRecord[]>();
        (data as unknown as TimeTrackingRecord[] || []).forEach(record => {
          const existing = map.get(record.task_id) || [];
          map.set(record.task_id, [...existing, record]);
        });

        setTimeMap(map);
      } catch (err) {
        console.error("Error fetching time tracking:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [taskIds.join(",")]);

  const getTaskTotalTime = useCallback((taskId: string): number => {
    const records = timeMap.get(taskId) || [];
    return records.reduce((total, record) => total + calculateTotalTime(record), 0);
  }, [timeMap]);

  const getTaskRecords = useCallback((taskId: string): TimeTrackingRecord[] => {
    return timeMap.get(taskId) || [];
  }, [timeMap]);

  const isTaskActive = useCallback((taskId: string): boolean => {
    const records = timeMap.get(taskId) || [];
    return records.some(r => r.is_running);
  }, [timeMap]);

  return {
    timeMap,
    isLoading,
    getTaskTotalTime,
    getTaskRecords,
    isTaskActive,
  };
};
