import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StatusUrgencyItem {
  label: string;
  color: string;
}

interface StatusUrgencyData {
  statuses: StatusUrgencyItem[];
  urgencies: StatusUrgencyItem[];
  isLoading: boolean;
}

// Cache to store the fetched data
let cachedData: { statuses: StatusUrgencyItem[]; urgencies: StatusUrgencyItem[] } | null = null;
let fetchPromise: Promise<void> | null = null;
let listeners: Set<(data: { statuses: StatusUrgencyItem[]; urgencies: StatusUrgencyItem[] }) => void> = new Set();

// Default values
const defaultStatuses: StatusUrgencyItem[] = [
  { label: "Not Started", color: "bg-status-todo text-status-todo-foreground" },
  { label: "In Progress", color: "bg-status-doing text-status-doing-foreground" },
  { label: "In Approval", color: "bg-status-hold text-status-hold-foreground" },
  { label: "Approved", color: "bg-status-approved text-status-approved-foreground" },
  { label: "Revision", color: "bg-status-cancelled text-status-cancelled-foreground" },
  { label: "On Hold", color: "bg-status-done text-status-done-foreground" },
];

const defaultUrgencies: StatusUrgencyItem[] = [
  { label: "Low", color: "bg-urgency-low text-urgency-low-foreground" },
  { label: "Medium", color: "bg-urgency-medium text-urgency-medium-foreground" },
  { label: "High", color: "bg-urgency-high text-urgency-high-foreground" },
  { label: "Immediate", color: "bg-urgency-immediate text-urgency-immediate-foreground" },
];

// Fetch data from database
const fetchStatusUrgencyData = async (): Promise<void> => {
  const { data: settingsData } = await supabase
    .from("system_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["task_statuses", "task_urgencies"]);

  let statuses = defaultStatuses;
  let urgencies = defaultUrgencies;

  if (settingsData) {
    const statusSetting = settingsData.find(s => s.setting_key === "task_statuses");
    const urgencySetting = settingsData.find(s => s.setting_key === "task_urgencies");

    if (statusSetting) {
      try {
        statuses = JSON.parse(statusSetting.setting_value);
      } catch (e) {
        console.error("Failed to parse status options", e);
      }
    }

    if (urgencySetting) {
      try {
        urgencies = JSON.parse(urgencySetting.setting_value);
      } catch (e) {
        console.error("Failed to parse urgency options", e);
      }
    }
  }

  cachedData = { statuses, urgencies };
  
  // Notify all listeners
  listeners.forEach(listener => listener(cachedData!));
};

// Invalidate cache and refetch
export const invalidateStatusUrgencyCache = async () => {
  cachedData = null;
  fetchPromise = null;
  await fetchStatusUrgencyData();
};

// Set up real-time subscription (singleton)
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

const setupRealtimeSubscription = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel("status-urgency-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "system_settings",
        filter: "setting_key=in.(task_statuses,task_urgencies)",
      },
      () => {
        invalidateStatusUrgencyCache();
      }
    )
    .subscribe();
};

export const useStatusUrgency = (): StatusUrgencyData => {
  const [data, setData] = useState<{ statuses: StatusUrgencyItem[]; urgencies: StatusUrgencyItem[] }>(() => {
    // Return cached data immediately if available
    return cachedData || { statuses: defaultStatuses, urgencies: defaultUrgencies };
  });
  const [isLoading, setIsLoading] = useState(!cachedData);

  useEffect(() => {
    // Set up real-time subscription
    setupRealtimeSubscription();

    // If data is already cached, use it
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    // If fetch is in progress, wait for it
    if (fetchPromise) {
      fetchPromise.then(() => {
        if (cachedData) {
          setData(cachedData);
          setIsLoading(false);
        }
      });
      return;
    }

    // Start new fetch
    fetchPromise = fetchStatusUrgencyData().then(() => {
      if (cachedData) {
        setData(cachedData);
        setIsLoading(false);
      }
      fetchPromise = null;
    });
  }, []);

  useEffect(() => {
    // Register listener for updates
    const listener = (newData: { statuses: StatusUrgencyItem[]; urgencies: StatusUrgencyItem[] }) => {
      setData(newData);
    };
    
    listeners.add(listener);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    statuses: data.statuses,
    urgencies: data.urgencies,
    isLoading,
  };
};
