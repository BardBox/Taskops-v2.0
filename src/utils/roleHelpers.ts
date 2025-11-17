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
