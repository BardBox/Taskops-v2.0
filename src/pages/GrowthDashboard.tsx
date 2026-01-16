import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { LeadTable, Lead } from "@/components/sales/LeadTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeadDialog } from "@/components/sales/LeadDialog";
import { ContactTable, Contact } from "@/components/sales/ContactTable";
import { ContactDialog } from "@/components/sales/ContactDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SalesOpsPanel, Activity } from "@/components/sales/SalesOpsPanel";
import { ContactDetailPanel } from "@/components/sales/ContactDetailPanel";
import { SmartMetricCards } from "@/components/sales/SmartMetricCards";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { fetchExchangeRates, ExchangeRates } from "@/utils/currency";
import { MainLayout } from "@/components/MainLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useFollowUpReminders } from "@/hooks/useFollowUpReminders";
import { Search, Filter, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const GrowthDashboard = () => {
    // Lead State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [leadDialogOpen, setLeadDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [deleteLeadDialogOpen, setDeleteLeadDialogOpen] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

    // Contact State
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState("pipeline");

    // Panel State
    const [selectedLeadForPanel, setSelectedLeadForPanel] = useState<Lead | null>(null);
    const [selectedContactForPanel, setSelectedContactForPanel] = useState<Contact | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);

    // Currency State
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

    // User/Profile State
    const [userMap, setUserMap] = useState<Record<string, string>>({});

    // Access Control
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState<string | null>(null);

    // Filtering & Sorting State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'created_at' | 'next_follow_up' | 'expected_value' | 'lead_code'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');



    // Keyboard shortcut for New Lead/Contact
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                if (activeTab === "pipeline") {
                    setSelectedLead(null);
                    setLeadDialogOpen(true);
                } else if (activeTab === "contacts") {
                    setSelectedContact(null);
                    setContactDialogOpen(true);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTab]);

    const loadRates = async () => {
        const rates = await fetchExchangeRates();
        setExchangeRates(rates);
    };

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*, contact:contacts(name, company_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data as unknown as Lead[] || []);
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast.error("Failed to load leads");
        } finally {
            setLoadingLeads(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('name');

            if (error) throw error;
            setContacts(data as Contact[] || []);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            toast.error("Failed to load contacts");
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchActivities = async (leadId: string) => {
        const { data, error } = await supabase
            .from('sales_activities')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Cast strictly or validate
            setActivities(data as unknown as Activity[]);
        } else {
            setActivities([]);
        }
    };

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('user_roles')
            .select('user_id, profiles:user_id(full_name)')
            // Fetch all roles relevant to sales/growth
            .in('role', ['project_owner', 'business_head', 'sales_team']);

        if (data) {
            const map: Record<string, string> = {};
            data.forEach((item: { user_id: string; profiles: { full_name: string } | null }) => {
                if (item.profiles && item.profiles.full_name) {
                    map[item.user_id] = item.profiles.full_name;
                }
            });
            setUserMap(map);
        }
    };

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .single();

            const role = roleData?.role;
            setUserRole(role);

            // Roles allowed to access Growth Engine
            const allowedRoles = ["project_owner", "business_head", "sales_team"];
            const isAllowed = allowedRoles.includes(role);

            if (role && !isAllowed) {
                toast.error("You do not have access to the Growth Engine");
                navigate("/dashboard?view=ops");
            }
        };

        checkAccess();
        fetchLeads();
        fetchContacts();
        loadRates();
        fetchUsers();
    }, [navigate]);

    useEffect(() => {
        if (selectedLeadForPanel) {
            fetchActivities(selectedLeadForPanel.id);
        }
    }, [selectedLeadForPanel]);

    // Follow-up Reminders
    const { stats: followUpStats, getFollowUpStatus } = useFollowUpReminders(leads);

    // Filter and sort leads
    const filteredAndSortedLeads = useMemo(() => {
        let filtered = [...leads];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(lead =>
                lead.title.toLowerCase().includes(query) ||
                lead.contact?.name?.toLowerCase().includes(query) ||
                lead.contact?.company_name?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilters.length > 0) {
            filtered = filtered.filter(lead => statusFilters.includes(lead.status));
        }

        // Sort
        filtered.sort((a, b) => {
            let compareValue = 0;

            switch (sortBy) {
                case 'created_at':
                    compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'next_follow_up':
                    const aDate = a.next_follow_up ? new Date(a.next_follow_up).getTime() : Infinity;
                    const bDate = b.next_follow_up ? new Date(b.next_follow_up).getTime() : Infinity;
                    compareValue = aDate - bDate;
                    break;
                case 'expected_value':
                    compareValue = (a.expected_value || 0) - (b.expected_value || 0);
                    break;
                case 'lead_code':
                    compareValue = (a.lead_code || 0) - (b.lead_code || 0);
                    break;
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return filtered;
    }, [leads, searchQuery, statusFilters, sortBy, sortOrder]);

    // Lead Handlers
    const handleAddLead = () => {
        setSelectedLead(null);
        setLeadDialogOpen(true);
    };

    const handleEditLead = (lead: Lead) => {
        setSelectedLead(lead);
        setLeadDialogOpen(true);
    };

    const confirmDeleteLead = (leadId: string) => {
        setLeadToDelete(leadId);
        setDeleteLeadDialogOpen(true);
    };

    const handleDeleteLead = async () => {
        if (!leadToDelete) return;

        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadToDelete);

            if (error) throw error;

            toast.success("Lead deleted successfully");
            fetchLeads();
        } catch (error) {
            console.error('Error deleting lead:', error);
            toast.error("Failed to delete lead");
        } finally {
            setDeleteLeadDialogOpen(false);
            setLeadToDelete(null);
        }
    };

    const handleLeadClick = (lead: Lead) => {
        setSelectedContactForPanel(null);
        setSelectedLeadForPanel(lead);
    };

    const handleSnoozeFollowUp = async (leadId: string) => {
        try {
            const lead = leads.find(l => l.id === leadId);
            if (!lead || !lead.next_follow_up) return;

            const currentDate = new Date(lead.next_follow_up);
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 1);

            const { error } = await supabase
                .from('leads')
                .update({ next_follow_up: newDate.toISOString() })
                .eq('id', leadId);

            if (error) throw error;

            toast.success("Follow-up snoozed to " + newDate.toLocaleDateString());
            fetchLeads();
        } catch (error: any) {
            toast.error("Failed to snooze: " + error.message);
        }
    };

    const handleMarkFollowUpCompleted = async (leadId: string) => {
        try {
            const { error } = await supabase
                .from('leads')
                .update({ next_follow_up: null })
                .eq('id', leadId);

            if (error) throw error;

            toast.success("Follow-up marked as completed");
            fetchLeads();
        } catch (error: any) {
            toast.error("Failed to mark completed: " + error.message);
        }
    };

    // Contact Handlers
    const handleAddContact = () => {
        setSelectedContact(null);
        setContactDialogOpen(true);
    };

    const handleEditContact = (contact: Contact) => {
        setSelectedContact(contact);
        setContactDialogOpen(true);
    };

    const handleContactClick = (contact: Contact) => {
        setSelectedLeadForPanel(null);
        setSelectedContactForPanel(contact);
    };

    const confirmDeleteContact = (contactId: string) => {
        setContactToDelete(contactId);
        setDeleteContactDialogOpen(true);
    };

    const handleDeleteContact = async () => {
        if (!contactToDelete) return;

        try {
            const { error, count } = await supabase
                .from('contacts')
                .delete({ count: 'exact' })
                .eq('id', contactToDelete);

            if (error) throw error;
            if (count === 0) {
                throw new Error("No contact was deleted. Check permissions.");
            }

            toast.success("Contact deleted successfully");
            fetchContacts();
            // Also refresh leads as some might have missing contacts now (or CASCADE handled it)
            fetchLeads();
        } catch (error) {
            console.error('Error deleting contact:', error);
            // Check for Foreign Key violation (Postgres code 23503)
            if ((error as any).code === '23503') {
                toast.error("Cannot delete contact because it is linked to active leads. Please archive or unlink it first.");
            } else {
                toast.error("Failed to delete contact: " + ((error as any).message || "Unknown error"));
            }
        } finally {
            setDeleteContactDialogOpen(false);
            setContactToDelete(null);
        }
    };

    const handleViewContact = (contactId: string) => {
        // 1. Find the contact
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            // 2. Clear lead selection
            setSelectedLeadForPanel(null);

            // 3. Switch tab
            setActiveTab("contacts");

            // 4. Select contact for panel (slight delay to allow tab switch/mount if needed, though state is lifting)
            setTimeout(() => {
                setSelectedContactForPanel(contact);
            }, 100);
        } else {
            toast.error("Contact details not found locally.");
            // Potentially fetch individual if not found
        }
    };

    if (loadingLeads && loadingContacts) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Backdrop handler
    const closePanels = () => {
        setSelectedLeadForPanel(null);
        setSelectedContactForPanel(null);
    };

    return (
        <MainLayout>
            <div className="space-y-6 relative p-4 md:p-8 min-h-full" onClick={closePanels}>

                <Breadcrumbs />

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Growth Engine</h1>
                        <p className="text-muted-foreground">Manage your pipeline, leads, and contacts.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === "pipeline" ? (
                            <>
                                <Button
                                    size="icon"
                                    className="h-14 w-14 rounded-full bg-slate-900 hover:bg-slate-800 shadow-lg"
                                    onClick={handleAddLead}
                                >
                                    <Plus className="h-6 w-6" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-14 w-14 rounded-full shadow-md"
                                    onClick={() => fetchLeads()}
                                    title="Refresh leads"
                                >
                                    <Loader2 className="h-5 w-5" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="icon"
                                    className="h-14 w-14 rounded-full bg-slate-900 hover:bg-slate-800 shadow-lg"
                                    onClick={handleAddContact}
                                >
                                    <Plus className="h-6 w-6" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-14 w-14 rounded-full shadow-md"
                                    onClick={() => fetchContacts()}
                                    title="Refresh contacts"
                                >
                                    <Loader2 className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <SmartMetricCards leads={leads} exchangeRates={exchangeRates} />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                        <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pipeline" className="space-y-4">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg border">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search leads by title, contact, or company..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-2">
                                <SortAsc className="h-4 w-4 text-muted-foreground" />
                                <select
                                    value={`${sortBy}-${sortOrder}`}
                                    onChange={(e) => {
                                        const [field, order] = e.target.value.split('-');
                                        setSortBy(field as any);
                                        setSortOrder(order as 'asc' | 'desc');
                                    }}
                                    className="text-sm border rounded-md px-2 py-1.5 bg-white"
                                >
                                    <option value="created_at-desc">Newest First</option>
                                    <option value="created_at-asc">Oldest First</option>
                                    <option value="next_follow_up-asc">Follow-up (Earliest)</option>
                                    <option value="next_follow_up-desc">Follow-up (Latest)</option>
                                    <option value="expected_value-desc">Value (High to Low)</option>
                                    <option value="expected_value-asc">Value (Low to High)</option>
                                    <option value="lead_code-desc">Lead Code (Desc)</option>
                                    <option value="lead_code-asc">Lead Code (Asc)</option>
                                </select>
                            </div>
                        </div>

                        {/* Status Filters */}
                        <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-lg border">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Status:</span>
                            {['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map((status) => {
                                const count = leads.filter(l => l.status === status).length;
                                const isActive = statusFilters.includes(status);
                                return (
                                    <Badge
                                        key={status}
                                        variant={isActive ? "default" : "outline"}
                                        className={`cursor-pointer transition-all ${isActive ? '' : 'hover:bg-slate-100'}`}
                                        onClick={() => {
                                            if (isActive) {
                                                setStatusFilters(statusFilters.filter(s => s !== status));
                                            } else {
                                                setStatusFilters([...statusFilters, status]);
                                            }
                                        }}
                                    >
                                        {status} ({count})
                                    </Badge>
                                );
                            })}
                            {statusFilters.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => setStatusFilters([])}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {/* Results count */}
                        <div className="text-sm text-muted-foreground">
                            Showing {filteredAndSortedLeads.length} of {leads.length} leads
                        </div>

                        <LeadTable
                            leads={filteredAndSortedLeads}
                            onEdit={handleEditLead}
                            onDelete={confirmDeleteLead}
                            onAddToCalendar={() => toast.info("Calendar integration coming soon")}
                            onLeadClick={handleLeadClick}
                            userMap={userMap}
                            getFollowUpStatus={getFollowUpStatus}
                            onSnooze={handleSnoozeFollowUp}
                            onMarkCompleted={handleMarkFollowUpCompleted}
                        />
                    </TabsContent>
                    <TabsContent value="contacts" className="space-y-4">
                        <ContactTable
                            contacts={contacts}
                            onEdit={handleEditContact}
                            onDelete={confirmDeleteContact}
                            onContactClick={handleContactClick}
                        />
                    </TabsContent>
                </Tabs>

                <Sheet
                    open={!!selectedLeadForPanel || !!selectedContactForPanel}
                    onOpenChange={(open) => !open && closePanels()}
                    modal={false}
                >
                    <SheetContent
                        side="right"
                        className="p-0 border-l border-slate-200 w-[450px] sm:max-w-[450px]"
                        overlayClassName="hidden"
                        onInteractOutside={(e) => e.preventDefault()} // Prevent auto-closing by Radix, we handle it manually via click
                        onClick={(e) => e.stopPropagation()} // Prevent React event bubbling to the parent div which closes panels
                    >
                        {selectedLeadForPanel ? (
                            <SalesOpsPanel
                                lead={selectedLeadForPanel}
                                events={activities}
                                onClose={() => setSelectedLeadForPanel(null)}
                                onRefresh={() => fetchActivities(selectedLeadForPanel.id)}
                                onEdit={handleEditLead}
                                onViewContact={handleViewContact}
                                onMarkWon={async (lead) => {
                                    try {
                                        const { error } = await supabase
                                            .from('leads')
                                            .update({ status: 'Won' })
                                            .eq('id', lead.id);

                                        if (error) throw error;

                                        toast.success("Lead marked as Won!");
                                        fetchLeads(); // Refresh leads
                                        // Refresh the specific panel lead if it's the one open (it is)
                                        setSelectedLeadForPanel({ ...lead, status: 'Won' });
                                    } catch (error) {
                                        console.error("Error marking lead as won:", error);
                                        toast.error("Failed to update lead status");
                                    }
                                }}
                                userMap={userMap}
                            />
                        ) : selectedContactForPanel ? (
                            <ContactDetailPanel
                                contact={selectedContactForPanel}
                                onClose={() => setSelectedContactForPanel(null)}
                                onEdit={(contact) => {
                                    handleEditContact(contact);
                                }}
                                onLeadClick={(lead) => {
                                    // Switch to pipeline view and open the lead panel
                                    setActiveTab("pipeline");
                                    setSelectedContactForPanel(null);
                                    setSelectedLeadForPanel(lead);
                                }}
                            />
                        ) : null}
                    </SheetContent>
                </Sheet>

                <LeadDialog
                    open={leadDialogOpen}
                    onOpenChange={setLeadDialogOpen}
                    lead={selectedLead}
                    onSuccess={fetchLeads}
                />

                <ContactDialog
                    open={contactDialogOpen}
                    onOpenChange={setContactDialogOpen}
                    contact={selectedContact}
                    onSuccess={() => {
                        fetchContacts();
                        fetchLeads(); // Refresh leads in case contact details changed
                    }}
                />

                <AlertDialog open={deleteLeadDialogOpen} onOpenChange={setDeleteLeadDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the lead.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Lead
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={deleteContactDialogOpen} onOpenChange={setDeleteContactDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the contact.
                                Any leads associated with this contact might also be affected.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Contact
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
};
