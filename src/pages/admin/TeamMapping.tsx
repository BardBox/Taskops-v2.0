import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, UserMinus, Users, Loader2, Search, ArrowRight, ArrowLeft, Check, UserCog, User } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_code: string | null;
  role?: string;
}

interface TeamMapping {
  id: string;
  pm_id: string;
  team_member_id: string;
  assigned_at: string;
}

export default function TeamMapping() {
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [teamMappings, setTeamMappings] = useState<TeamMapping[]>([]);
  const [selectedPmId, setSelectedPmId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

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
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: 'list' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users via Edge Function');
      }

      const { users } = await response.json();

      // PMs selection (PMs and Owners)
      const pmUsers = users.filter((u: any) => u.role === 'project_manager' || u.role === 'project_owner' || u.role === 'business_head');

      setAllUsers(users);
      setProjectManagers(pmUsers);

      // Auto-select first PM if available
      if (pmUsers.length > 0) {
        // setSelectedPmId(pmUsers[0].id); // Optional: Auto-select
      }

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

  const selectedPM = useMemo(() =>
    projectManagers.find(pm => pm.id === selectedPmId),
    [projectManagers, selectedPmId]);

  const assignedUserIds = useMemo(() =>
    teamMappings
      .filter(m => m.pm_id === selectedPmId)
      .map(m => m.team_member_id),
    [teamMappings, selectedPmId]);

  const assignedUsers = useMemo(() =>
    allUsers.filter(u => assignedUserIds.includes(u.id)),
    [allUsers, assignedUserIds]);

  const availableUsers = useMemo(() =>
    allUsers.filter(u =>
      u.id !== selectedPmId && // Can't assign self
      !assignedUserIds.includes(u.id) && // Not already assigned
      (searchQuery === "" ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.user_code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ),
    [allUsers, selectedPmId, assignedUserIds, searchQuery]);

  const handleAssign = async (userId: string) => {
    if (!selectedPmId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("team_mappings")
        .insert({
          pm_id: selectedPmId,
          team_member_id: userId,
          assigned_by_id: currentUserId,
        });

      if (error) throw error;
      await fetchTeamMappings();
      toast.success("User added to team");
    } catch (error) {
      console.error("Assign error", error);
      toast.error("Failed to assign user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!selectedPmId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("team_mappings")
        .delete()
        .eq("pm_id", selectedPmId)
        .eq("team_member_id", userId);

      if (error) throw error;
      await fetchTeamMappings();
      toast.success("User removed from team");
    } catch (error) {
      console.error("Remove error", error);
      toast.error("Failed to remove user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignAll = async () => {
    if (!selectedPmId || availableUsers.length === 0) return;
    setActionLoading(true);
    try {
      const mappings = availableUsers.map(u => ({
        pm_id: selectedPmId,
        team_member_id: u.id,
        assigned_by_id: currentUserId,
      }));

      const { error } = await supabase
        .from("team_mappings")
        .insert(mappings);

      if (error) throw error;
      await fetchTeamMappings();
      toast.success(`Assigned ${mappings.length} users`);
    } catch (error) {
      console.error("Assign All error", error);
      toast.error("Failed to assign all users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAll = async () => {
    if (!selectedPmId || assignedUserIds.length === 0) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("team_mappings")
        .delete()
        .eq("pm_id", selectedPmId);

      if (error) throw error;
      await fetchTeamMappings();
      toast.success("All users removed from team");
    } catch (error) {
      console.error("Remove All error", error);
      toast.error("Failed to remove all users");
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
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold mb-2">Team Allocation</h1>
        <p className="text-muted-foreground">
          Map ANY resource (Team Members, Admins, other PMs) to a Project Manager.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* LEFT COLUMN: Project Managers List */}
        <Card className="col-span-4 flex flex-col h-full overflow-hidden border-r-4 border-r-primary/10">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Project Managers
            </CardTitle>
            <CardDescription>Select a PM to manage their team</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {projectManagers.map(pm => {
                  const count = teamMappings.filter(m => m.pm_id === pm.id).length;
                  const isSelected = selectedPmId === pm.id;

                  return (
                    <button
                      key={pm.id}
                      onClick={() => setSelectedPmId(pm.id)}
                      className={`w-full text-left p-4 flex items-center gap-3 transition-all hover:bg-muted/50 ${isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
                    >
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={pm.avatar_url || ""} />
                        <AvatarFallback>{pm.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{pm.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{pm.role?.replace('_', ' ')}</div>
                      </div>
                      <Badge variant={isSelected ? "default" : "secondary"} className="ml-auto">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Team Mangement */}
        <Card className="col-span-8 flex flex-col h-full overflow-hidden">
          {!selectedPM ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
              <UserCog className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a Project Manager to start mapping</p>
            </div>
          ) : (
            <>
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Managing Team for {selectedPM.full_name}</CardTitle>
                    <CardDescription>Assign resources to this manager</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search available users..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="grid grid-cols-2 h-full divide-x">

                  {/* AVAILABLE COLUMN */}
                  <div className="flex flex-col h-full bg-muted/10">
                    <div className="p-3 bg-muted/30 border-b flex items-center justify-between">
                      <span className="font-medium text-sm text-muted-foreground">Available ({availableUsers.length})</span>
                      <Button size="sm" variant="outline" onClick={handleAssignAll} disabled={availableUsers.length === 0 || actionLoading}>
                        Add All <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-2">
                        {availableUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 bg-background border rounded-md hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar_url || ""} />
                                <AvatarFallback className="text-xs">{u.full_name?.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div className="truncate">
                                <div className="text-sm font-medium truncate">{u.full_name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{u.role?.replace('_', ' ')}</div>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleAssign(u.id)} disabled={actionLoading}>
                              <UserPlus className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                        ))}
                        {availableUsers.length === 0 && (
                          <div className="text-center p-8 text-muted-foreground text-sm">
                            No users available
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* ASSIGNED COLUMN */}
                  <div className="flex flex-col h-full bg-primary/5">
                    <div className="p-3 bg-primary/10 border-b flex items-center justify-between">
                      <span className="font-medium text-sm text-primary">Assigned Team ({assignedUsers.length})</span>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemoveAll} disabled={assignedUsers.length === 0 || actionLoading}>
                        Remove All <UserMinus className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-2">
                        {assignedUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-2 bg-background border border-primary/20 rounded-md shadow-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-8 w-8 border border-primary/20">
                                <AvatarImage src={u.avatar_url || ""} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{u.full_name?.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div className="truncate">
                                <div className="text-sm font-medium truncate">{u.full_name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{u.role?.replace('_', ' ')}</div>
                              </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(u.id)} disabled={actionLoading}>
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {assignedUsers.length === 0 && (
                          <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center">
                            <Users className="h-8 w-8 mb-2 opacity-20" />
                            No members assigned yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
