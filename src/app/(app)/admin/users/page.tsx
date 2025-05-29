
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { db, auth as firebaseAuth } from "@/lib/firebase/config"; // Renamed auth to firebaseAuth to avoid conflict
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { UserProfile, UserRole } from "@/types";
import { Users, PlusCircle, Loader2, Mail, KeyRound, UserCheck, ShieldAlert } from "lucide-react";
import Image from "next/image"; // Keep Image for existing structure, will adapt for Avatar

const userSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  displayName: z.string().min(2, "Display name must be at least 2 characters."),
  role: z.enum(["admin", "sales", "technician"], { required_error: "Role is required." }),
});

export default function AdminUsersPage() {
  const { userProfile: currentUserProfile, loading: authLoading, addAppUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUserProfile?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUserProfile, authLoading, router]);

  useEffect(() => {
    if (currentUserProfile?.role === "admin") {
      const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const usersCollectionRef = collection(db, "users");
          const q = query(usersCollectionRef, orderBy("displayName", "asc"));
          const querySnapshot = await getDocs(q);
          const fetchedUsers = querySnapshot.docs.map(doc => doc.data() as UserProfile);
          setUsers(fetchedUsers);
        } catch (error) {
          console.error("Error fetching users: ", error);
          toast({
            title: "Error",
            description: "Failed to fetch users from Firestore.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [currentUserProfile, toast]);

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      role: "sales", // Default role
    },
  });

  async function onAddUserSubmit(values: z.infer<typeof userSchema>) {
    if (currentUserProfile?.role !== 'admin') {
      toast({ title: "Unauthorized", description: "Only admins can add users.", variant: "destructive" });
      return;
    }
    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, values.email, values.password);
      const newAuthUser = userCredential.user;

      // 2. Add user document to Firestore using AuthContext function
      await addAppUser(newAuthUser.uid, values.email, values.displayName, values.role as UserRole);

      // 3. Update local state
      const newUserProfile: UserProfile = {
        uid: newAuthUser.uid,
        email: values.email,
        displayName: values.displayName,
        role: values.role as UserRole,
        photoURL: null, // Or generate a placeholder
      };
      setUsers(prevUsers => [newUserProfile, ...prevUsers].sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")));
      
      toast({
        title: "User Added",
        description: `${values.displayName} has been successfully added.`,
      });
      form.reset();
      setIsAddUserDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding user: ", error);
      let errorMessage = "Failed to add user. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use by another account.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0][0]?.toUpperCase() || "U";
    return (names[0][0]?.toUpperCase() || "") + (names[names.length - 1][0]?.toUpperCase() || "");
  };

  if (authLoading || currentUserProfile?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading user management or checking admin privileges...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users and their roles within LuxeFlow.
          </p>
        </div>
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddUserDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter the details for the new user below. They will be created in Firebase Authentication and Firestore.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddUserSubmit)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. Jane Doe" {...field} className="pl-10" />
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
                          <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                       <div className="relative">
                        <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsAddUserDialogOpen(false); form.reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding User...</> : "Add User"}
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
            <Users className="mr-2 h-5 w-5 text-primary" />
            Current Users ({users.length})
          </CardTitle>
          <CardDescription>
            View and manage existing users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
             <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading users...</p>
            </div>
          ) : users.length > 0 ? (
            <ul className="space-y-4">
              {users.map((user) => (
                <li key={user.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} data-ai-hint="user avatar" />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0">
                    <span className="text-sm capitalize px-2 py-1 rounded-full bg-secondary text-secondary-foreground self-start sm:self-auto mb-1 sm:mb-0">{user.role}</span>
                     <div className="flex space-x-2 mt-2 sm:mt-1 self-start sm:self-auto">
                        <Button variant="outline" size="sm" disabled>Edit</Button>
                        <Button variant="destructive" size="sm" disabled>Delete</Button>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No users found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Add New User" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
