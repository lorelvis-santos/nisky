"use client";

import { Activity, CheckCircle2, FileText, Link2, MessageSquare, Pencil, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { ProjectActivity } from "@/types/entities";
import { formatDateTime } from "@/lib/utils";

const labels: Record<string, string> = {
  PROJECT_CREATED: "creó el proyecto",
  PROJECT_UPDATED: "actualizó el proyecto",
  TASK_CREATED: "creó la tarea",
  TASK_UPDATED: "actualizó la tarea",
  TASK_COMPLETED: "completó la tarea",
  TASK_DELETED: "eliminó la tarea",
  SUBTASK_CREATED: "añadió una subtarea",
  SUBTASK_UPDATED: "actualizó una subtarea",
  SUBTASK_DELETED: "eliminó una subtarea",
  NOTE_CREATED: "creó la nota",
  NOTE_UPDATED: "actualizó la nota",
  NOTE_DELETED: "eliminó la nota",
  MEMBER_ADDED: "añadió a un miembro",
  MEMBER_REMOVED: "eliminó a un miembro",
  MEMBER_ROLE_CHANGED: "cambió un rol",
  COMMENT_CREATED: "comentó en el proyecto",
  RESOURCE_ADDED: "añadió un recurso",
  RESOURCE_DELETED: "eliminó un recurso",
};

function iconFor(type: string) {
  if (type.startsWith("TASK") || type.startsWith("SUBTASK")) return CheckCircle2;
  if (type.startsWith("NOTE")) return FileText;
  if (type.startsWith("MEMBER")) return UserPlus;
  if (type.startsWith("COMMENT")) return MessageSquare;
  if (type.startsWith("RESOURCE")) return Link2;
  if (type === "PROJECT_UPDATED") return Pencil;
  return Activity;
}

export function ProjectActivityTimeline({ activities }: { activities: ProjectActivity[] }) {
  if (activities.length === 0) return <div className="project-panel flex min-h-56 flex-col items-center justify-center gap-2 text-center"><Activity className="text-[#1e3a5f]" size={24} /><p className="text-[13px] font-medium text-[#2f3b45]">Aún no hay actividad.</p><p className="text-[12px] text-[#5f6872]">Los cambios del proyecto aparecerán aquí.</p></div>;
  return <div className="project-panel divide-y divide-[#e7e9e8] p-2 sm:p-4">{activities.map((item) => { const Icon = iconFor(item.type); return <article className="flex gap-3 px-2 py-4 sm:px-3" key={item.id}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e7e9e8] text-[#1e3a5f]"><Icon size={15} /></span><Avatar avatarUrl={item.actor.avatarUrl} email={item.actor.email} name={item.actor.name} size="sm" /><p className="min-w-0 flex-1 text-[13px] leading-5 text-[#5f6872]"><strong className="font-semibold text-[#2f3b45]">{item.actor.name ?? item.actor.email}</strong> {labels[item.type] ?? "hizo un cambio"}{item.entityTitle && <strong className="font-semibold text-[#2f3b45]">: {item.entityTitle}</strong>}<span className="mt-1 block text-[11px] text-[#858d91]">{formatDateTime(item.createdAt)}</span></p></article>; })}</div>;
}
