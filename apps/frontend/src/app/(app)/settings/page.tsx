"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { PasswordSection } from "@/components/admin/PasswordSection";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { UserManagement } from "@/components/admin/UserManagement";

type Tab = "profile" | "security" | "admin";

const tabs: Array<{ id: Tab; label: string; adminOnly?: boolean }> = [
  { id: "profile", label: "Perfil" },
  { id: "security", label: "Seguridad" },
  { id: "admin", label: "Administración", adminOnly: true },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);
  const [active, setActive] = useState<Tab>(visibleTabs[0]?.id ?? "profile");

  return (
    <section className="flex h-full min-h-0 flex-col p-container-padding sm:p-section-gap">
      <div className="flex min-h-0 flex-1 flex-col border border-outline-variant bg-surface-container-lowest">
        <div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-4 pt-4">
          <h2 className="px-0 pb-2 font-headline-xs text-headline-xs">Ajustes</h2>
          <div className="mt-2 flex gap-1 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                className={`border-b-2 px-3 py-2 font-label-caps text-label-caps uppercase ${active === tab.id ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}
                key={tab.id}
                onClick={() => setActive(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-container-padding">
          {active === "profile" && (
            <dl className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nombre</dt><dd className="mt-1 font-body-md text-body-md">{user?.name ?? "-"}</dd></div>
              <div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Email</dt><dd className="mt-1 font-data-mono text-data-mono">{user?.email}</dd></div>
              <div><dt className="font-label-caps text-label-caps uppercase text-on-surface-variant">Rol</dt><dd className="mt-1 font-data-mono text-data-mono">{user?.role}</dd></div>
            </dl>
          )}

          {active === "security" && (
            <div className="max-w-2xl">
              <PasswordSection />
            </div>
          )}

          {active === "admin" && isAdmin && (
            <div className="space-y-6">
              <SettingsForm />
              <div className="space-y-2">
                <h3 className="font-headline-xs text-headline-xs">Usuarios</h3>
                <UserManagement />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}