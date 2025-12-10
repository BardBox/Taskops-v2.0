import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Link, Image as ImageIcon, Calendar, Activity, Zap, Eye, Filter,
  User, Building2, FolderKanban, CalendarCheck, LinkIcon, Tag
} from "lucide-react";
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
  // Resolved names for display
  old_display_value?: string;
  new_display_value?: string;
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

    // Collect all unique IDs that need resolution
    const clientIds = new Set<string>();
    const projectIds = new Set<string>();
    const userIds = new Set<string>();

    data?.forEach(entry => {
      if (entry.field_name === 'client_id') {
        if (entry.old_value) clientIds.add(entry.old_value);
        if (entry.new_value) clientIds.add(entry.new_value);
      }
      if (entry.field_name === 'project_id') {
        if (entry.old_value) projectIds.add(entry.old_value);
        if (entry.new_value) projectIds.add(entry.new_value);
      }
      if (entry.field_name === 'assignee_id') {
        if (entry.old_value) userIds.add(entry.old_value);
        if (entry.new_value) userIds.add(entry.new_value);
      }
    });

    // Fetch names for IDs
    const [clientsRes, projectsRes, usersRes] = await Promise.all([
      clientIds.size > 0 
        ? supabase.from('clients').select('id, name').in('id', Array.from(clientIds))
        : { data: [] },
      projectIds.size > 0 
        ? supabase.from('projects').select('id, name').in('id', Array.from(projectIds))
        : { data: [] },
      userIds.size > 0 
        ? supabase.from('profiles').select('id, full_name').in('id', Array.from(userIds))
        : { data: [] },
    ]);

    const clientsMap = new Map<string, string>(
      clientsRes.data?.map(c => [c.id, c.name] as [string, string]) || []
    );
    const projectsMap = new Map<string, string>(
      projectsRes.data?.map(p => [p.id, p.name] as [string, string]) || []
    );
    const usersMap = new Map<string, string>(
      usersRes.data?.map(u => [u.id, u.full_name] as [string, string]) || []
    );

    const enrichedData = data?.map(entry => {
      let old_display_value: string | null = entry.old_value;
      let new_display_value: string | null = entry.new_value;

      // Resolve IDs to names
      if (entry.field_name === 'client_id') {
        old_display_value = entry.old_value ? clientsMap.get(entry.old_value) || 'Unknown Client' : null;
        new_display_value = entry.new_value ? clientsMap.get(entry.new_value) || 'Unknown Client' : null;
      }
      if (entry.field_name === 'project_id') {
        old_display_value = entry.old_value ? projectsMap.get(entry.old_value) || 'Unknown Project' : null;
        new_display_value = entry.new_value ? projectsMap.get(entry.new_value) || 'Unknown Project' : null;
      }
      if (entry.field_name === 'assignee_id') {
        old_display_value = entry.old_value ? usersMap.get(entry.old_value) || 'Unknown User' : null;
        new_display_value = entry.new_value ? usersMap.get(entry.new_value) || 'Unknown User' : null;
      }
      // Format dates
      if (['date', 'deadline', 'actual_delivery'].includes(entry.field_name)) {
        old_display_value = entry.old_value ? format(new Date(entry.old_value), 'MMM d, yyyy') : null;
        new_display_value = entry.new_value ? format(new Date(entry.new_value), 'MMM d, yyyy') : null;
      }

      return {
        ...entry,
        editor: {
          ...entry.editor,
          role: rolesMap.get(entry.edited_by_id) || 'team_member'
        },
        old_display_value,
        new_display_value
      };
    });

    setHistory(enrichedData || []);
    setLoading(false);
  };

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'task_name':
        return <Tag className="h-4 w-4" />;
      case 'notes':
        return <FileText className="h-4 w-4" />;
      case 'reference_link_1':
      case 'reference_link_2':
      case 'reference_link_3':
        return <Link className="h-4 w-4" />;
      case 'reference_image':
        return <ImageIcon className="h-4 w-4" />;
      case 'deadline':
      case 'date':
        return <Calendar className="h-4 w-4" />;
      case 'actual_delivery':
        return <CalendarCheck className="h-4 w-4" />;
      case 'status':
        return <Activity className="h-4 w-4" />;
      case 'urgency':
        return <Zap className="h-4 w-4" />;
      case 'client_id':
        return <Building2 className="h-4 w-4" />;
      case 'project_id':
        return <FolderKanban className="h-4 w-4" />;
      case 'assignee_id':
        return <User className="h-4 w-4" />;
      case 'asset_link':
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      task_name: 'Task Name',
      notes: 'Description',
      reference_link_1: 'Reference Link 1',
      reference_link_2: 'Reference Link 2',
      reference_link_3: 'Reference Link 3',
      reference_image: 'Reference Image',
      deadline: 'Deadline',
      date: 'Date Assigned',
      actual_delivery: 'Actual Delivery',
      status: 'Status',
      urgency: 'Urgency',
      client_id: 'Client',
      project_id: 'Project',
      assignee_id: 'Assignee',
      asset_link: 'Asset Link',
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
    if (filterType === 'timeline') return ['deadline', 'date', 'actual_delivery'].includes(entry.field_name);
    if (filterType === 'properties') return ['status', 'urgency'].includes(entry.field_name);
    if (filterType === 'assignment') return ['client_id', 'project_id', 'assignee_id', 'task_name'].includes(entry.field_name);
    if (filterType === 'links') return ['asset_link', 'reference_link_1', 'reference_link_2', 'reference_link_3'].includes(entry.field_name);
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
              <SelectItem value="assignment">Task & Assignment</SelectItem>
              <SelectItem value="timeline">Timeline & Dates</SelectItem>
              <SelectItem value="properties">Status & Urgency</SelectItem>
              <SelectItem value="links">Links & Assets</SelectItem>
              <SelectItem value="references">References</SelectItem>
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

                  {/* Description versions */}
                  {entry.field_name === 'notes' && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Version #{descriptionVersions.length - descriptionVersions.findIndex(v => v.id === entry.id)}
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

                  {/* Task name changes */}
                  {entry.field_name === 'task_name' && (
                    <div className="mt-2 space-y-1 text-xs">
                      {entry.old_value && (
                        <div className="text-muted-foreground line-through">
                          Previous: {entry.old_value}
                        </div>
                      )}
                      {entry.new_value && (
                        <div className="text-foreground font-medium">
                          New: {entry.new_value}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Client, Project, Assignee changes - show resolved names */}
                  {['client_id', 'project_id', 'assignee_id'].includes(entry.field_name) && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="line-through opacity-60">
                        {entry.old_display_value || 'None'}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">
                        {entry.new_display_value || 'None'}
                      </Badge>
                    </div>
                  )}

                  {/* Date changes */}
                  {['date', 'deadline', 'actual_delivery'].includes(entry.field_name) && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="line-through opacity-60">
                        {entry.old_display_value || 'Not set'}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">
                        {entry.new_display_value || 'Not set'}
                      </Badge>
                    </div>
                  )}

                  {/* Reference links */}
                  {entry.field_name.includes('reference_link') && (
                    <div className="mt-2 space-y-1 text-xs">
                      {entry.old_value && (
                        <div className="text-muted-foreground line-through truncate max-w-xs">
                          Previous: {entry.old_value}
                        </div>
                      )}
                      {entry.new_value && (
                        <div className="text-foreground truncate max-w-xs">
                          New: <a href={entry.new_value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{entry.new_value}</a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Asset link */}
                  {entry.field_name === 'asset_link' && (
                    <div className="mt-2 space-y-1 text-xs">
                      {entry.old_value && (
                        <div className="text-muted-foreground line-through truncate max-w-xs">
                          Previous: {entry.old_value}
                        </div>
                      )}
                      {entry.new_value && (
                        <div className="text-foreground truncate max-w-xs">
                          New: <a href={entry.new_value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{entry.new_value}</a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference image */}
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

                  {/* Status and Urgency changes */}
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