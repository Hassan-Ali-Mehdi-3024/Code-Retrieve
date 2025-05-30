
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

// It's good practice to have metadata for all layouts
export const metadata: Metadata = {
  title: `Client Portal - ${siteConfig.name}`,
  description: `Client portal for ${siteConfig.description}`,
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-4 px-4 md:px-6 border-b sticky top-0 z-40 bg-background/95 backdrop-blur-lg">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary">{siteConfig.name}</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            Back to Main Site
          </Link>
        </div>
      </header>
      <main className="flex-1 container mx-auto py-8 px-4 md:px-6">
        {children}
      </main>
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto py-6 px-4 md:px-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name} by LUXE Maintenance Corporation. All rights reserved.</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
