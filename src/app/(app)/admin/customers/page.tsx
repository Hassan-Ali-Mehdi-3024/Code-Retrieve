
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // If we add status or tags later
import { Building, PlusCircle, Edit, Eye, Mail, Phone, User, Home, Briefcase, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore"; // For customerSince
import { format } from "date-fns";

// Define Customer interface
interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  customerSince: Timestamp;
  logoUrl?: string;
  dataAiHint?: string;
  notes?: string;
}

const customerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  contactName: z.string().min(2, "Contact name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number seems too short.").optional().or(z.literal("")),
  address: z.string().min(5, "Address seems too short.").optional().or(z.literal("")),
  notes: z.string().optional(),
});

// Mock Data (replace with Firestore integration later)
const mockCustomers: Customer[] = [
  {
    id: "cust_1",
    companyName: "Stark Industries",
    contactName: "Pepper Potts",
    email: "pepper@stark.com",
    phone: "555-0101",
    address: "1 Stark Tower, New York, NY",
    customerSince: Timestamp.fromDate(new Date("2022-01-15")),
    logoUrl: "https://placehold.co/40x40.png?text=SI",
    dataAiHint: "tech company",
    notes: "Long-term client, high value.",
  },
  {
    id: "cust_2",
    companyName: "Wayne Enterprises",
    contactName: "Lucius Fox",
    email: "lucius@wayne.com",
    phone: "555-0202",
    address: "1007 Mountain Drive, Gotham City",
    customerSince: Timestamp.fromDate(new Date("2021-11-20")),
    logoUrl: "https://placehold.co/40x40.png?text=WE",
    dataAiHint: "conglomerate business",
    notes: "Requires meticulous service.",
  },
];

export default function AdminCustomersPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false); // Will be true when fetching
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  // const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  // const [isViewCustomerDialogOpen, setIsViewCustomerDialogOpen] = useState(false);
  // const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!authLoading && userProfile && !["admin", "sales"].includes(userProfile.role)) {
      router.push("/dashboard");
    }
  }, [userProfile, authLoading, router]);

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

  // const editForm = useForm<z.infer<typeof customerSchema>>({
  //   resolver: zodResolver(customerSchema),
  // });

  async function onAddCustomerSubmit(values: z.infer<typeof customerSchema>) {
    // For now, adds to local state. Replace with Firestore logic.
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`, // Temporary ID
      ...values,
      phone: values.phone || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
      customerSince: Timestamp.now(),
      logoUrl: `https://placehold.co/40x40.png?text=${values.companyName.substring(0,2).toUpperCase()}`,
      dataAiHint: "company logo",
    };
    setCustomers(prev => [newCustomer, ...prev]);
    toast({
      title: "Customer Added (Mock)",
      description: `${values.companyName} has been added locally.`,
    });
    form.reset();
    setIsAddCustomerDialogOpen(false);
  }

  // Placeholder functions for Edit/View - to be implemented
  // const handleEditCustomer = (customer: Customer) => {
  //   setSelectedCustomer(customer);
  //   editForm.reset({ ...customer, phone: customer.phone || "", address: customer.address || "", notes: customer.notes || "" });
  //   setIsEditCustomerDialogOpen(true);
  // };

  // const handleViewCustomer = (customer: Customer) => {
  //   setSelectedCustomer(customer);
  //   setIsViewCustomerDialogOpen(true);
  // };

  if (authLoading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading or verifying access...</p>
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
        <DialogTrigger asChild>
          <Button onClick={() => { form.reset(); setIsAddCustomerDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Customer
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the details for the new customer. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAddCustomerSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. Stark Industries" {...field} className="pl-10" />
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
                        <Input placeholder="e.g. Pepper Potts" {...field} className="pl-10" />
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
                        <Input type="email" placeholder="e.g. contact@example.com" {...field} className="pl-10" />
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. 123 Main St, Anytown USA" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Any additional notes about this customer..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
               />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsAddCustomerDialogOpen(false); form.reset();}}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Customer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog (To be implemented) */}
      {/* View Customer Dialog (To be implemented) */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage all existing clients of LuxeFlow.
          </p>
        </div>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5 text-primary" />
            Current Customers ({customers.length})
          </CardTitle>
          <CardDescription>
            View and manage customers in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCustomers ? ( // Placeholder for loading state
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading customers...</p>
            </div>
          ) : customers.length > 0 ? (
            <ul className="space-y-4">
              {customers.map((customer) => (
                <li key={customer.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-4">
                    <Image 
                      src={customer.logoUrl || `https://placehold.co/40x40.png?text=${customer.companyName.substring(0,2).toUpperCase()}`} 
                      alt={customer.companyName} 
                      width={40} 
                      height={40} 
                      className="rounded-md object-contain" 
                      data-ai-hint={customer.dataAiHint || "company logo"}
                    />
                    <div>
                      <p className="font-semibold text-primary">{customer.companyName}</p>
                      <p className="text-sm font-medium">{customer.contactName}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}{customer.phone && ` • ${customer.phone}`}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0">
                     <p className="text-xs text-muted-foreground">Customer Since: {customer.customerSince ? format(customer.customerSince.toDate(), "PP") : 'N/A'}</p>
                     {/* Add status badge here if needed in future */}
                     <div className="flex space-x-2 mt-2 sm:mt-1 self-start sm:self-auto">
                        <Button variant="outline" size="sm" onClick={() => alert(`View ${customer.companyName}`)} disabled> 
                            <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => alert(`Edit ${customer.companyName}`)} disabled>
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No customers found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Add New Customer" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

