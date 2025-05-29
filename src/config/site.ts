
import type { NavItem, UserRole } from "@/types";
import { LayoutDashboard, Users, Briefcase, FileText, Wrench, DollarSign, Settings, LogOut, UserCircle, Building, Receipt } from "lucide-react"; // Added Receipt

export const siteConfig = {
  name: "LuxeFlow",
  description: "CRM for LUXE Maintenance Corporation to automate lead management, job dispatch, and invoicing.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", 
  ogImage: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/og.jpg`,
  sidebarNav: {
    admin: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "technician"] },
      { title: "Users", href: "/admin/users", icon: Users, roles: ["admin"] },
      { title: "Leads", href: "/admin/leads", icon: Building, roles: ["admin", "sales"] },
      { title: "Customers", href: "/admin/customers", icon: Briefcase, roles: ["admin", "sales"] },
      { title: "Estimates", href: "/admin/estimates", icon: FileText, roles: ["admin", "sales"] },
      { title: "Jobs", href: "/admin/jobs", icon: Wrench, roles: ["admin", "technician"] },
      { title: "Invoices", href: "/admin/invoices", icon: Receipt, roles: ["admin"] }, // Changed icon to Receipt
      { title: "Settings", href: "/admin/settings", icon: Settings, roles: ["admin"] },
    ] as NavItem[],
    sales: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "technician"] },
      { title: "Leads", href: "/admin/leads", icon: Building, roles: ["admin", "sales"] }, // Point sales to admin leads
      { title: "Customers", href: "/admin/customers", icon: Briefcase, roles: ["admin", "sales"] }, // Point sales to admin customers
      { title: "Estimates", href: "/admin/estimates", icon: FileText, roles: ["admin", "sales"] }, // Point sales to admin estimates
    ] as NavItem[],
    technician: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "technician"] },
      { title: "My Jobs", href: "/admin/jobs", icon: Wrench, roles: ["admin", "technician"] }, // Point tech to admin jobs (filtered view)
    ] as NavItem[],
  },
  userNav: [
    { title: "Profile", href: "/profile", icon: UserCircle },
    { title: "Settings", href: "/settings", icon: Settings },
    // Logout is handled separately
  ] as NavItem[],
};

export function getSidebarNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return siteConfig.sidebarNav.admin;
    case "sales":
      // Sales users will use the admin routes for shared resources.
      // We filter siteConfig.sidebarNav.admin to only include items relevant to sales.
      return siteConfig.sidebarNav.admin.filter(item => 
        item.roles?.includes("sales")
      );
    case "technician":
      // Technicians will use the admin routes for shared resources.
      // We filter siteConfig.sidebarNav.admin to only include items relevant to technicians.
       return siteConfig.sidebarNav.admin.filter(item => 
        item.roles?.includes("technician")
      );
    default:
      return [];
  }
}

    
