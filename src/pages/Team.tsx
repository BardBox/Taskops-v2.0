import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Mail, Clock, MapPin, Filter, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  creative_title: string | null;
  user_code: string | null;
  status: string | null;
  mood: string | null;
  timezone: string | null;
  best_contact_time: string | null;
  tagline: string | null;
  superpower: string | null;
  kryptonite: string | null;
  role?: string;
}

export default function Team() {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creativeTitleFilter, setCreativeTitleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uniqueCreativeTitles, setUniqueCreativeTitles] = useState<string[]>([]);

  useEffect(() => {
    checkAuthAndFetchTeam();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, roleFilter, statusFilter, creativeTitleFilter, teamMembers]);

  const checkAuthAndFetchTeam = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await fetchTeamMembers();
  };

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const membersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "team_member"
        };
      }) || [];

      setTeamMembers(membersWithRoles);
      setFilteredMembers(membersWithRoles);
      
      // Extract unique creative titles for filter
      const titles = membersWithRoles
        .map(m => m.creative_title)
        .filter((title): title is string => !!title)
        .filter((title, index, self) => self.indexOf(title) === index)
        .sort();
      setUniqueCreativeTitles(titles);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...teamMembers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.full_name.toLowerCase().includes(query) ||
        member.creative_title?.toLowerCase().includes(query) ||
        member.user_code?.toLowerCase().includes(query) ||
        member.tagline?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    // Creative title filter
    if (creativeTitleFilter !== "all") {
      filtered = filtered.filter(member => member.creative_title === creativeTitleFilter);
    }

    setFilteredMembers(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCreativeTitleFilter("all");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "project_owner":
        return "bg-purple-500 text-white";
      case "project_manager":
        return "bg-blue-500 text-white";
      case "team_member":
        return "bg-green-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-muted";
    switch (status) {
      case "Available":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "Busy":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "Out of Office":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
      case "Do Not Disturb":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "On Leave":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              My Team
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, title, code, or tagline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-2">
                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="project_owner">Project Owner</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="team_member">Team Member</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Busy">Busy</SelectItem>
                    <SelectItem value="Out of Office">Out of Office</SelectItem>
                    <SelectItem value="Do Not Disturb">Do Not Disturb</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>

                {/* Creative Title Filter */}
                <Select value={creativeTitleFilter} onValueChange={setCreativeTitleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Creative Title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Titles</SelectItem>
                    {uniqueCreativeTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {(searchQuery || roleFilter !== "all" || statusFilter !== "all" || creativeTitleFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Team Members Grid */}
        {filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No team members found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card 
                  className="hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/profile?user=${member.id}&from=team`)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="h-20 w-20 ring-4 ring-background group-hover:ring-primary/20 transition-all">
                          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                          <AvatarFallback className="text-xl">
                            {member.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {member.status && (
                          <div className="absolute -bottom-1 -right-1">
                            <div className={`w-4 h-4 rounded-full border-2 border-background ${
                              member.status === "Available" ? "bg-green-500" :
                              member.status === "Busy" ? "bg-red-500" :
                              member.status === "Out of Office" ? "bg-orange-500" :
                              member.status === "Do Not Disturb" ? "bg-purple-500" :
                              member.status === "On Leave" ? "bg-gray-500" :
                              "bg-gray-500"
                            }`} />
                          </div>
                        )}
                      </div>

                      {/* Name & Code */}
                      <div className="space-y-1 w-full">
                        <h3 className="font-semibold text-lg">{member.full_name}</h3>
                        {member.user_code && (
                          <Badge variant="outline" className="text-xs">
                            #{member.user_code}
                          </Badge>
                        )}
                      </div>

                      {/* Role Badge */}
                      <Badge className={getRoleBadgeColor(member.role || "team_member")}>
                        {formatRole(member.role || "team_member")}
                      </Badge>

                      {/* Creative Title */}
                      {member.creative_title && (
                        <p className="text-sm font-medium text-primary">
                          {member.creative_title}
                        </p>
                      )}

                      {/* Tagline */}
                      {member.tagline && (
                        <p className="text-sm text-muted-foreground italic line-clamp-2">
                          "{member.tagline}"
                        </p>
                      )}

                      {/* Status & Mood */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {member.status && (
                          <Badge variant="outline" className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        )}
                        {member.mood && (
                          <Badge variant="outline" className="text-sm">
                            Feeling {member.mood.split(" ")[1] || member.mood} {member.mood.split(" ")[0]}
                          </Badge>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="w-full pt-4 border-t space-y-2">
                        {member.timezone && (
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{member.timezone}</span>
                          </div>
                        )}
                        {member.best_contact_time && (
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Best time: {member.best_contact_time}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
