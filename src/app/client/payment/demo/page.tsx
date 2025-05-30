
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign, Lock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Payment Demo",
};

export default function ClientPaymentDemoPage() {
  return (
    <div className="max-w-md mx-auto py-8">
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
          <div className="p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold mb-2 text-sm">Order Summary (Example)</h3>
            <div className="flex justify-between text-xs">
              <span>Invoice #DEMO-001</span>
              <span>Amount Due: $125.00</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Service: Quarterly Maintenance Package</p>
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
                alert("Demo Payment Submitted! No actual payment was processed.");
              }}
            >
              <ShieldCheck className="mr-2 h-5 w-5" /> Pay $125.00 (Demo)
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
