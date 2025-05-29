
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, PlusCircle } from "lucide-react";
import Image from "next/image";

// Mock data for users - replace with actual data fetching
const mockUsers = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "sales", avatar: "https://placehold.co/40x40.png?text=A" },
  { id: "2", name: "Bob Williams", email: "bob@example.com", role: "technician", avatar: "https://placehold.co/40x40.png?text=B" },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", role: "admin", avatar: "https://placehold.co/40x40.png?text=C" },
];


export default function AdminUsersPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile?.role !== "admin") {
      router.push("/dashboard"); // Redirect if not admin
    }
  }, [userProfile, loading, router]);

  if (loading || userProfile?.role !== "admin") {
    return <p>Loading or unauthorized...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users and their roles within LuxeFlow.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            Current Users
          </CardTitle>
          <CardDescription>
            View and manage existing users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockUsers.length > 0 ? (
            <ul className="space-y-4">
              {mockUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Image 
                      src={user.avatar} 
                      alt={user.name} 
                      width={40} 
                      height={40} 
                      className="rounded-full"
                      data-ai-hint="user avatar" 
                    />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm capitalize px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{user.role}</span>
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No users found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
