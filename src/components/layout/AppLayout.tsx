
"use client";

import { useAuth } from "@/context/AuthContext";
import { SidebarNav } from "./SidebarNav";
import { UserNav } from "./UserNav";
import { siteConfig } from "@/config/site";
import { Briefcase, PanelLeft } from "lucide-react";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Image from "next/image";

function AppHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <UserNav />
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();

  if (!userProfile) {
    // This should be handled by AuthGuard or (app)/layout.tsx, but as a fallback:
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading user profile...</p>
      </div>
    ); 
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar 
        variant="sidebar" 
        collapsible="icon" 
        className="border-r bg-sidebar text-sidebar-foreground"
      >
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
            <Briefcase className="h-7 w-7 text-sidebar-primary shrink-0" />
            <span className="text-xl group-data-[collapsible=icon]:hidden whitespace-nowrap">{siteConfig.name}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarNav role={userProfile.role} />
        </SidebarContent>
        <SidebarFooter className="mt-auto border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
           <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Image 
              src={userProfile.photoURL || `https://placehold.co/40x40.png?text=${userProfile.displayName?.[0] || 'U'}`}
              alt={userProfile.displayName || "User"} 
              width={32} 
              height={32} 
              className="rounded-full"
              data-ai-hint="user avatar"
            />
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium truncate">{userProfile.displayName}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize truncate">{userProfile.role}</p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
