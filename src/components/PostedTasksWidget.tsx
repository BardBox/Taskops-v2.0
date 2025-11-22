import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PostedTask {
  id: string;
  task_name: string;
  posted_at: string | null;
  posted_by: string | null;
  asset_link: string | null;
  clients: {
    name: string;
  } | null;
  posted_by_profile: {
    full_name: string;
  } | null;
}

export function PostedTasksWidget() {
  const [postedTasks, setPostedTasks] = useState<PostedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostedTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('posted-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: 'is_posted=eq.true',
        },
        () => {
          fetchPostedTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPostedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          task_name,
          posted_at,
          posted_by,
          asset_link,
          clients (name),
          posted_by_profile:profiles!tasks_posted_by_fkey (full_name)
        `)
        .eq("is_posted", true)
        .order("posted_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPostedTasks(data || []);
    } catch (error) {
      console.error("Error fetching posted tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Posted to Social Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Posted to Social Media
          <Badge variant="secondary" className="ml-auto">
            {postedTasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {postedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No tasks posted yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {postedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {task.task_name}
                        </h4>
                        {task.clients && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {task.clients.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Posted on {task.posted_at ? format(new Date(task.posted_at), 'PPp') : 'Unknown'}
                        </p>
                        {task.posted_by_profile && (
                          <p>by {task.posted_by_profile.full_name}</p>
                        )}
                      </div>
                    </div>
                    {task.asset_link && (
                      <a
                        href={task.asset_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-2 hover:bg-accent rounded-md transition-colors"
                        title="View asset"
                      >
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
