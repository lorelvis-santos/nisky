"use client";

import { useAuth } from "@/context/AuthProvider";
import type { UserAdmin } from "@/types/admin";

type Props = {
  users: UserAdmin[];
  onEdit: (user: UserAdmin) => void;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function UserTable({ users, onEdit }: Props) {
  const { user: me } = useAuth();
  return (
    <div className="overflow-x-auto border border-outline-variant bg-surface-container-lowest">
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            <th className="font-label-caps text-label-caps uppercase text-on-surface-variant px-4 py-3">Usuario</th>
            <th className="font-label-caps text-label-caps uppercase text-on-surface-variant px-4 py-3">Rol</th>
            <th className="font-label-caps text-label-caps uppercase text-on-surface-variant px-4 py-3">Estado</th>
            <th className="font-label-caps text-label-caps uppercase text-on-surface-variant px-4 py-3">Último acceso</th>
            <th className="font-label-caps text-label-caps uppercase text-on-surface-variant px-4 py-3">Creado</th>
            <th className="font-label-caps text-label-caps uppercase text-on-surface-variant px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === me?.id;
            return (
              <tr className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low" key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-body-md text-body-md">{user.name ?? "-"}{isSelf && <span className="ml-2 text-on-surface-variant">(tú)</span>}</p>
                  <p className="font-data-mono text-data-mono text-xs text-on-surface-variant">{user.email}</p>
                </td>
                <td className="px-4 py-3 font-data-mono text-data-mono text-body-sm">{user.role}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block border px-2 py-0.5 font-label-caps text-label-caps uppercase ${user.isActive ? "border-outline-variant text-on-surface" : "border-error text-error"}`}>
                    {user.isActive ? "Activo" : "Deshabilitado"}
                  </span>
                </td>
                <td className="px-4 py-3 font-data-mono text-data-mono text-xs text-on-surface-variant">{formatDate(user.lastLoginAt)}</td>
                <td className="px-4 py-3 font-data-mono text-data-mono text-xs text-on-surface-variant">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button className="px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" onClick={() => onEdit(user)} type="button">Editar</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}