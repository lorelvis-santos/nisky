"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useChangePassword } from "@/features/auth/hooks/useAuthConfig";

const schema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
  newPassword: z.string().min(8, "Mínimo 8 caracteres").regex(/[A-Z]/, "Incluye una mayúscula").regex(/[0-9]/, "Incluye un número"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export function PasswordSection() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const mutation = useChangePassword(() => {
    toast.success("¡Contraseña actualizada!");
    reset();
  });

  return (
    <div className="rounded-lg border border-outline-variant bg-surface p-container-padding shadow-cadence-1">
      <h3 className="font-headline-xs text-headline-xs text-on-surface">Cambiar contraseña</h3>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Al cambiarla, se cerrarán todas tus sesiones activas.</p>
      <form className="mt-4 max-w-sm space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant">Contraseña actual</span>
          <PasswordInput autoComplete="current-password" {...register("currentPassword")} />
          {errors.currentPassword && <span className="mt-1 block text-xs text-error">{errors.currentPassword.message}</span>}
        </label>
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant">Nueva contraseña</span>
          <PasswordInput autoComplete="new-password" {...register("newPassword")} />
          {errors.newPassword && <span className="mt-1 block text-xs text-error">{errors.newPassword.message}</span>}
        </label>
        <label className="block">
          <span className="font-label-md text-label-md text-on-surface-variant">Confirmar nueva contraseña</span>
          <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && <span className="mt-1 block text-xs text-error">{errors.confirmPassword.message}</span>}
        </label>
        <button className="min-h-11 rounded-md bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Guardando..." : "Actualizar contraseña"}
        </button>
        {mutation.error && <p className="rounded-md border border-error bg-error-container p-2 font-body-sm text-body-sm text-on-error-container">{mutation.error.message}</p>}
      </form>
    </div>
  );
}
