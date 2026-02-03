import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    FolderPlus, FolderMinus, Folders, Loader2, Search,
    ArrowRight, Building2, Layers, CheckCircle2
} from "lucide-react";

interface Client {
    id: string;
    name: string;
}

interface ProjectTemplate {
    id: string;
    name: string;
    description: string | null;
}

interface Project {
    id: string;
    name: string;
    client_id: string;
    template_id: string | null;
    is_archived: boolean;
}

export default function ProjectMapping() {
    const [clients, setClients] = useState<Client[]>([]);
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [clientSearchQuery, setClientSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch clients
            const { data: clientsData, error: clientsError } = await supabase
                .from("clients")
                .select("id, name")
                .eq("is_archived", false)
                .order("name");

            if (clientsError) throw clientsError;

            // Fetch active templates
            const { data: templatesData, error: templatesError } = await supabase
                .from("project_templates")
                .select("id, name, description")
                .eq("is_active", true)
                .order("name");

            if (templatesError) throw templatesError;

            // Fetch all projects
            const { data: projectsData, error: projectsError } = await supabase
                .from("projects")
                .select("id, name, client_id, template_id, is_archived");

            if (projectsError) throw projectsError;

            setClients(clientsData || []);
            setTemplates(templatesData || []);
            setProjects(projectsData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const selectedClient = useMemo(() =>
        clients.find(c => c.id === selectedClientId),
        [clients, selectedClientId]
    );

    // Projects already mapped to this client
    const mappedProjects = useMemo(() =>
        projects.filter(p => p.client_id === selectedClientId && !p.is_archived),
        [projects, selectedClientId]
    );

    // Template IDs that are already mapped to this client
    const mappedTemplateIds = useMemo(() =>
        mappedProjects
            .filter(p => p.template_id)
            .map(p => p.template_id),
        [mappedProjects]
    );

    // Templates available to map (not already mapped)
    const availableTemplates = useMemo(() =>
        templates.filter(t =>
            !mappedTemplateIds.includes(t.id) &&
            (searchQuery === "" ||
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        ),
        [templates, mappedTemplateIds, searchQuery]
    );

    // Filtered clients
    const filteredClients = useMemo(() =>
        clients.filter(c =>
            clientSearchQuery === "" ||
            c.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
        ),
        [clients, clientSearchQuery]
    );

    const handleMapTemplate = async (template: ProjectTemplate) => {
        if (!selectedClientId) return;
        setActionLoading(true);

        try {
            // Create a new project for this client from the template
            const { error } = await supabase
                .from("projects")
                .insert({
                    name: template.name,
                    client_id: selectedClientId,
                    template_id: template.id,
                    is_archived: false,
                    is_default: false,
                });

            if (error) throw error;

            toast.success(`"${template.name}" mapped to ${selectedClient?.name}`);
            await fetchData();
        } catch (error: any) {
            console.error("Map error:", error);
            if (error.code === "23505") {
                toast.error("This project already exists for this client");
            } else {
                toast.error(`Failed to map template: ${error.message}`);
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnmapProject = async (project: Project) => {
        if (!selectedClientId) return;
        setActionLoading(true);

        try {
            // Archive the project instead of deleting
            const { error } = await supabase
                .from("projects")
                .update({ is_archived: true })
                .eq("id", project.id);

            if (error) throw error;

            toast.success(`"${project.name}" unmapped (archived)`);
            await fetchData();
        } catch (error: any) {
            console.error("Unmap error:", error);
            toast.error("Failed to unmap project");
        } finally {
            setActionLoading(false);
        }
    };

    const handleMapAll = async () => {
        if (!selectedClientId || availableTemplates.length === 0) return;
        setActionLoading(true);

        try {
            const newProjects = availableTemplates.map(template => ({
                name: template.name,
                client_id: selectedClientId,
                template_id: template.id,
                is_archived: false,
                is_default: false,
            }));

            const { error } = await supabase
                .from("projects")
                .insert(newProjects);

            if (error) throw error;

            toast.success(`Mapped ${newProjects.length} templates to ${selectedClient?.name}`);
            await fetchData();
        } catch (error: any) {
            console.error("Map All error:", error);
            toast.error("Failed to map all templates");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnmapAll = async () => {
        if (!selectedClientId || mappedProjects.length === 0) return;
        setActionLoading(true);

        try {
            const projectIds = mappedProjects.map(p => p.id);

            const { error } = await supabase
                .from("projects")
                .update({ is_archived: true })
                .in("id", projectIds);

            if (error) throw error;

            toast.success(`Unmapped all projects from ${selectedClient?.name}`);
            await fetchData();
        } catch (error: any) {
            console.error("Unmap All error:", error);
            toast.error("Failed to unmap all projects");
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
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col p-6">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Folders className="h-8 w-8" />
                    Project Mapping
                </h1>
                <p className="text-muted-foreground">
                    Map project templates to clients. Creates projects from templates in bulk.
                </p>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                {/* LEFT COLUMN: Clients List */}
                <Card className="col-span-4 flex flex-col h-full overflow-hidden border-r-4 border-r-primary/10">
                    <CardHeader className="pb-3 bg-muted/30">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Clients
                        </CardTitle>
                        <CardDescription>Select a client to manage projects</CardDescription>
                        <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search clients..."
                                className="pl-9"
                                value={clientSearchQuery}
                                onChange={(e) => setClientSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {filteredClients.map(client => {
                                    const count = projects.filter(
                                        p => p.client_id === client.id && !p.is_archived
                                    ).length;
                                    const isSelected = selectedClientId === client.id;

                                    return (
                                        <button
                                            key={client.id}
                                            onClick={() => setSelectedClientId(client.id)}
                                            className={`w-full text-left p-4 flex items-center gap-3 transition-all hover:bg-muted/50 ${isSelected
                                                ? "bg-primary/5 border-l-4 border-l-primary"
                                                : "border-l-4 border-l-transparent"
                                                }`}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{client.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {count} project{count !== 1 ? "s" : ""} mapped
                                                </div>
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

                {/* RIGHT COLUMN: Template Mapping */}
                <Card className="col-span-8 flex flex-col h-full overflow-hidden">
                    {!selectedClient ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
                            <Building2 className="h-16 w-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a client to start mapping projects</p>
                        </div>
                    ) : (
                        <>
                            <CardHeader className="pb-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Mapping Projects for {selectedClient.name}</CardTitle>
                                        <CardDescription>Map templates to create projects for this client</CardDescription>
                                    </div>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search templates..."
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 p-0 overflow-hidden">
                                <div className="grid grid-cols-2 h-full divide-x">

                                    {/* AVAILABLE COLUMN */}
                                    <div className="flex flex-col h-full min-h-0 bg-muted/10">
                                        <div className="p-3 bg-muted/30 border-b flex items-center justify-between shrink-0">
                                            <span className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                                                <Layers className="h-4 w-4" />
                                                Available ({availableTemplates.length})
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleMapAll}
                                                disabled={availableTemplates.length === 0 || actionLoading}
                                            >
                                                Map All <ArrowRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-auto">
                                            <div className="p-3 space-y-2">
                                                {availableTemplates.map(template => (
                                                    <div
                                                        key={template.id}
                                                        className="flex items-center justify-between p-3 bg-background border rounded-md hover:shadow-sm transition-all group"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium">{template.name}</div>
                                                            {template.description && (
                                                                <div className="text-xs text-muted-foreground truncate">
                                                                    {template.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleMapTemplate(template)}
                                                            disabled={actionLoading}
                                                        >
                                                            <FolderPlus className="h-4 w-4 text-primary" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {availableTemplates.length === 0 && (
                                                    <div className="text-center p-8 text-muted-foreground text-sm">
                                                        {templates.length === 0
                                                            ? "No templates available. Create templates first."
                                                            : "All templates are mapped to this client."
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* MAPPED COLUMN */}
                                    <div className="flex flex-col h-full min-h-0 bg-primary/5">
                                        <div className="p-3 bg-primary/10 border-b flex items-center justify-between shrink-0">
                                            <span className="font-medium text-sm text-primary flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Mapped ({mappedProjects.length})
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={handleUnmapAll}
                                                disabled={mappedProjects.length === 0 || actionLoading}
                                            >
                                                Unmap All <FolderMinus className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-auto">
                                            <div className="p-3 space-y-2">
                                                {mappedProjects.map(project => (
                                                    <div
                                                        key={project.id}
                                                        className="flex items-center justify-between p-3 bg-background border border-primary/20 rounded-md shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                                                <Layers className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <div className="font-medium">{project.name}</div>
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleUnmapProject(project)}
                                                            disabled={actionLoading}
                                                        >
                                                            <FolderMinus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {mappedProjects.length === 0 && (
                                                    <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center">
                                                        <Folders className="h-8 w-8 mb-2 opacity-20" />
                                                        No projects mapped yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
