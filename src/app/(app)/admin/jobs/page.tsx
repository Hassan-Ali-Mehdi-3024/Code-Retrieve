
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, PlusCircle, Eye, Edit, Trash2, User, CalendarDays, ListOrdered, Loader2, Search, Building, UserCheck } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { format } from "date-fns";
import type { UserProfile } from "@/types";

interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
}

interface Technician extends UserProfile {
  // UserProfile already covers uid, displayName, email, role
}

type JobStatus = "Pending Schedule" | "Scheduled" | "Dispatched" | "In Progress" | "On Hold" | "Completed" | "Cancelled" | "Requires Follow-up";

interface Job {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string; // Denormalized
  customerEmail?: string; // Denormalized
  assignedTechnicianId?: string | null;
  technicianName?: string | null; // Denormalized
  description: string;
  status: JobStatus;
  dateCreated: Timestamp;
  scheduledDate?: Timestamp | null;
  completionDate?: Timestamp | null;
  notes?: string | null;
  internalNotes?: string | null;
  lastUpdated?: Timestamp;
  estimateId?: string | null; // Optional link to an estimate
}

const jobSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  assignedTechnicianId: z.string().optional().nullable(),
  description: z.string().min(5, "Description must be at least 5 characters."),
  status: z.enum(["Pending Schedule", "Scheduled", "Dispatched", "In Progress", "On Hold", "Completed", "Cancelled", "Requires Follow-up"]),
  scheduledDate: z.date().optional().nullable(),
  completionDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  estimateId: z.string().optional().nullable(),
});

const getStatusBadgeVariant = (status: JobStatus) => {
  switch (status) {
    case "Pending Schedule": return "secondary";
    case "Scheduled": return "default";
    case "Dispatched": return "outline";
    case "In Progress": return "default"; // consider a specific color
    case "On Hold": return "secondary";
    case "Completed": return "outline"; // success variant
    case "Cancelled": return "destructive";
    case "Requires Follow-up": return "destructive"; // or warning
    default: return "default";
  }
};

const generateJobNumber = async (): Promise<string> => {
  const prefix = "JOB-";
  const datePart = format(new Date(), "yyyyMMdd");
  const jobsRef = collection(db, "jobs");
  // A more robust counter would involve a server-side transaction or a dedicated counter document.
  // For simplicity, we'll count existing jobs for the day.
  const todayStart = new Timestamp(Math.floor(new Date().setHours(0,0,0,0) / 1000), 0);
  const q = query(jobsRef, where("dateCreated", ">=", todayStart));

  const snapshot = await getDocs(q);
  const count = snapshot.size + 1; 
  return `${prefix}${datePart}-${String(count).padStart(3, '0')}`;
};

export default function AdminJobsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  useEffect(() => {
    if (!authLoading && userProfile && !["admin", "technician"].includes(userProfile.role)) {
      router.push("/dashboard");
    }
  }, [userProfile, authLoading, router]);

  const fetchCustomers = useCallback(async () => {
    try {
      const customersCollectionRef = collection(db, "customers");
      const q = query(customersCollectionRef, orderBy("companyName", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedCustomers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({ title: "Error", description: "Failed to fetch customers.", variant: "destructive" });
    }
  }, [toast]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, where("role", "==", "technician"), orderBy("displayName", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedTechnicians = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
      setTechnicians(fetchedTechnicians);
    } catch (error) {
      console.error("Error fetching technicians: ", error);
      toast({ title: "Error", description: "Failed to fetch technicians.", variant: "destructive" });
    }
  }, [toast]);
  
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobsCollectionRef = collection(db, "jobs");
      const q = query(jobsCollectionRef, orderBy("dateCreated", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
      setJobs(fetchedJobs);
    } catch (error) {
      console.error("Error fetching jobs: ", error);
      toast({ title: "Error Fetching Jobs", description: "Failed to load jobs from Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile && ["admin", "technician"].includes(userProfile.role)) {
      fetchCustomers();
      fetchTechnicians();
      fetchJobs();
    }
  }, [userProfile, fetchCustomers, fetchTechnicians, fetchJobs]);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customerId: "",
      assignedTechnicianId: "",
      description: "",
      status: "Pending Schedule",
      scheduledDate: null,
      completionDate: null,
      notes: "",
      internalNotes: "",
      estimateId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof jobSchema>) {
    setIsSubmitting(true);
    try {
      const selectedCustomerDoc = customers.find(c => c.id === values.customerId);
      if (!selectedCustomerDoc) {
        toast({ title: "Error", description: "Selected customer not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const selectedTechnicianDoc = values.assignedTechnicianId ? technicians.find(t => t.uid === values.assignedTechnicianId) : null;

      const jobDataForDb = {
        customerId: selectedCustomerDoc.id,
        customerName: selectedCustomerDoc.companyName,
        customerEmail: selectedCustomerDoc.email || undefined,
        assignedTechnicianId: selectedTechnicianDoc?.uid || null,
        technicianName: selectedTechnicianDoc?.displayName || null,
        description: values.description,
        status: values.status,
        scheduledDate: values.scheduledDate ? Timestamp.fromDate(values.scheduledDate) : null,
        completionDate: values.completionDate ? Timestamp.fromDate(values.completionDate) : null,
        notes: values.notes || null,
        internalNotes: values.internalNotes || null,
        estimateId: values.estimateId || null,
      };

      if (selectedJob) { // Editing
        const jobDocRef = doc(db, "jobs", selectedJob.id);
        await updateDoc(jobDocRef, { ...jobDataForDb, lastUpdated: serverTimestamp() as Timestamp }); 
        toast({ title: "Job Updated", description: `Job ${selectedJob.jobNumber} has been updated.` });
      } else { // Adding
        const jobNumber = await generateJobNumber();
        const newJobData = {
            ...jobDataForDb,
            jobNumber,
            dateCreated: serverTimestamp() as Timestamp,
            lastUpdated: serverTimestamp() as Timestamp,
        }
        const jobsCollectionRef = collection(db, "jobs");
        await addDoc(jobsCollectionRef, newJobData);
        toast({ title: "Job Created", description: `Job ${jobNumber} has been created.` });
      }
      
      form.reset();
      setIsFormDialogOpen(false);
      setSelectedJob(null);
      fetchJobs();
    } catch (error) {
      console.error("Error saving job: ", error);
      toast({ title: "Error Saving Job", description: "Failed to save job. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleOpenFormDialog = (jobToEdit?: Job) => {
    setSelectedJob(jobToEdit || null);
    if (jobToEdit) {
      form.reset({
        customerId: jobToEdit.customerId,
        assignedTechnicianId: jobToEdit.assignedTechnicianId || "",
        description: jobToEdit.description,
        status: jobToEdit.status,
        scheduledDate: jobToEdit.scheduledDate ? jobToEdit.scheduledDate.toDate() : null,
        completionDate: jobToEdit.completionDate ? jobToEdit.completionDate.toDate() : null,
        notes: jobToEdit.notes || "",
        internalNotes: jobToEdit.internalNotes || "",
        estimateId: jobToEdit.estimateId || "",
      });
    } else {
      form.reset({ 
        customerId: "",
        assignedTechnicianId: "",
        description: "",
        status: "Pending Schedule",
        scheduledDate: null,
        completionDate: null,
        notes: "",
        internalNotes: "",
        estimateId: "",
      });
    }
    setIsFormDialogOpen(true);
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setIsViewDialogOpen(true);
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
  };

  async function confirmDeleteJob() {
    if (!jobToDelete) return;
    setIsSubmitting(true);
    try {
      const jobDocRef = doc(db, "jobs", jobToDelete.id);
      await deleteDoc(jobDocRef);
      toast({ title: "Job Deleted", description: `Job ${jobToDelete.jobNumber} has been deleted.` });
      setJobToDelete(null);
      fetchJobs();
    } catch (error) {
      console.error("Error deleting job: ", error);
      toast({ title: "Error Deleting Job", description: "Failed to delete job. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || !userProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }
  if (!["admin", "technician"].includes(userProfile.role)) {
    return <div className="flex h-screen items-center justify-center"><p>Access Denied.</p></div>;
  }
  
  // Technicians might have a filtered view or different capabilities later
  const canManageJobs = userProfile.role === "admin";


  return (
    <div className="space-y-6">
      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { setIsFormDialogOpen(isOpen); if (!isOpen) setSelectedJob(null); }}>
        <DialogTrigger asChild>
          {canManageJobs && (
            <Button onClick={() => handleOpenFormDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Job
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJob ? "Edit Job" : "Create New Job"} {selectedJob?.jobNumber && `(${selectedJob.jobNumber})`}</DialogTitle>
            <DialogDescription>
              {selectedJob ? "Update the details for this job." : "Fill in the details to create a new job."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-2">
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                          {field.value ? customers.find(c => c.id === field.value)?.companyName : "Select customer"}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto p-0">
                        {customers.map(customer => (
                          <div key={customer.id} onClick={() => {form.setValue("customerId", customer.id, {shouldValidate: true}); (document.activeElement as HTMLElement)?.blur(); }}
                               className="cursor-pointer p-2 hover:bg-accent hover:text-accent-foreground">
                            {customer.companyName} ({customer.contactName})
                          </div>
                        ))}
                        {customers.length === 0 && <p className="p-2 text-sm text-muted-foreground">No customers found.</p>}
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="assignedTechnicianId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Technician (Optional)</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                          {field.value ? technicians.find(t => t.uid === field.value)?.displayName : "Select technician"}
                          <UserCheck className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] overflow-y-auto p-0">
                        <div onClick={() => {form.setValue("assignedTechnicianId", null, {shouldValidate: true}); (document.activeElement as HTMLElement)?.blur(); }}
                             className="cursor-pointer p-2 hover:bg-accent hover:text-accent-foreground text-muted-foreground italic">
                            None
                        </div>
                        {technicians.map(tech => (
                          <div key={tech.uid} onClick={() => {form.setValue("assignedTechnicianId", tech.uid, {shouldValidate: true}); (document.activeElement as HTMLElement)?.blur(); }}
                               className="cursor-pointer p-2 hover:bg-accent hover:text-accent-foreground">
                            {tech.displayName}
                          </div>
                        ))}
                        {technicians.length === 0 && <p className="p-2 text-sm text-muted-foreground">No technicians found.</p>}
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem> <FormLabel>Job Description</FormLabel> <FormControl><Textarea placeholder="Detailed description of the work to be done..." {...field} /></FormControl> <FormMessage /> </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem> <FormLabel>Status</FormLabel> 
                        <select onChange={field.onChange} value={field.value} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            {(["Pending Schedule", "Scheduled", "Dispatched", "In Progress", "On Hold", "Completed", "Cancelled", "Requires Follow-up"] as JobStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    <FormMessage /> </FormItem>
                )} />
                <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Scheduled Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); (document.activeElement as HTMLElement)?.blur();}} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
               <FormField control={form.control} name="estimateId" render={({ field }) => ( <FormItem> <FormLabel>Related Estimate ID (Optional)</FormLabel> <FormControl><Input placeholder="e.g., EST-20230101-001" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem> <FormLabel>Customer Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Notes visible to the customer..." {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="internalNotes" render={({ field }) => (
                <FormItem> <FormLabel>Internal Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Internal notes for staff and technicians..." {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {setIsFormDialogOpen(false); setSelectedJob(null);}}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (selectedJob ? "Save Changes" : "Create Job")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={(isOpen) => { setIsViewDialogOpen(isOpen); if (!isOpen) setSelectedJob(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Wrench className="mr-2 h-6 w-6 text-primary" />
              Job Details: {selectedJob?.jobNumber}
            </DialogTitle>
            <DialogDescription>
              For: {selectedJob?.customerName} {selectedJob?.customerEmail && `(${selectedJob.customerEmail})`}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <strong className="text-muted-foreground">Status:</strong><p><Badge variant={getStatusBadgeVariant(selectedJob.status)}>{selectedJob.status}</Badge></p>
                <strong className="text-muted-foreground">Technician:</strong><p>{selectedJob.technicianName || "Not Assigned"}</p>
                <strong className="text-muted-foreground">Scheduled:</strong><p>{selectedJob.scheduledDate ? format(selectedJob.scheduledDate.toDate(), "PPp") : 'Not Scheduled'}</p>
                <strong className="text-muted-foreground">Completed:</strong><p>{selectedJob.completionDate ? format(selectedJob.completionDate.toDate(), "PPp") : 'Not Completed'}</p>
                <strong className="text-muted-foreground">Created:</strong><p>{selectedJob.dateCreated ? format(selectedJob.dateCreated.toDate(), "PP") : 'N/A'}</p>
                <strong className="text-muted-foreground">Last Updated:</strong><p>{selectedJob.lastUpdated ? format(selectedJob.lastUpdated.toDate(), "PPp") : 'N/A'}</p>
                {selectedJob.estimateId && <><strong className="text-muted-foreground">Estimate ID:</strong><p>{selectedJob.estimateId}</p></>}
              </div>
              
              <div>
                <h4 className="font-semibold text-muted-foreground mb-1">Description:</h4>
                <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedJob.description}</p>
              </div>

              {selectedJob.notes && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Customer Notes:</h4>
                  <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedJob.notes}</p>
                </div>
              )}
              {selectedJob.internalNotes && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Internal Notes:</h4>
                  <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedJob.internalNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            {canManageJobs && 
              <Button onClick={() => { if(selectedJob) { setIsViewDialogOpen(false); handleOpenFormDialog(selectedJob); } }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Job
              </Button>
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete job '{jobToDelete?.jobNumber}'. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJobToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteJob}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
          <p className="text-muted-foreground">Oversee and manage all service jobs.</p>
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="mr-2 h-5 w-5 text-primary" />
            Current Jobs ({jobs.length})
          </CardTitle>
          <CardDescription>Browse and manage all service jobs in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading jobs...</p>
            </div>
          ) : jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job #</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Technician</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Scheduled Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">{job.jobNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{job.customerName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{job.technicianName || "N/A"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{job.scheduledDate ? format(job.scheduledDate.toDate(), "PP") : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewJob(job)}><Eye className="mr-1 h-3 w-3" /> View</Button>
                        {canManageJobs && (
                          <>
                          <Button variant="outline" size="sm" onClick={() => handleOpenFormDialog(job)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteJob(job)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No jobs found.</p>
              {canManageJobs && <p className="mt-1 text-xs text-muted-foreground">Click "Create New Job" to get started.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
