
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
      { title: "Invoices", href: "/admin/invoices", icon: Receipt, roles: ["admin"] }, 
      { title: "Settings", href: "/settings", icon: Settings, roles: ["admin", "sales", "technician"] }, // Changed href and roles
    ] as NavItem[],
    sales: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "technician"] },
      { title: "Leads", href: "/admin/leads", icon: Building, roles: ["admin", "sales"] }, 
      { title: "Customers", href: "/admin/customers", icon: Briefcase, roles: ["admin", "sales"] }, 
      { title: "Estimates", href: "/admin/estimates", icon: FileText, roles: ["admin", "sales"] },
      { title: "Settings", href: "/settings", icon: Settings, roles: ["admin", "sales", "technician"] },
    ] as NavItem[],
    technician: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "technician"] },
      { title: "My Jobs", href: "/admin/jobs", icon: Wrench, roles: ["admin", "technician"] }, 
      { title: "Settings", href: "/settings", icon: Settings, roles: ["admin", "sales", "technician"] },
    ] as NavItem[],
  },
  userNav: [
    { title: "Profile", href: "/profile", icon: UserCircle }, // This could perhaps link to /settings#profile or be removed if settings covers it
    // { title: "Settings", href: "/settings", icon: Settings }, // This is now in the main sidebar
    // Logout is handled separately
  ] as NavItem[],
};

export function getSidebarNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return siteConfig.sidebarNav.admin;
    case "sales":
      return siteConfig.sidebarNav.admin.filter(item => 
        item.roles?.includes("sales")
      );
    case "technician":
       return siteConfig.sidebarNav.admin.filter(item => 
        item.roles?.includes("technician")
      );
    default:
      return [];
  }
}

    