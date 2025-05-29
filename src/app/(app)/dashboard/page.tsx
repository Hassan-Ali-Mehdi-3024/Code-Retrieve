
"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LayoutDashboard, User, Briefcase, Wrench } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <p>Loading dashboard...</p>; 
  }

  const getRoleSpecificGreeting = () => {
    switch (userProfile.role) {
      case "admin":
        return "You have full access to manage users, leads, jobs, and system settings.";
      case "sales":
        return "Focus on managing leads, nurturing customer relationships, and creating estimates.";
      case "technician":
        return "View your assigned jobs, update their status, and mark them as complete.";
      default:
        return "Welcome to your dashboard.";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Image 
              src={userProfile.photoURL || `https://placehold.co/64x64.png?text=${userProfile.displayName?.[0] || 'U'}`} 
              alt={userProfile.displayName || "User"} 
              width={64} height={64} 
              className="rounded-full"
              data-ai-hint="user avatar"
            />
            <div>
              <CardTitle className="text-3xl">Welcome, {userProfile.displayName || "User"}!</CardTitle>
              <CardDescription className="text-lg">
                You are logged in as a <span className="font-semibold capitalize text-primary">{userProfile.role}</span>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{getRoleSpecificGreeting()}</p>
        </CardContent>
      </Card>

      <Alert className="border-accent text-accent-foreground">
        <LayoutDashboard className="h-5 w-5 !text-accent" />
        <AlertTitle className="font-semibold !text-accent">Your Dashboard Overview</AlertTitle>
        <AlertDescription>
          This is your central hub for all activities within LuxeFlow. Use the sidebar to navigate to different sections.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userProfile.role === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Management</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Users</div>
              <p className="text-xs text-muted-foreground">
                Add, edit, and assign roles to team members.
              </p>
            </CardContent>
          </Card>
        )}
         {(userProfile.role === "admin" || userProfile.role === "sales") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lead Tracking</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">View Leads</div>
              <p className="text-xs text-muted-foreground">
                Monitor and manage potential customers.
              </p>
            </CardContent>
          </Card>
        )}
        {(userProfile.role === "admin" || userProfile.role === "technician") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Job Dispatch</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Jobs</div>
              <p className="text-xs text-muted-foreground">
                {userProfile.role === "admin" ? "Assign and track ongoing jobs." : "View and update your assigned jobs."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
