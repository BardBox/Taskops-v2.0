import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Project {
  id: string;
  name: string;
  client_id: string;
  is_archived: boolean;
  is_default: boolean;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminProjects() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const isOwner = userRole === "project_owner";
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: "", client_id: "", is_default: false });
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [showArchived]);

  const fetchProjects = async () => {
    try {
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
      
      if (!showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("is_archived", false)
        .order("name");
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch clients");
    }
  };

  const handleSaveProject = async () => {
    try {
      if (editingProject) {
        // If setting this as default, unset other defaults first
        if (formData.is_default) {
          await supabase
            .from("projects")
            .update({ is_default: false })
            .neq("id", editingProject.id);
        }
        
        const { error } = await supabase
          .from("projects")
          .update({ name: formData.name, client_id: formData.client_id, is_default: formData.is_default })
          .eq("id", editingProject.id);
        if (error) throw error;
        toast.success("Project updated successfully");
      } else {
        // If setting this as default, unset other defaults first
        if (formData.is_default) {
          await supabase
            .from("projects")
            .update({ is_default: false });
        }
        
        const { error } = await supabase.from("projects").insert([formData]);
        if (error) throw error;
        toast.success("Project created successfully");
      }
      setDialogOpen(false);
      setFormData({ name: "", client_id: "", is_default: false });
      setEditingProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({ name: project.name, client_id: project.client_id, is_default: project.is_default });
    setDialogOpen(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!isOwner) {
      toast.error("Only owners can delete projects");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Project deleted successfully");
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleArchiveProject = async (id: string, currentArchived: boolean) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_archived: !currentArchived })
        .eq("id", id);
      if (error) throw error;
      toast.success(currentArchived ? "Project unarchived" : "Project archived");
      fetchProjects();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setFormData({ name: "", client_id: "", is_default: false });
    setDialogOpen(true);
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Unknown";
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Button onClick={openCreateDialog}>Add Project</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>{project.name}</TableCell>
              <TableCell>{getClientName(project.client_id)}</TableCell>
              <TableCell>{project.is_default ? "Yes" : "No"}</TableCell>
              <TableCell>{project.is_archived ? "Archived" : "Active"}</TableCell>
              <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditProject(project)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleArchiveProject(project.id, project.is_archived)}
                  >
                    {project.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </Button>
                  {userRole === "project_owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create Project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Update project details" : "Add a new project"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked as boolean })}
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Set as default project
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject}>
              {editingProject ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
