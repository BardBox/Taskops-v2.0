import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FileEdit, Clock, User } from "lucide-react";
import { format } from "date-fns";

interface RevisionTask {
  id: string;
  task_name: string;
  revision_number: number;
  status: string;
  created_at: string;
  assignee_id: string;
  assignee_name?: string;
}

interface TaskRevisionsProps {
  taskId: string;
  taskName: string;
  clientId: string;
  projectId: string | null;
  assigneeId: string;
  deadline: string | null;
  urgency: string;
  notes: string | null;
  referenceLink1: string | null;
  referenceLink2: string | null;
  referenceLink3: string | null;
  status: string;
  userRole: string;
  userId: string;
  isRevision: boolean;
  parentTaskId: string | null;
  onRevisionCreated?: () => void;
}

export function TaskRevisions({
  taskId,
  taskName,
  clientId,
  projectId,
  assigneeId,
  deadline,
  urgency,
  notes,
  referenceLink1,
  referenceLink2,
  referenceLink3,
  status,
  userRole,
  userId,
  isRevision,
  parentTaskId,
  onRevisionCreated,
}: TaskRevisionsProps) {
  const [revisions, setRevisions] = useState<RevisionTask[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const effectiveParentId = isRevision ? parentTaskId : taskId;

  useEffect(() => {
    if (effectiveParentId) {
      fetchRevisions();
    }
  }, [effectiveParentId]);

  const fetchRevisions = async () => {
    if (!effectiveParentId) return;

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          task_name,
          revision_number,
          status,
          created_at,
          assignee_id,
          profiles:assignee_id (full_name)
        `)
        .eq("parent_task_id", effectiveParentId)
        .order("revision_number", { ascending: false });

      if (error) throw error;

      const formattedRevisions = data.map((rev: any) => ({
        ...rev,
        assignee_name: rev.profiles?.full_name || "Unknown",
      }));

      setRevisions(formattedRevisions);
    } catch (error) {
      console.error("Error fetching revisions:", error);
    }
  };

  const handleRequestRevision = async () => {
    setLoading(true);
    try {
      // Get the highest revision number for this parent task
      const { data: existingRevisions, error: countError } = await supabase
        .from("tasks")
        .select("revision_number")
        .eq("parent_task_id", effectiveParentId)
        .order("revision_number", { ascending: false })
        .limit(1);

      if (countError) throw countError;

      const nextRevisionNumber = existingRevisions && existingRevisions.length > 0
        ? existingRevisions[0].revision_number + 1
        : 1;

      // Create the revision task
      const { error: insertError } = await supabase.from("tasks").insert({
        task_name: `${taskName} (Rev ${nextRevisionNumber})`,
        client_id: clientId,
        project_id: projectId,
        assignee_id: assigneeId,
        assigned_by_id: userId,
        deadline: deadline,
        status: "Not Started",
        urgency: urgency,
        notes: notes,
        reference_link_1: referenceLink1,
        reference_link_2: referenceLink2,
        reference_link_3: referenceLink3,
        parent_task_id: effectiveParentId,
        revision_number: nextRevisionNumber,
        is_revision: true,
        date: new Date().toISOString().split('T')[0],
      });

      if (insertError) throw insertError;

      // Update the original/parent task status to "Rejected"
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "Rejected" })
        .eq("id", taskId);

      if (updateError) throw updateError;

      toast.success("Revision requested successfully");
      setShowRequestDialog(false);
      fetchRevisions();
      onRevisionCreated?.();
    } catch (error) {
      console.error("Error requesting revision:", error);
      toast.error("Failed to request revision");
    } finally {
      setLoading(false);
    }
  };

  const canRequestRevision = 
    (userRole === "project_manager" || userRole === "project_owner") && 
    (status === "Waiting for Approval" || status === "In Approval");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileEdit className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Revision History</h3>
          {revisions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {revisions.length} {revisions.length === 1 ? "Revision" : "Revisions"}
            </Badge>
          )}
        </div>
        {canRequestRevision && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRequestDialog(true)}
          >
            <FileEdit className="h-3.5 w-3.5 mr-1.5" />
            Request Revision
          </Button>
        )}
      </div>

      <Separator />

      {revisions.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No revisions yet
        </div>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {revisions.map((revision) => (
              <Card key={revision.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Revision {revision.revision_number}
                        </Badge>
                        <Badge className="text-xs">
                          {revision.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{revision.task_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {revision.assignee_name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(revision.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Revision</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new revision task with the same details and mark the current task as "Rejected". 
              The assignee will be notified about the revision request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestRevision} disabled={loading}>
              {loading ? "Creating..." : "Request Revision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
