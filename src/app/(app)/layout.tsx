
"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          <Skeleton className="h-4 w-[250px] bg-muted" />
          <Skeleton className="h-4 w-[200px] bg-muted" />
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
