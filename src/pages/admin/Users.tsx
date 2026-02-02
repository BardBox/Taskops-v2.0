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
import { Plus, Trash2, Edit, ArrowUpDown, ArrowUp, ArrowDown, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AvatarSelector } from "@/components/AvatarSelector";

interface User {
  id: string;
  email: string;
  full_name: string;
  user_code: string;
  role: string;
  creative_title?: string | null;
  avatar_url?: string | null;
}

export default function AdminUsers() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "team_member",
    avatar_url: null as string | null,
  });
  const [filters, setFilters] = useState({
    userId: "",
    name: "",
    role: "",
    creativeTitle: "",
  });
  const [sortField, setSortField] = useState<"user_code" | "full_name" | "email" | "role" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const isOwner = userRole === "project_owner";
  const isPM = userRole === "project_manager";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please sign in again.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
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
        let errorMessage = 'Failed to fetch users';
        if (response.status === 401) {
          toast.error("Session expired. Please sign in again.");
          await supabase.auth.signOut();
          window.location.href = "/auth";
          return;
        }
        if (response.status === 404) {
          errorMessage = 'Service not found. Please ensure the "admin-users" Edge Function is deployed.';
        } else {
          try {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } catch (e) {
            console.error("Error parsing error response:", e);
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const { users: usersData } = await response.json();
      setUsers(usersData);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please sign in again.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'create',
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
          avatar_url: newUser.avatar_url,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please sign in again.");
          await supabase.auth.signOut();
          window.location.href = "/auth";
          return;
        }
        let errorMessage = 'Failed to create user';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          console.error("Error parsing error response:", e);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast.success("User created successfully");
      setCreateDialogOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "team_member", avatar_url: null });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Detailed error for debugging
      const errorDetails = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(`Create failed: ${errorDetails}`);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please sign in again.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: 'update',
          userId: editingUser.id,
          full_name: editingUser.full_name,
          email: editingUser.email,
          role: editingUser.role,
          creative_title: editingUser.creative_title,
          avatar_url: editingUser.avatar_url,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please sign in again.");
          await supabase.auth.signOut();
          window.location.href = "/auth";
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success("User updated successfully");
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please sign in again.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resetPassword',
          userId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please sign in again.");
          await supabase.auth.signOut();
          window.location.href = "/auth";
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }

      toast.success("Password reset email sent successfully");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    }
  };

  const handleChangePassword = async () => {
    if (!editingUser || !newPassword) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please sign in again.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'changePassword',
          userId: editingUser.id,
          newPassword,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please sign in again.");
          await supabase.auth.signOut();
          window.location.href = "/auth";
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      toast.success("Password changed successfully");
      setChangePasswordDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isOwner) {
      toast.error("Only owners can delete users");
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Session expired. Please sign in again.");
        await supabase.auth.signOut();
        window.location.href = "/auth";
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          userId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please sign in again.");
          await supabase.auth.signOut();
          window.location.href = "/auth";
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const canEditUser = (user: User) => {
    if (isOwner) return true;
    if (isPM && user.role !== 'project_owner') return true;
    return false;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "project_owner":
        return "bg-role-owner text-role-owner-foreground";
      case "project_manager":
        return "bg-role-manager text-role-manager-foreground";
      default:
        return "bg-role-member text-role-member-foreground";
    }
  };

  const handleSort = (field: "user_code" | "full_name" | "email" | "role") => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: "user_code" | "full_name" | "email" | "role") => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const filteredAndSortedUsers = users
    .filter((user) => {
      if (filters.userId && !String(user.user_code || "").toLowerCase().includes(filters.userId.toLowerCase())) {
        return false;
      }
      if (filters.name && !String(user.full_name || "").toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      if (filters.role && user.role !== filters.role) {
        return false;
      }
      if (filters.creativeTitle && !String(user.creative_title || "").toLowerCase().includes(filters.creativeTitle.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      let aValue = String(a[sortField] || "").toLowerCase();
      let bValue = String(b[sortField] || "").toLowerCase();

      // Apply padding for user_code sorting
      if (sortField === "user_code") {
        aValue = aValue.padStart(3, "0");
        bValue = bValue.padStart(3, "0");
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const clearFilters = () => {
    setFilters({ userId: "", name: "", role: "", creativeTitle: "" });
  };

  const hasActiveFilters = filters.userId || filters.name || filters.role || filters.creativeTitle;

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
          <div className="flex items-center justify-between">
            <CardTitle>All Users</CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {filters.userId && (
                <Badge variant="secondary">
                  User ID: {filters.userId}
                </Badge>
              )}
              {filters.name && (
                <Badge variant="secondary">
                  Name: {filters.name}
                </Badge>
              )}
              {filters.role && (
                <Badge variant="secondary">
                  Role: {filters.role.replace("_", " ")}
                </Badge>
              )}
              {filters.creativeTitle && (
                <Badge variant="secondary">
                  Creative Title: {filters.creativeTitle}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2 flex-wrap">
            <Input
              placeholder="Filter by User ID..."
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="max-w-xs"
            />
            <Input
              placeholder="Filter by Name..."
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              className="max-w-xs"
            />
            <Input
              placeholder="Filter by Creative Title..."
              value={filters.creativeTitle}
              onChange={(e) => setFilters({ ...filters, creativeTitle: e.target.value })}
              className="max-w-xs"
            />
            <Select
              value={filters.role}
              onValueChange={(value) => setFilters({ ...filters, role: value })}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filter by Role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Roles</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
                <SelectItem value="sales_team">Sales Team</SelectItem>
                <SelectItem value="production_superviser">Production Superviser</SelectItem>
                <SelectItem value="business_head">Business Head</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="project_owner">Project Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("user_code")}
                  >
                    User ID
                    {getSortIcon("user_code")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("full_name")}
                  >
                    Name
                    {getSortIcon("full_name")}
                  </Button>
                </TableHead>
                <TableHead>Creative Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("role")}
                  >
                    Role
                    {getSortIcon("role")}
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">
                    {String(user.user_code || "").padStart(3, "0")}
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-primary">
                      {user.creative_title || "-"}
                    </span>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  {(isOwner || isPM) && (
                    <TableCell>
                      <div className="flex gap-2">
                        {canEditUser(user) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
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
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="sales_team">Sales Team</SelectItem>
                  <SelectItem value="production_superviser">Production Superviser</SelectItem>
                  {(isOwner || isPM) && (
                    <>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="business_head">Business Head</SelectItem>
                    </>
                  )}
                  {isOwner && (
                    <SelectItem value="project_owner">Project Owner</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {isPM && !isOwner && (
                <p className="text-sm text-muted-foreground mt-1">
                  PMs can create Team Members and Project Managers
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Creative Title</Label>
                <Input
                  value={editingUser.creative_title || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, creative_title: e.target.value })}
                  placeholder="e.g., Senior Designer, Creative Director"
                  maxLength={50}
                  list="admin-creative-title-suggestions"
                />
                <datalist id="admin-creative-title-suggestions">
                  <option value="Visual Designer" />
                  <option value="Motion Designer" />
                  <option value="UX/UI Designer" />
                  <option value="Graphic Designer" />
                  <option value="Brand Designer" />
                  <option value="Creative Director" />
                  <option value="Art Director" />
                  <option value="Senior Designer" />
                  <option value="Junior Designer" />
                  <option value="Design Lead" />
                  <option value="Copywriter" />
                  <option value="Content Creator" />
                  <option value="Illustrator" />
                  <option value="Animator" />
                  <option value="Video Editor" />
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  Organizational position or creative specialty
                </p>
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_member">Team Member</SelectItem>
                    <SelectItem value="sales_team">Sales Team</SelectItem>
                    <SelectItem value="production_superviser">Production Superviser</SelectItem>
                    {(isOwner || isPM) && (
                      <>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="business_head">Business Head</SelectItem>
                      </>
                    )}
                    {isOwner && (
                      <SelectItem value="project_owner">Project Owner</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isPM && !isOwner && editingUser.role === 'project_owner' && (
                  <p className="text-sm text-destructive mt-1">
                    Cannot change Project Owner role
                  </p>
                )}
              </div>

              <AvatarSelector
                selectedAvatarUrl={editingUser.avatar_url || null}
                onAvatarSelect={(url) => setEditingUser({ ...editingUser, avatar_url: url })}
              />
            </div>
          )}

          <DialogFooter className="flex flex-col gap-3 sm:gap-2">
            <div className="flex flex-wrap gap-2">
              {isOwner && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setChangePasswordDialogOpen(true);
                  }}
                  className="flex-1 sm:flex-initial"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => editingUser && handleResetPassword(editingUser.id)}
                className="flex-1 sm:flex-initial"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} className="flex-1">Update User</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                setNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
