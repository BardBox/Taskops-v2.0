import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { UserPlus, UserMinus, Users, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_code: string | null;
}

interface TeamMapping {
  id: string;
  pm_id: string;
  team_member_id: string;
  assigned_at: string;
}

export default function TeamMapping() {
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamMappings, setTeamMappings] = useState<TeamMapping[]>([]);
  const [selectedPM, setSelectedPM] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
    fetchTeamMappings();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all PMs
      const { data: pms, error: pmError } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, full_name, avatar_url, user_code)")
        .eq("role", "project_manager");

      if (pmError) throw pmError;

      // Fetch all TMs
      const { data: tms, error: tmError } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, full_name, avatar_url, user_code)")
        .eq("role", "team_member");

      if (tmError) throw tmError;

      const pmUsers = pms?.map((pm: any) => pm.profiles) || [];
      const tmUsers = tms?.map((tm: any) => tm.profiles) || [];

      setProjectManagers(pmUsers);
      setTeamMembers(tmUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMappings = async () => {
    try {
      const { data, error } = await supabase
        .from("team_mappings")
        .select("*");

      if (error) throw error;
      setTeamMappings(data || []);
    } catch (error) {
      console.error("Error fetching team mappings:", error);
      toast.error("Failed to load team mappings");
    }
  };

  const getAssignedTeamMembers = (pmId: string): string[] => {
    return teamMappings
      .filter(mapping => mapping.pm_id === pmId)
      .map(mapping => mapping.team_member_id);
  };

  const isAssigned = (pmId: string, tmId: string): boolean => {
    return teamMappings.some(
      mapping => mapping.pm_id === pmId && mapping.team_member_id === tmId
    );
  };

  const assignTeamMember = async (pmId: string, tmId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("team_mappings")
        .insert({
          pm_id: pmId,
          team_member_id: tmId,
          assigned_by_id: currentUserId,
        });

      if (error) throw error;

      await fetchTeamMappings();
      toast.success("Team member assigned successfully");
    } catch (error: any) {
      console.error("Error assigning team member:", error);
      if (error.code === "23505") {
        toast.error("This team member is already assigned to this PM");
      } else {
        toast.error("Failed to assign team member");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const removeTeamMember = async (pmId: string, tmId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("team_mappings")
        .delete()
        .eq("pm_id", pmId)
        .eq("team_member_id", tmId);

      if (error) throw error;

      await fetchTeamMappings();
      toast.success("Team member removed successfully");
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    } finally {
      setActionLoading(false);
    }
  };

  const assignAllTeamMembers = async (pmId: string) => {
    setActionLoading(true);
    try {
      const unassignedMembers = teamMembers.filter(
        tm => !isAssigned(pmId, tm.id)
      );

      if (unassignedMembers.length === 0) {
        toast.info("All team members are already assigned to this PM");
        setActionLoading(false);
        return;
      }

      const mappings = unassignedMembers.map(tm => ({
        pm_id: pmId,
        team_member_id: tm.id,
        assigned_by_id: currentUserId,
      }));

      const { error } = await supabase
        .from("team_mappings")
        .insert(mappings);

      if (error) throw error;

      await fetchTeamMappings();
      toast.success(`${unassignedMembers.length} team member(s) assigned successfully`);
    } catch (error) {
      console.error("Error assigning all team members:", error);
      toast.error("Failed to assign all team members");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Team Mapping</h1>
        <p className="text-muted-foreground">
          Assign team members to project managers
        </p>
      </div>

      {projectManagers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No project managers found. Please create project manager accounts first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {projectManagers.map((pm) => {
            const assignedTMs = getAssignedTeamMembers(pm.id);
            const assignedTeamMemberObjects = teamMembers.filter(tm =>
              assignedTMs.includes(tm.id)
            );
            const unassignedTeamMembers = teamMembers.filter(tm =>
              !assignedTMs.includes(tm.id)
            );

            return (
              <Card key={pm.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={pm.avatar_url || ""} alt={pm.full_name} />
                        <AvatarFallback>
                          {pm.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{pm.full_name}</CardTitle>
                        <CardDescription>
                          Project Manager {pm.user_code ? `(${pm.user_code})` : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {assignedTMs.length} Team Member{assignedTMs.length !== 1 ? "s" : ""}
                      </Badge>
                      {unassignedTeamMembers.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => assignAllTeamMembers(pm.id)}
                          disabled={actionLoading}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add All ({unassignedTeamMembers.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Assigned Team Members */}
                    {assignedTeamMemberObjects.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Assigned Team Members</h4>
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-2">
                            {assignedTeamMemberObjects.map((tm) => (
                              <div
                                key={tm.id}
                                className="flex items-center justify-between p-3 border rounded-lg bg-accent/20"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={tm.avatar_url || ""} alt={tm.full_name} />
                                    <AvatarFallback className="text-xs">
                                      {tm.full_name.split(" ").map(n => n[0]).join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{tm.full_name}</p>
                                    {tm.user_code && (
                                      <p className="text-xs text-muted-foreground">
                                        Code: {tm.user_code}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTeamMember(pm.id, tm.id)}
                                  disabled={actionLoading}
                                >
                                  <UserMinus className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Unassigned Team Members */}
                    {unassignedTeamMembers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Available Team Members</h4>
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-2">
                            {unassignedTeamMembers.map((tm) => (
                              <div
                                key={tm.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/10 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={tm.avatar_url || ""} alt={tm.full_name} />
                                    <AvatarFallback className="text-xs">
                                      {tm.full_name.split(" ").map(n => n[0]).join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{tm.full_name}</p>
                                    {tm.user_code && (
                                      <p className="text-xs text-muted-foreground">
                                        Code: {tm.user_code}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => assignTeamMember(pm.id, tm.id)}
                                  disabled={actionLoading}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {assignedTeamMemberObjects.length === 0 && unassignedTeamMembers.length === 0 && (
                      <p className="text-sm text-center text-muted-foreground py-4">
                        No team members available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
