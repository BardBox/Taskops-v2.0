
import { useRef } from "react";
import { SalesOpsPanel, Activity } from "@/components/sales/SalesOpsPanel";

// ... existing imports ...

export const GrowthDashboard = () => {
    // ... existing state ...

    // Panel State
    const [selectedLeadForPanel, setSelectedLeadForPanel] = useState<Lead | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        if (selectedLeadForPanel) {
            fetchActivities(selectedLeadForPanel.id);
        }
    }, [selectedLeadForPanel]);

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

    const handleLeadClick = (lead: Lead) => {
        setSelectedLeadForPanel(lead);
    };

    // ... existing handlers ...

    return (
        <div className="space-y-6 relative">
            {/* ... header ... */}

            {/* ... cards ... */}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                {/* ... tabs list ... */}
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

            {/* ... dialogs ... */}
        </div>
    );
};

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
        </div >
    );
};
