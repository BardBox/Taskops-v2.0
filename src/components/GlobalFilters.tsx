import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStatusUrgency } from "@/hooks/useStatusUrgency";
import { useIsMobile } from "@/hooks/use-mobile";
import { RotateCcw, Filter, ChevronDown } from "lucide-react";

export interface FilterState {
  year: string;
  month: string;
  status: string;
  urgency: string;
  clientId: string;
  projectName: string;
  teamMemberId: string;
  projectManagerId: string;
  highlightToday: boolean;
  highlightImmediate: boolean;
  highlightDelayed: boolean;
  highlightInApproval: boolean;
  delay: string;
  quickFilter: string[];
}

interface GlobalFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  compact?: boolean;
}

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Status and urgency options will be loaded dynamically from system_settings

const DELAY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "on-time", label: "On Time" },
  { value: "early", label: "Early" },
  { value: "delayed", label: "Delayed" }
];

export const GlobalFilters = ({ filters, onFiltersChange, compact = false }: GlobalFiltersProps) => {
  const [years, setYears] = useState<number[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [projectManagers, setProjectManagers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();
  
  const { statuses, urgencies } = useStatusUrgency();
  const statusOptions = statuses.map(s => s.label);
  const urgencyOptions = urgencies.map(u => u.label);

  // Count active filters
  const activeFilterCount = [
    filters.year !== "all",
    filters.month !== "all",
    filters.status !== "all",
    filters.urgency !== "all",
    filters.delay !== "all",
    filters.clientId !== "all",
    filters.projectName !== "all",
    filters.teamMemberId !== "all",
    filters.projectManagerId !== "all",
  ].filter(Boolean).length;

  useEffect(() => {
    getCurrentUser();
    fetchFilterOptions();
    loadSavedFilters();

    // Set up real-time subscriptions
    const profilesChannel = supabase
      .channel("filters-profiles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => fetchFilterOptions()
      )
      .subscribe();

    const rolesChannel = supabase
      .channel("filters-roles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => fetchFilterOptions()
      )
      .subscribe();

    const clientsChannel = supabase
      .channel("filters-clients-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        () => fetchFilterOptions()
      )
      .subscribe();

    const settingsChannel = supabase
      .channel("filters-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
        },
        () => fetchFilterOptions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  useEffect(() => {
    saveFilters();
  }, [filters]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (roleData) setUserRole(roleData.role);
    }
  };

  const fetchFilterOptions = async () => {
    // Fetch years from tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("date")
      .order("date", { ascending: false });
    
    if (tasks) {
      const uniqueYears = Array.from(
        new Set(tasks.map(t => new Date(t.date).getFullYear()))
      ).sort((a, b) => b - a);
      setYears(uniqueYears);
    }

    // Fetch clients
    const { data: clientsData } = await supabase
      .from("clients")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    setClients(clientsData || []);

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .eq("is_archived", false)
      .order("name");
    setProjects(projectsData || []);

    // Fetch all users with their roles
    const { data: usersData } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles!inner(role)
      `)
      .order("full_name");

    if (usersData) {
      // Team Members dropdown includes ALL users (PO, PM, TM) for task assignment
      // This allows POs and PMs to be assigned tasks and filtered as team members
      setTeamMembers(usersData);
      
      // Project Managers dropdown includes only PMs and POs
      const pms = usersData.filter((u: any) => {
        const roles = Array.isArray(u.user_roles) ? u.user_roles : [u.user_roles];
        return roles.some((r: any) => r?.role === "project_manager" || r?.role === "project_owner");
      });
      setProjectManagers(pms);
    }
  };

  const loadSavedFilters = () => {
    const saved = sessionStorage.getItem("taskops_filters");
    if (saved) {
      try {
        const parsedFilters = JSON.parse(saved);
        // Ensure delay, projectName, and quickFilter properties exist for backwards compatibility
        onFiltersChange({ 
          ...parsedFilters, 
          delay: parsedFilters.delay || "all",
          projectName: parsedFilters.projectName || "all",
          quickFilter: Array.isArray(parsedFilters.quickFilter) 
            ? parsedFilters.quickFilter 
            : (parsedFilters.quickFilter === "all" || !parsedFilters.quickFilter ? [] : [parsedFilters.quickFilter])
        });
      } catch (e) {
        console.error("Failed to load saved filters", e);
      }
    }
  };

  const saveFilters = () => {
    sessionStorage.setItem("taskops_filters", JSON.stringify(filters));
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // If client changes, reset project if selected project is not available for the new client
    if (key === "clientId" && value !== "all") {
      const availableProjectNames = projects
        .filter(p => p.client_id === value)
        .map(p => p.name);
      
      if (filters.projectName !== "all" && !availableProjectNames.includes(filters.projectName)) {
        newFilters.projectName = "all";
      }
    }
    
    // If client is set to "all", keep projectName as is (it will show all projects with that name)
    
    onFiltersChange(newFilters);
  };

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.urgency} onValueChange={(v) => updateFilter("urgency", v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            {urgencyOptions.map(urgency => (
              <SelectItem key={urgency} value={urgency}>{urgency}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.delay} onValueChange={(v) => updateFilter("delay", v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Delay" />
          </SelectTrigger>
          <SelectContent>
            {DELAY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="highlight-today-compact"
            checked={filters.highlightToday}
            onCheckedChange={(checked) => updateFilter("highlightToday", checked)}
          />
          <Label htmlFor="highlight-today-compact" className="text-sm cursor-pointer">
            Today
          </Label>
        </div>
      </div>
    );
  }

  const resetViewFilters = () => {
    onFiltersChange({
      ...filters,
      year: "all",
      month: "all",
      status: "all",
      urgency: "all",
      clientId: "all",
      projectName: "all",
      teamMemberId: "all",
      projectManagerId: "all",
      delay: "all",
    });
  };

  const resetHighlights = () => {
    onFiltersChange({
      ...filters,
      highlightToday: false,
      highlightImmediate: false,
      highlightDelayed: false,
      highlightInApproval: false,
    });
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* View Filters Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{isMobile ? 'View Filters' : ''}</h3>
          <button
            onClick={resetViewFilters}
            className="h-5 w-5 rounded-full bg-background border border-foreground/20 hover:bg-foreground flex items-center justify-center transition-all active:scale-90 active:rotate-180 hover:rotate-12 group"
            title="Reset Filters"
          >
            <RotateCcw className="h-3 w-3 text-foreground group-hover:text-background transition-transform" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-9 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Year</Label>
              <Select value={filters.year} onValueChange={(v) => updateFilter("year", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Month</Label>
              <Select value={filters.month} onValueChange={(v) => updateFilter("month", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Urgency</Label>
              <Select value={filters.urgency} onValueChange={(v) => updateFilter("urgency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {urgencyOptions.map(urgency => (
                    <SelectItem key={urgency} value={urgency}>{urgency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Delay</Label>
              <Select value={filters.delay} onValueChange={(v) => updateFilter("delay", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELAY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Client</Label>
              <Select value={filters.clientId} onValueChange={(v) => updateFilter("clientId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Project</Label>
              <Select 
                value={filters.projectName} 
                onValueChange={(v) => updateFilter("projectName", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Array.from(new Set(
                    projects
                      .filter(p => filters.clientId === "all" || p.client_id === filters.clientId)
                      .map(p => p.name)
                  )).sort().map(projectName => (
                    <SelectItem key={projectName} value={projectName}>{projectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userRole !== "team_member" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Team Member</Label>
                <Select value={filters.teamMemberId} onValueChange={(v) => updateFilter("teamMemberId", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {teamMembers.map(tm => (
                      <SelectItem key={tm.id} value={tm.id}>{tm.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {userRole !== "team_member" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">PM</Label>
                <Select value={filters.projectManagerId} onValueChange={(v) => updateFilter("projectManagerId", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {projectManagers.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

      {/* Highlight Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Highlight Tasks</h3>
          <button
            onClick={resetHighlights}
            className="h-5 w-5 rounded-full bg-background border border-foreground/20 hover:bg-foreground flex items-center justify-center transition-all active:scale-90 active:rotate-180 hover:rotate-12 group"
            title="Reset Highlights"
          >
            <RotateCcw className="h-3 w-3 text-foreground group-hover:text-background transition-transform" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 h-6">
            <Switch
              id="highlight-today"
              checked={filters.highlightToday}
              onCheckedChange={(checked) => updateFilter("highlightToday", checked)}
              className="data-[state=checked]:bg-blue-500"
            />
            <Label htmlFor="highlight-today" className="text-sm cursor-pointer leading-none">
              Today
            </Label>
          </div>
          <div className="flex items-center gap-2 h-6">
            <Switch
              id="highlight-immediate"
              checked={filters.highlightImmediate}
              onCheckedChange={(checked) => updateFilter("highlightImmediate", checked)}
              className="data-[state=checked]:bg-red-500"
            />
            <Label htmlFor="highlight-immediate" className="text-sm cursor-pointer leading-none">
              Immediate
            </Label>
          </div>
          <div className="flex items-center gap-2 h-6">
            <Switch
              id="highlight-delayed"
              checked={filters.highlightDelayed}
              onCheckedChange={(checked) => updateFilter("highlightDelayed", checked)}
              className="data-[state=checked]:bg-orange-500"
            />
            <Label htmlFor="highlight-delayed" className="text-sm cursor-pointer leading-none">
              Delayed
            </Label>
          </div>
          <div className="flex items-center gap-2 h-6">
            <Switch
              id="highlight-in-approval"
              checked={filters.highlightInApproval}
              onCheckedChange={(checked) => updateFilter("highlightInApproval", checked)}
              className="data-[state=checked]:bg-green-500"
            />
            <Label htmlFor="highlight-in-approval" className="text-sm cursor-pointer leading-none">
              In Approval
            </Label>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: Show filter button that opens sheet
  if (isMobile) {
    return (
      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full gap-2 h-11">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center justify-between">
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    resetViewFilters();
                    resetHighlights();
                  }}
                  className="text-destructive"
                >
                  Clear All
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>
          <FilterContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="p-3 md:p-4">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">View Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <FilterContent />
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};