
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, PlusCircle, Edit, Eye, Mail, Phone, User, Briefcase as LeadSourceIcon, Loader2, BrainCircuit, Star, UserCheck, RefreshCw, Search as SearchIcon } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { scoreLead, type ScoreLeadInput, type ScoreLeadOutput } from "@/ai/flows/lead-scoring";
import type { Customer } from "../customers/page"; 

type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost" | "Converted";

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  status: LeadStatus;
  source: string;
  dateAdded: Timestamp;
  lastUpdated?: Timestamp;
  logoUrl?: string; 
  dataAiHint?: string;
  notes?: string | null;
  leadScore?: number;
  leadScoreReason?: string;
  isQualified?: boolean;
}

const leadSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  contactName: z.string().min(2, "Contact name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number seems too short.").optional().or(z.literal("")).nullable(),
  status: z.enum(["New", "Contacted", "Qualified", "Lost", "Converted"]),
  source: z.string().min(2, "Source must be at least 2 characters."),
  notes: z.string().optional().nullable(), 
});

const getStatusBadgeVariant = (status: LeadStatus) => {
  switch (status) {
    case "New": return "default";
    case "Contacted": return "secondary";
    case "Qualified": return "outline"; 
    case "Converted": return "default"; 
    case "Lost": return "destructive";
    default: return "default";
  }
};


export default function AdminLeadsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [isViewLeadDialogOpen, setIsViewLeadDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isScoringLead, setIsScoringLead] = useState(false);
  const [isConvertingToCustomer, setIsConvertingToCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && userProfile?.role !== "admin") {
      router.push("/dashboard"); 
    }
  }, [userProfile, authLoading, router]);

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      if (!userProfile || userProfile.role !== "admin") {
        setIsLoadingLeads(false);
        return;
      }
      const leadsCollectionRef = collection(db, "leads");
      const q = query(leadsCollectionRef, orderBy("dateAdded", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedLeads = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Lead));
      setLeads(fetchedLeads);
    } catch (error) {
      console.error("Error fetching leads: ", error);
      toast({
        title: "Error Fetching Leads",
        description: "Failed to fetch leads from Firestore. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === "admin") {
      fetchLeads();
    }
  }, [userProfile]); 

  const form = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      status: "New",
      source: "",
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
  });

  async function onAddLeadSubmit(values: z.infer<typeof leadSchema>) {
    try {
      const newLeadData = {
        ...values,
        status: values.status as LeadStatus,
        phone: values.phone || null,
        notes: values.notes || null,
        dateAdded: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        logoUrl: `https://placehold.co/40x40.png?text=${values.companyName.substring(0,2).toUpperCase()}`,
        dataAiHint: "company logo",
      };
      
      const leadsCollectionRef = collection(db, "leads");
      await addDoc(leadsCollectionRef, newLeadData);
      
      toast({
        title: "Lead Added",
        description: `${values.companyName} has been successfully added.`,
      });
      form.reset();
      setIsAddLeadDialogOpen(false);
      fetchLeads(); 
    } catch (error) {
      console.error("Error adding lead: ", error);
      toast({
        title: "Error Adding Lead",
        description: "Failed to add lead. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    editForm.reset({
        companyName: lead.companyName || "",
        contactName: lead.contactName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        status: lead.status, 
        source: lead.source || "",
        notes: lead.notes || "",
    });
    setIsEditLeadDialogOpen(true);
  };

  async function onEditLeadSubmit(values: z.infer<typeof leadSchema>) {
    if (!selectedLead) return;
    try {
      const leadDocRef = doc(db, "leads", selectedLead.id);
      const updatedData = {
        ...values,
        status: values.status as LeadStatus,
        phone: values.phone || null,
        notes: values.notes || null,
        lastUpdated: serverTimestamp(),
      }
      await updateDoc(leadDocRef, updatedData);
      toast({
        title: "Lead Updated",
        description: `${values.companyName} has been successfully updated.`,
      });
      setIsEditLeadDialogOpen(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error("Error updating lead: ", error);
      toast({
        title: "Error Updating Lead",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsViewLeadDialogOpen(true);
  };

  const handleScoreLead = async (leadToScore?: Lead) => {
    const currentLead = leadToScore || selectedLead;
    if (!currentLead) return;
    setIsScoringLead(true);
    try {
      const inquiry = `Lead for ${currentLead.companyName} (Contact: ${currentLead.contactName}, Email: ${currentLead.email}). Source: ${currentLead.source}. Notes: ${currentLead.notes || 'N/A'}`;
      const scoreLeadInput: ScoreLeadInput = {
        initialInquiry: inquiry,
        websiteActivity: "Lead manually entered/managed in CRM.", 
      };
      const scoreOutput: ScoreLeadOutput = await scoreLead(scoreLeadInput);
      
      const leadDocRef = doc(db, "leads", currentLead.id);
      const aiUpdate = {
        leadScore: scoreOutput.leadScore,
        leadScoreReason: scoreOutput.reason,
        isQualified: scoreOutput.isQualified,
        lastUpdated: serverTimestamp(),
      }
      await updateDoc(leadDocRef, aiUpdate);

      const updatedLeadWithScore = {
        ...currentLead, 
        ...aiUpdate,
        lastUpdated: Timestamp.now() 
      } as Lead;
      
      setSelectedLead(updatedLeadWithScore); 
      setLeads(prevLeads => prevLeads.map(l => l.id === currentLead.id ? updatedLeadWithScore : l));
      
      toast({
        title: "Lead Scored",
        description: `${currentLead.companyName} has been scored by AI.`,
      });
    } catch (error) {
      console.error("Error scoring lead with AI: ", error);
      toast({
        title: "AI Scoring Error",
        description: "Failed to score lead using AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScoringLead(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!selectedLead) return;
    setIsConvertingToCustomer(true);
    try {
      const newCustomerData: Omit<Customer, 'id' | 'customerSince' | 'lastUpdated'> & { customerSince?: any, lastUpdated?: any, originalLeadId?: string } = {
        companyName: selectedLead.companyName,
        contactName: selectedLead.contactName,
        email: selectedLead.email,
        phone: selectedLead.phone || null,
        address: null, 
        notes: selectedLead.notes || null,
        customerSince: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        logoUrl: `https://placehold.co/40x40.png?text=${selectedLead.companyName.substring(0,2).toUpperCase()}`,
        dataAiHint: "company logo",
        originalLeadId: selectedLead.id, 
      };

      const customersCollectionRef = collection(db, "customers");
      await addDoc(customersCollectionRef, newCustomerData);

      const leadDocRef = doc(db, "leads", selectedLead.id);
      await updateDoc(leadDocRef, {
        status: "Converted" as LeadStatus,
        lastUpdated: serverTimestamp(),
      });
      
      toast({
        title: "Lead Converted",
        description: `${selectedLead.companyName} has been successfully converted to a customer.`,
      });

      setIsViewLeadDialogOpen(false); 
      fetchLeads(); 

    } catch (error) {
      console.error("Error converting lead to customer: ", error);
      toast({
        title: "Conversion Error",
        description: "Failed to convert lead to customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConvertingToCustomer(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    return leads.filter(lead =>
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);


  if (authLoading || (!userProfile && !isLoadingLeads)) { 
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading or verifying access...</p>
      </div>
    );
  }
  
  if (!authLoading && userProfile?.role !== "admin") {
     return (
      <div className="flex h-screen items-center justify-center">
        <p>Access Denied. You must be an admin to view this page.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Add Lead Dialog */}
      <Dialog open={isAddLeadDialogOpen} onOpenChange={setIsAddLeadDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the details for the new lead. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddLeadSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem> <FormLabel>Company Name</FormLabel> <FormControl><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Acme Corp" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="contactName" render={({ field }) => ( <FormItem> <FormLabel>Contact Name</FormLabel> <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. John Doe" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="e.g. john.doe@example.com" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone (Optional)</FormLabel> <FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="e.g. 555-123-4567" {...field} value={field.value ?? ""} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger className="rounded-md"><SelectValue placeholder="Select lead status" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="New">New</SelectItem> <SelectItem value="Contacted">Contacted</SelectItem> <SelectItem value="Qualified">Qualified</SelectItem> <SelectItem value="Lost">Lost</SelectItem> <SelectItem value="Converted">Converted</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="source" render={({ field }) => ( <FormItem> <FormLabel>Source</FormLabel> <FormControl><div className="relative"><LeadSourceIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Website, Referral" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Any additional notes about this lead..." {...field} value={field.value ?? ""} className="rounded-md" /></FormControl> <FormMessage /> </FormItem> )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsAddLeadDialogOpen(false); form.reset();}} className="rounded-md">Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-md">{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Lead"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Lead: {selectedLead?.companyName}</DialogTitle>
            <DialogDescription>Update the details for this lead. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditLeadSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
               <FormField control={editForm.control} name="companyName" render={({ field }) => ( <FormItem> <FormLabel>Company Name</FormLabel> <FormControl><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Acme Corp" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
               <FormField control={editForm.control} name="contactName" render={({ field }) => ( <FormItem> <FormLabel>Contact Name</FormLabel> <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. John Doe" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
               <FormField control={editForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="e.g. john.doe@example.com" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
               <FormField control={editForm.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone (Optional)</FormLabel> <FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="e.g. 555-123-4567" {...field} value={field.value ?? ""} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
               <FormField control={editForm.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger className="rounded-md"><SelectValue placeholder="Select lead status" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="New">New</SelectItem> <SelectItem value="Contacted">Contacted</SelectItem> <SelectItem value="Qualified">Qualified</SelectItem> <SelectItem value="Lost">Lost</SelectItem> <SelectItem value="Converted">Converted</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
               <FormField control={editForm.control} name="source" render={({ field }) => ( <FormItem> <FormLabel>Source</FormLabel> <FormControl><div className="relative"><LeadSourceIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Website, Referral" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
               <FormField control={editForm.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Any additional notes about this lead..." {...field} value={field.value ?? ""} className="rounded-md" /></FormControl> <FormMessage /> </FormItem> )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsEditLeadDialogOpen(false); setSelectedLead(null); }} className="rounded-md">Cancel</Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting} className="rounded-md">{editForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</> : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Lead Dialog */}
      <Dialog open={isViewLeadDialogOpen} onOpenChange={setIsViewLeadDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <Image 
                src={selectedLead?.logoUrl || `https://placehold.co/40x40.png?text=${selectedLead?.companyName?.substring(0,2)?.toUpperCase() || 'L'}`} 
                alt={selectedLead?.companyName || "Lead"} 
                width={32} height={32} 
                className="rounded-md mr-3 object-contain" 
                data-ai-hint={selectedLead?.dataAiHint || "company logo"}
              />
              {selectedLead?.companyName}
            </DialogTitle>
            <DialogDescription>Detailed information for this lead.</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p><strong className="text-muted-foreground">Contact:</strong></p><p>{selectedLead.contactName}</p>
                <p><strong className="text-muted-foreground">Email:</strong></p><p className="truncate">{selectedLead.email}</p>
                <p><strong className="text-muted-foreground">Phone:</strong></p><p>{selectedLead.phone || "N/A"}</p>
                <p><strong className="text-muted-foreground">Status:</strong></p><p><Badge variant={getStatusBadgeVariant(selectedLead.status)}>{selectedLead.status}</Badge></p>
                <p><strong className="text-muted-foreground">Source:</strong></p><p>{selectedLead.source}</p>
                <p><strong className="text-muted-foreground">Added:</strong></p><p>{selectedLead.dateAdded ? format(selectedLead.dateAdded.toDate(), "PPp") : 'N/A'}</p>
                <p><strong className="text-muted-foreground">Last Updated:</strong></p><p>{selectedLead.lastUpdated ? format(selectedLead.lastUpdated.toDate(), "PPp") : 'N/A'}</p>
              </div>
              
              {selectedLead.notes && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Notes:</h4>
                  <p className="text-sm bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              <Card className="mt-4 bg-card shadow-md rounded-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <BrainCircuit className="mr-2 h-5 w-5 text-primary" /> AI Lead Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLead.leadScore !== undefined && selectedLead.leadScore !== null ? (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 mr-2" />
                        <p className="text-xl font-bold text-primary">{selectedLead.leadScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span></p>
                      </div>
                      <p><strong className="text-muted-foreground">Qualification:</strong> {selectedLead.isQualified ? <Badge variant="outline" className="border-green-500 text-green-600">Qualified</Badge> : <Badge variant="destructive">Not Qualified</Badge>}</p>
                      <p><strong className="text-muted-foreground">Reason:</strong> {selectedLead.leadScoreReason}</p>
                      <Button variant="outline" size="sm" onClick={() => handleScoreLead()} disabled={isScoringLead} className="mt-2 rounded-md">
                        {isScoringLead ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Re-scoring...</> : <><RefreshCw className="mr-2 h-4 w-4" /> Re-Score Lead</>}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-muted-foreground mb-3">No AI score available for this lead yet.</p>
                      <Button onClick={() => handleScoreLead()} disabled={isScoringLead} className="rounded-md">
                        {isScoringLead ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring...</> : <><BrainCircuit className="mr-2 h-4 w-4" /> Score Lead with AI</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedLead.isQualified && selectedLead.status !== "Converted" && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={handleConvertToCustomer} 
                    disabled={isConvertingToCustomer} 
                    className="w-full rounded-md bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isConvertingToCustomer ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting...</> : <><UserCheck className="mr-2 h-4 w-4" /> Convert to Customer</>}
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewLeadDialogOpen(false)} className="rounded-md">Close</Button>
             <Button onClick={() => { if(selectedLead) { setIsViewLeadDialogOpen(false); handleEditLead(selectedLead); } }} disabled={selectedLead?.status === "Converted"} className="rounded-md">
                <Edit className="mr-2 h-4 w-4" /> Edit Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">Oversee and manage all potential client leads for Luxe Maintainance CRM.</p>
        </div>
        <div className="flex items-center gap-4">
             <div className="relative w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-md bg-card" 
                />
            </div>
            <Button onClick={() => { form.reset({ companyName: "", contactName: "", email: "", phone: "", status: "New", source: "", notes: "" }); setIsAddLeadDialogOpen(true);}} className="rounded-md">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Lead
            </Button>
        </div>
      </div>
      
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center text-xl">
            <Building className="mr-2 h-5 w-5 text-primary" /> Current Leads ({filteredLeads.length})
          </CardTitle>
          <CardDescription>View and manage incoming and ongoing leads in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingLeads ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading leads...</p>
            </div>
          ) : filteredLeads.length > 0 ? (
            <ul className="divide-y divide-border">
              {filteredLeads.map((lead) => (
                <li key={lead.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-4 flex-grow">
                    <Image 
                      src={lead.logoUrl || `https://placehold.co/40x40.png?text=${lead.companyName.substring(0,2).toUpperCase()}`} 
                      alt={lead.companyName} 
                      width={40} height={40} 
                      className="rounded-md object-contain" 
                      data-ai-hint={lead.dataAiHint || "company logo"}
                    />
                    <div className="flex-grow">
                      <p className="font-semibold text-primary">{lead.companyName}</p>
                      <p className="text-sm font-medium">{lead.contactName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{lead.email}{lead.phone && ` • ${lead.phone}`}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                     <Badge variant={getStatusBadgeVariant(lead.status)} className="mb-1 sm:mb-0 self-start sm:self-auto">{lead.status}</Badge>
                     <p className="text-xs text-muted-foreground">Source: {lead.source}</p>
                     <p className="text-xs text-muted-foreground">Added: {lead.dateAdded ? format(lead.dateAdded.toDate(), "PP") : 'N/A'}</p>
                  </div>
                   <div className="flex space-x-2 mt-2 sm:mt-0 sm:ml-4 self-start sm:self-auto flex-shrink-0 pt-2 sm:pt-0">
                        <Button variant="outline" size="sm" onClick={() => handleViewLead(lead)} className="rounded-md"> 
                            <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditLead(lead)} disabled={lead.status === "Converted"} className="rounded-md">
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                     </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Building className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No leads found{searchTerm && " matching your search"}.</p>
              {!searchTerm && <p className="mt-1 text-xs text-muted-foreground">Click "Add New Lead" to get started.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

