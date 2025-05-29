
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
import { Wrench, PlusCircle, Eye, Edit, Trash2, User, CalendarDays, ListOrdered, Loader2, Search, Building, UserCheck, Save } from "lucide-react";
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
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, where, getDoc } from "firebase/firestore"; // Added getDoc
import { format, addDays } from "date-fns";
import type { UserProfile } from "@/types";
import type { Estimate } from "../estimates/page";
import { generateInvoiceNumber, type InvoiceStatus, type InvoiceLineItem } from "../invoices/page";

interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
}

interface Technician extends UserProfile {
  // UserProfile already covers uid, displayName, email, role
}

export type JobStatus = "Pending Schedule" | "Scheduled" | "Dispatched" | "In Progress" | "On Hold" | "Completed" | "Cancelled" | "Requires Follow-up";

const ALL_JOB_STATUSES: JobStatus[] = ["Pending Schedule", "Scheduled", "Dispatched", "In Progress", "On Hold", "Completed", "Cancelled", "Requires Follow-up"];

interface Job {
  id: string;
  jobNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  assignedTechnicianId?: string | null;
  technicianName?: string | null;
  description: string;
  status: JobStatus;
  dateCreated: Timestamp;
  scheduledDate?: Timestamp | null;
  completionDate?: Timestamp | null;
  notes?: string | null;
  internalNotes?: string | null;
  lastUpdated?: Timestamp;
  estimateId?: string | null;
  invoiceCreated?: boolean; // To track if an invoice has been created
}

const jobSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  assignedTechnicianId: z.string().optional().nullable(),
  description: z.string().min(5, "Description must be at least 5 characters."),
  status: z.enum(ALL_JOB_STATUSES),
  scheduledDate: z.date().optional().nullable(),
  completionDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  estimateId: z.string().optional().nullable(),
});

const technicianJobUpdateSchema = z.object({
    status: z.enum(ALL_JOB_STATUSES),
    notes: z.string().optional().nullable(),
});


const getStatusBadgeVariant = (status: JobStatus) => {
  switch (status) {
    case "Pending Schedule": return "secondary";
    case "Scheduled": return "default";
    case "Dispatched": return "outline";
    case "In Progress": return "default";
    case "On Hold": return "secondary";
    case "Completed": return "outline";
    case "Cancelled": return "destructive";
    case "Requires Follow-up": return "destructive";
    default: return "default";
  }
};

export const generateJobNumber = async (): Promise<string> => {
  const prefix = "JOB-";
  const datePart = format(new Date(), "yyyyMMdd");
  const jobsRef = collection(db, "jobs");
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

  const canManageJobs = userProfile?.role === "admin";

  useEffect(() => {
    if (!authLoading && userProfile && !["admin", "technician"].includes(userProfile.role)) {
      router.push("/dashboard");
    }
  }, [userProfile, authLoading, router]);

  const fetchCustomers = useCallback(async () => {
    if (userProfile?.role !== 'admin') {
      setCustomers([]);
      return;
    }
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
  }, [toast, userProfile]);

  const fetchTechnicians = useCallback(async () => {
    if (userProfile?.role !== 'admin') {
      setTechnicians([]);
      return;
    }
    try {
      const usersCollectionRef = collection(db, "users");
      // Fetch all users and filter/sort client-side to avoid composite index errors if not set up.
      // FOR PERFORMANCE: Create a composite index in Firestore: collection 'users', fields 'role' (asc) and 'displayName' (asc).
      const querySnapshot = await getDocs(usersCollectionRef);
      let fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as UserProfile));
      
      const fetchedTechnicians = fetchedUsers
        .filter(user => user.role === "technician")
        .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")) as Technician[];
      
      setTechnicians(fetchedTechnicians);
    } catch (error) {
      console.error("Error fetching technicians: ", error);
      toast({ title: "Error", description: "Failed to fetch technicians.", variant: "destructive" });
    }
  }, [toast, userProfile]);

  const fetchJobs = useCallback(async () => {
    if (!userProfile) return;

    setIsLoading(true);
    try {
      const jobsCollectionRef = collection(db, "jobs");
      let q;

      if (userProfile.role === 'admin') {
        q = query(jobsCollectionRef, orderBy("dateCreated", "desc"));
      } else if (userProfile.role === 'technician') {
        // Query only by assignedTechnicianId to avoid complex index requirements for now.
        // Sorting will be done client-side.
        // RECOMMENDED: Create a composite index in Firestore for jobs:
        // assignedTechnicianId (ASC), scheduledDate (DESC), dateCreated (DESC) for optimal performance.
        q = query(jobsCollectionRef, where("assignedTechnicianId", "==", userProfile.uid));
      } else {
        setJobs([]);
        setIsLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);
      let fetchedJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

      // Client-side sorting for technicians if composite index for sorting is not available
      if (userProfile.role === 'technician') {
        fetchedJobs.sort((a, b) => {
          // Sort by scheduledDate (descending, nulls last)
          if (a.scheduledDate && b.scheduledDate) {
            if (b.scheduledDate.toMillis() !== a.scheduledDate.toMillis()) {
              return b.scheduledDate.toMillis() - a.scheduledDate.toMillis();
            }
          } else if (a.scheduledDate) {
            return -1; // a comes first (b is null)
          } else if (b.scheduledDate) {
            return 1;  // b comes first (a is null)
          }

          // Then sort by dateCreated (descending)
          return b.dateCreated.toMillis() - a.dateCreated.toMillis();
        });
      }

      setJobs(fetchedJobs);
    } catch (error) {
      console.error("Error fetching jobs: ", error);
      toast({ title: "Error Fetching Jobs", description: "Failed to load jobs from Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, userProfile]);

  useEffect(() => {
    if (userProfile && ["admin", "technician"].includes(userProfile.role)) {
      if(canManageJobs) {
        fetchCustomers();
        fetchTechnicians();
      }
      fetchJobs();
    }
  }, [userProfile, fetchCustomers, fetchTechnicians, fetchJobs, canManageJobs]);

  const adminForm = useForm<z.infer<typeof jobSchema>>({
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

  const technicianUpdateForm = useForm<z.infer<typeof technicianJobUpdateSchema>>({
    resolver: zodResolver(technicianJobUpdateSchema),
    defaultValues: {
        status: "Pending Schedule",
        notes: "",
    }
  });

  const createInvoiceFromJob = async (job: Job, jobId: string) => {
    if (job.invoiceCreated) {
        toast({ title: "Info", description: "Invoice already created for this job.", variant: "default"});
        return;
    }
    try {
        const invoiceNumber = await generateInvoiceNumber();
        let lineItems: InvoiceLineItem[] = [];
        let taxRate = 0.0; // Default tax rate

        if (job.estimateId) {
            const estimateDocSnap = await getDoc(doc(db, "estimates", job.estimateId));
            if (estimateDocSnap.exists()) {
                const estimateData = estimateDocSnap.data() as Estimate;
                lineItems = estimateData.lineItems.map(li => ({
                    id: crypto.randomUUID(),
                    description: li.description,
                    quantity: li.quantity,
                    unitPrice: li.unitPrice,
                    totalPrice: li.totalPrice,
                }));
                taxRate = estimateData.taxRate;
            }
        }

        if (lineItems.length === 0) {
            lineItems.push({
                id: crypto.randomUUID(),
                description: job.description || `Services for job ${job.jobNumber}`,
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0
            });
        }

        const subtotal = lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        const newInvoiceData = {
            invoiceNumber,
            customerId: job.customerId,
            customerName: job.customerName,
            customerEmail: job.customerEmail || undefined,
            jobId: jobId,
            estimateId: job.estimateId || null,
            dateCreated: serverTimestamp(),
            dueDate: Timestamp.fromDate(addDays(new Date(), 30)),
            lineItems,
            subtotal,
            taxRate,
            taxAmount,
            totalAmount,
            status: "Draft" as InvoiceStatus,
            notes: `Invoice for completed job: ${job.jobNumber}`,
            lastUpdated: serverTimestamp(),
            paidAmount: 0,
            paymentDate: null,
        };

        await addDoc(collection(db, "invoices"), newInvoiceData);

        const jobDocRef = doc(db, "jobs", jobId);
        await updateDoc(jobDocRef, { invoiceCreated: true, lastUpdated: serverTimestamp() });

        toast({
            title: "Invoice Created",
            description: `Invoice ${invoiceNumber} automatically created for job ${job.jobNumber}. Please review and edit the invoice if necessary, especially line items and pricing.`,
            duration: 7000,
        });
        fetchJobs();
    } catch (error) {
        console.error("Error creating invoice from job: ", error);
        toast({ title: "Invoice Creation Error", description: "Failed to automatically create invoice.", variant: "destructive" });
    }
};


  async function onAdminSubmit(values: z.infer<typeof jobSchema>) {
    if (!canManageJobs) {
        toast({ title: "Unauthorized", description: "Only admins can create or edit jobs here.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    let finalJobData: Job;
    let jobIdToUpdate: string | undefined = selectedJob?.id;

    try {
      const selectedCustomerDoc = customers.find(c => c.id === values.customerId);
      if (!selectedCustomerDoc) {
        toast({ title: "Error", description: "Selected customer not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const selectedTechnicianDoc = values.assignedTechnicianId ? technicians.find(t => t.uid === values.assignedTechnicianId) : null;

      const jobDataForDb: Partial<Omit<Job, 'id' | 'jobNumber' | 'dateCreated' | 'lastUpdated' | 'invoiceCreated'>> & { lastUpdated?: Timestamp, dateCreated?: Timestamp, invoiceCreated?: boolean } = {
        customerId: selectedCustomerDoc.id,
        customerName: selectedCustomerDoc.companyName,
        customerEmail: selectedCustomerDoc.email || undefined,
        assignedTechnicianId: selectedTechnicianDoc?.uid || null,
        technicianName: selectedTechnicianDoc?.displayName || null,
        description: values.description,
        status: values.status,
        scheduledDate: values.scheduledDate ? Timestamp.fromDate(values.scheduledDate) : null,
        completionDate: values.status === "Completed" && (!selectedJob || selectedJob.status !== "Completed") ? serverTimestamp() as Timestamp : (values.completionDate ? Timestamp.fromDate(values.completionDate) : null),
        notes: values.notes || null,
        internalNotes: values.internalNotes || null,
        estimateId: values.estimateId || null,
      };

      if (selectedJob) {
        const jobDocRef = doc(db, "jobs", selectedJob.id);
        await updateDoc(jobDocRef, {...jobDataForDb, lastUpdated: serverTimestamp() as Timestamp});
        toast({ title: "Job Updated", description: `Job ${selectedJob.jobNumber} has been updated.` });
        finalJobData = { ...selectedJob, ...jobDataForDb, status: values.status, lastUpdated: Timestamp.now() };

      } else {
        const jobNumber = await generateJobNumber();
        const newJobDataWithTimestamps = {
            ...jobDataForDb,
            jobNumber,
            dateCreated: serverTimestamp() as Timestamp,
            lastUpdated: serverTimestamp() as Timestamp,
            invoiceCreated: false,
        }
        const docRef = await addDoc(collection(db, "jobs"), newJobDataWithTimestamps);
        jobIdToUpdate = docRef.id;
        toast({ title: "Job Created", description: `Job ${jobNumber} has been created.` });
        finalJobData = {
            ...newJobDataWithTimestamps,
            id: docRef.id,
            dateCreated: Timestamp.now(),
            lastUpdated: Timestamp.now(),
        } as Job;
      }

      if (values.status === "Completed" && jobIdToUpdate && (!selectedJob || selectedJob.status !== "Completed")) {
         if (!finalJobData.invoiceCreated) {
            await createInvoiceFromJob(finalJobData, jobIdToUpdate);
         }
      }

      adminForm.reset();
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
    if (!canManageJobs) return;
    setSelectedJob(jobToEdit || null);
    if (jobToEdit) {
      adminForm.reset({
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
      adminForm.reset();
    }
    setIsFormDialogOpen(true);
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    if (userProfile?.role === 'technician') {
        technicianUpdateForm.reset({
            status: job.status,
            notes: job.notes || "",
        });
    }
    setIsViewDialogOpen(true);
  };

  const handleTechnicianStatusUpdate = async (values: z.infer<typeof technicianJobUpdateSchema>) => {
    if (!selectedJob || userProfile?.role !== 'technician' || selectedJob.assignedTechnicianId !== userProfile.uid) {
        toast({ title: "Error", description: "Cannot update this job.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
        const jobDocRef = doc(db, "jobs", selectedJob.id);
        const updateData: Partial<Job> = {
            status: values.status,
            notes: values.notes || null,
            lastUpdated: serverTimestamp() as Timestamp,
        };
        if (values.status === "Completed" && selectedJob.status !== "Completed") {
            updateData.completionDate = serverTimestamp() as Timestamp;
        }

        await updateDoc(jobDocRef, updateData);
        toast({ title: "Job Status Updated", description: `Status for job ${selectedJob.jobNumber} updated to ${values.status}.`});

        const updatedJobInState = { ...selectedJob, ...updateData, lastUpdated: Timestamp.now(), completionDate: (values.status === "Completed" && !selectedJob.completionDate) ? Timestamp.now() : selectedJob.completionDate } as Job;
        setJobs(prevJobs => prevJobs.map(j => j.id === selectedJob.id ? updatedJobInState : j ));
        setSelectedJob(updatedJobInState);

        if (values.status === "Completed" && selectedJob.status !== "Completed") {
            if (!updatedJobInState.invoiceCreated) {
                await createInvoiceFromJob(updatedJobInState, selectedJob.id);
            }
        }
    } catch (error) {
        console.error("Error updating job status by technician:", error);
        toast({ title: "Update Error", description: "Failed to update job status.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDeleteJob = (job: Job) => {
    if (!canManageJobs) return;
    setJobToDelete(job);
  };

  async function confirmDeleteJob() {
    if (!jobToDelete || !canManageJobs) return;
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

  return (
    <div className="space-y-6">
      {canManageJobs && (
      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { setIsFormDialogOpen(isOpen); if (!isOpen) setSelectedJob(null); }}>
        <DialogTrigger asChild>
            <Button onClick={() => handleOpenFormDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Job
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJob ? "Edit Job" : "Create New Job"} {selectedJob?.jobNumber && `(${selectedJob.jobNumber})`}</DialogTitle>
            <DialogDescription>
              {selectedJob ? "Update the details for this job." : "Fill in the details to create a new job."}
            </DialogDescription>
          </DialogHeader>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-2">
              <FormField control={adminForm.control} name="customerId" render={({ field }) => (
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
                          <div key={customer.id} onClick={() => {adminForm.setValue("customerId", customer.id, {shouldValidate: true}); (document.activeElement as HTMLElement)?.blur(); }}
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

              <FormField control={adminForm.control} name="assignedTechnicianId" render={({ field }) => (
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
                        <div onClick={() => {adminForm.setValue("assignedTechnicianId", null, {shouldValidate: true}); (document.activeElement as HTMLElement)?.blur(); }}
                             className="cursor-pointer p-2 hover:bg-accent hover:text-accent-foreground text-muted-foreground italic">
                            None
                        </div>
                        {technicians.map(tech => (
                          <div key={tech.uid} onClick={() => {adminForm.setValue("assignedTechnicianId", tech.uid, {shouldValidate: true}); (document.activeElement as HTMLElement)?.blur(); }}
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

              <FormField control={adminForm.control} name="description" render={({ field }) => (
                <FormItem> <FormLabel>Job Description</FormLabel> <FormControl><Textarea placeholder="Detailed description of the work to be done..." {...field} /></FormControl> <FormMessage /> </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={adminForm.control} name="status" render={({ field }) => (
                    <FormItem> <FormLabel>Status</FormLabel>
                        <ShadSelect onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select job status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {ALL_JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </ShadSelect>
                    <FormMessage /> </FormItem>
                )} />
                <FormField control={adminForm.control} name="scheduledDate" render={({ field }) => (
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
               <FormField control={adminForm.control} name="estimateId" render={({ field }) => ( <FormItem> <FormLabel>Related Estimate ID (Optional)</FormLabel> <FormControl><Input placeholder="e.g., EST-20230101-001" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )} />

              <FormField control={adminForm.control} name="notes" render={({ field }) => (
                <FormItem> <FormLabel>Customer Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Notes visible to the customer..." {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
              )} />
              {canManageJobs &&
                <FormField control={adminForm.control} name="internalNotes" render={({ field }) => (
                  <FormItem> <FormLabel>Internal Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Internal notes for staff and technicians..." {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
                )} />
              }

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
      )}

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
                {selectedJob.invoiceCreated && <><strong className="text-muted-foreground">Invoice Created:</strong><p className="text-green-600">Yes</p></>}
              </div>

              <div>
                <h4 className="font-semibold text-muted-foreground mb-1">Description:</h4>
                <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedJob.description}</p>
              </div>

              {userProfile?.role === 'technician' && selectedJob.assignedTechnicianId === userProfile.uid && (
                 <Form {...technicianUpdateForm}>
                    <form onSubmit={technicianUpdateForm.handleSubmit(handleTechnicianStatusUpdate)} className="space-y-3 pt-3 border-t">
                         <h4 className="font-semibold text-muted-foreground">Update Job Status</h4>
                         <FormField
                            control={technicianUpdateForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>New Status</FormLabel>
                                <ShadSelect onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select new status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {ALL_JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </ShadSelect>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={technicianUpdateForm.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Update Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Add any notes about this status update..." {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting || (selectedJob.status === 'Completed' && selectedJob.invoiceCreated) } size="sm">
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Status...</> : <><Save className="mr-2 h-4 w-4" />Save Status Update</>}
                        </Button>
                    </form>
                 </Form>
              )}

              {selectedJob.notes && (!technicianUpdateForm.getValues("notes") || userProfile?.role === 'admin') && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 mt-3">Customer Notes:</h4>
                  <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedJob.notes}</p>
                </div>
              )}

              {canManageJobs && selectedJob.internalNotes && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 mt-3">Internal Notes:</h4>
                  <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{selectedJob.internalNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            {canManageJobs && selectedJob &&
              <Button onClick={() => { setIsViewDialogOpen(false); handleOpenFormDialog(selectedJob); }} disabled={selectedJob.status === 'Completed' && selectedJob.invoiceCreated}>
                  <Edit className="mr-2 h-4 w-4" /> Edit Job
              </Button>
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManageJobs && (
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
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {userProfile?.role === 'admin' ? "Job Management" : "My Assigned Jobs"}
          </h1>
          <p className="text-muted-foreground">
            {userProfile?.role === 'admin' ? "Oversee and manage all service jobs." : "View and manage your assigned service jobs."}
          </p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="mr-2 h-5 w-5 text-primary" />
            {userProfile?.role === 'admin' ? `Current Jobs (${jobs.length})` : `My Jobs (${jobs.length})`}
          </CardTitle>
          <CardDescription>
            {userProfile?.role === 'admin' ? "Browse and manage all service jobs in the system." : "Details of jobs assigned to you."}
          </CardDescription>
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
                    {userProfile?.role === 'admin' &&
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Technician</th>
                    }
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
                      {userProfile?.role === 'admin' &&
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{job.technicianName || "N/A"}</td>
                      }
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{job.scheduledDate ? format(job.scheduledDate.toDate(), "PP") : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewJob(job)}><Eye className="mr-1 h-3 w-3" /> View</Button>
                        {canManageJobs && (
                          <>
                          <Button variant="outline" size="sm" onClick={() => handleOpenFormDialog(job)} disabled={job.status === 'Completed' && job.invoiceCreated}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteJob(job)} disabled={job.status === 'Completed' && job.invoiceCreated}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
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
              {userProfile?.role === 'technician' && <p className="mt-1 text-xs text-muted-foreground">You currently have no jobs assigned to you.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
