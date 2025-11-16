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
  { label: "Not Started", color: "bg-status-sky-blue text-status-sky-blue-foreground" },
  { label: "In Progress", color: "bg-status-buttercup text-status-buttercup-foreground" },
  { label: "In Approval", color: "bg-status-lavender text-status-lavender-foreground" },
  { label: "Approved", color: "bg-status-mint text-status-mint-foreground" },
  { label: "Revision", color: "bg-status-peach text-status-peach-foreground" },
  { label: "On Hold", color: "bg-status-pearl text-status-pearl-foreground" },
  { label: "Cancelled", color: "bg-status-coral text-status-coral-foreground" },
  { label: "Rejected", color: "bg-status-rose text-status-rose-foreground" },
];

const defaultUrgencies: StatusUrgencyItem[] = [
  { label: "Very Low", color: "bg-urgency-1 text-urgency-1-foreground" },
  { label: "Low", color: "bg-urgency-5 text-urgency-5-foreground" },
  { label: "Medium", color: "bg-urgency-10 text-urgency-10-foreground" },
  { label: "High", color: "bg-urgency-15 text-urgency-15-foreground" },
  { label: "Immediate", color: "bg-urgency-20 text-urgency-20-foreground" },
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
