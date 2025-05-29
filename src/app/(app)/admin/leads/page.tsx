
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, PlusCircle, Edit, Eye, Mail, Phone, User, Briefcase as LeadSourceIcon } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Define Lead Status type
type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost";

// Mock data for leads - this will now be initial state
const initialLeads = [
  { 
    id: "1", 
    companyName: "Innovatech Solutions", 
    contactName: "Alex Green", 
    email: "alex.g@innovatech.com", 
    phone: "555-0101", 
    status: "New" as LeadStatus, 
    source: "Website Inquiry", 
    dateAdded: "2024-07-15", 
    logoUrl: "https://placehold.co/40x40.png?text=IS",
    dataAiHint: "company logo" 
  },
  { 
    id: "2", 
    companyName: "Quantum Dynamics", 
    contactName: "Brenda Miles", 
    email: "b.miles@quantumdyn.com", 
    phone: "555-0102", 
    status: "Contacted" as LeadStatus, 
    source: "Referral", 
    dateAdded: "2024-07-10", 
    logoUrl: "https://placehold.co/40x40.png?text=QD",
    dataAiHint: "technology firm"
  },
  { 
    id: "3", 
    companyName: "Synergy Corp", 
    contactName: "Carl Davis", 
    email: "carl.d@synergy.org", 
    phone: "555-0103", 
    status: "Qualified" as LeadStatus, 
    source: "Trade Show", 
    dateAdded: "2024-06-20", 
    logoUrl: "https://placehold.co/40x40.png?text=SC",
    dataAiHint: "business building"
  },
];

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  dateAdded: string;
  logoUrl: string;
  dataAiHint: string;
}

const leadSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  contactName: z.string().min(2, "Contact name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number seems too short.").optional(),
  status: z.enum(["New", "Contacted", "Qualified", "Lost"]),
  source: z.string().min(2, "Source must be at least 2 characters."),
});

const getStatusBadgeVariant = (status: LeadStatus) => {
  switch (status) {
    case "New":
      return "default";
    case "Contacted":
      return "secondary";
    case "Qualified":
      return "outline"; 
    case "Lost":
      return "destructive";
    default:
      return "default";
  }
};


export default function AdminLeadsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && userProfile?.role !== "admin") {
      router.push("/dashboard"); 
    }
  }, [userProfile, authLoading, router]);

  const form = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      status: "New",
      source: "",
    },
  });

  async function onAddLeadSubmit(values: z.infer<typeof leadSchema>) {
    const newLead: Lead = {
      id: (leads.length + 1).toString(), // Simple ID generation for mock data
      ...values,
      status: values.status as LeadStatus,
      dateAdded: new Date().toISOString().split("T")[0], // Today's date
      logoUrl: `https://placehold.co/40x40.png?text=${values.companyName.substring(0,2).toUpperCase()}`,
      dataAiHint: "company logo", // Generic hint for new leads
    };
    setLeads(prevLeads => [newLead, ...prevLeads]);
    toast({
      title: "Lead Added",
      description: `${values.companyName} has been successfully added.`,
    });
    form.reset();
    setIsAddLeadDialogOpen(false);
  }

  if (authLoading || userProfile?.role !== "admin") {
    return <p>Loading lead management or checking admin privileges...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">
            Oversee and manage all potential client leads for LuxeFlow.
          </p>
        </div>
        <Dialog open={isAddLeadDialogOpen} onOpenChange={setIsAddLeadDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddLeadDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Enter the details for the new lead below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddLeadSubmit)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. Acme Corp" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                         <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. John Doe" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="e.g. john.doe@example.com" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="tel" placeholder="e.g. 555-123-4567" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Qualified">Qualified</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LeadSourceIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. Website, Referral" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsAddLeadDialogOpen(false); form.reset();}}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Lead"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5 text-primary" />
            Current Leads ({leads.length})
          </CardTitle>
          <CardDescription>
            View and manage incoming and ongoing leads in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length > 0 ? (
            <ul className="space-y-4">
              {leads.map((lead) => (
                <li key={lead.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-4">
                    <Image 
                      src={lead.logoUrl} 
                      alt={lead.companyName} 
                      width={40} 
                      height={40} 
                      className="rounded-md object-contain" 
                      data-ai-hint={lead.dataAiHint}
                    />
                    <div>
                      <p className="font-semibold text-primary">{lead.companyName}</p>
                      <p className="text-sm font-medium">{lead.contactName}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}{lead.phone && ` • ${lead.phone}`}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0">
                     <Badge variant={getStatusBadgeVariant(lead.status)} className="mb-1 sm:mb-0 self-start sm:self-auto">{lead.status}</Badge>
                     <p className="text-xs text-muted-foreground">Source: {lead.source}</p>
                     <p className="text-xs text-muted-foreground">Added: {lead.dateAdded}</p>
                     <div className="flex space-x-2 mt-2 sm:mt-1 self-start sm:self-auto">
                        <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm">
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Building className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No leads found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Add New Lead" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
