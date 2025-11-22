import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, Trash2, User, FolderKanban, Users, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "sonner";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url: string | null;
  client_name?: string;
  task_name?: string;
}

interface GroupedNotifications {
  [key: string]: Notification[];
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    fetchUserRole(session.user.id);
    fetchNotifications(session.user.id);
  };

  const fetchUserRole = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      setUserRole(data?.role || "team_member");
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchNotifications = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          tasks:task_id (
            task_name,
            clients:client_id (
              name
            )
          )
        `)
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const enrichedData = (data || []).map((notif: any) => ({
        ...notif,
        task_name: notif.tasks?.task_name,
        client_name: notif.tasks?.clients?.name,
      }));
      
      setNotifications(enrichedData as Notification[]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.size === 0) return;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", Array.from(selectedNotifications));

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => !selectedNotifications.has(n.id)));
      setSelectedNotifications(new Set());
      toast.success(`${selectedNotifications.size} notification${selectedNotifications.size > 1 ? 's' : ''} deleted`);
    } catch (error) {
      console.error("Error deleting notifications:", error);
      toast.error("Failed to delete notifications");
    }
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.task_id) {
      setSelectedTaskId(notification.task_id);
      setTaskDialogOpen(true);
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const groupByTask = (notifications: Notification[]): GroupedNotifications => {
    return notifications.reduce((acc, notif) => {
      const key = notif.task_id || "general";
      if (!acc[key]) acc[key] = [];
      acc[key].push(notif);
      return acc;
    }, {} as GroupedNotifications);
  };

  const groupByPerson = (notifications: Notification[]): GroupedNotifications => {
    return notifications.reduce((acc, notif) => {
      const key = notif.actor_name || "System";
      if (!acc[key]) acc[key] = [];
      acc[key].push(notif);
      return acc;
    }, {} as GroupedNotifications);
  };

  const groupByClient = (notifications: Notification[]): GroupedNotifications => {
    return notifications.reduce((acc, notif) => {
      const key = notif.client_name || "No Client";
      if (!acc[key]) acc[key] = [];
      acc[key].push(notif);
      return acc;
    }, {} as GroupedNotifications);
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const renderMessage = () => {
      if (notification.task_name) {
        const parts = notification.message.split(notification.task_name);
        if (parts.length > 1) {
          return (
            <>
              {parts[0]}
              <span className="font-bold">{notification.task_name}</span>
              {parts.slice(1).join(notification.task_name)}
            </>
          );
        }
      }
      return notification.message;
    };

    return (
      <div
        className={`flex items-start gap-3 p-4 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${
          !notification.is_read ? "bg-accent/20" : ""
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <Checkbox
          checked={selectedNotifications.has(notification.id)}
          onCheckedChange={() => toggleNotificationSelection(notification.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
        <Avatar className="h-10 w-10">
          <AvatarImage src={notification.actor_avatar_url || ""} />
          <AvatarFallback>
            {notification.actor_name?.split(" ").map(n => n[0]).join("") || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-sm text-muted-foreground">{renderMessage()}</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  by {notification.actor_name || "System"}
                </p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(notification.created_at), "PPp")}
                </p>
              </div>
            </div>
          </div>
          {!notification.is_read && (
            <Badge variant="secondary" className="text-xs">New</Badge>
          )}
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumbs />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notification Center</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedNotifications.size > 0 && (
              <Button variant="destructive" onClick={deleteSelectedNotifications}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedNotifications.size})
              </Button>
            )}
            <Button onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="client">
              <Building2 className="mr-2 h-4 w-4" />
              Client
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <FolderKanban className="mr-2 h-4 w-4" />
              Task
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="mr-2 h-4 w-4" />
              People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Notifications</CardTitle>
                {notifications.length > 0 && (
                  <Checkbox
                    checked={selectedNotifications.size === notifications.length}
                    onCheckedChange={toggleSelectAll}
                  />
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No notifications yet</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client" className="space-y-4">
            {Object.entries(groupByClient(notifications)).map(([client, notifs]) => (
              <Card key={client}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {client}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifs.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {Object.entries(groupByTask(notifications)).map(([taskId, notifs]) => (
              <Card key={taskId}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    {taskId === "general" ? "General Notifications" : `Task Activity`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifs.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            {Object.entries(groupByPerson(notifications)).map(([person, notifs]) => (
              <Card key={person}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {person}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifs.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {selectedTaskId && (
        <TaskDetailDialog
          taskId={selectedTaskId}
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          userRole={userRole}
          userId={userId}
        />
      )}
    </MainLayout>
  );
}
