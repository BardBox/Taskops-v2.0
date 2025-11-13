import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statuses = [
  { value: "To Do", label: "To Do", color: "bg-gray-100 text-gray-800" },
  { value: "Doing", label: "Doing", color: "bg-blue-100 text-blue-800" },
  { value: "Done", label: "Done", color: "bg-green-100 text-green-800" },
  { value: "Approved", label: "Approved", color: "bg-purple-100 text-purple-800" },
  { value: "On Hold", label: "On Hold", color: "bg-yellow-100 text-yellow-800" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "Needs Review", label: "Needs Review", color: "bg-orange-100 text-orange-800" },
  { value: "Blocked", label: "Blocked", color: "bg-pink-100 text-pink-800" },
];

const urgencies = [
  { value: "Low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "Medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "High", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "Immediate", label: "Immediate", color: "bg-red-100 text-red-800" },
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
