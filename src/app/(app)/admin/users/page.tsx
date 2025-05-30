
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db, auth as firebaseAuth } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { UserProfile, UserRole } from "@/types";
import { Users, PlusCircle, Loader2, Mail, KeyRound, UserCheck, ShieldAlert, Edit3, Trash2, Search as SearchIcon } from "lucide-react";

const addUserSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  displayName: z.string().min(2, "Display name must be at least 2 characters."),
  role: z.enum(["admin", "sales", "technician"], { required_error: "Role is required." }),
});

const editUserSchema = z.object({
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
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");


  useEffect(() => {
    if (!authLoading && currentUserProfile?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUserProfile, authLoading, router]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      if (currentUserProfile?.role !== "admin") {
        setIsLoadingUsers(false);
        return;
      }
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
  
  useEffect(() => {
    if (currentUserProfile?.role === "admin") {
      fetchUsers();
    }
  }, [currentUserProfile]);


  const addUserForm = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      role: "sales", 
    },
  });

  const editUserForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });

  async function onAddUserSubmit(values: z.infer<typeof addUserSchema>) {
    if (currentUserProfile?.role !== 'admin') {
      toast({ title: "Unauthorized", description: "Only admins can add users.", variant: "destructive" });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, values.email, values.password);
      const newAuthUser = userCredential.user;
      await addAppUser(newAuthUser.uid, values.email, values.displayName, values.role as UserRole);
      
      fetchUsers(); // Refetch users to include the new one
      
      toast({
        title: "User Added",
        description: `${values.displayName} has been successfully added.`,
      });
      addUserForm.reset();
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

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    editUserForm.reset({
      displayName: user.displayName || "",
      role: user.role,
    });
    setIsEditUserDialogOpen(true);
  };

  async function onEditUserSubmit(values: z.infer<typeof editUserSchema>) {
    if (!selectedUser || currentUserProfile?.role !== 'admin') {
      toast({ title: "Error", description: "No user selected or unauthorized.", variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", selectedUser.uid);
      await updateDoc(userDocRef, {
        displayName: values.displayName,
        role: values.role as UserRole,
      });

      fetchUsers(); // Refetch to reflect changes

      toast({
        title: "User Updated",
        description: `${values.displayName} has been successfully updated.`,
      });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user: ", error);
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleDeleteUser = (user: UserProfile) => {
    if (user.uid === currentUserProfile?.uid) {
        toast({
            title: "Cannot Delete Self",
            description: "Administrators cannot delete their own accounts through this interface.",
            variant: "destructive",
        });
        return;
    }
    setUserToDelete(user);
  };

  async function confirmDeleteUser() {
    if (!userToDelete || currentUserProfile?.role !== 'admin') {
      toast({ title: "Error", description: "No user selected for deletion or unauthorized.", variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userToDelete.uid);
      await deleteDoc(userDocRef);
      // Note: Firebase Auth user deletion is not handled here (requires Admin SDK / Cloud Function)
      
      fetchUsers(); // Refetch users
      toast({
        title: "User Deleted",
        description: `${userToDelete.displayName}'s Firestore record has been deleted. Their authentication account still exists.`,
      });
    } catch (error) {
      console.error("Error deleting user: ", error);
      toast({
        title: "Error",
        description: "Failed to delete user's Firestore record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUserToDelete(null); 
    }
  }


  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0][0]?.toUpperCase() || "U";
    return (names[0][0]?.toUpperCase() || "") + (names[names.length - 1][0]?.toUpperCase() || "");
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);


  if (authLoading || !currentUserProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading user management...</p>
      </div>
    );
  }
   if (currentUserProfile.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Access Denied. You must be an admin to view this page.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users and their roles within Luxe Maintainance.
          </p>
        </div>
        <div className="flex items-center gap-4">
             <div className="relative w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-md bg-card"
                />
            </div>
            <Button onClick={() => { addUserForm.reset(); setIsAddUserDialogOpen(true);}} className="rounded-md">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
            </Button>
        </div>
      </div>
      
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent className="sm:max-w-[480px] rounded-lg">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter the details for the new user below. They will be created in Firebase Authentication and Firestore.
              </DialogDescription>
            </DialogHeader>
            <Form {...addUserForm}>
              <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4 py-2">
                <FormField
                  control={addUserForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. Jane Doe" {...field} className="pl-10 rounded-md" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} className="pl-10 rounded-md" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" {...field} className="pl-10 rounded-md" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                       <div className="relative">
                        <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="pl-10 rounded-md">
                              <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-md">
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
                  <Button type="button" variant="outline" onClick={() => { setIsAddUserDialogOpen(false); addUserForm.reset(); }} className="rounded-md">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addUserForm.formState.isSubmitting} className="rounded-md">
                    {addUserForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding User...</> : "Add User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.displayName}</DialogTitle>
            <DialogDescription>
              Update the user's display name and role. Email cannot be changed here.
            </DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-4 py-2">
              <FormField
                control={editUserForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. Jane Doe" {...field} className="pl-10 rounded-md" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email (Read-only)</FormLabel>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={selectedUser?.email || ""} readOnly disabled className="pl-10 bg-muted/50 rounded-md"/>
                </div>
              </FormItem>
              <FormField
                control={editUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <div className="relative">
                        <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="pl-10 rounded-md">
                            <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-md">
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
                <Button type="button" variant="outline" onClick={() => setIsEditUserDialogOpen(false)} className="rounded-md">
                  Cancel
                </Button>
                <Button type="submit" disabled={editUserForm.formState.isSubmitting} className="rounded-md">
                  {editUserForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <AlertDialogContent className="rounded-lg">
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will delete the user's profile data ({userToDelete?.displayName}) from Firestore. 
                    Their Firebase Authentication account will NOT be deleted by this action.
                    This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDelete(null)} className="rounded-md">Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDeleteUser}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md"
                >
                    Yes, delete user record
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


      <Card className="shadow-lg rounded-xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center text-xl">
            <Users className="mr-2 h-5 w-5 text-primary" />
            Current Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            View and manage existing users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingUsers ? (
             <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <ul className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <li key={user.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-3 flex-grow">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} data-ai-hint="user avatar"/>
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <span className="text-sm capitalize px-2 py-1 rounded-full bg-secondary text-secondary-foreground self-start sm:self-auto mb-1 sm:mb-0">{user.role}</span>
                     <div className="flex space-x-2 mt-2 sm:mt-1 self-start sm:self-auto">
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)} className="rounded-md">
                            <Edit3 className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.uid === currentUserProfile?.uid}
                            className="rounded-md"
                        >
                            <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No users found{searchTerm && " matching your search"}.</p>
              {!searchTerm && <p className="mt-1 text-xs text-muted-foreground">Click "Add New User" to get started.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
