
"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Edit3, KeyRound, Loader2, Settings as SettingsIcon, Palette, Sun, Moon, Laptop } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters."),
  email: z.string().email().optional(), 
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Confirm password is required."),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});


export default function SettingsPage() {
  const { userProfile, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile?.displayName || "",
      email: userProfile?.email || "",
    },
  });

  useEffect(() => {
    if (userProfile) {
        profileForm.reset({
            displayName: userProfile.displayName || "",
            email: userProfile.email || "",
        });
    }
  }, [userProfile, profileForm]);


  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    if (!user || !userProfile) {
        toast({ title: "Error", description: "User not found. Please re-login.", variant: "destructive"});
        return;
    }
    setIsProfileSubmitting(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: values.displayName });
      } else {
        throw new Error("Firebase Auth current user not available.");
      }

      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { displayName: values.displayName });
      
      // To trigger a re-fetch/update in AuthContext, ideally context would expose a setter
      // For now, we rely on re-render or user re-navigating to see changes in header etc.
      // The profile page itself will reflect change on form reset or re-fetch
      
      toast({
        title: "Profile Updated",
        description: "Your display name has been successfully updated.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Profile Update Failed",
        description: error.message || "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    if (!user || !user.email) {
        toast({ title: "Error", description: "User or user email not found. Please re-login.", variant: "destructive"});
        return;
    }
    setIsPasswordSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, values.newPassword);

      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Error changing password:", error);
      let errorMessage = "Could not change your password. Please try again.";
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect current password. Please try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      toast({
        title: "Password Change Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0][0]?.toUpperCase() || "U";
    return (names[0][0]?.toUpperCase() || "") + (names[names.length - 1][0]?.toUpperCase() || "");
  };

  if (authLoading || !userProfile || !user || !mounted) {
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
              <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} data-ai-hint="user avatar"/>
              <AvatarFallback className="text-2xl">{getInitials(userProfile.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" disabled>
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
            <Button type="submit" disabled={isProfileSubmitting || profileForm.formState.isSubmitting}>
              {isProfileSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
              Save Profile Changes
            </Button>
          </form>
        </CardContent>
      </Card>

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
            <Button type="submit" disabled={isPasswordSubmitting || passwordForm.formState.isSubmitting}>
                {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Palette className="mr-3 h-6 w-6 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose how LuxeFlow looks to you. Select a theme preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <Label
              htmlFor="light-theme"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                theme === "light" ? "border-primary ring-2 ring-primary" : "border-muted"
              }`}
            >
              <RadioGroupItem value="light" id="light-theme" className="sr-only" />
              <Sun className="h-6 w-6 mb-2" />
              Light
            </Label>
            <Label
              htmlFor="dark-theme"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                theme === "dark" ? "border-primary ring-2 ring-primary" : "border-muted"
              }`}
            >
              <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
              <Moon className="h-6 w-6 mb-2" />
              Dark
            </Label>
            <Label
              htmlFor="system-theme"
              className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                theme === "system" ? "border-primary ring-2 ring-primary" : "border-muted"
              }`}
            >
              <RadioGroupItem value="system" id="system-theme" className="sr-only" />
              <Laptop className="h-6 w-6 mb-2" />
              System
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {userProfile.role === 'admin' && (
        <Card className="shadow-md">
            <CardHeader>
            <CardTitle className="flex items-center text-xl">
                <SettingsIcon className="mr-3 h-6 w-6 text-primary" />
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
