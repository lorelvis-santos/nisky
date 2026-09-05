"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

export function JournalLocked() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-container-padding">
      <div className="max-w-sm rounded-lg border border-outline-variant bg-surface p-section-gap text-center shadow-cadence-1">
        <Lock className="mx-auto text-primary" size={28} />
        <h2 className="mt-3 font-headline-xs text-headline-xs font-bold text-primary">Tu diario está protegido</h2>
        <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
          Tu diario se guarda con un candado que solo se abre mientras estás aquí. Entra de nuevo y podrás seguir escribiendo.
        </p>
        <button className="mt-4 min-h-11 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary shadow-cadence-1 transition-colors hover:bg-primary/90" onClick={() => void logout()} type="button">
          Iniciar sesión de nuevo
        </button>
      </div>
    </div>
  );
}
