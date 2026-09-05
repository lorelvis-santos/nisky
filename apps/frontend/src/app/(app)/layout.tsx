"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { PendingRemindersGate } from "@/features/reminders/components/PendingRemindersGate";
import { QuickCaptureModal } from "@/features/quicknotes/components/QuickCaptureModal";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { TasksSidebarProvider } from "@/context/TasksSidebarContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const stored = localStorage.getItem("app:sidebarCollapsed");
    if (stored !== null) {
      // Hydrate the client preference after SSR without changing the server markup.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(stored === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("app:sidebarCollapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setCaptureOpen(true);
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((collapsed) => {
          const next = !collapsed;
          localStorage.setItem("app:sidebarCollapsed", String(next));
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando sesión...</div>;
  }

  if (pathname === "/focus") {
    return (
      <>
        {children}
        <QuickCaptureModal onClose={() => setCaptureOpen(false)} open={captureOpen} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <TasksSidebarProvider>
        <Sidebar user={user} open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopAppBar onMenu={() => setMenuOpen(true)} onOpenCapture={() => setCaptureOpen(true)} />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </main>
      </TasksSidebarProvider>
      <PendingRemindersGate />
      <QuickCaptureModal onClose={() => setCaptureOpen(false)} open={captureOpen} />
    </div>
  );
}
