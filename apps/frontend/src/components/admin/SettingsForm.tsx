"use client";

import { toast } from "sonner";
import { useAdminSettingsMutation, useAdminSettingsQuery } from "@/features/admin/hooks/useAdmin";

export function SettingsForm() {
  const { data, isLoading, isError } = useAdminSettingsQuery();
  const mutation = useAdminSettingsMutation();

  const toggle = async (checked: boolean) => {
    try {
      await mutation.mutateAsync({ publicSignup: checked });
      toast.success(checked ? "Registro público habilitado" : "Registro público deshabilitado");
    } catch {
      toast.error("No se pudo actualizar la configuración");
    }
  };

  if (isLoading) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando configuración...</p>;
  }

  if (isError || !data) {
    return <p className="font-body-sm text-body-sm text-error">No se pudo cargar la configuración.</p>;
  }

  return (
    <div className="border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-surface-container-low p-container-padding">
        <div>
          <h3 className="font-headline-xs text-headline-xs">Registro público</h3>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Permite que cualquier persona cree una cuenta en Nisky.</p>
        </div>
        <button
          aria-checked={data.publicSignup}
          aria-label="Alternar registro público"
          className={`relative h-6 w-11 shrink-0 border transition-colors ${data.publicSignup ? "border-primary bg-primary" : "border-outline-variant bg-surface-container-high"}`}
          disabled={mutation.isPending}
          onClick={() => void toggle(!data.publicSignup)}
          role="switch"
          type="button"
        >
          <span className={`absolute top-0.5 h-[18px] w-[18px] bg-surface transition-all ${data.publicSignup ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      <p className="p-container-padding font-data-mono text-data-mono text-xs text-on-surface-variant">
        {mutation.isPending ? "Guardando..." : data.publicSignup ? "El registro público está habilitado" : "El registro público está deshabilitado"}
      </p>
    </div>
  );
}