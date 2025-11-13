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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  created_at: string;
}

export default function AdminClients() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("");

  const isOwner = userRole === "project_owner";

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    try {
      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from("clients")
          .update({ name: clientName })
          .eq("id", editingClient.id);

        if (error) throw error;
        toast.success("Client updated successfully");
      } else {
        // Create new client
        const { error } = await supabase
          .from("clients")
          .insert({ name: clientName });

        if (error) throw error;
        toast.success("Client created successfully");
      }

      setDialogOpen(false);
      setClientName("");
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
    setDialogOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!isOwner) {
      toast.error("Only owners can delete clients");
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

  const openCreateDialog = () => {
    setEditingClient(null);
    setClientName("");
    setDialogOpen(true);
  };

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
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                      >
                        <Pencil className="h-4 w-4" />
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
