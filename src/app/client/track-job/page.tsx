
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2, AlertTriangle, Search, Info, CalendarDays, UserCircle, BadgeHelp } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/app/(app)/admin/jobs/page"; // Assuming JobStatus is exported

interface Job {
  id: string;
  jobNumber: string;
  customerName: string; // Masked or partial for privacy
  description: string; // Keep generic
  status: JobStatus;
  scheduledDate?: Timestamp | null;
  completionDate?: Timestamp | null;
  notes?: string | null; // Public notes only
}

const getStatusBadgeVariant = (status: JobStatus | undefined) => {
  if (!status) return "default";
  switch (status) {
    case "Pending Schedule": return "secondary";
    case "Scheduled": return "default";
    case "Dispatched": return "outline";
    case "In Progress": return "default";
    case "On Hold": return "secondary";
    case "Completed": return "outline";
    case "Cancelled": return "destructive";
    case "Requires Follow-up": return "destructive";
    default: return "default";
  }
};

export default function TrackJobPage() {
  const [jobNumber, setJobNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const { toast } = useToast();

  const handleTrackJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobNumber.trim()) {
      setError("Please enter a job number.");
      setJobDetails(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setJobDetails(null);

    try {
      const jobsRef = collection(db, "jobs");
      const q = query(jobsRef, where("jobNumber", "==", jobNumber.trim()), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No job found with that number. Please check the number and try again.");
        toast({
          title: "Job Not Found",
          description: "Could not find a job with the provided number.",
          variant: "destructive",
        });
      } else {
        const jobDoc = querySnapshot.docs[0];
        const data = jobDoc.data();
        // Ensure only public-safe fields are extracted
        setJobDetails({
          id: jobDoc.id,
          jobNumber: data.jobNumber,
          customerName: data.customerName ? data.customerName.substring(0, 3) + '...' : 'Valued Customer', // Mask customer name
          description: data.description || "Service Job", // Keep description generic
          status: data.status as JobStatus,
          scheduledDate: data.scheduledDate || null,
          completionDate: data.completionDate || null,
          notes: data.notes || null, // Assuming 'notes' are public-facing if present
        });
      }
    } catch (err) {
      console.error("Error finding job:", err);
      setError("An error occurred while searching for the job. Please try again later.");
      toast({
        title: "Search Error",
        description: "Could not perform the search due to an error.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Track Your Job</CardTitle>
          <CardDescription>
            Enter your job number below to see its current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrackJob} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="jobNumber">Job Number</Label>
              <Input
                id="jobNumber"
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="e.g., JOB-20230101-001"
                required
                className="text-base"
              />
            </div>

            {error && !isLoading && (
              <div className="p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Track Job
                </>
              )}
            </Button>
          </form>

          {jobDetails && !isLoading && !error && (
            <Card className="mt-8 shadow-md border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <Info className="h-5 w-5 mr-2 text-primary" />
                    Job Status: {jobDetails.jobNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center">
                    <UserCircle className="h-4 w-4 mr-2 text-muted-foreground"/>
                    <p><strong className="text-muted-foreground">Customer:</strong> {jobDetails.customerName}</p>
                </div>
                <div className="flex items-center">
                    <BadgeHelp className="h-4 w-4 mr-2 text-muted-foreground"/>
                    <p><strong className="text-muted-foreground">Status:</strong> <Badge variant={getStatusBadgeVariant(jobDetails.status)}>{jobDetails.status}</Badge></p>
                </div>
                <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground"/>
                    <p><strong className="text-muted-foreground">Scheduled:</strong> {jobDetails.scheduledDate ? format(jobDetails.scheduledDate.toDate(), "PPP") : "Not yet scheduled"}</p>
                </div>
                {jobDetails.status === "Completed" && jobDetails.completionDate && (
                    <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 mr-2 text-green-600"/>
                        <p><strong className="text-muted-foreground">Completed:</strong> <span className="text-green-600">{format(jobDetails.completionDate.toDate(), "PPP")}</span></p>
                    </div>
                )}
                 <p className="text-xs text-muted-foreground pt-2 border-t border-dashed mt-3">Description: {jobDetails.description}</p>
                {jobDetails.notes && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground">Notes:</p>
                    <p className="text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded-sm">{jobDetails.notes}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">If you have questions, please contact support.</p>
              </CardFooter>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
