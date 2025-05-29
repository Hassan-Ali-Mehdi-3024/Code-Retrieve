
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
import { Receipt, PlusCircle, Eye, Edit, Trash2, DollarSign, CalendarDays, Loader2, Search, Printer } from "lucide-react";
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
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, where } from "firebase/firestore";
import { format, addDays } from "date-fns";
import type { UserProfile } from "@/types";

interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Partially Paid" | "Overdue" | "Void";
const ALL_INVOICE_STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Partially Paid", "Overdue", "Void"];

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  jobId?: string | null;
  estimateId?: string | null;
  dateCreated: Timestamp;
  dueDate: Timestamp;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number; // e.g., 0.08 for 8%
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes?: string | null;
  lastUpdated?: Timestamp;
  paidAmount?: number;
  paymentDate?: Timestamp | null;
}

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  dueDate: z.date({ required_error: "Due date is required." }),
  status: z.enum(ALL_INVOICE_STATUSES),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  taxRate: z.coerce.number().min(0, "Tax rate cannot be negative.").max(1, "Tax rate (0.0 to 1.0)."),
  notes: z.string().optional().nullable(),
  paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative.").optional().nullable(),
  paymentDate: z.date().optional().nullable(),
  jobId: z.string().optional().nullable(),
  estimateId: z.string().optional().nullable(),
});

const getStatusBadgeVariant = (status: InvoiceStatus) => {
  switch (status) {
    case "Draft": return "secondary";
    case "Sent": return "default";
    case "Paid": return "outline"; // Success
    case "Partially Paid": return "default"; // Info
    case "Overdue": return "destructive";
    case "Void": return "destructive";
    default: return "default";
  }
};

export const generateInvoiceNumber = async (): Promise<string> => {
  const prefix = "INV-";
  const datePart = format(new Date(), "yyyyMMdd");
  const invoicesRef = collection(db, "invoices");
  // Query for invoices created today to get a daily sequence
  const todayStart = new Timestamp(Math.floor(new Date().setHours(0,0,0,0) / 1000), 0);
  const q = query(invoicesRef, where("dateCreated", ">=", todayStart));
  
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1; // Increment based on today's count
  return `${prefix}${datePart}-${String(count).padStart(3, '0')}`;
};


export default function AdminInvoicesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const canManageInvoices = userProfile?.role === "admin"; // Only admins for now

  useEffect(() => {
    if (!authLoading && userProfile && !canManageInvoices) {
      router.push("/dashboard");
    }
  }, [userProfile, authLoading, router, canManageInvoices]);

  const fetchCustomers = useCallback(async () => {
    if (!canManageInvoices) return;
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
  }, [toast, canManageInvoices]);

  const fetchInvoices = useCallback(async () => {
    if (!canManageInvoices) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesCollectionRef = collection(db, "invoices");
      const q = query(invoicesCollectionRef, orderBy("dateCreated", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedInvoices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error("Error fetching invoices: ", error);
      toast({ title: "Error Fetching Invoices", description: "Failed to load invoices.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, canManageInvoices]);

  useEffect(() => {
    if (userProfile && canManageInvoices) {
      fetchCustomers();
      fetchInvoices();
    }
  }, [userProfile, canManageInvoices, fetchCustomers, fetchInvoices]);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: "",
      dueDate: addDays(new Date(), 30),
      status: "Draft",
      lineItems: [{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }],
      taxRate: 0.0,
      notes: "",
      paidAmount: 0,
      paymentDate: null,
      jobId: null,
      estimateId: null,
    },
  });

  const watchedLineItemsForm = form.watch("lineItems") || [];
  const lineItemFields = watchedLineItemsForm.map((item, index) => ({ ...item, id: item.id || crypto.randomUUID(), _formIndex: index }));

  const appendLineItem = (item: Omit<InvoiceLineItem, 'totalPrice' | 'id'>) => {
    const currentItems = form.getValues('lineItems') || [];
    form.setValue('lineItems', [...currentItems, { ...item, id: crypto.randomUUID(), totalPrice: item.quantity * item.unitPrice }]);
  };

  const removeLineItem = (index: number) => {
    const currentItems = form.getValues('lineItems') || [];
    form.setValue('lineItems', currentItems.filter((_, i) => i !== index));
  };
  
  const updateLineItem = (index: number, updatedValues: Partial<Omit<InvoiceLineItem, 'id' | 'totalPrice'>>) => {
    const currentItems = form.getValues('lineItems') || [];
    const updatedItems = [...currentItems];
    if (updatedItems[index]) {
        const currentItem = updatedItems[index];
        updatedItems[index] = {
            ...currentItem,
            ...updatedValues,
            quantity: updatedValues.quantity !== undefined ? Number(updatedValues.quantity) : Number(currentItem.quantity),
            unitPrice: updatedValues.unitPrice !== undefined ? Number(updatedValues.unitPrice) : Number(currentItem.unitPrice),
        } as InvoiceLineItem; 
        updatedItems[index].totalPrice = (updatedItems[index].quantity || 0) * (updatedItems[index].unitPrice || 0);
        form.setValue('lineItems', updatedItems, { shouldValidate: true, shouldDirty: true });
    }
  };

  const calculateTotals = (lineItems: Omit<InvoiceLineItem, 'id' | 'totalPrice'>[], taxRate: number) => {
    const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  async function onSubmit(values: z.infer<typeof invoiceSchema>) {
    if (!canManageInvoices) return;
    setIsSubmitting(true);
    try {
      const selectedCustomerDoc = customers.find(c => c.id === values.customerId);
      if (!selectedCustomerDoc) {
        toast({ title: "Error", description: "Selected customer not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const validLineItems = values.lineItems.map(li => ({
        id: li.id || crypto.randomUUID(),
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.quantity) * Number(li.unitPrice)
      }));
      
      const totals = calculateTotals(validLineItems, Number(values.taxRate));
      
      const invoiceDataForDb = {
        customerId: selectedCustomerDoc.id,
        customerName: selectedCustomerDoc.companyName,
        customerEmail: selectedCustomerDoc.email || undefined,
        dueDate: Timestamp.fromDate(values.dueDate),
        status: values.status,
        lineItems: validLineItems,
        subtotal: totals.subtotal,
        taxRate: Number(values.taxRate),
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes: values.notes || null,
        paidAmount: values.paidAmount ? Number(values.paidAmount) : 0,
        paymentDate: values.paymentDate ? Timestamp.fromDate(values.paymentDate) : null,
        jobId: values.jobId || null,
        estimateId: values.estimateId || null,
      };

      if (selectedInvoice) {
        const invoiceDocRef = doc(db, "invoices", selectedInvoice.id);
        await updateDoc(invoiceDocRef, { ...invoiceDataForDb, lastUpdated: serverTimestamp() as Timestamp }); 
        toast({ title: "Invoice Updated", description: `Invoice ${selectedInvoice.invoiceNumber} has been updated.` });
      } else {
        const invoiceNumber = await generateInvoiceNumber();
        const newInvoiceData = {
            ...invoiceDataForDb,
            invoiceNumber,
            dateCreated: serverTimestamp() as Timestamp,
            lastUpdated: serverTimestamp() as Timestamp,
        }
        await addDoc(collection(db, "invoices"), newInvoiceData);
        toast({ title: "Invoice Created", description: `Invoice ${invoiceNumber} has been created.` });
      }
      
      form.reset();
      setIsFormDialogOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error("Error saving invoice: ", error);
      toast({ title: "Error Saving Invoice", description: "Failed to save invoice.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleOpenFormDialog = (invoiceToEdit?: Invoice) => {
    if (!canManageInvoices) return;
    setSelectedInvoice(invoiceToEdit || null);
    if (invoiceToEdit) {
      form.reset({
        customerId: invoiceToEdit.customerId,
        dueDate: invoiceToEdit.dueDate.toDate(),
        status: invoiceToEdit.status,
        lineItems: invoiceToEdit.lineItems.map(li => ({...li, id: li.id || crypto.randomUUID(), unitPrice: Number(li.unitPrice), quantity: Number(li.quantity) })), 
        taxRate: invoiceToEdit.taxRate,
        notes: invoiceToEdit.notes || "",
        paidAmount: invoiceToEdit.paidAmount || 0,
        paymentDate: invoiceToEdit.paymentDate ? invoiceToEdit.paymentDate.toDate() : null,
        jobId: invoiceToEdit.jobId || null,
        estimateId: invoiceToEdit.estimateId || null,
      });
    } else {
      form.reset(); // Resets to defaultValues
    }
    setIsFormDialogOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewDialogOpen(true);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (!canManageInvoices) return;
    setInvoiceToDelete(invoice);
  };

  async function confirmDeleteInvoice() {
    if (!invoiceToDelete || !canManageInvoices) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "invoices", invoiceToDelete.id));
      toast({ title: "Invoice Deleted", description: `Invoice ${invoiceToDelete.invoiceNumber} has been deleted.` });
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice: ", error);
      toast({ title: "Error Deleting Invoice", description: "Failed to delete invoice.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const watchedFormLineItems = form.watch("lineItems") || [];
  const watchedFormTaxRate = form.watch("taxRate");

  const currentSubtotal = React.useMemo(() => {
    return watchedFormLineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
  }, [watchedFormLineItems]);

  const currentTaxAmount = React.useMemo(() => {
    return currentSubtotal * (Number(watchedFormTaxRate) || 0);
  }, [currentSubtotal, watchedFormTaxRate]);

  const currentTotalAmount = React.useMemo(() => {
    return currentSubtotal + currentTaxAmount;
  }, [currentSubtotal, currentTaxAmount]);


  if (authLoading || !userProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }
  if (!canManageInvoices) {
    return <div className="flex h-screen items-center justify-center"><p>Access Denied.</p></div>;
  }

  return (
    <div className="space-y-6">
      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { setIsFormDialogOpen(isOpen); if (!isOpen) setSelectedInvoice(null); }}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenFormDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedInvoice ? "Edit Invoice" : "Create New Invoice"} {selectedInvoice?.invoiceNumber && `(${selectedInvoice.invoiceNumber})`}</DialogTitle>
            <DialogDescription>
              {selectedInvoice ? "Update invoice details." : "Fill in details to create a new invoice."}
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
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
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
                 <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem> <FormLabel>Status</FormLabel> 
                        <ShadSelect onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>{ALL_INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </ShadSelect>
                    <FormMessage /> </FormItem>
                )} />
              </div>

              <div className="space-y-3">
                <FormLabel>Line Items</FormLabel>
                {lineItemFields.map((item, index) => (
                  <Card key={item.id || index} className="p-3 bg-muted/30 relative">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (
                        <FormItem className="col-span-5">
                          {index === 0 && <FormLabel className="text-xs">Description</FormLabel>}
                          <FormControl><Input placeholder="Service or item" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (
                        <FormItem className="col-span-2">
                           {index === 0 && <FormLabel className="text-xs">Qty</FormLabel>}
                          <FormControl><Input type="number" placeholder="1" {...field} onChange={e => { field.onChange(e); updateLineItem(index, { quantity: parseFloat(e.target.value) || 0 }) }} /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )} />
                       <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                        <FormItem className="col-span-2">
                           {index === 0 && <FormLabel className="text-xs">Unit Price</FormLabel>}
                          <FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => { field.onChange(e); updateLineItem(index, { unitPrice: parseFloat(e.target.value) || 0 }) }} /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )} />
                      <div className="col-span-2 flex items-center">
                        <p className="text-sm font-medium w-full text-right pr-1">
                          {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center">
                        {lineItemFields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeLineItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendLineItem({ description: "", quantity: 1, unitPrice: 0 })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Line Item
                </Button>
                 {form.formState.errors.lineItems && <FormMessage>{(form.formState.errors.lineItems as any).message || (form.formState.errors.lineItems.root?.message)}</FormMessage>}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                 <FormField control={form.control} name="taxRate" render={({ field }) => (
                  <FormItem> <FormLabel>Tax Rate (e.g., 0.08)</FormLabel>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl><Input type="number" step="0.001" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="pl-10"/></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-1 text-sm text-right">
                  <p>Subtotal: <span className="font-medium">${currentSubtotal.toFixed(2)}</span></p>
                  <p>Tax ({((Number(watchedFormTaxRate) || 0) * 100).toFixed(1)}%): <span className="font-medium">${currentTaxAmount.toFixed(2)}</span></p>
                  <p className="text-lg font-bold">Total: <span className="font-medium">${currentTotalAmount.toFixed(2)}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="paidAmount" render={({ field }) => (
                    <FormItem> <FormLabel>Amount Paid (Optional)</FormLabel> 
                    <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
                )} />
                <FormField control={form.control} name="paymentDate" render={({ field }) => (
                    <FormItem className="flex flex-col"> <FormLabel>Payment Date (Optional)</FormLabel> 
                        <Popover><PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(date) => {field.onChange(date); (document.activeElement as HTMLElement)?.blur();}} initialFocus /></PopoverContent>
                        </Popover>
                    <FormMessage /> </FormItem>
                )} />
              </div>
               <FormField control={form.control} name="jobId" render={({ field }) => ( <FormItem> <FormLabel>Related Job ID (Optional)</FormLabel> <FormControl><Input placeholder="e.g., JOB-20230101-001" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )} />
               <FormField control={form.control} name="estimateId" render={({ field }) => ( <FormItem> <FormLabel>Related Estimate ID (Optional)</FormLabel> <FormControl><Input placeholder="e.g., EST-20230101-001" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )} />


              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Payment terms, thank you note, etc." {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {setIsFormDialogOpen(false); setSelectedInvoice(null);}}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (selectedInvoice ? "Save Changes" : "Create Invoice")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={(isOpen) => { setIsViewDialogOpen(isOpen); if (!isOpen) setSelectedInvoice(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center"><Receipt className="mr-2 h-6 w-6 text-primary" />Invoice: {selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>To: {selectedInvoice?.customerName} ({selectedInvoice?.customerEmail || "N/A"})</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2 text-sm">
              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                <strong className="text-muted-foreground">Status:</strong><p className="col-span-2"><Badge variant={getStatusBadgeVariant(selectedInvoice.status)}>{selectedInvoice.status}</Badge></p>
                <strong className="text-muted-foreground">Date Issued:</strong><p className="col-span-2">{selectedInvoice.dateCreated ? format(selectedInvoice.dateCreated.toDate(), "PP") : 'N/A'}</p>
                <strong className="text-muted-foreground">Due Date:</strong><p className="col-span-2">{selectedInvoice.dueDate ? format(selectedInvoice.dueDate.toDate(), "PP") : 'N/A'}</p>
                {selectedInvoice.jobId && <><strong className="text-muted-foreground">Job ID:</strong><p className="col-span-2">{selectedInvoice.jobId}</p></>}
                {selectedInvoice.estimateId && <><strong className="text-muted-foreground">Estimate ID:</strong><p className="col-span-2">{selectedInvoice.estimateId}</p></>}
              </div>
              
              <div className="mt-4"><h4 className="font-semibold mb-1 text-muted-foreground">Line Items:</h4>
                <div className="border rounded-md">
                  {selectedInvoice.lineItems.map((item, index) => (
                    <div key={item.id || index} className={`flex justify-between p-2 ${index < selectedInvoice.lineItems.length -1 ? 'border-b' : ''}`}>
                      <span className="flex-1">{item.description}</span>
                      <span className="w-16 text-center">{item.quantity}</span>
                      <span className="w-20 text-right">${Number(item.unitPrice).toFixed(2)}</span>
                      <span className="w-24 text-right font-medium">${Number(item.totalPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-right">
                <p>Subtotal: <span className="font-medium">${selectedInvoice.subtotal.toFixed(2)}</span></p>
                <p>Tax ({(selectedInvoice.taxRate * 100).toFixed(1)}%): <span className="font-medium">${selectedInvoice.taxAmount.toFixed(2)}</span></p>
                <p className="text-lg font-bold">Total: <span className="font-medium">${selectedInvoice.totalAmount.toFixed(2)}</span></p>
                {selectedInvoice.paidAmount > 0 && <p className="text-green-600">Paid: <span className="font-medium">${selectedInvoice.paidAmount.toFixed(2)}</span></p> }
                {selectedInvoice.paidAmount > 0 && <p className="font-bold">Balance Due: <span className="font-medium">${(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toFixed(2)}</span></p>}
              </div>

              {selectedInvoice.notes && (<div className="mt-3"><h4 className="font-semibold text-muted-foreground mb-1">Notes:</h4><p className="bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{selectedInvoice.notes}</p></div>)}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { if(selectedInvoice) { setIsViewDialogOpen(false); handleOpenFormDialog(selectedInvoice); } }}><Edit className="mr-2 h-4 w-4" /> Edit Invoice</Button>
            <Button variant="secondary" onClick={() => alert("Print functionality to be implemented.")}><Printer className="mr-2 h-4 w-4" /> Print/PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete invoice '{invoiceToDelete?.invoiceNumber}'. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Yes, delete invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Invoice Management</h1>
        <p className="text-muted-foreground">Create, view, and manage customer invoices.</p></div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="flex items-center"><Receipt className="mr-2 h-5 w-5 text-primary" />Current Invoices ({invoices.length})</CardTitle>
        <CardDescription>Browse and manage all invoices in the system.</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading invoices...</p></div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50"><tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice #</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Issued</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr></thead>
                <tbody className="bg-background divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{invoice.customerName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{invoice.dateCreated ? format(invoice.dateCreated.toDate(), "PP") : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{invoice.dueDate ? format(invoice.dueDate.toDate(), "PP") : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">${invoice.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)}><Eye className="mr-1 h-3 w-3" /> View</Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenFormDialog(invoice)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteInvoice(invoice)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10"><Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No invoices found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Create New Invoice" or complete jobs to generate invoices automatically.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
