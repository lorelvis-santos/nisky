"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { PendingRemindersGate } from "@/features/reminders/components/PendingRemindersGate";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopAppBar } from "@/components/ui/TopAppBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando sesión...</div>;
  }

  if (pathname === "/focus") return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopAppBar onMenu={() => setMenuOpen(true)} />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
      <PendingRemindersGate />
    </div>
  );
}
