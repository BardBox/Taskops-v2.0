import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        fetchLeads();
        fetchContacts();
    }, []);

    useEffect(() => {
        if (selectedLeadForPanel) {
            fetchActivities(selectedLeadForPanel.id);
        }
    }, [selectedLeadForPanel]);

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
        setSelectedLeadForPanel(lead);
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

    const confirmDeleteContact = (contactId: string) => {
        setContactToDelete(contactId);
        setDeleteContactDialogOpen(true);
    };

    const handleDeleteContact = async () => {
        if (!contactToDelete) return;

        try {
            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactToDelete);

            if (error) throw error;

            toast.success("Contact deleted successfully");
            fetchContacts();
            // Also refresh leads as some might have missing contacts now (or CASCADE handled it)
            fetchLeads();
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast.error("Failed to delete contact");
        } finally {
            setDeleteContactDialogOpen(false);
            setContactToDelete(null);
        }
    };

    if (loadingLeads && loadingContacts) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Growth Engine</h1>
                    <p className="text-muted-foreground">Manage your pipeline, leads, and contacts.</p>
                </div>
                {activeTab === "pipeline" ? (
                    <Button onClick={handleAddLead}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lead
                    </Button>
                ) : (
                    <Button onClick={handleAddContact}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${leads.reduce((sum, lead) => sum + (lead.expected_value || 0), 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{leads.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{contacts.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                </TabsList>
                <TabsContent value="pipeline" className="space-y-4">
                    <LeadTable
                        leads={leads}
                        onEdit={handleEditLead}
                        onDelete={confirmDeleteLead}
                        onAddToCalendar={() => toast.info("Calendar integration coming soon")}
                        onLeadClick={handleLeadClick}
                    />
                </TabsContent>
                <TabsContent value="contacts" className="space-y-4">
                    <ContactTable
                        contacts={contacts}
                        onEdit={handleEditContact}
                        onDelete={confirmDeleteContact}
                    />
                </TabsContent>
            </Tabs>

            {selectedLeadForPanel && (
                <SalesOpsPanel
                    lead={selectedLeadForPanel}
                    events={activities}
                    onClose={() => setSelectedLeadForPanel(null)}
                />
            )}

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
    );
};
