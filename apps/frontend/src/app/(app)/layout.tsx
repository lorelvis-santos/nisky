"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Sidebar } from "@/components/ui/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando sesión...</div>;
  }

  return <div className="flex min-h-screen bg-background"><Sidebar user={user} /><main className="min-w-0 flex-1">{children}</main></div>;
}
