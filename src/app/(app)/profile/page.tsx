
"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Shield, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ProfilePage() {
  const { userProfile, loading: authLoading } = useAuth();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(" ");
    if (names.length === 1) return names[0][0]?.toUpperCase() || "U";
    return (names[0][0]?.toUpperCase() || "") + (names[names.length - 1][0]?.toUpperCase() || "");
  };

  if (authLoading || !userProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">View your personal information.</p>
        </div>
         <Button asChild variant="outline">
            <Link href="/settings">
                <Edit className="mr-2 h-4 w-4" /> Edit Profile & Settings
            </Link>
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader className="items-center text-center border-b pb-6">
            <Avatar className="h-24 w-24 mb-3">
                <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} data-ai-hint="user avatar"/>
                <AvatarFallback className="text-3xl">{getInitials(userProfile.displayName)}</AvatarFallback>
            </Avatar>
          <CardTitle className="text-2xl">{userProfile.displayName || "N/A"}</CardTitle>
          <CardDescription className="capitalize flex items-center">
            <Shield className="mr-1.5 h-4 w-4 text-muted-foreground" /> {userProfile.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium">{userProfile.displayName || "N/A"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="font-medium">{userProfile.email || "N/A"}</p>
            </div>
          </div>
           <div className="flex items-center space-x-3">
            <Image 
                src={`https://placehold.co/20x20.png?text=${userProfile.uid.substring(0,1).toUpperCase()}`} 
                alt="User ID icon"
                width={20} height={20}
                className="rounded-sm"
                data-ai-hint="abstract id"
            />
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="font-mono text-xs">{userProfile.uid}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
            <Button asChild>
                <Link href="/settings">
                    <Edit className="mr-2 h-4 w-4" /> Manage Account Settings
                </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
                Update your display name, change password, or manage other preferences in the settings area.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
