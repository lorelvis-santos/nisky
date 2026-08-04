"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { registerSchema, type RegisterFormData } from "@/features/auth/schemas/auth.schema";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { mutate, isPending, error } = useRegister((result) => { setAuth(result); toast.success("Cuenta creada"); router.replace("/"); });
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });
  if (process.env.NEXT_PUBLIC_PUBLIC_SIGNUP !== "true") return <section className="border border-outline-variant bg-surface-container-lowest p-6"><h1 className="font-headline-sm text-headline-sm">Registro deshabilitado</h1><Link className="mt-4 inline-block text-sm text-primary underline" href="/login">Volver al login</Link></section>;
  return <section className="w-full max-w-md border border-outline-variant bg-surface-container-lowest p-6"><div className="mb-6 border-b border-outline-variant pb-4"><p className="font-label-caps text-label-caps uppercase text-on-surface-variant">Nisky / New account</p><h1 className="mt-1 font-headline-sm text-headline-sm">Crear cuenta</h1></div><form className="space-y-4" onSubmit={handleSubmit((values) => mutate(values))}><Field label="Nombre" error={errors.name?.message}><input autoComplete="name" className="field" type="text" {...register("name")} /></Field><Field label="Email" error={errors.email?.message}><input autoComplete="email" className="field" type="email" {...register("email")} /></Field><Field label="Contraseña" error={errors.password?.message}><PasswordInput autoComplete="new-password" {...register("password")} /></Field><Field label="Confirmar contraseña" error={errors.confirmPassword?.message}><PasswordInput autoComplete="new-password" {...register("confirmPassword")} /></Field><button className="h-10 w-full border border-primary bg-primary-container px-4 font-headline-xs text-headline-xs text-primary-foreground hover:bg-primary disabled:opacity-50" disabled={isPending} type="submit">{isPending ? "Creando..." : "Crear cuenta"}</button>{error && <p className="border border-error bg-error-container p-2 text-sm text-on-error-container">{error.message}</p>}</form><p className="mt-6 text-center text-sm text-on-surface-variant">¿Ya tienes cuenta? <Link className="text-primary underline" href="/login">Iniciar sesión</Link></p></section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block font-label-caps text-label-caps uppercase text-on-surface-variant">{label}</span>{children}{error && <span className="mt-1 block text-xs text-error">{error}</span>}</label>; }
