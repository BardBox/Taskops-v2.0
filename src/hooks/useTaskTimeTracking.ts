import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTimeTracking } from "@/contexts/TimeTrackingContext";

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
  fetchAllUsers?: boolean;
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
  const { taskId, userId, fetchAllUsers } = options;
  const [records, setRecords] = useState<TimeTrackingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get global tracking state to override local "is_running" if user is clocked out
  const { state: globalState, userId: currentAuthUserId } = useTimeTracking();

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

      if (userId && !fetchAllUsers) {
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
        (payload) => {
          fetchTimeTracking();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchTimeTracking]);

  // Global subscription: Listen to user_work_sessions for the current user
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
          // When global session changes, re-fetch to reflect paused/stopped state
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

  // Process records to respect global clock-out state
  const processedRecords = useMemo(() => {
    return records.map(record => {
      // Only override for the currently authenticated user
      // If global state is NOT active, then this user's tasks cannot be running
      if (record.user_id === currentAuthUserId && globalState.status !== 'active') {

        // Refinement: If strictly on "Break", we can calculate the time accrued up to the break start
        // to avoid the timer jumping back to the previous saved state (visual glitch).
        if (globalState.status === 'break' && globalState.lastBreakStart && record.is_running && record.started_at) {
          const breakTime = new Date(globalState.lastBreakStart).getTime();
          const startTime = new Date(record.started_at).getTime();
          if (breakTime > startTime) {
            const elapsedBeforeBreak = Math.floor((breakTime - startTime) / 1000);
            return {
              ...record,
              is_running: false,
              total_seconds: record.total_seconds + elapsedBeforeBreak
            };
          }
        }

        return { ...record, is_running: false };
      }
      return record;
    });
  }, [records, globalState.status, globalState.lastBreakStart, currentAuthUserId]);

  return {
    records: processedRecords,
    isLoading,
    error,
    refetch: fetchTimeTracking,
    getUserTotalTime: (uid: string) => {
      const record = processedRecords.find(r => r.user_id === uid);
      if (!record) return 0;
      return calculateTotalTime(record);
    },
    getTotalTime: () => {
      return processedRecords.reduce((total, record) => total + calculateTotalTime(record), 0);
    },
    getPrimaryRecord: () => {
      return processedRecords[0] || null;
    },
    isAnyoneTracking: () => {
      return processedRecords.some(r => r.is_running);
    },
  };
};

// Hook for fetching time tracking for multiple tasks at once
export const useMultipleTasksTimeTracking = (taskIds: string[], userId?: string) => {
  const [timeMap, setTimeMap] = useState<Map<string, TimeTrackingRecord[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Get global tracking state
  const { state: globalState, userId: currentAuthUserId } = useTimeTracking();

  const fetchAll = useCallback(async () => {
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
  }, [taskIds.join(",")]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscription for task_time_tracking changes
  useEffect(() => {
    if (taskIds.length === 0) return;

    const channel = supabase
      .channel(`multi-time-tracking-${taskIds.slice(0, 5).join("-")}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_time_tracking",
        },
        (payload) => {
          // Check if payload relates to any of our tracked tasks
          const payloadTaskId = (payload.new as any)?.task_id || (payload.old as any)?.task_id;
          if (payloadTaskId && taskIds.includes(payloadTaskId)) {
            fetchAll();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskIds.join(","), fetchAll]);

  // Global subscription: Listen to user_work_sessions for the current user
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
          // When global session changes, re-fetch to reflect paused/stopped state
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [userId, fetchAll]);

  // Process timeMap to respect global clock-out state
  const processedTimeMap = useMemo(() => {
    const newMap = new Map<string, TimeTrackingRecord[]>();

    timeMap.forEach((records, taskId) => {
      const processedRecords = records.map(record => {
        if (record.user_id === currentAuthUserId && globalState.status !== 'active') {

          // Refinement: If strictly on "Break", calculate partial time
          if (globalState.status === 'break' && globalState.lastBreakStart && record.is_running && record.started_at) {
            const breakTime = new Date(globalState.lastBreakStart).getTime();
            const startTime = new Date(record.started_at).getTime();
            if (breakTime > startTime) {
              const elapsedBeforeBreak = Math.floor((breakTime - startTime) / 1000);
              return {
                ...record,
                is_running: false,
                total_seconds: record.total_seconds + elapsedBeforeBreak
              };
            }
          }

          return { ...record, is_running: false };
        }
        return record;
      });
      newMap.set(taskId, processedRecords);
    });

    return newMap;
  }, [timeMap, globalState.status, globalState.lastBreakStart, currentAuthUserId]);

  const getTaskTotalTime = useCallback((taskId: string): number => {
    const records = processedTimeMap.get(taskId) || [];
    return records.reduce((total, record) => total + calculateTotalTime(record), 0);
  }, [processedTimeMap]);

  const getTaskRecords = useCallback((taskId: string): TimeTrackingRecord[] => {
    return processedTimeMap.get(taskId) || [];
  }, [processedTimeMap]);

  const isTaskActive = useCallback((taskId: string): boolean => {
    const records = processedTimeMap.get(taskId) || [];
    return records.some(r => r.is_running);
  }, [processedTimeMap]);

  return {
    timeMap: processedTimeMap,
    isLoading,
    getTaskTotalTime,
    getTaskRecords,
    isTaskActive,
    refetch: fetchAll,
  };
};
