"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { loginSchema, type LoginFormData } from "@/features/auth/schemas/auth.schema";
import type { ApiError } from "@/types/api.types";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { mutate, isPending, error } = useLogin((result) => {
    setAuth(result);
    toast.success("Bienvenido a Nisky");
    const redirect = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("redirect") || "/";
    router.replace(redirect);
  });
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  return <section className="w-full max-w-md border border-outline-variant bg-surface-container-lowest p-6"><div className="mb-6 border-b border-outline-variant pb-4"><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nisky / Access</p><h1 className="mt-1 font-headline-sm text-headline-sm text-on-surface">Iniciar sesión</h1><p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Accede a tu consola de gestión.</p></div><form className="space-y-4" onSubmit={handleSubmit((values) => mutate(values))}><Field label="Email" error={errors.email?.message}><input autoComplete="email" className="field" type="email" {...register("email")} /></Field><Field label="Contraseña" error={errors.password?.message}><input autoComplete="current-password" className="field" type="password" {...register("password")} /></Field><button className="h-10 w-full border border-primary bg-primary-container px-4 font-headline-xs text-headline-xs text-primary-foreground hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isPending} type="submit">{isPending ? "Validando..." : "Ingresar"}</button>{error && <MutationError error={error as ApiError} />}</form>{process.env.NEXT_PUBLIC_PUBLIC_SIGNUP === "true" && <p className="mt-6 text-center font-body-sm text-body-sm text-on-surface-variant">¿No tienes cuenta? <Link className="text-primary underline" href="/register">Crear cuenta</Link></p>}</section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">{label}</span>{children}{error && <span className="mt-1 block text-xs text-error">{error}</span>}</label>; }
function MutationError({ error }: { error?: ApiError }) { return error ? <p className="border border-error bg-error-container p-2 text-sm text-on-error-container">{error.message}</p> : null; }
