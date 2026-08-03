"use client";

import { useAuth } from "@/context/AuthProvider";

export default function DashboardPage() {
  const { user } = useAuth();
  return <div className="min-h-screen"><header className="flex h-14 items-center justify-between border-b border-outline-variant bg-surface px-container-padding"><div><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nisky / Operations</p><h1 className="font-headline-sm text-headline-sm">Dashboard</h1></div><span className="font-data-mono text-data-mono text-on-surface-variant">{user?.role}</span></header><section className="p-section-gap"><div className="border border-outline-variant bg-surface-container-lowest p-container-padding"><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Sesión activa</p><h2 className="mt-1 font-headline-xs text-headline-xs">Bienvenido, {user?.name ?? user?.email}</h2><p className="mt-2 max-w-xl font-body-md text-body-md text-on-surface-variant">La fundación de Nisky está lista. Los módulos de gestión diaria, CRM y finanzas se añadirán sobre esta base multiusuario.</p></div></section></div>;
}
