import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Link, Image as ImageIcon, Calendar, Activity, Zap, Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { DescriptionVersionDialog } from "./DescriptionVersionDialog";

interface HistoryEntry {
  id: string;
  edited_at: string;
  edited_by_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  version_snapshot: string | null;
  change_description: string | null;
  editor: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

interface TaskHistoryProps {
  taskId: string;
}

export const TaskHistory = ({ taskId }: TaskHistoryProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedVersion, setSelectedVersion] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    fetchHistory();

    const channel = supabase
      .channel(`task-history-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_edit_history',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('task_edit_history')
      .select(`
        *,
        editor:edited_by_id (
          full_name,
          avatar_url
        )
      `)
      .eq('task_id', taskId)
      .order('edited_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      return;
    }

    // Get roles for editors
    const editorIds = data?.map(entry => entry.edited_by_id) || [];
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', editorIds);

    const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    const enrichedData = data?.map(entry => ({
      ...entry,
      editor: {
        ...entry.editor,
        role: rolesMap.get(entry.edited_by_id) || 'team_member'
      }
    }));

    setHistory(enrichedData || []);
    setLoading(false);
  };

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'notes':
        return <FileText className="h-4 w-4" />;
      case 'reference_link_1':
      case 'reference_link_2':
      case 'reference_link_3':
        return <Link className="h-4 w-4" />;
      case 'reference_image':
        return <ImageIcon className="h-4 w-4" />;
      case 'deadline':
        return <Calendar className="h-4 w-4" />;
      case 'status':
        return <Activity className="h-4 w-4" />;
      case 'urgency':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      notes: 'Description',
      reference_link_1: 'Reference Link 1',
      reference_link_2: 'Reference Link 2',
      reference_link_3: 'Reference Link 3',
      reference_image: 'Reference Image',
      deadline: 'Deadline',
      status: 'Status',
      urgency: 'Urgency',
    };
    return labels[fieldName] || fieldName;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'project_owner':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'project_manager':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'project_owner':
        return 'PO';
      case 'project_manager':
        return 'PM';
      default:
        return 'TM';
    }
  };

  const filteredHistory = history.filter(entry => {
    if (filterType === 'all') return true;
    if (filterType === 'description') return entry.field_name === 'notes';
    if (filterType === 'references') return entry.field_name.includes('reference');
    if (filterType === 'timeline') return entry.field_name === 'deadline';
    if (filterType === 'properties') return ['status', 'urgency'].includes(entry.field_name);
    return true;
  });

  const descriptionVersions = history.filter(entry => entry.field_name === 'notes');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter changes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="description">Description</SelectItem>
              <SelectItem value="references">References</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="properties">Status & Urgency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-xs">
          {filteredHistory.length} {filteredHistory.length === 1 ? 'change' : 'changes'}
        </Badge>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No changes found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Task modifications will appear here
              </p>
            </div>
          ) : (
            filteredHistory.map((entry, index) => (
              <div
                key={entry.id}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.editor.avatar_url || ''} />
                  <AvatarFallback>{entry.editor.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.editor.full_name}</span>
                      <Badge className={getRoleBadgeColor(entry.editor.role)} variant="outline">
                        {getRoleLabel(entry.editor.role)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.edited_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {getFieldIcon(entry.field_name)}
                    <span className="text-muted-foreground">{entry.change_description}</span>
                  </div>

                  {entry.field_name === 'notes' && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Version #{descriptionVersions.length - index}
                      </div>
                      {entry.version_snapshot && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVersion(entry)}
                          className="gap-2"
                        >
                          <Eye className="h-3 w-3" />
                          View Version
                        </Button>
                      )}
                    </div>
                  )}

                  {entry.field_name.includes('reference_link') && (
                    <div className="mt-2 space-y-1 text-xs">
                      {entry.old_value && (
                        <div className="text-muted-foreground line-through">
                          Previous: {entry.old_value}
                        </div>
                      )}
                      {entry.new_value && (
                        <div className="text-foreground">
                          New: <a href={entry.new_value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{entry.new_value}</a>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.field_name === 'reference_image' && (
                    <div className="mt-2 space-y-2">
                      {entry.new_value && (
                        <img 
                          src={entry.new_value} 
                          alt="Reference" 
                          className="w-32 h-32 object-cover rounded border"
                        />
                      )}
                    </div>
                  )}

                  {(entry.field_name === 'status' || entry.field_name === 'urgency') && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="line-through opacity-60">
                        {entry.old_value}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">
                        {entry.new_value}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {selectedVersion && (
        <DescriptionVersionDialog
          version={selectedVersion}
          allVersions={descriptionVersions}
          open={!!selectedVersion}
          onOpenChange={(open) => !open && setSelectedVersion(null)}
        />
      )}
    </div>
  );
};
