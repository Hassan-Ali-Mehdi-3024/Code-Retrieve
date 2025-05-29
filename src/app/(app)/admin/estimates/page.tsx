
"use client";

import React from "react"; // Added React import
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, PlusCircle, Eye, Edit, Trash2, DollarSign, User, CalendarDays, Percent, ListOrdered, Loader2, Search } from "lucide-react";
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
import { format, addDays } from "date-fns";
import type { Customer } from "@/app/(app)/admin/customers/page"; // Assuming path

type EstimateStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

interface LineItem {
  id: string; // for unique key in rendering
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string; // Denormalized for easy display
  customerEmail?: string; // Denormalized
  dateCreated: Timestamp;
  validUntil: Timestamp;
  status: EstimateStatus;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number; // e.g., 0.08 for 8%
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  lastUpdated?: Timestamp;
}

const lineItemSchema = z.object({
  id: z.string().optional(), // Optional for new items
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
});

const estimateSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  // estimateNumber will be auto-generated or manually set if needed, not in form for new
  validUntilDate: z.date({ required_error: "Valid until date is required." }),
  status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired"]),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  taxRate: z.coerce.number().min(0, "Tax rate cannot be negative.").max(1, "Tax rate should be a decimal (e.g., 0.05 for 5%)."),
  notes: z.string().optional().nullable(),
});


const getStatusBadgeVariant = (status: EstimateStatus) => {
  switch (status) {
    case "Draft": return "secondary";
    case "Sent": return "default";
    case "Accepted": return "outline"; // Consider a success variant
    case "Rejected": return "destructive";
    case "Expired": return "outline";
    default: return "default";
  }
};

const generateEstimateNumber = async (): Promise<string> => {
  // Basic number generation, could be more sophisticated (e.g., fetch last number from a settings doc)
  const prefix = "EST-";
  const datePart = format(new Date(), "yyyyMMdd");
  // For uniqueness, query count of estimates on current date. Not truly atomic without server-side logic.
  const estimatesRef = collection(db, "estimates");
  const todayStart = new Timestamp(Math.floor(new Date().setHours(0,0,0,0) / 1000), 0);
  const q = query(estimatesRef, where("dateCreated", ">=", todayStart));
  const snapshot = await getDocs(q);
  const count = snapshot.size + 1; 
  return `${prefix}${datePart}-${String(count).padStart(3, '0')}`;
};


export default function AdminEstimatesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);

  useEffect(() => {
    if (!authLoading && userProfile && !["admin", "sales"].includes(userProfile.role)) {
      router.push("/dashboard");
    }
  }, [userProfile, authLoading, router]);

  const fetchCustomers = async () => {
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
  };

  const fetchEstimates = async () => {
    setIsLoading(true);
    try {
      const estimatesCollectionRef = collection(db, "estimates");
      const q = query(estimatesCollectionRef, orderBy("dateCreated", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedEstimates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Estimate));
      setEstimates(fetchedEstimates);
    } catch (error) {
      console.error("Error fetching estimates: ", error);
      toast({ title: "Error Fetching Estimates", description: "Failed to load estimates from Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile && ["admin", "sales"].includes(userProfile.role)) {
      fetchCustomers();
      fetchEstimates();
    }
  }, [userProfile]);

  const form = useForm<z.infer<typeof estimateSchema>>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      customerId: "",
      validUntilDate: addDays(new Date(), 30), // Default to 30 days from now
      status: "Draft",
      lineItems: [{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }],
      taxRate: 0.0,
      notes: "",
    },
  });

  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem, update: updateLineItem } = form.control.register('lineItems', { value: [] }) && form.watch('lineItems') ?
    // @ts-ignore TODO: Fix this type issue with react-hook-form useFieldArray if it persists
    // This is a common workaround for type inference issues with useFieldArray in complex scenarios.
    // Ideally, useFieldArray from react-hook-form should be used directly.
    // For now, we'll manually manage for simplicity in this prototype stage
    (() => {
        const items = form.watch('lineItems');
        return {
            fields: items.map((item, index) => ({ ...item, id: item.id || crypto.randomUUID(), _formIndex: index })),
            append: (item: Omit<LineItem, 'totalPrice' | 'id'>) => { // id is generated, totalPrice calculated
                const currentItems = form.getValues('lineItems');
                form.setValue('lineItems', [...currentItems, { ...item, id: crypto.randomUUID(), totalPrice: item.quantity * item.unitPrice }]);
            },
            remove: (index: number) => {
                const currentItems = form.getValues('lineItems');
                form.setValue('lineItems', currentItems.filter((_, i) => i !== index));
            },
            update: (index: number, item: Partial<Omit<LineItem, 'id'>>) => { // id should not be updated this way
                 const currentItems = form.getValues('lineItems');
                 const updatedItems = [...currentItems];
                 // Ensure the item at the index exists
                 if (updatedItems[index]) {
                    updatedItems[index] = { ...updatedItems[index], ...item } as LineItem;
                    if(item.quantity !== undefined || item.unitPrice !== undefined){
                        updatedItems[index].totalPrice = (item.quantity ?? updatedItems[index].quantity) * (item.unitPrice ?? updatedItems[index].unitPrice);
                    }
                    form.setValue('lineItems', updatedItems);
                 }
            }
        };
    })()
    : { fields: [], append: () => {}, remove: () => {}, update: () => {} };


  const calculateTotals = (lineItems: Omit<LineItem, 'id' | 'totalPrice'>[], taxRate: number) => {
    const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  async function onSubmit(values: z.infer<typeof estimateSchema>) {
    setIsSubmitting(true);
    try {
      const selectedCustomer = customers.find(c => c.id === values.customerId);
      if (!selectedCustomer) {
        toast({ title: "Error", description: "Selected customer not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const totals = calculateTotals(values.lineItems, values.taxRate);
      

      const estimateDataForDb: Omit<Estimate, 'id' | 'estimateNumber' | 'dateCreated' | 'lastUpdated'> & { dateCreated?: Timestamp, lastUpdated?: Timestamp, estimateNumber?: string } = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.companyName,
        customerEmail: selectedCustomer.email,
        validUntil: Timestamp.fromDate(values.validUntilDate),
        status: values.status,
        lineItems: values.lineItems.map(li => ({...li, id: li.id || crypto.randomUUID(), totalPrice: li.quantity * li.unitPrice })),
        subtotal: totals.subtotal,
        taxRate: values.taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes: values.notes || null,
      };


      if (selectedEstimate) { // Editing
        const estimateDocRef = doc(db, "estimates", selectedEstimate.id);
        await updateDoc(estimateDocRef, { ...estimateDataForDb, lastUpdated: serverTimestamp() as Timestamp }); 
        toast({ title: "Estimate Updated", description: `Estimate ${selectedEstimate.estimateNumber} has been updated.` });
      } else { // Adding
        const estimateNumber = await generateEstimateNumber();
        const newEstimateData = {
            ...estimateDataForDb,
            estimateNumber,
            dateCreated: serverTimestamp() as Timestamp,
            lastUpdated: serverTimestamp() as Timestamp,
        }
        const estimatesCollectionRef = collection(db, "estimates");
        await addDoc(estimatesCollectionRef, newEstimateData);
        toast({ title: "Estimate Created", description: `Estimate ${estimateNumber} has been created.` });
      }
      
      form.reset();
      setIsFormDialogOpen(false);
      setSelectedEstimate(null);
      fetchEstimates();
    } catch (error) {
      console.error("Error saving estimate: ", error);
      toast({ title: "Error Saving Estimate", description: "Failed to save estimate. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleOpenFormDialog = (estimateToEdit?: Estimate) => {
    setSelectedEstimate(estimateToEdit || null);
    if (estimateToEdit) {
      form.reset({
        customerId: estimateToEdit.customerId,
        validUntilDate: estimateToEdit.validUntil.toDate(),
        status: estimateToEdit.status,
        lineItems: estimateToEdit.lineItems.map(li => ({...li, unitPrice: Number(li.unitPrice), quantity: Number(li.quantity) })), // ensure numbers
        taxRate: estimateToEdit.taxRate,
        notes: estimateToEdit.notes || "",
      });
    } else {
      form.reset({ // Reset to default values for new estimate, including generating new UUIDs for line items
        customerId: "",
        validUntilDate: addDays(new Date(), 30),
        status: "Draft",
        lineItems: [{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }],
        taxRate: 0.0,
        notes: "",
      });
    }
    setIsFormDialogOpen(true);
  };

  const handleViewEstimate = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setIsViewDialogOpen(true);
  };

  const handleDeleteEstimate = (estimate: Estimate) => {
    setEstimateToDelete(estimate);
  };

  async function confirmDeleteEstimate() {
    if (!estimateToDelete) return;
    setIsSubmitting(true);
    try {
      const estimateDocRef = doc(db, "estimates", estimateToDelete.id);
      await deleteDoc(estimateDocRef);
      toast({ title: "Estimate Deleted", description: `Estimate ${estimateToDelete.estimateNumber} has been deleted.` });
      setEstimateToDelete(null);
      fetchEstimates();
    } catch (error) {
      console.error("Error deleting estimate: ", error);
      toast({ title: "Error Deleting Estimate", description: "Failed to delete estimate. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Watch line items and tax rate to recalculate totals dynamically in the form
  const watchedLineItems = form.watch("lineItems");
  const watchedTaxRate = form.watch("taxRate");
  const currentSubtotal = React.useMemo(() => watchedLineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0), [watchedLineItems]);
  const currentTaxAmount = React.useMemo(() => currentSubtotal * (Number(watchedTaxRate) || 0), [currentSubtotal, watchedTaxRate]);
  const currentTotalAmount = React.useMemo(() => currentSubtotal + currentTaxAmount, [currentSubtotal, currentTaxAmount]);


  if (authLoading || !userProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }
  if (!["admin", "sales"].includes(userProfile.role)) {
    return <div className="flex h-screen items-center justify-center"><p>Access Denied.</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Estimate Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { setIsFormDialogOpen(isOpen); if (!isOpen) setSelectedEstimate(null); }}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenFormDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Estimate
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedEstimate ? "Edit Estimate" : "Create New Estimate"} {selectedEstimate?.estimateNumber && `(${selectedEstimate.estimateNumber})`}</DialogTitle>
            <DialogDescription>
              {selectedEstimate ? "Update the details for this estimate." : "Fill in the details to create a new estimate."}
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
                        {/* Basic search can be added here if needed, for now direct select */}
                        {customers.map(customer => (
                          <div key={customer.id} onClick={() => {form.setValue("customerId", customer.id); (document.activeElement as HTMLElement)?.blur(); }}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="validUntilDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
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
                        <select onChange={field.onChange} value={field.value} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            {(["Draft", "Sent", "Accepted", "Rejected", "Expired"] as EstimateStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    <FormMessage /> </FormItem>
                )} />
              </div>

              {/* Line Items */}
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
                          <FormControl><Input type="number" placeholder="1" {...field} onChange={e => { field.onChange(e); updateLineItem(index, { quantity: parseFloat(e.target.value) }) }} /></FormControl>
                           <FormMessage />
                        </FormItem>
                      )} />
                       <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                        <FormItem className="col-span-2">
                           {index === 0 && <FormLabel className="text-xs">Unit Price</FormLabel>}
                          <FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => { field.onChange(e); updateLineItem(index, { unitPrice: parseFloat(e.target.value) }) }} /></FormControl>
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
                 {form.formState.errors.lineItems && !form.formState.errors.lineItems.message && <FormMessage>{form.formState.errors.lineItems.root?.message || 'Please add at least one line item.'}</FormMessage>}

              </div>

              {/* Totals & Tax */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                 <FormField control={form.control} name="taxRate" render={({ field }) => (
                  <FormItem> <FormLabel>Tax Rate (e.g., 0.08 for 8%)</FormLabel>
                    <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl><Input type="number" step="0.001" placeholder="0.00" {...field} /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-1 text-sm text-right">
                  <p>Subtotal: <span className="font-medium">${currentSubtotal.toFixed(2)}</span></p>
                  <p>Tax ({((Number(watchedTaxRate) || 0) * 100).toFixed(1)}%): <span className="font-medium">${currentTaxAmount.toFixed(2)}</span></p>
                  <p className="text-lg font-bold">Total: <span className="font-medium">${currentTotalAmount.toFixed(2)}</span></p>
                </div>
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Any additional notes for the customer or internal remarks..." {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => {setIsFormDialogOpen(false); setSelectedEstimate(null);}}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (selectedEstimate ? "Save Changes" : "Create Estimate")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Estimate Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(isOpen) => { setIsViewDialogOpen(isOpen); if (!isOpen) setSelectedEstimate(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-6 w-6 text-primary" />
              Estimate: {selectedEstimate?.estimateNumber}
            </DialogTitle>
            <DialogDescription>
              To: {selectedEstimate?.customerName} ({selectedEstimate?.customerEmail || "N/A"})
            </DialogDescription>
          </DialogHeader>
          {selectedEstimate && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2 text-sm">
              <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                <strong className="text-muted-foreground">Status:</strong><p className="col-span-2"><Badge variant={getStatusBadgeVariant(selectedEstimate.status)}>{selectedEstimate.status}</Badge></p>
                <strong className="text-muted-foreground">Date Created:</strong><p className="col-span-2">{selectedEstimate.dateCreated ? format(selectedEstimate.dateCreated.toDate(), "PP") : 'N/A'}</p>
                <strong className="text-muted-foreground">Valid Until:</strong><p className="col-span-2">{selectedEstimate.validUntil ? format(selectedEstimate.validUntil.toDate(), "PP") : 'N/A'}</p>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-1 text-muted-foreground">Line Items:</h4>
                <div className="border rounded-md">
                  {selectedEstimate.lineItems.map((item, index) => (
                    <div key={item.id || index} className={`flex justify-between p-2 ${index < selectedEstimate.lineItems.length -1 ? 'border-b' : ''}`}>
                      <span className="flex-1">{item.description}</span>
                      <span className="w-16 text-center">{item.quantity}</span>
                      <span className="w-20 text-right">${Number(item.unitPrice).toFixed(2)}</span>
                      <span className="w-24 text-right font-medium">${Number(item.totalPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-right">
                <p>Subtotal: <span className="font-medium">${selectedEstimate.subtotal.toFixed(2)}</span></p>
                <p>Tax ({(selectedEstimate.taxRate * 100).toFixed(1)}%): <span className="font-medium">${selectedEstimate.taxAmount.toFixed(2)}</span></p>
                <p className="text-lg font-bold">Total: <span className="font-medium">${selectedEstimate.totalAmount.toFixed(2)}</span></p>
              </div>

              {selectedEstimate.notes && (
                <div className="mt-3">
                  <h4 className="font-semibold text-muted-foreground mb-1">Notes:</h4>
                  <p className="bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{selectedEstimate.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { if(selectedEstimate) { setIsViewDialogOpen(false); handleOpenFormDialog(selectedEstimate); } }}>
                <Edit className="mr-2 h-4 w-4" /> Edit Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Estimate Confirmation Dialog */}
      <AlertDialog open={!!estimateToDelete} onOpenChange={(open) => !open && setEstimateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete estimate '{estimateToDelete?.estimateNumber}'. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEstimateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEstimate}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, delete estimate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimate Management</h1>
          <p className="text-muted-foreground">Create, view, and manage service estimates.</p>
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Current Estimates ({estimates.length})
          </CardTitle>
          <CardDescription>Browse and manage all estimates in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading estimates...</p>
            </div>
          ) : estimates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estimate #</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {estimates.map((estimate) => (
                    <tr key={estimate.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary">{estimate.estimateNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{estimate.customerName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{estimate.dateCreated ? format(estimate.dateCreated.toDate(), "PP") : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">${estimate.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(estimate.status)}>{estimate.status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewEstimate(estimate)}><Eye className="mr-1 h-3 w-3" /> View</Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenFormDialog(estimate)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteEstimate(estimate)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No estimates found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Create New Estimate" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

