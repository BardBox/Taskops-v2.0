import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function AdminUsers() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "team_member",
  });

  const isOwner = userRole === "project_owner";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const { data: { users: authUsers } } = await (supabase.auth.admin as any).listUsers();

      const usersData = profiles?.map((profile) => {
        const authUser = authUsers?.find((u: any) => u.id === profile.id);
        const userRole = roles?.find((r) => r.user_id === profile.id);

        return {
          id: profile.id,
          email: authUser?.email || "",
          full_name: profile.full_name,
          role: userRole?.role || "team_member",
        };
      }) || [];

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validate PM can only create TMs
      if (!isOwner && newUser.role !== "team_member") {
        toast.error("Project Managers can only create Team Members");
        return;
      }

      // Create user in auth
      const { data: authData, error: authError } = await (supabase.auth.admin as any).createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: { full_name: newUser.full_name, role: newUser.role },
      });

      if (authError) throw authError;

      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "team_member" });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isOwner) {
      toast.error("Only owners can delete users");
      return;
    }

    try {
      const { error } = await (supabase.auth.admin as any).deleteUser(userId);
      if (error) throw error;

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "project_owner":
        return "bg-purple-100 text-purple-800";
      case "project_manager":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage system users and roles</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {isOwner && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>

            <div>
              <Label>Full Name</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                disabled={!isOwner}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  {isOwner && (
                    <>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="project_owner">Project Owner</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {!isOwner && (
                <p className="text-sm text-muted-foreground mt-1">
                  PMs can only create Team Members
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
