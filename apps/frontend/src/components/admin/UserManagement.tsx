"use client";

import { useState } from "react";
import type { UserAdmin } from "@/types/admin";
import { useAdminUsersQuery } from "@/features/admin/hooks/useAdmin";
import { UserFormModal } from "./UserFormModal";
import { UserTable } from "./UserTable";

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserAdmin | null>(null);
  const [creating, setCreating] = useState(false);

  const debounced = search.trim();
  const query = useAdminUsersQuery({ q: debounced || undefined, page, limit: 10 });

  const users = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="field sm:max-w-xs"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o email..."
          value={search}
        />
        <button
          className="border border-primary bg-primary-container px-4 py-2 font-body-sm text-body-sm text-primary-foreground hover:bg-primary"
          onClick={() => setCreating(true)}
          type="button"
        >
          Nuevo usuario
        </button>
      </div>

      {query.isLoading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando usuarios...</p>
      ) : query.isError ? (
        <p className="font-body-sm text-body-sm text-error">Ups, no pudimos cargar los usuarios. Inténtalo de nuevo.</p>
      ) : users.length === 0 ? (
        <p className="border border-outline-variant bg-surface-container-lowest p-container-padding font-body-sm text-body-sm text-on-surface-variant">No se encontraron usuarios.</p>
      ) : (
        <>
          <UserTable onEdit={(user) => setEditing(user)} users={users} />
          <div className="flex items-center justify-between gap-4">
            <button
              className="border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Anterior
            </button>
            <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
              Página {query.data?.meta.currentPage ?? page} de {query.data?.meta.totalPages ?? 1} · {query.data?.meta.totalItems ?? 0} usuarios
            </span>
            <button
              className="border border-outline-variant bg-surface-container-lowest px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!query.data || query.data.meta.totalPages <= page || query.isFetching}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {(creating || editing) && (
        <UserFormModal
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          user={editing}
        />
      )}
    </div>
  );
}