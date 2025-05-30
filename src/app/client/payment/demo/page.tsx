
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign, Lock, ShieldCheck, Loader2, AlertTriangle, Info } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import { db } from "@/lib/firebase/config";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import type { InvoiceStatus, InvoiceLineItem } from "@/app/(app)/admin/invoices/page"; // Import from admin page

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  jobId?: string | null;
  estimateId?: string | null;
  dateCreated: Timestamp;
  dueDate: Timestamp;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes?: string | null;
  lastUpdated?: Timestamp;
  paidAmount?: number;
  paymentDate?: Timestamp | null;
}


export default function ClientPaymentDemoPage() {
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const idFromQuery = searchParams.get('invoiceId');
    setInvoiceId(idFromQuery);
  }, [searchParams]);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setInvoice(null); // Clear previous invoice if ID is removed
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const invoiceDocRef = doc(db, "invoices", invoiceId);
        const docSnap = await getDoc(invoiceDocRef);
        if (docSnap.exists()) {
          setInvoice({ id: docSnap.id, ...docSnap.data() } as Invoice);
        } else {
          setError(`Invoice with ID "${invoiceId}" not found or access is restricted.`);
          setInvoice(null);
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Failed to load invoice details. Please try again later.");
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const amountToPay = invoice ? (invoice.totalAmount - (invoice.paidAmount || 0)) : 125.00; // Default for demo if no invoice
  const amountDisplay = amountToPay.toFixed(2);
  const paymentButtonText = invoice ? `Pay $${amountDisplay}` : "Pay $125.00 (Demo)";

  return (
    <div className="max-w-md mx-auto py-8 px-2 sm:px-4">
      <Card className="shadow-xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">Secure Payment</CardTitle>
          <CardDescription>
            This is a demonstration page. No real payment will be processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading invoice details...
            </div>
          )}
          {error && !loading && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive">
                <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <h3 className="font-semibold text-sm">Error Loading Invoice</h3>
                </div>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}
          {!loading && !error && !invoice && invoiceId && (
            <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10 text-yellow-700">
              <div className="flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold text-sm">Invoice Not Found</h3>
              </div>
              <p className="text-xs mt-1">Could not load details for invoice ID: {invoiceId}. It might be incorrect or the invoice is no longer available.</p>
            </div>
          )}

          <div className={`p-4 border rounded-lg bg-muted/20 ${error ? 'opacity-50' : ''}`}>
            <h3 className="font-semibold mb-2 text-sm">Order Summary</h3>
            {invoice && !error ? (
              <>
                <div className="flex justify-between text-xs">
                  <span>Invoice #{invoice.invoiceNumber}</span>
                  <span>Amount Due: <span className="font-medium">${amountDisplay}</span></span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: <span className="font-medium">{invoice.status}</span>
                </p>
                 {invoice.notes && <p className="text-xs text-muted-foreground mt-1 truncate">Note: {invoice.notes}</p>}
              </>
            ) : (
               !invoiceId && (
                <>
                    <div className="flex justify-between text-xs">
                    <span>Invoice #DEMO-001</span>
                    <span>Amount Due: $125.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Service: Quarterly Maintenance Package (Demo)</p>
                </>
               )
            )}
             {!invoice && !invoiceId && !loading && !error && <p className="text-xs text-muted-foreground mt-2">Enter an invoice ID in the URL (e.g., ?invoiceId=...) to load specific details.</p>}
          </div>

          <form className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative mt-1">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="cardNumber" type="text" placeholder="•••• •••• •••• ••••" className="pl-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="text" placeholder="MM / YY" className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                 <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="cvc" type="text" placeholder="•••" className="pl-10" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="cardHolderName">Cardholder Name</Label>
              <Input id="cardHolderName" type="text" placeholder="John M. Doe" className="mt-1"/>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground !mt-8"
              onClick={(e) => {
                e.preventDefault();
                alert(`Demo Payment Submitted for ${paymentButtonText}! No actual payment was processed.`);
              }}
              disabled={loading || (invoiceId && !invoice && !error) /* Disable if trying to load specific invoice and it's not there yet (but not if general error) */}
            >
              <ShieldCheck className="mr-2 h-5 w-5" /> {paymentButtonText}
            </Button>
          </form>
           <p className="text-xs text-center text-muted-foreground flex items-center justify-center pt-4">
            <Lock className="h-3 w-3 mr-1"/> This is a simulated secure payment gateway.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

