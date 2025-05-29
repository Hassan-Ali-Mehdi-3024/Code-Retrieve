
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, PlusCircle, Edit, Eye } from "lucide-react";
import Image from "next/image";

// Mock data for leads - replace with actual data fetching
const mockLeads = [
  { 
    id: "1", 
    companyName: "Innovatech Solutions", 
    contactName: "Alex Green", 
    email: "alex.g@innovatech.com", 
    phone: "555-0101", 
    status: "New" as "New" | "Contacted" | "Qualified" | "Lost", 
    source: "Website Inquiry", 
    dateAdded: "2024-07-15", 
    logoUrl: "https://placehold.co/40x40.png?text=IS",
    dataAiHint: "company logo" 
  },
  { 
    id: "2", 
    companyName: "Quantum Dynamics", 
    contactName: "Brenda Miles", 
    email: "b.miles@quantumdyn.com", 
    phone: "555-0102", 
    status: "Contacted" as "New" | "Contacted" | "Qualified" | "Lost", 
    source: "Referral", 
    dateAdded: "2024-07-10", 
    logoUrl: "https://placehold.co/40x40.png?text=QD",
    dataAiHint: "technology firm"
  },
  { 
    id: "3", 
    companyName: "Synergy Corp", 
    contactName: "Carl Davis", 
    email: "carl.d@synergy.org", 
    phone: "555-0103", 
    status: "Qualified" as "New" | "Contacted" | "Qualified" | "Lost", 
    source: "Trade Show", 
    dateAdded: "2024-06-20", 
    logoUrl: "https://placehold.co/40x40.png?text=SC",
    dataAiHint: "business building"
  },
];

type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost";

const getStatusBadgeVariant = (status: LeadStatus) => {
  switch (status) {
    case "New":
      return "default";
    case "Contacted":
      return "secondary";
    case "Qualified":
      return "outline"; // Consider a success-like variant if available or custom
    case "Lost":
      return "destructive";
    default:
      return "default";
  }
};


export default function AdminLeadsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile?.role !== "admin") {
      router.push("/dashboard"); // Redirect if not admin
    }
  }, [userProfile, loading, router]);

  if (loading || userProfile?.role !== "admin") {
    // Added a more specific loading message for admins
    return <p>Loading lead management or checking admin privileges...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-muted-foreground">
            Oversee and manage all potential client leads for LuxeFlow.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Lead
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5 text-primary" />
            Current Leads
          </CardTitle>
          <CardDescription>
            View and manage incoming and ongoing leads in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockLeads.length > 0 ? (
            <ul className="space-y-4">
              {mockLeads.map((lead) => (
                <li key={lead.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4 sm:gap-0">
                  <div className="flex items-center space-x-4">
                    <Image 
                      src={lead.logoUrl} 
                      alt={lead.companyName} 
                      width={40} 
                      height={40} 
                      className="rounded-md object-contain" // Use rounded-md for logos, object-contain
                      data-ai-hint={lead.dataAiHint}
                    />
                    <div>
                      <p className="font-semibold text-primary">{lead.companyName}</p>
                      <p className="text-sm font-medium">{lead.contactName}</p>
                      <p className="text-xs text-muted-foreground">{lead.email} &bull; {lead.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:space-y-1 w-full sm:w-auto mt-3 sm:mt-0">
                     <Badge variant={getStatusBadgeVariant(lead.status)} className="mb-1 sm:mb-0 self-start sm:self-auto">{lead.status}</Badge>
                     <p className="text-xs text-muted-foreground">Source: {lead.source}</p>
                     <p className="text-xs text-muted-foreground">Added: {lead.dateAdded}</p>
                     <div className="flex space-x-2 mt-2 sm:mt-1 self-start sm:self-auto">
                        <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm">
                            <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                     </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No leads found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

