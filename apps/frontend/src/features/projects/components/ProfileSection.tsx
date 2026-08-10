"use client";

import { Camera, Check, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import type { User } from "@/types/entities";
import { useProfileMutations } from "../hooks/useProjects";

export function ProfileSection() {
  const { user, accessToken, setAuth } = useAuth();
  const mutations = useProfileMutations();
  const [name, setName] = useState(user?.name ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyUser = (updated: Partial<User>) => {
    if (user && accessToken) setAuth({ accessToken, user: { ...user, ...updated } });
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      applyUser(await mutations.update.mutateAsync({ name: trimmed }));
      setEditing(false);
      toast.success("¡Perfil actualizado!");
    } catch {
      toast.error("Ups, no pudimos guardar tu perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true);
    try {
      applyUser(await mutations.avatar.mutateAsync(file));
      toast.success("¡Foto actualizada!");
    } catch {
      toast.error("Ups, no pudimos subir tu foto. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    setSaving(true);
    try {
      applyUser(await mutations.removeAvatar.mutateAsync());
      toast.success("Foto eliminada");
    } catch {
      toast.error("Ups, no pudimos quitar tu foto. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Tu foto de perfil" className="h-20 w-20 rounded-full border border-outline-variant object-cover" src={user.avatarUrl} />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-headline-sm text-headline-sm text-primary">
            {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="space-y-2">
          <input
            accept="image/*"
            className="hidden"
            onChange={(event) => void upload(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Camera size={14} /> {user?.avatarUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {user?.avatarUrl && (
            <button
              className="flex items-center gap-1.5 border border-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
              disabled={saving}
              onClick={() => void removePhoto()}
              type="button"
            >
              <X size={14} /> Quitar foto
            </button>
          )}
        </div>
      </div>

      <div>
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">NOMBRE</span>
        {editing ? (
          <div className="mt-1 flex gap-2">
            <input
              autoFocus
              className="field max-w-xs"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveName();
              }}
              value={name}
            />
            <button aria-label="Guardar nombre" className="flex items-center gap-1 border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-primary hover:bg-surface-container-high disabled:opacity-50" disabled={saving || !name.trim()} onClick={() => void saveName()} type="button">
              <Check size={14} /> Guardar
            </button>
            <button className="border border-outline-variant px-2 py-1.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high" onClick={() => { setEditing(false); setName(user?.name ?? ""); }} type="button">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <p className="font-body-md text-body-md">{user?.name ?? "-"}</p>
            <button className="border border-outline-variant px-2 py-1 font-body-sm text-body-sm text-primary hover:bg-surface-container-high" onClick={() => setEditing(true)} type="button">
              Editar
            </button>
          </div>
        )}
      </div>

      <div>
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">EMAIL</span>
        <p className="mt-1 font-data-mono text-data-mono">{user?.email}</p>
      </div>
    </div>
  );
}