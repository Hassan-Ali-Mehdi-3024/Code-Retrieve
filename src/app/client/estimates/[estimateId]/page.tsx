
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Printer, Download, AlertTriangle, Mail, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { format } from "date-fns";

interface ClientEstimatePageProps {
  params: { estimateId: string };
}

type EstimateStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  dateCreated: Timestamp;
  validUntil: Timestamp;
  status: EstimateStatus;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  jobCreated?: boolean;
}

// Static company details for display on the estimate
const companyDetails = {
  name: "LuxeFlow by LUXE Maintenance Corporation",
  address: "123 Luxe Lane, Prestige City, ST 12345",
  phone: "(555) 123-4567",
  email: "quotes@luxeflow.com",
};

export default function ClientEstimatePage({ params }: ClientEstimatePageProps) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstimate = async () => {
      if (!params.estimateId) {
        setError("No estimate ID provided.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const estimateDocRef = doc(db, "estimates", params.estimateId);
        const docSnap = await getDoc(estimateDocRef);

        if (docSnap.exists()) {
          setEstimate({ id: docSnap.id, ...docSnap.data() } as Estimate);
        } else {
          setError("Estimate not found or you do not have permission to view it.");
        }
      } catch (err) {
        console.error("Error fetching estimate:", err);
        setError("Failed to load estimate details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [params.estimateId]);

  const getStatusBadgeVariant = (status: EstimateStatus | undefined) => {
    if (!status) return "default";
    switch (status) {
      case "Draft": case "Expired": return "secondary";
      case "Sent": return "default";
      case "Accepted": return "outline";
      case "Rejected": return "destructive";
      default: return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center py-10 max-w-lg mx-auto">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Loading estimate details...</p>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="text-center py-10 max-w-lg mx-auto">
        <Card className="border-destructive shadow-lg">
            <CardHeader>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">Access Denied or Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                  {error || `The estimate ID "${params.estimateId}" could not be found or is no longer available.`}
                </p>
                <p className="text-muted-foreground mt-2">
                  Please check the link or contact support if you believe this is an error.
                </p>
            </CardContent>
            <CardFooter className="flex justify-center pt-4">
                <Button variant="outline" asChild>
                    <a href={`mailto:${companyDetails.email}`}>
                        <Mail className="mr-2 h-4 w-4"/> Contact Support
                    </a>
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4">
      <Card className="shadow-xl border print:shadow-none print:border-none">
        <CardHeader className="border-b pb-6 bg-muted/30 print:bg-transparent">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-lg font-semibold text-primary">{companyDetails.name}</h1>
              <p className="text-xs text-muted-foreground">{companyDetails.address}</p>
              <p className="text-xs text-muted-foreground">{companyDetails.phone} • {companyDetails.email}</p>
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0">
                <h2 className="text-2xl font-bold text-primary tracking-tight">ESTIMATE</h2>
                <p className="text-sm font-semibold text-muted-foreground">#{estimate.estimateNumber}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start">
            <div>
                <p className="text-xs text-muted-foreground">BILLED TO</p>
                <p className="font-semibold">{estimate.customerName}</p>
                {estimate.customerEmail && <p className="text-xs text-muted-foreground">{estimate.customerEmail}</p>}
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0">
                <p className="text-xs text-muted-foreground">Date of Issue: <span className="font-medium text-foreground">{format(estimate.dateCreated.toDate(), "PPP")}</span></p>
                <p className="text-xs text-muted-foreground">Valid Until: <span className="font-medium text-foreground">{format(estimate.validUntil.toDate(), "PPP")}</span></p>
                <Badge variant={getStatusBadgeVariant(estimate.status)} className="mt-1 text-xs">{estimate.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4 text-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lineItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="py-3 px-3 text-left">{item.description}</td>
                      <td className="py-3 px-3 text-center">{item.quantity}</td>
                      <td className="py-3 px-3 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-medium">${Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
                <div className="w-full sm:w-64 space-y-1">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">${estimate.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax ({(estimate.taxRate * 100).toFixed(1)}%):</span>
                        <span className="font-medium">${estimate.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-1 mt-1">
                        <span className="text-primary">Total Amount:</span>
                        <span className="text-primary">${estimate.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {estimate.notes && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold text-muted-foreground mb-1 text-xs uppercase">Notes:</h4>
                <p className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap text-xs">{estimate.notes}</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Downloading PDF... (Functionality to be implemented)")}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              {estimate.status === "Sent" && (
                 <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => alert("Estimate Accepted! (Backend action required)")}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Accept Estimate
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => alert("Estimate Rejected. (Backend action required)")}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject Estimate
                    </Button>
                 </>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 print:hidden">
             <p className="text-xs text-center text-muted-foreground w-full">
                Questions about this estimate? Contact us at <a href={`mailto:${companyDetails.email}`} className="text-primary hover:underline">{companyDetails.email}</a> or call <a href={`tel:${companyDetails.phone}`} className="text-primary hover:underline">{companyDetails.phone}</a>.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
