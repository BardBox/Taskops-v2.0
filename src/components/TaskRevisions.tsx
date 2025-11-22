import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { FileEdit, ExternalLink, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskRevisionsProps {
  taskId: string;
  revisionCount: number;
  status: string;
  userRole: string;
  userId: string;
  onRevisionRequested?: () => void;
}

interface RevisionHistory {
  revision_number: number;
  date_requested: string;
  requested_by_name: string;
  requested_by_avatar: string | null;
  comment: string | null;
  reference_link: string | null;
  reference_image: string | null;
  status: string;
}

export function TaskRevisions({
  taskId,
  revisionCount,
}: TaskRevisionsProps) {
  const [revisions, setRevisions] = useState<RevisionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevisionHistory();
  }, [taskId, revisionCount]);

  const fetchRevisionHistory = async () => {
    setLoading(true);
    try {
      // Fetch all revision records from tasks table where parent_task_id = taskId
      const { data: revisionTasks, error } = await supabase
        .from("tasks")
        .select(`
          revision_number,
          revision_requested_at,
          revision_requested_by,
          revision_comment,
          revision_reference_link,
          revision_reference_image,
          status,
          profiles:revision_requested_by (
            full_name,
            avatar_url
          )
        `)
        .eq("id", taskId)
        .order("revision_number", { ascending: false });

      if (error) throw error;

      // Build revision history from the data
      const history: RevisionHistory[] = [];
      
      if (revisionTasks && revisionTasks.length > 0) {
        const task = revisionTasks[0];
        
        // If there are revisions, create entries for each
        for (let i = task.revision_number; i >= 1; i--) {
          history.push({
            revision_number: i,
            date_requested: task.revision_requested_at || new Date().toISOString(),
            requested_by_name: (task.profiles as any)?.full_name || "Unknown",
            requested_by_avatar: (task.profiles as any)?.avatar_url || null,
            comment: task.revision_comment || null,
            reference_link: task.revision_reference_link || null,
            reference_image: task.revision_reference_image || null,
            status: task.status,
          });
        }
      }

      setRevisions(history);
    } catch (error) {
      console.error("Error fetching revision history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileEdit className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Revisions Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          This task hasn't required any revisions. Revisions will appear here when requested by project managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-sm font-medium">Revision History</Label>
        <Badge variant="secondary" className="text-xs">
          {revisionCount} {revisionCount === 1 ? "Revision" : "Revisions"}
        </Badge>
      </div>

      <div className="space-y-4">
        {revisions.map((revision) => (
          <Card key={revision.revision_number} className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={revision.requested_by_avatar || undefined} />
                  <AvatarFallback>
                    {revision.requested_by_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        Revision #{revision.revision_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {revision.requested_by_name} • {format(new Date(revision.date_requested), 'PPp')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {revision.status}
                    </Badge>
                  </div>

                  {revision.comment && (
                    <div className="bg-muted/30 rounded-md p-3 text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">Comment:</p>
                      <p className="whitespace-pre-wrap">{revision.comment}</p>
                    </div>
                  )}

                  {revision.reference_link && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Reference Link:</p>
                      <a
                        href={revision.reference_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {revision.reference_link}
                      </a>
                    </div>
                  )}

                  {revision.reference_image && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Reference Image:</p>
                      <a
                        href={revision.reference_image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img
                          src={revision.reference_image}
                          alt="Revision reference"
                          className="max-w-xs max-h-40 rounded border hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
