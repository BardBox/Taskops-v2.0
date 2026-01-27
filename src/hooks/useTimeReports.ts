import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";

export interface TimeReportTask {
    taskId: string;
    taskName: string;
    projectName: string;
    clientName: string;
    assigneeName: string;
    estimatedMinutes: number; // The budget
    actualMinutes: number;    // From aggregated sessions
    status: string;
    efficiency: number;       // actual / estimated (1.0 = on budget, >1.0 = over budget)
}

export interface TimeReportSummary {
    totalEstimatedMinutes: number;
    totalActualMinutes: number;
    overBudgetTaskCount: number;
    underBudgetTaskCount: number;
}

export const useTimeReports = (
    dateFrom: Date | undefined,
    dateTo: Date | undefined
) => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<TimeReportTask[]>([]);
    const [summary, setSummary] = useState<TimeReportSummary>({
        totalEstimatedMinutes: 0,
        totalActualMinutes: 0,
        overBudgetTaskCount: 0,
        underBudgetTaskCount: 0,
    });

    useEffect(() => {
        fetchReportData();
    }, [dateFrom, dateTo]);

    const fetchReportData = async () => {
        try {
            setLoading(true);

            // 1. Fetch all tasks that have either estimates OR time tracked in the period
            // We will join task_time_sessions to get actuals

            // Start building the query on task_time_sessions first to filter by date
            let sessionsQuery = supabase
                .from("task_time_sessions")
                .select("task_id, duration_seconds");

            if (dateFrom) {
                sessionsQuery = sessionsQuery.gte("started_at", dateFrom.toISOString());
            }
            if (dateTo) {
                sessionsQuery = sessionsQuery.lte("started_at", dateTo.toISOString());
            }

            const { data: sessions, error: sessionsError } = await sessionsQuery;
            if (sessionsError) throw sessionsError;

            // Aggregate time per task
            const actualsMap = new Map<string, number>();
            sessions?.forEach(session => {
                const current = actualsMap.get(session.task_id) || 0;
                actualsMap.set(session.task_id, current + (session.duration_seconds || 0));
            });

            // 2. Fetch Task Details for these tasks AND any tasks with estimates 
            // (Optimization: For now, we'll fetch tasks involved in the sessions + tasks with estimates)
            // Actually, we probably want to see *all* active tasks or just those with activity?
            // "Budget vs Actual" usually implies viewing things that HAVE activity or HAVE budget.

            const taskIds = Array.from(actualsMap.keys());

            // If no time tracked, we might still want to see tasks with estimates? 
            // For this v1, let's focus on tasks that have activity OR are explicitly passed in filters (TODO).
            // Let's widen the net: fetch tasks updated recently or created recently could be too large.
            // Let's stick to: Tasks present in the time sessions.

            if (taskIds.length === 0) {
                setReportData([]);
                setLoading(false);
                return;
            }

            const { data: tasks, error: tasksError } = await supabase
                .from("tasks")
                .select(`
          id,
          task_name,
          estimated_minutes,
          status,
          projects(name),
          clients(name),
          assignee:profiles!tasks_assignee_id_fkey(full_name)
        `)
                .in("id", taskIds);

            if (tasksError) throw tasksError;

            // 3. Combine Data
            let totalEst = 0;
            let totalAct = 0;
            let over = 0;
            let under = 0;

            const combined: TimeReportTask[] = (tasks || []).map((task: any) => {
                const actualSeconds = actualsMap.get(task.id) || 0;
                const actualMinutes = Math.round(actualSeconds / 60);
                const estimatedMinutes = task.estimated_minutes || 0;

                // Efficiency: 
                // 0.8 means took 80% of budget (Good)
                // 1.2 means took 120% of budget (Over)
                // Avoid div/0
                const efficiency = estimatedMinutes > 0 ? (actualMinutes / estimatedMinutes) : 0;

                totalEst += estimatedMinutes;
                totalAct += actualMinutes;

                if (estimatedMinutes > 0) {
                    if (actualMinutes > estimatedMinutes) over++;
                    else under++;
                }

                return {
                    taskId: task.id,
                    taskName: task.task_name,
                    projectName: task.projects?.name || "No Project",
                    clientName: task.clients?.name || "No Client",
                    assigneeName: task.assignee?.full_name || "Unassigned",
                    estimatedMinutes,
                    actualMinutes,
                    status: task.status,
                    efficiency
                };
            });

            // Sort by "Most Over Budget" (highest efficiency > 1)
            combined.sort((a, b) => b.efficiency - a.efficiency);

            setReportData(combined);
            setSummary({
                totalEstimatedMinutes: totalEst,
                totalActualMinutes: totalAct,
                overBudgetTaskCount: over,
                underBudgetTaskCount: under
            });

        } catch (err) {
            console.error("Error fetching time reports:", err);
        } finally {
            setLoading(false);
        }
    };

    return { loading, reportData, summary };
};
