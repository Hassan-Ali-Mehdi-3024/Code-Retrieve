
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSidebarNavItems } from "@/config/site";
import type { NavItem, UserRole } from "@/types";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";


interface SidebarNavProps {
  role: UserRole;
  className?: string;
}

export function SidebarNav({ role, className }: SidebarNavProps) {
  const pathname = usePathname();
  const items = getSidebarNavItems(role);

  if (!items?.length) {
    return null;
  }

  return (
    <nav className={cn("flex flex-col gap-2", className)}>
      <SidebarMenu>
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        
        return (
          <SidebarMenuItem key={index}>
             <SidebarMenuButton
                asChild
                isActive={isActive}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                  !isActive && "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                tooltip={item.title}
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
      </SidebarMenu>
    </nav>
  );
}
