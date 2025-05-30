
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Printer, Download, AlertTriangle, Mail } from "lucide-react";
import type { Metadata } from "next";

// For a dynamic page, metadata generation can be more complex if data-dependent
// Since we are marking this as "use client", generateMetadata needs to be handled differently
// or moved to a parent layout if dynamic data from this level is needed.
// For now, we'll remove it or keep it static if not dependent on client-side fetched data.
// Let's assume for this fix, the metadata can be simplified or handled by the layout.
// export async function generateMetadata({ params }: ClientEstimatePageProps): Promise<Metadata> {
//   return {
//     title: `View Estimate #${params.estimateId}`,
//   };
// }

interface ClientEstimatePageProps {
  params: { estimateId: string };
}

type EstimateStatus = "Sent" | "Accepted" | "Rejected" | "Draft" | "Expired";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface MockEstimate {
  estimateNumber: string;
  customerName: string;
  dateCreated: string;
  validUntil: string;
  status: EstimateStatus;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

// Mock estimate data - replace with actual data fetching in a real application
const getMockEstimateData = (estimateId: string): MockEstimate | null => {
  if (estimateId.startsWith("EST-DEMO") || estimateId.startsWith("EST-2024")) {
    return {
      estimateNumber: estimateId,
      customerName: "Valued Client",
      dateCreated: "July 28, 2024",
      validUntil: "August 27, 2024",
      status: "Sent",
      lineItems: [
        { description: "Premium Landscaping Package - Phase 1", quantity: 1, unitPrice: 450.00, totalPrice: 450.00 },
        { description: "Seasonal Flower Bed Planting (Assorted Perennials)", quantity: 2, unitPrice: 75.00, totalPrice: 150.00 },
        { description: "Irrigation System Check & Minor Adjustments", quantity: 1, unitPrice: 120.00, totalPrice: 120.00 },
      ],
      subtotal: 720.00,
      taxRate: 0.08, // 8%
      taxAmount: 57.60,
      totalAmount: 777.60,
      notes: "This estimate includes all specified materials and labor. Payment terms: 50% upfront, 50% upon completion. This estimate is valid for 30 days from the date of issue. Thank you for choosing LuxeFlow!",
      companyAddress: "123 Luxe Lane, Prestige City, ST 12345",
      companyPhone: "(555) 123-4567",
      companyEmail: "quotes@luxeflow.com"
    };
  }
  return null;
};


export default function ClientEstimatePage({ params }: ClientEstimatePageProps) {
  const estimate = getMockEstimateData(params.estimateId);

  if (!estimate) {
    return (
      <div className="text-center py-10 max-w-lg mx-auto">
        <Card className="border-destructive">
            <CardHeader>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-xl text-destructive">Estimate Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                The estimate ID <code className="bg-muted px-1 py-0.5 rounded-sm">{params.estimateId}</code> could not be found or is no longer available.
                Please check the link or contact support.
                </p>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button variant="outline" asChild>
                    <a href={`mailto:${getMockEstimateData("EST-DEMO")?.companyEmail || 'support@luxeflow.com'}`}> {/* Use a default or fetched company email */}
                        <Mail className="mr-2 h-4 w-4"/> Contact Support
                    </a>
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: EstimateStatus) => {
    switch (status) {
      case "Draft": case "Expired": return "secondary";
      case "Sent": return "default";
      case "Accepted": return "outline";
      case "Rejected": return "destructive";
      default: return "default";
    }
  };


  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-xl border">
        <CardHeader className="border-b pb-6 bg-muted/30">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-sm font-semibold text-primary">{estimate.companyAddress}</h1>
              <p className="text-xs text-muted-foreground">{estimate.companyPhone} • {estimate.companyEmail}</p>
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
                {/* Add customer address if available */}
            </div>
            <div className="text-left sm:text-right mt-2 sm:mt-0">
                <p className="text-xs text-muted-foreground">Date of Issue: <span className="font-medium text-foreground">{estimate.dateCreated}</span></p>
                <p className="text-xs text-muted-foreground">Valid Until: <span className="font-medium text-foreground">{estimate.validUntil}</span></p>
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
                  {estimate.lineItems.map((item, index) => (
                    <tr key={index} className={`${index < estimate.lineItems.length - 1 ? 'border-b' : ''}`}>
                      <td className="py-3 px-3 text-left">{item.description}</td>
                      <td className="py-3 px-3 text-center">{item.quantity}</td>
                      <td className="py-3 px-3 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
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
                        <span className="text-muted-foreground">Tax ({(estimate.taxRate * 100).toFixed(0)}%):</span>
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

            <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Downloading PDF... (Demo)")}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              {estimate.status === "Sent" && (
                 <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => alert("Estimate Accepted! (Demo Action)")}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Accept Estimate
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => alert("Estimate Rejected. (Demo Action)")}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject Estimate
                    </Button>
                 </>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
             <p className="text-xs text-center text-muted-foreground w-full">
                Questions about this estimate? Contact us at <a href={`mailto:${estimate.companyEmail}`} className="text-primary hover:underline">{estimate.companyEmail}</a> or call <a href={`tel:${estimate.companyPhone}`} className="text-primary hover:underline">{estimate.companyPhone}</a>.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
