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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Archive, ArchiveRestore, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  client_code: string;
  premium_tag: string | null;
  is_archived: boolean;
  created_at: string;
}

export default function AdminClients() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("");
  const [premiumTag, setPremiumTag] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<"client_code" | "name" | "premium_tag" | "is_archived" | "created_at" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const isOwner = userRole === "project_owner";

  useEffect(() => {
    fetchClients();
    setPremiumTag("none"); // Initialize with "none"
  }, [showArchived]);

  const fetchClients = async () => {
    try {
      let query = supabase
        .from("clients")
        .select("id, name, client_code, premium_tag, is_archived, created_at")
        .order("name");

      if (!showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClients((data as any) || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter a client name");
      return;
    }

    try {
      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from("clients")
          .update({ 
            name: clientName,
            premium_tag: premiumTag === "none" ? null : premiumTag
          })
          .eq("id", editingClient.id);

        if (error) throw error;
        toast.success("Client updated successfully");
      } else {
        // Get next client code
        const { data: nextCode } = await supabase.rpc("generate_client_code" as any);
        
        // Create new client
        const { error } = await supabase
          .from("clients")
          .insert([{ 
            name: clientName,
            client_code: nextCode,
            premium_tag: premiumTag === "none" ? null : premiumTag
          }]);

        if (error) throw error;
        toast.success("Client created successfully");
      }

      setDialogOpen(false);
      setClientName("");
      setPremiumTag("none");
      setEditingClient(null);
      fetchClients();
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast.error(error.message || "Failed to save client");
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientName(client.name);
    setPremiumTag(client.premium_tag || "none");
    setDialogOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!isOwner) {
      toast.error("Only owners can delete clients");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (error) throw error;
      toast.success("Client deleted successfully");
      fetchClients();
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(error.message || "Failed to delete client");
    }
  };

  const handleArchiveClient = async (clientId: string, currentArchived: boolean) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update({ is_archived: !currentArchived })
        .eq("id", clientId);

      if (error) throw error;
      toast.success(currentArchived ? "Client unarchived successfully" : "Client archived successfully");
      fetchClients();
    } catch (error: any) {
      console.error("Error archiving client:", error);
      toast.error(error.message || "Failed to archive client");
    }
  };

  const openCreateDialog = () => {
    setEditingClient(null);
    setClientName("");
    setPremiumTag("none");
    setDialogOpen(true);
  };

  const handleSort = (field: "client_code" | "name" | "premium_tag" | "is_archived" | "created_at") => {
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

  const getSortIcon = (field: "client_code" | "name" | "premium_tag" | "is_archived" | "created_at") => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const getPremiumBadgeColor = (tag: string | null) => {
    if (!tag) return "bg-muted text-muted-foreground";
    
    switch (tag) {
      case "A":
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case "B":
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case "C":
        return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
      case "D":
        return "bg-gradient-to-r from-blue-400 to-blue-600 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const sortedClients = [...clients].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    // Handle null values for premium_tag
    if (sortField === "premium_tag") {
      aValue = aValue || "";
      bValue = bValue || "";
    }
    
    // Handle date strings
    if (sortField === "created_at") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Client Management</h2>
          <p className="text-muted-foreground">Manage client organizations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("client_code")}
                  >
                    Client ID
                    {getSortIcon("client_code")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("name")}
                  >
                    Client Name
                    {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("premium_tag")}
                  >
                    Premium Tag
                    {getSortIcon("premium_tag")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("is_archived")}
                  >
                    Status
                    {getSortIcon("is_archived")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort("created_at")}
                  >
                    Created
                    {getSortIcon("created_at")}
                  </Button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono text-sm">{client.client_code}</TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    {client.premium_tag && (
                      <Badge variant="secondary">{client.premium_tag}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.is_archived ? "outline" : "default"}>
                      {client.is_archived ? "Archived" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveClient(client.id, client.is_archived)}
                      >
                        {client.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Update client information" : "Create a new client organization"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Client Name</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label>Premium Tag (Optional)</Label>
              <Select value={premiumTag} onValueChange={setPremiumTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select premium tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient}>
              {editingClient ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
