"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, PlusCircle, Edit, Eye, Mail, Phone, User, Home, Briefcase, Loader2, Trash2, Search as SearchIcon } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";

interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  customerSince: Timestamp;
  lastUpdated?: Timestamp;
  logoUrl?: string;
  dataAiHint?: string;
  notes?: string | null;
}

const customerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  contactName: z.string().min(2, "Contact name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number seems too short.").optional().or(z.literal("")).nullable(),
  address: z.string().min(5, "Address seems too short.").optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
});

export default function AdminCustomersPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!authLoading && userProfile && !["admin", "sales"].includes(userProfile.role)) {
      router.push("/dashboard");
    }
  }, [userProfile, authLoading, router]);

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      if (!userProfile || !["admin", "sales"].includes(userProfile.role)) {
        setIsLoadingCustomers(false);
        return;
      }
      const customersCollectionRef = collection(db, "customers");
      const q = query(customersCollectionRef, orderBy("companyName", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedCustomers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Customer));
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Error fetching customers: ", error);
      toast({
        title: "Error Fetching Customers",
        description: "Failed to fetch customers from Firestore. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (userProfile && ["admin", "sales"].includes(userProfile.role)) {
      fetchCustomers();
    }
  }, [userProfile]);

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
  });

  async function onAddCustomerSubmit(values: z.infer<typeof customerSchema>) {
    try {
      const newCustomerData = {
        ...values,
        phone: values.phone || null,
        address: values.address || null,
        notes: values.notes || null,
        customerSince: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        logoUrl: `https://placehold.co/40x40.png?text=${values.companyName.substring(0,2).toUpperCase()}`,
        dataAiHint: "company logo",
      };
      
      const customersCollectionRef = collection(db, "customers");
      await addDoc(customersCollectionRef, newCustomerData);
      
      toast({
        title: "Customer Added",
        description: `${values.companyName} has been successfully added.`,
      });
      form.reset();
      setIsAddCustomerDialogOpen(false);
      fetchCustomers(); 
    } catch (error) {
      console.error("Error adding customer: ", error);
      toast({
        title: "Error Adding Customer",
        description: "Failed to add customer. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.reset({
      companyName: customer.companyName || "",
      contactName: customer.contactName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setIsEditCustomerDialogOpen(true);
  };

  async function onEditCustomerSubmit(values: z.infer<typeof customerSchema>) {
    if (!selectedCustomer) return;
    try {
      const customerDocRef = doc(db, "customers", selectedCustomer.id);
      await updateDoc(customerDocRef, {
        ...values,
        phone: values.phone || null,
        address: values.address || null,
        notes: values.notes || null,
        lastUpdated: serverTimestamp(),
      });
      toast({
        title: "Customer Updated",
        description: `${values.companyName} has been successfully updated.`,
      });
      setIsEditCustomerDialogOpen(false);
      setSelectedCustomer(null);
      fetchCustomers(); 
    } catch (error) {
      console.error("Error updating customer: ", error);
      toast({
        title: "Error Updating Customer",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    }
  }
  
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewCustomerDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  async function confirmDeleteCustomer() {
    if (!customerToDelete) return;
    try {
      const customerDocRef = doc(db, "customers", customerToDelete.id);
      await deleteDoc(customerDocRef);
      toast({
        title: "Customer Deleted",
        description: `${customerToDelete.companyName} has been deleted.`,
      });
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer: ", error);
      toast({
        title: "Error Deleting Customer",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    }
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "C";
    const names = name.split(" ");
    if (names.length === 1) return names[0][0]?.toUpperCase() || "C";
    return (names[0][0]?.toUpperCase() || "") + (names[names.length - 1][0]?.toUpperCase() || "");
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter(customer =>
      customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  if (authLoading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading customer data...</p>
      </div>
    );
  }

  if (!["admin", "sales"].includes(userProfile.role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Access Denied. You must be an admin or sales user to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Customer Dialog */}
      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the details for the new customer. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddCustomerSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem> <FormLabel>Company Name</FormLabel> <FormControl><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Stark Industries" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="contactName" render={({ field }) => ( <FormItem> <FormLabel>Contact Name</FormLabel> <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Pepper Potts" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="e.g. contact@example.com" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone (Optional)</FormLabel> <FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="e.g. 555-123-4567" {...field} value={field.value ?? ""} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="address" render={({ field }) => ( <FormItem> <FormLabel>Address (Optional)</FormLabel> <FormControl><div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. 123 Main St, Anytown USA" {...field} value={field.value ?? ""} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Any additional notes about this customer..." {...field} value={field.value ?? ""} className="rounded-md"/></FormControl> <FormMessage /> </FormItem> )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsAddCustomerDialogOpen(false); form.reset();}} className="rounded-md">Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-md">{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Customer"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer: {selectedCustomer?.companyName}</DialogTitle>
            <DialogDescription>Update the customer's details. Click save when you're done.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditCustomerSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <FormField control={editForm.control} name="companyName" render={({ field }) => ( <FormItem> <FormLabel>Company Name</FormLabel> <FormControl><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Stark Industries" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={editForm.control} name="contactName" render={({ field }) => ( <FormItem> <FormLabel>Contact Name</FormLabel> <FormControl><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. Pepper Potts" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={editForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="e.g. contact@example.com" {...field} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={editForm.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Phone (Optional)</FormLabel> <FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="tel" placeholder="e.g. 555-123-4567" {...field} value={field.value ?? ""} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={editForm.control} name="address" render={({ field }) => ( <FormItem> <FormLabel>Address (Optional)</FormLabel> <FormControl><div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="e.g. 123 Main St, Anytown USA" {...field} value={field.value ?? ""} className="pl-10 rounded-md" /></div></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={editForm.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Any additional notes about this customer..." {...field} value={field.value ?? ""} className="rounded-md" /></FormControl> <FormMessage /> </FormItem> )} />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsEditCustomerDialogOpen(false); setSelectedCustomer(null); }} className="rounded-md">Cancel</Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting} className="rounded-md">{editForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={isViewCustomerDialogOpen} onOpenChange={setIsViewCustomerDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
             <DialogTitle className="flex items-center">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={selectedCustomer?.logoUrl || undefined} alt={selectedCustomer?.companyName || "Customer"} data-ai-hint={selectedCustomer?.dataAiHint || "company logo"}/>
                <AvatarFallback>{getInitials(selectedCustomer?.companyName)}</AvatarFallback>
              </Avatar>
              {selectedCustomer?.companyName}
            </DialogTitle>
            <DialogDescription>Detailed information for this customer.</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2 text-sm">
              <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                <strong className="text-muted-foreground">Contact:</strong><p className="col-span-2">{selectedCustomer.contactName}</p>
                <strong className="text-muted-foreground">Email:</strong><p className="col-span-2 truncate">{selectedCustomer.email}</p>
                <strong className="text-muted-foreground">Phone:</strong><p className="col-span-2">{selectedCustomer.phone || "N/A"}</p>
                <strong className="text-muted-foreground">Address:</strong><p className="col-span-2 whitespace-pre-wrap">{selectedCustomer.address || "N/A"}</p>
                <strong className="text-muted-foreground">Customer Since:</strong><p className="col-span-2">{selectedCustomer.customerSince ? format(selectedCustomer.customerSince.toDate(), "PP") : 'N/A'}</p>
                <strong className="text-muted-foreground">Last Updated:</strong><p className="col-span-2">{selectedCustomer.lastUpdated ? format(selectedCustomer.lastUpdated.toDate(), "PPp") : 'N/A'}</p>
              </div>
              {selectedCustomer.notes && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Notes:</h4>
                  <p className="bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsViewCustomerDialogOpen(false)} className="rounded-md">Close</Button>
             <Button onClick={() => { if(selectedCustomer) { setIsViewCustomerDialogOpen(false); handleEditCustomer(selectedCustomer); } }} className="rounded-md">
                <Edit className="mr-2 h-4 w-4" /> Edit Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the customer '{customerToDelete?.companyName}'. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCustomerToDelete(null)} className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md"
            >
              Yes, delete customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">Manage all existing clients of Luxe Maintainance.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-md bg-card"
                />
            </div>
            <Button onClick={() => { form.reset(); setIsAddCustomerDialogOpen(true); }} className="rounded-md">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Customer
            </Button>
        </div>
      </div>
      
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center text-xl">
            <Briefcase className="mr-2 h-5 w-5 text-primary" />
            Current Customers ({filteredCustomers.length})
          </CardTitle>
          <CardDescription>View and manage customers in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingCustomers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading customers...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <ul className="divide-y divide-border">
              {filteredCustomers.map((customer) => (
                <li key={customer.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-4 flex-grow">
                    <Image 
                      src={customer.logoUrl || `https://placehold.co/40x40.png?text=${customer.companyName.substring(0,2).toUpperCase()}`} 
                      alt={customer.companyName} 
                      width={40} height={40} 
                      className="rounded-md object-contain" 
                      data-ai-hint={customer.dataAiHint || "company logo"}
                    />
                    <div className="flex-grow">
                      <p className="font-semibold text-primary">{customer.companyName}</p>
                      <p className="text-sm font-medium">{customer.contactName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{customer.email}{customer.phone && ` • ${customer.phone}`}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                     <p className="text-xs text-muted-foreground">Since: {customer.customerSince ? format(customer.customerSince.toDate(), "PP") : 'N/A'}</p>
                     <div className="flex space-x-2 mt-2 sm:mt-1 self-start sm:self-auto">
                        <Button variant="outline" size="sm" onClick={() => handleViewCustomer(customer)} className="rounded-md"> 
                            <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditCustomer(customer)} className="rounded-md">
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteCustomer(customer)} className="rounded-md">
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No customers found{searchTerm && " matching your search"}.</p>
              {!searchTerm && <p className="mt-1 text-xs text-muted-foreground">Click "Add New Customer" to get started.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}