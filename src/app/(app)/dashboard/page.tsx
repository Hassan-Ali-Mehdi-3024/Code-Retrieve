
"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, Briefcase, Wrench, FileText, Receipt, BuildingIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardPage() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <p>Loading dashboard...</p>; 
  }

  const getRoleSpecificGreeting = () => {
    switch (userProfile.role) {
      case "admin":
        return "You have full access to manage users, customers, leads, estimates, jobs, invoices, and system settings.";
      case "sales":
        return "Focus on managing leads, customers, and creating estimates to drive sales.";
      case "technician":
        return "View your assigned jobs, update their status, and mark them as complete.";
      default:
        return "Welcome to your dashboard.";
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg border border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Image 
              src={userProfile.photoURL || `https://placehold.co/80x80.png?text=${userProfile.displayName?.[0]?.toUpperCase() || 'U'}`} 
              alt={userProfile.displayName || "User"} 
              width={80} height={80} 
              className="rounded-full border-2 border-primary/50 object-cover"
              data-ai-hint="user avatar"
            />
            <div className="text-center sm:text-left">
              <CardTitle className="text-3xl md:text-4xl">Welcome, {userProfile.displayName || "User"}!</CardTitle>
              <CardDescription className="text-lg mt-1">
                You are logged in as a <span className="font-semibold capitalize text-primary">{userProfile.role}</span>.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-muted-foreground text-center sm:text-left">{getRoleSpecificGreeting()}</p>
        </CardContent>
      </Card>

      <Alert variant="default" className="border-primary/20 dark:border-primary/30 shadow-sm">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">Your Dashboard Overview</AlertTitle>
        <AlertDescription>
          This is your central hub for all activities within Luxe Maintainance CRM. Use the sidebar to navigate to different sections.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userProfile.role === "admin" && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <User className="mr-2 h-6 w-6 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>
                Add, edit, and assign roles to team members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>
        )}
         {(userProfile.role === "admin" || userProfile.role === "sales") && (
          <>
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <BuildingIcon className="mr-2 h-6 w-6 text-primary" /> {/* Changed from Briefcase */}
                  Lead Management
                </CardTitle>
                <CardDescription>
                  Track, score, and convert potential client leads.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/leads">Manage Leads</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Briefcase className="mr-2 h-6 w-6 text-primary" />
                  Customer Management
                </CardTitle>
                <CardDescription>
                  View and manage details of existing clients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/customers">Manage Customers</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <FileText className="mr-2 h-6 w-6 text-primary" />
                  Estimate Management
                </CardTitle>
                <CardDescription>
                  Create and send service estimates to customers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/estimates">Manage Estimates</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
        {(userProfile.role === "admin" || userProfile.role === "technician") && (
          <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Wrench className="mr-2 h-6 w-6 text-primary" />
                Job Management
              </CardTitle>
              <CardDescription>
                {userProfile.role === "admin" ? "Assign, schedule, and track ongoing service jobs." : "View and update your assigned jobs."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/jobs">
                  {userProfile.role === "admin" ? "Manage All Jobs" : "View My Jobs"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
         {userProfile.role === "admin" && (
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Receipt className="mr-2 h-6 w-6 text-primary" />
                  Invoice Management
                </CardTitle>
                <CardDescription>
                  Generate and manage customer invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/invoices">Manage Invoices</Link>
                </Button>
              </CardContent>
            </Card>
         )}
      </div>
    </div>
  );
}
