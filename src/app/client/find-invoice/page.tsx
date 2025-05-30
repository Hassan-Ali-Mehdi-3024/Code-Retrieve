
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DollarSign, Loader2, AlertTriangle, Search } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function FindInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleFindInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, where("invoiceNumber", "==", invoiceNumber.trim()), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("No invoice found with that number. Please check the number and try again.");
        toast({
          title: "Invoice Not Found",
          description: "Could not find an invoice with the provided number.",
          variant: "destructive",
        });
      } else {
        const invoiceDoc = querySnapshot.docs[0];
        router.push(`/client/payment/demo?invoiceId=${invoiceDoc.id}`);
      }
    } catch (err) {
      console.error("Error finding invoice:", err);
      setError("An error occurred while searching for the invoice. Please try again later.");
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
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Pay Your Invoice</CardTitle>
          <CardDescription>
            Enter your invoice number below to proceed to payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFindInvoice} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., INV-20230101-001"
                required
                className="text-base"
              />
            </div>

            {error && (
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
                  Find Invoice
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
