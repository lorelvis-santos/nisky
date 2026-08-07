"use client";

import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteMyFeedbackMutation, useMyFeedbackQuery } from "@/features/feedback/hooks/useFeedback";
import type { FeedbackCategory, FeedbackStatus } from "@/types/entities";

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  BUG: "Bug",
  IDEA: "Idea",
  IMPROVEMENT: "Mejora",
  OTHER: "Otro",
};

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  NEW: "Nuevo",
  REVIEWING: "En revisión",
  RESOLVED: "Resuelto",
};

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  NEW: "border-primary text-primary",
  REVIEWING: "border-tertiary text-tertiary",
  RESOLVED: "border-outline-variant text-on-surface-variant",
};

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span className={`inline-block border px-2 py-0.5 font-label-caps text-label-caps uppercase ${STATUS_BADGE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function MyFeedbackList() {
  const { data: items, isLoading } = useMyFeedbackQuery();
  const remove = useDeleteMyFeedbackMutation();

  if (isLoading) {
    return <p className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant"><Loader2 className="animate-spin" size={16} /> Cargando tu historial…</p>;
  }

  if (!items || items.length === 0) return null;

  return (
    <section>
      <h2 className="font-headline-xs text-headline-xs">Tu historial</h2>
      <ul className="mt-3 divide-y divide-outline-variant border border-outline-variant bg-surface-container-lowest">
        {items.map((item) => (
          <li className="flex items-start gap-3 p-container-padding" key={item.id}>
            <div className="min-w-0 flex-1">
              <p className="font-body-md text-body-md">{item.message}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <span>{CATEGORY_LABEL[item.category]}</span>
                <span>·</span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={item.status} />
              <button
                aria-label="Eliminar feedback"
                className="border border-outline-variant px-2 py-2 text-sm text-error hover:bg-error-container disabled:opacity-50"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(item.id, {
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
    </section>
  );
}