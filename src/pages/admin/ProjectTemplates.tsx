import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Layers, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ProjectTemplate {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export default function ProjectTemplates() {
    const { userRole } = useOutletContext<{ userRole: string }>();
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [saving, setSaving] = useState(false);

    const isOwner = userRole === "project_owner";

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from("project_templates")
                .select("*")
                .order("name");

            if (error) throw error;
            setTemplates(data || []);
        } catch (error: any) {
            console.error("Error fetching templates:", error);
            toast.error("Failed to fetch project templates");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!formData.name.trim()) {
            toast.error("Template name is required");
            return;
        }

        setSaving(true);
        try {
            if (editingTemplate) {
                const { error } = await supabase
                    .from("project_templates")
                    .update({
                        name: formData.name.trim(),
                        description: formData.description.trim() || null
                    })
                    .eq("id", editingTemplate.id);

                if (error) throw error;
                toast.success("Template updated successfully");
            } else {
                const { error } = await supabase
                    .from("project_templates")
                    .insert([{
                        name: formData.name.trim(),
                        description: formData.description.trim() || null
                    }]);

                if (error) {
                    if (error.code === "23505") {
                        toast.error("A template with this name already exists");
                        return;
                    }
                    throw error;
                }
                toast.success("Template created successfully");
            }

            setDialogOpen(false);
            setFormData({ name: "", description: "" });
            setEditingTemplate(null);
            fetchTemplates();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEditTemplate = (template: ProjectTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || ""
        });
        setDialogOpen(true);
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!isOwner) {
            toast.error("Only owners can delete templates");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this template?")) return;

        try {
            const { error } = await supabase
                .from("project_templates")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Template deleted successfully");
            fetchTemplates();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleToggleActive = async (template: ProjectTemplate) => {
        try {
            const { error } = await supabase
                .from("project_templates")
                .update({ is_active: !template.is_active })
                .eq("id", template.id);

            if (error) throw error;
            toast.success(template.is_active ? "Template deactivated" : "Template activated");
            fetchTemplates();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const openCreateDialog = () => {
        setEditingTemplate(null);
        setFormData({ name: "", description: "" });
        setDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Layers className="h-8 w-8" />
                        Project Templates
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create reusable project types that can be mapped to clients
                    </p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Template
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {templates.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No templates found. Create your first project template.
                            </TableCell>
                        </TableRow>
                    ) : (
                        templates.map((template) => (
                            <TableRow key={template.id} className={!template.is_active ? "opacity-50" : ""}>
                                <TableCell className="font-medium">{template.name}</TableCell>
                                <TableCell className="text-muted-foreground max-w-md truncate">
                                    {template.description || "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={template.is_active ? "default" : "secondary"}>
                                        {template.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {new Date(template.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleActive(template)}
                                            title={template.is_active ? "Deactivate" : "Activate"}
                                        >
                                            {template.is_active ? (
                                                <ToggleRight className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <ToggleLeft className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditTemplate(template)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {isOwner && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteTemplate(template.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? "Edit Template" : "Create Template"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate
                                ? "Update the project template details"
                                : "Create a new reusable project template"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Template Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Branding, SEO, Website"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of this project type"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTemplate} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTemplate ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
