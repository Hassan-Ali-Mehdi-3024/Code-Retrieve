import type { LucideIcon } from 'lucide-react';

export type UserRole = "admin" | "sales" | "technician";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  photoURL?: string | null;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  external?: boolean;
  roles?: UserRole[];
  label?: string;
  items?: NavItem[]; // For sub-navigation
}
