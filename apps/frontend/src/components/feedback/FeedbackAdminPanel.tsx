"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminFeedbackMutations, useAdminFeedbackQuery } from "@/features/feedback/hooks/useFeedback";
import { StatusBadge } from "@/components/feedback/MyFeedbackList";
import type { FeedbackCategory, FeedbackStatus } from "@/types/entities";

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  BUG: "Bug",
  IDEA: "Idea",
  IMPROVEMENT: "Mejora",
  OTHER: "Otro",
};

export function FeedbackAdminPanel() {
  const [category, setCategory] = useState<FeedbackCategory | "ALL">("ALL");
  const [status, setStatus] = useState<FeedbackStatus | "ALL">("ALL");

  const { data: items, isLoading } = useAdminFeedbackQuery({
    ...(category !== "ALL" ? { category } : {}),
    ...(status !== "ALL" ? { status } : {}),
    limit: 50,
  });

  const mutations = useAdminFeedbackMutations();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Filtrar por categoría" className="field w-auto" onChange={(e) => setCategory(e.target.value as FeedbackCategory | "ALL")} value={category}>
          <option value="ALL">Todas las categorías</option>
          {(Object.keys(CATEGORY_LABEL) as FeedbackCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <select aria-label="Filtrar por estado" className="field w-auto" onChange={(e) => setStatus(e.target.value as FeedbackStatus | "ALL")} value={status}>
          <option value="ALL">Todos los estados</option>
          <option value="NEW">Nuevo</option>
          <option value="REVIEWING">En revisión</option>
          <option value="RESOLVED">Resuelto</option>
        </select>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant"><Loader2 className="animate-spin" size={16} /> Cargando feedback…</p>
      ) : !items || items.length === 0 ? (
        <p className="border border-outline-variant bg-surface-container-lowest p-container-padding font-body-sm text-body-sm text-on-surface-variant">
          No hay feedback con estos filtros.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant border border-outline-variant bg-surface-container-lowest">
          {items.map((item) => (
            <li className="flex flex-wrap items-start gap-3 p-container-padding" key={item.id}>
              <div className="min-w-0 flex-1">
                <p className="text-body-md text-body-md">{item.message}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="border border-outline-variant px-1.5 py-0.5 font-label-caps text-label-caps uppercase">{CATEGORY_LABEL[item.category]}</span>
                  {item.user.name ?? item.user.email}
                  {item.contactEmail ? <span className="font-data-mono text-data-mono text-xs">({item.contactEmail})</span> : null}
                  <span>·</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={item.status} />
                <select
                  aria-label="Cambiar estado"
                  className="field h-8 w-auto text-xs"
                  onChange={(e) =>
                    mutations.update.mutate(
                      { id: item.id, status: e.target.value as FeedbackStatus },
                      {
                        onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado."),
                      },
                    )
                  }
                  value={item.status}
                >
                  <option value="NEW">Nuevo</option>
                  <option value="REVIEWING">En revisión</option>
                  <option value="RESOLVED">Resuelto</option>
                </select>
                <button
                  aria-label="Eliminar feedback"
                  className="border border-outline-variant px-2 py-2 text-sm text-error hover:bg-error-container disabled:opacity-50"
                  disabled={mutations.remove.isPending}
                  onClick={() =>
                    mutations.remove.mutate(item.id, {
                      onSuccess: () => toast.success("Feedback eliminado."),
                      onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo eliminar."),
                    })
                  }
                  title="Eliminar"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}