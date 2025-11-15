import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statuses = [
  { value: "To Do", label: "To Do", color: "bg-status-todo text-status-todo-foreground" },
  { value: "Doing", label: "Doing", color: "bg-status-doing text-status-doing-foreground" },
  { value: "Done", label: "Done", color: "bg-status-done text-status-done-foreground" },
  { value: "Approved", label: "Approved", color: "bg-status-approved text-status-approved-foreground" },
  { value: "On Hold", label: "On Hold", color: "bg-status-hold text-status-hold-foreground" },
  { value: "Cancelled", label: "Cancelled", color: "bg-status-cancelled text-status-cancelled-foreground" },
  { value: "Needs Review", label: "Needs Review", color: "bg-status-hold text-status-hold-foreground" },
  { value: "Blocked", label: "Blocked", color: "bg-status-cancelled text-status-cancelled-foreground" },
];

const urgencies = [
  { value: "Low", label: "Low", color: "bg-urgency-low text-urgency-low-foreground" },
  { value: "Medium", label: "Medium", color: "bg-urgency-medium text-urgency-medium-foreground" },
  { value: "High", label: "High", color: "bg-urgency-high text-urgency-high-foreground" },
  { value: "Immediate", label: "Immediate", color: "bg-urgency-immediate text-urgency-immediate-foreground" },
];

export default function StatusUrgency() {
  const { userRole } = useOutletContext<{ userRole: string }>();
  const isOwner = userRole === "project_owner";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Status & Urgency</h2>
        <p className="text-muted-foreground">
          {isOwner ? "Manage UI colors and labels" : "View status and urgency definitions"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Statuses</CardTitle>
            <CardDescription>Current status options and their colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statuses.map((status) => (
                <div key={status.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="font-medium">{status.label}</span>
                  <Badge className={status.color}>{status.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Urgency</CardTitle>
            <CardDescription>Current urgency levels and their colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgencies.map((urgency) => (
                <div key={urgency.value} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="font-medium">{urgency.label}</span>
                  <Badge className={urgency.color}>{urgency.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isOwner && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Only Project Owners can edit status and urgency configurations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
