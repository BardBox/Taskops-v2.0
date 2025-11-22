import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/MainLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { format } from "date-fns";
import { CheckCircle2, ExternalLink, Search, Filter, Download, Calendar, User, Building2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
  id: string;
  task_name: string;
  posted_at: string | null;
  posted_by: string | null;
  asset_link: string | null;
  is_posted: boolean;
  deadline: string | null;
  status: string;
  urgency: string;
  clients: {
    name: string;
  } | null;
  posted_by_profile: {
    full_name: string;
  } | null;
  assignee_profile: {
    full_name: string;
  } | null;
}

export default function PostingStatus() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('posting-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          task_name,
          posted_at,
          posted_by,
          asset_link,
          is_posted,
          deadline,
          status,
          urgency,
          clients (name),
          posted_by_profile:profiles!tasks_posted_by_fkey (full_name),
          assignee_profile:profiles!tasks_assignee_id_fkey (full_name)
        `)
        .in("status", ["Approved", "Posted"])
        .order("posted_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const filteredTasks = getFilteredTasks();
    const csvContent = [
      ["Task Name", "Client", "Status", "Urgency", "Assignee", "Posted By", "Posted Date", "Asset Link"],
      ...filteredTasks.map(task => [
        task.task_name,
        task.clients?.name || "-",
        task.is_posted ? "Posted" : "Not Posted",
        task.urgency,
        task.assignee_profile?.full_name || "-",
        task.posted_by_profile?.full_name || "-",
        task.posted_at ? format(new Date(task.posted_at), 'PPp') : "-",
        task.asset_link || "-"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posting-status-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success("Report exported successfully");
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.clients?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Client filter
    if (clientFilter !== "all") {
      filtered = filtered.filter(task => task.clients?.name === clientFilter);
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter(task => task.urgency === urgencyFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(task => {
        if (!task.posted_at) return false;
        const postedDate = new Date(task.posted_at);
        const daysDiff = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case "today":
            return daysDiff === 0;
          case "week":
            return daysDiff <= 7;
          case "month":
            return daysDiff <= 30;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setClientFilter("all");
    setUrgencyFilter("all");
    setDateFilter("all");
  };

  const postedTasks = getFilteredTasks().filter(task => task.is_posted);
  const notPostedTasks = getFilteredTasks().filter(task => !task.is_posted);

  const renderTaskRow = (task: Task) => (
    <TableRow key={task.id} className="hover:bg-accent/50">
      <TableCell className="font-medium">{task.task_name}</TableCell>
      <TableCell>
        {task.clients && (
          <Badge variant="outline">{task.clients.name}</Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={task.urgency === "Immediate" ? "destructive" : task.urgency === "High" ? "default" : "secondary"}>
          {task.urgency}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {task.assignee_profile?.full_name || "-"}
      </TableCell>
      <TableCell className="text-sm">
        {task.posted_by_profile?.full_name || "-"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {task.posted_at ? format(new Date(task.posted_at), 'PPp') : "-"}
      </TableCell>
      <TableCell>
        {task.asset_link ? (
          <a
            href={task.asset_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Posting Status</h1>
            <p className="text-muted-foreground mt-1">
              Track tasks posted and ready to post on social media
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Urgencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgencies</SelectItem>
                  <SelectItem value="Immediate">Immediate</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Mid">Mid</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || clientFilter !== "all" || urgencyFilter !== "all" || dateFilter !== "all") && (
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {getFilteredTasks().length} of {tasks.length} tasks
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getFilteredTasks().length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Posted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{postedTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Yet to Post</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{notPostedTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Table */}
        <Tabs defaultValue="posted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="posted" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Posted ({postedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="not-posted" className="gap-2">
              <Calendar className="h-4 w-4" />
              Yet to Post ({notPostedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posted">
            <Card>
              <CardContent className="pt-6">
                {postedTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No posted tasks found</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Posted By</TableHead>
                          <TableHead>Posted Date</TableHead>
                          <TableHead>Asset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {postedTasks.map(renderTaskRow)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="not-posted">
            <Card>
              <CardContent className="pt-6">
                {notPostedTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No tasks pending to post</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Posted By</TableHead>
                          <TableHead>Posted Date</TableHead>
                          <TableHead>Asset</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notPostedTasks.map(renderTaskRow)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
