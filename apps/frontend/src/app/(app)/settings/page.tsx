"use client";

import { useAuth } from "@/context/AuthProvider";

export default function SettingsPage() {
  const { user } = useAuth();
  return <div className="min-h-screen"><header className="flex h-14 items-center border-b border-outline-variant bg-surface px-container-padding"><h1 className="font-headline-sm text-headline-sm">Ajustes</h1></header><section className="max-w-2xl p-section-gap"><div className="border border-outline-variant bg-surface-container-lowest"><div className="border-b border-outline-variant bg-surface-container-low p-container-padding"><h2 className="font-headline-xs text-headline-xs">Perfil</h2></div><dl className="grid gap-4 p-container-padding sm:grid-cols-2"><div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nombre</dt><dd className="mt-1 font-body-md text-body-md">{user?.name ?? "-"}</dd></div><div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Email</dt><dd className="mt-1 font-data-mono text-data-mono">{user?.email}</dd></div><div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Rol</dt><dd className="mt-1 font-data-mono text-data-mono">{user?.role}</dd></div></dl></div></section></div>;
}
