
"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Edit3, KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
// import { updateProfile } from "firebase/auth"; // For updating Firebase Auth profile
// import { doc, updateDoc } from "firebase/firestore"; // For updating Firestore profile
// import { db, auth } from "@/lib/firebase/config";

// Placeholder schemas and functions for now
const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters."),
  email: z.string().email().optional(), // Email might be read-only
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Confirm password is required."),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});


export default function SettingsPage() {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile?.displayName || "",
      email: userProfile?.email || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsProfileSubmitting(true);
    toast({ title: "Profile Update", description: "Profile update functionality to be implemented." });
    console.log("Profile update values:", values);
    // TODO: Implement actual profile update logic here
    // 1. Update Firebase Auth display name: await updateProfile(auth.currentUser, { displayName: values.displayName });
    // 2. Update Firestore user document: await updateDoc(doc(db, "users", user.uid), { displayName: values.displayName });
    // 3. Potentially re-fetch userProfile or update context
    setIsProfileSubmitting(false);
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsPasswordSubmitting(true);
    toast({ title: "Password Change", description: "Password change functionality to be implemented." });
    console.log("Password change values:", values);
    // TODO: Implement actual password change logic here
    // 1. Re-authenticate user: const credential = EmailAuthProvider.credential(user.email, values.currentPassword); await reauthenticateWithCredential(user, credential);
    // 2. Update password: await updatePassword(user, values.newPassword);
    setIsPasswordSubmitting(false);
    passwordForm.reset();
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0][0]?.toUpperCase() || "U";
    return (names[0][0]?.toUpperCase() || "") + (names[names.length - 1][0]?.toUpperCase() || "");
  };

  if (!userProfile || !user) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading settings...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and settings.
        </p>
      </div>
      <Separator />

      {/* Profile Settings */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <User className="mr-3 h-6 w-6 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal details. Your email address is used for login and cannot be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} data-ai-hint="user avatar" />
              <AvatarFallback className="text-2xl">{getInitials(userProfile.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" disabled> {/* onClick={() => toast({description: "Avatar upload TBD."})} */}
                <Edit3 className="mr-2 h-4 w-4" /> Change Avatar (TBD)
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, GIF or PNG. 1MB max.</p>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
             <div className="space-y-1">
                <Label htmlFor="displayName">Full Name</Label>
                <Input 
                    id="displayName" 
                    {...profileForm.register("displayName")} 
                    defaultValue={userProfile.displayName || ""}
                    placeholder="Your full name"
                />
                {profileForm.formState.errors.displayName && <p className="text-sm text-destructive">{profileForm.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-1">
                <Label htmlFor="email">Email Address (Read-only)</Label>
                <Input 
                    id="email" 
                    type="email"
                    value={userProfile.email || ""} 
                    readOnly 
                    disabled
                    className="bg-muted/50"
                />
            </div>
             <div className="space-y-1">
                <Label htmlFor="role">Role (Read-only)</Label>
                <Input 
                    id="role" 
                    value={userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)} 
                    readOnly 
                    disabled
                    className="bg-muted/50 capitalize"
                />
            </div>
            <Button type="submit" disabled={isProfileSubmitting}>
              {isProfileSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
              Save Profile Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Shield className="mr-3 h-6 w-6 text-primary" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings, like changing your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="currentPassword" 
                        type="password" 
                        {...passwordForm.register("currentPassword")}
                        placeholder="••••••••"
                        className="pl-10"
                    />
                </div>
                {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
            </div>
             <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                 <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="newPassword" 
                        type="password" 
                        {...passwordForm.register("newPassword")}
                        placeholder="••••••••"
                        className="pl-10"
                    />
                </div>
                {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
            </div>
            <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                 <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="confirmPassword" 
                        type="password" 
                        {...passwordForm.register("confirmPassword")}
                        placeholder="••••••••"
                        className="pl-10"
                    />
                </div>
                {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {userProfile.role === 'admin' && (
        <Card className="shadow-md">
            <CardHeader>
            <CardTitle className="flex items-center text-xl">
                <Settings className="mr-3 h-6 w-6 text-primary" />
                System Settings (Admin)
            </CardTitle>
            <CardDescription>
                Manage system-wide configurations. (Placeholder for future admin-specific settings)
            </CardDescription>
            </CardHeader>
            <CardContent>
            <p className="text-muted-foreground">Admin-specific settings will appear here.</p>
            <Button variant="link" className="p-0 h-auto mt-2" disabled>Configure System Settings (TBD)</Button>
            </CardContent>
        </Card>
      )}

    </div>
  );
}

    