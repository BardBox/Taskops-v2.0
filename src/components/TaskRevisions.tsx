import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FileEdit } from "lucide-react";

interface TaskRevisionsProps {
  taskId: string;
  revisionCount: number;
  status: string;
  userRole: string;
  userId: string;
  onRevisionRequested?: () => void;
}

export function TaskRevisions({
  taskId,
  revisionCount,
  status,
  userRole,
  userId,
  onRevisionRequested,
}: TaskRevisionsProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestRevision = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          revision_count: revisionCount + 1,
          revision_requested_at: new Date().toISOString(),
          revision_requested_by: userId,
          status: "Not Started",
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Revision requested successfully");
      setShowRequestDialog(false);
      onRevisionRequested?.();
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
    <div className="flex items-center gap-2">
      {revisionCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          <FileEdit className="h-3 w-3 mr-1" />
          Revision {revisionCount}
        </Badge>
      )}
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

      <AlertDialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Revision</AlertDialogTitle>
            <AlertDialogDescription>
              This will increment the revision counter and reset the task status to "Not Started". 
              The revision request will be tracked in the task discussion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestRevision} disabled={loading}>
              {loading ? "Requesting..." : "Request Revision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
