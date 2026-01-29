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
import { TodaysAgendaCard } from "@/components/sales/TodaysAgendaCard";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { fetchExchangeRates, ExchangeRates } from "@/utils/currency";
import { MainLayout } from "@/components/MainLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useFollowUpReminders } from "@/hooks/useFollowUpReminders";
import { Search, Filter, SortAsc, Download, Upload, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateExcelTemplate, parseExcel } from "@/utils/excelHelpers";
import { useRef } from "react";

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

    // Import/Export State
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Keyboard shortcuts for Growth Engine
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

            // Tab switching shortcuts
            if (e.key === '1') {
                e.preventDefault();
                setActiveTab("pipeline");
                return;
            }
            if (e.key === '2') {
                e.preventDefault();
                setActiveTab("contacts");
                return;
            }

            // New item shortcut
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

    // Clear search query when switching tabs for cleaner UX
    useEffect(() => {
        setSearchQuery("");
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

    // --- Import / Export Logic (Lifted) ---

    const handleExport = () => {
        if (activeTab === "pipeline") {
            const columns = [
                { header: "Title", key: "title", width: 30 },
                { header: "Contact Email", key: "contact_email", width: 30 },
                { header: "Status", key: "status", width: 15, dropdown: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] },
                { header: "Expected Value", key: "expected_value", width: 15 },
                { header: "Currency", key: "currency", width: 10, dropdown: ['USD', 'INR', 'EUR', 'GBP'] },
                { header: "Probability (0-100)", key: "probability", width: 15 },
                { header: "Source", key: "source", width: 15 },
                { header: "Next Follow Up (YYYY-MM-DD)", key: "next_follow_up", width: 20 },
                { header: "Follow Up Level", key: "follow_up_level", width: 15, dropdown: ['L1', 'L2', 'L3', 'L4', 'L5'] }
            ];
            generateExcelTemplate(columns, "Leads", "leads_template.xlsx");
            toast.success("Lead template exported!");
        } else {
            const columns = [
                { header: "Name", key: "name", width: 20 },
                { header: "Email", key: "email", width: 25 },
                { header: "Phone", key: "phone", width: 20 },
                { header: "Company Name", key: "company_name", width: 25 },
                { header: "Designation", key: "designation", width: 20 },
                { header: "Tags (comma separated)", key: "tags", width: 30 },
                { header: "Website", key: "website", width: 25 },
                { header: "LinkedIn", key: "linkedin", width: 25 },
                { header: "Facebook", key: "facebook", width: 25 },
                { header: "Instagram", key: "instagram", width: 25 }
            ];
            generateExcelTemplate(columns, "Contacts", "contacts_template.xlsx");
            toast.success("Contact template exported!");
        }
    };

    const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            if (activeTab === "pipeline") {
                await importLeads(file);
            } else {
                await importContacts(file);
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Import failed: " + error.message);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const importLeads = async (file: File) => {
        const data = await parseExcel<any>(file);
        const leadsToInsert = [];

        for (const row of data) {
            if (!row["Title"] && !row["title"]) continue;

            const title = row["Title"] || row["title"];
            const contactEmail = row["Contact Email"] || row["contact_email"];
            const status = row["Status"] || row["status"];
            const expectedValue = row["Expected Value"] || row["expected_value"];
            const currency = row["Currency"] || row["currency"];
            const probability = row["Probability (0-100)"] || row["probability"];
            const source = row["Source"] || row["source"];
            const nextFollowUp = row["Next Follow Up (YYYY-MM-DD)"] || row["next_follow_up"];
            const followUpLevel = row["Follow Up Level"] || row["follow_up_level"];

            let contactId = null;
            if (contactEmail) {
                const { data: contact } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('email', contactEmail)
                    .single();
                if (contact) contactId = contact.id;
            }

            leadsToInsert.push({
                title: title,
                contact_id: contactId,
                status: status || 'New',
                expected_value: expectedValue ? parseFloat(expectedValue) : null,
                currency: currency || 'USD',
                probability: probability ? parseInt(probability) : null,
                source: source || null,
                next_follow_up: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
                follow_up_level: followUpLevel || null,
            });
        }

        if (leadsToInsert.length === 0) {
            toast.error("No valid leads found in file");
            return;
        }

        const { error } = await supabase.from('leads').insert(leadsToInsert);
        if (error) throw error;

        toast.success(`Successfully imported ${leadsToInsert.length} leads`);
        fetchLeads();
    };

    const importContacts = async (file: File) => {
        const data = await parseExcel<any>(file);
        const contactsToInsert = data.map(row => {
            return {
                name: row["Name"] || row["name"],
                email: row["Email"] || row["email"] || null,
                phone: row["Phone"] || row["phone"] || null,
                company_name: row["Company Name"] || row["company_name"] || null,
                designation: row["Designation"] || row["designation"] || null,
                tags: (row["Tags (comma separated)"] || row["tags"]) ? (row["Tags (comma separated)"] || row["tags"]).split(',').map((t: string) => t.trim()) : [],
                website: row["Website"] || row["website"] || null,
                linkedin: row["LinkedIn"] || row["linkedin"] || null,
                facebook: row["Facebook"] || row["facebook"] || null,
                instagram: row["Instagram"] || row["instagram"] || null
            };
        }).filter(c => c.name);

        if (contactsToInsert.length === 0) {
            toast.error("No valid contacts found in file");
            return;
        }

        const { error } = await supabase.from('contacts').insert(contactsToInsert);
        if (error) throw error;

        toast.success(`Successfully imported ${contactsToInsert.length} contacts`);
        fetchContacts();
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
            <div className="space-y-6 relative min-h-full" onClick={closePanels}>

                <div className="p-4 md:p-8 pb-0 space-y-6">
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
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 md:px-8 py-4 space-y-4 shadow-sm">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                            <TabsTrigger value="contacts">Contacts</TabsTrigger>
                        </TabsList>

                        {/* Common Toolbar */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            {/* Search */}
                            <div className="relative flex-1 w-full sm:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={`Search ${activeTab === 'pipeline' ? 'leads' : 'contacts'}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto bg-white">
                                    <Download className="mr-2 h-4 w-4" />
                                    Template
                                </Button>
                                <div className="relative w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isImporting}
                                        className="w-full sm:w-auto bg-white"
                                    >
                                        {isImporting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        Import
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleImportFileChange}
                                        title="Import Data"
                                    />
                                </div>
                                {/* Sort (only for pipeline for now, can extend) */}
                                {activeTab === 'pipeline' && (
                                    <div className="flex items-center gap-1 sm:ml-2">
                                        <SortAsc className="h-4 w-4 text-muted-foreground" />
                                        <select
                                            value={`${sortBy}-${sortOrder}`}
                                            onChange={(e) => {
                                                const [field, order] = e.target.value.split('-');
                                                setSortBy(field as any);
                                                setSortOrder(order as 'asc' | 'desc');
                                            }}
                                            className="text-sm border rounded-md px-2 py-2 bg-white w-full sm:w-auto"
                                            title="Sort Leads"
                                            aria-label="Sort Leads"
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
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8 space-y-4">
                        <TabsContent value="pipeline" className="space-y-4 mt-0">
                            <TodaysAgendaCard
                                leads={followUpStats.today}
                                onLeadClick={handleLeadClick}
                                onMarkCompleted={handleMarkFollowUpCompleted}
                            />
                            <SmartMetricCards leads={leads} exchangeRates={exchangeRates} />

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
                                contacts={contacts.filter(contact => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                        contact.name.toLowerCase().includes(query) ||
                                        (contact.email && contact.email.toLowerCase().includes(query)) ||
                                        (contact.company_name && contact.company_name.toLowerCase().includes(query))
                                    );
                                })}
                                onEdit={handleEditContact}
                                onDelete={confirmDeleteContact}
                                onContactClick={handleContactClick}
                            />
                        </TabsContent>
                    </div>
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
                        hideCloseButton={true}
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
