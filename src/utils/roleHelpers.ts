// Helper functions for role-based access control

export const canTeamMemberChangeStatus = (currentStatus: string): boolean => {
  const restrictedStatuses = ["Approved", "On Hold", "Cancelled", "Rejected"];
  return !restrictedStatuses.includes(currentStatus);
};

export const getAvailableStatuses = (userRole: string, currentStatus?: string): string[] => {
  const allStatuses = ["Not Started", "In Progress", "In Approval", "Approved", "On Hold", "Cancelled", "Rejected"];
  
  if (userRole === "team_member") {
    const allowedStatuses = ["Not Started", "In Progress", "In Approval"];
    if (!currentStatus) return allowedStatuses;
    
    // If current status is restricted, don't allow any changes
    if (!canTeamMemberChangeStatus(currentStatus)) {
      return [];
    }
    return allowedStatuses;
  }
  
  return allStatuses;
};

export const canChangeUrgency = (userRole: string): boolean => {
  return userRole !== "team_member";
};

export const getUserRole = async (userId: string): Promise<string | null> => {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  
  return data?.role || null;
};

export const getUserRoles = async (userIds: string[]): Promise<Map<string, string>> => {
  if (userIds.length === 0) return new Map();
  
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);
  
  const roleMap = new Map<string, string>();
  data?.forEach(item => roleMap.set(item.user_id, item.role));
  return roleMap;
};
