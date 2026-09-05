"use client";

import { toast } from "sonner";
import { useAdminSettingsMutation, useAdminSettingsQuery } from "@/features/admin/hooks/useAdmin";

export function SettingsForm() {
  const { data, isLoading, isError } = useAdminSettingsQuery();
  const mutation = useAdminSettingsMutation();

  const toggle = async (checked: boolean) => {
    try {
      await mutation.mutateAsync({ publicSignup: checked });
      toast.success(checked ? "Registro abierto para todos" : "Registro cerrado");
    } catch {
      toast.error("Ups, no pudimos actualizar la configuración. Inténtalo de nuevo.");
    }
  };

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando configuración...</p>;
  }

  if (isError || !data) {
    return <p className="font-body-sm text-body-sm text-error">No se pudo cargar la configuración.</p>;
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface shadow-cadence-1">
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-low p-container-padding">
        <div>
          <h3 className="font-headline-xs text-headline-xs">Permitir cuentas nuevas</h3>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Deja que cualquier persona cree su cuenta en Nisky.</p>
        </div>
         <button
           aria-checked={data.publicSignup}
           aria-label="Activar o desactivar cuentas nuevas"
           className={`relative flex h-11 w-16 shrink-0 items-center rounded-full border transition-colors ${data.publicSignup ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-high"}`}
          disabled={mutation.isPending}
          onClick={() => void toggle(!data.publicSignup)}
          role="switch"
          type="button"
        >
           <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-surface transition-all ${data.publicSignup ? "right-1" : "left-1"}`} />
        </button>
      </div>
      <p className="p-container-padding font-data-mono text-data-mono text-xs text-on-surface-variant">
        {mutation.isPending ? "Guardando..." : data.publicSignup ? "Cualquier persona puede crear una cuenta" : "Solo tú puedes crear cuentas"}
      </p>
    </div>
  );
}
