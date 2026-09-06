"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AvatarStack } from "@/components/ui/Avatar";
import type { Project, ProjectMember } from "@/types/entities";

function targetDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectHeader({
  project,
  members,
  canEdit,
  canDelete,
  onBack,
  onEdit,
  onDelete,
  onSaveDescription,
}: {
  project: Project;
  members: ProjectMember[];
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveDescription: (description: string) => Promise<void>;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionSaving, setDescriptionSaving] = useState(false);
  const isShared = !project.isDefault && members.length > 1;
  const hasDescription = Boolean(project.description?.trim());

  const openDescriptionEditor = () => {
    setDescriptionDraft(project.description ?? "");
    setDescriptionOpen(true);
  };

  const closeDescriptionEditor = () => {
    setDescriptionOpen(false);
    setDescriptionDraft(project.description ?? "");
  };

  const saveDescription = async () => {
    const description = descriptionDraft.trim();
    if (description === (project.description ?? "").trim()) {
      closeDescriptionEditor();
      return;
    }
    setDescriptionSaving(true);
    try {
      await onSaveDescription(description);
      setDescriptionOpen(false);
      toast.success("Descripción actualizada");
    } catch {
      toast.error("No pudimos actualizar la descripción.");
    } finally {
      setDescriptionSaving(false);
    }
  };

  return (
    <header className="shrink-0">
       <div className="flex items-center gap-2 text-[12px] text-[#5f6872]">
        <Link
           className="transition-colors hover:text-[#1e3a5f]"
          href="/projects"
        >
          Proyectos
        </Link>
        <span aria-hidden="true">/</span>
         <span className="max-w-[min(60vw,32rem)] truncate font-medium text-[#1f2933]">
          {project.name}
        </span>
        <button
          aria-label="Volver a proyectos"
           className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-[#5f6872] hover:bg-white hover:text-[#1e3a5f] sm:hidden"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft size={15} />
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rounded-full ring-4 ring-white/70"
              style={{ backgroundColor: project.color }}
            />
             <h1 className="min-w-0 break-words font-display-hero-mobile text-display-hero-mobile font-bold tracking-[-0.035em] text-[#1f2933] sm:font-display-hero sm:text-display-hero">
              {project.name}
            </h1>
            <span className="rounded-full border border-[#c9d0d4] bg-[#e7e9e8] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a5f]">
              {project.isDefault
                ? "Personal"
                : isShared
                  ? "Compartido"
                  : "Proyecto"}
            </span>
          </div>
          {descriptionOpen ? (
            <div className="mt-3 max-w-2xl">
              <textarea
                aria-label="Descripción del proyecto"
                autoFocus
                className="project-input min-h-24 resize-y py-2"
                maxLength={2000}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void saveDescription();
                  if (event.key === "Escape") closeDescriptionEditor();
                }}
                placeholder="Qué contexto debe conocer el equipo..."
                value={descriptionDraft}
              />
              <div className="mt-2 flex items-center gap-2">
                <button className="rounded-md border border-[#dde1e2] px-3 py-2 text-[12px] font-semibold text-[#5f6872] hover:bg-[#eff1f0]" onClick={closeDescriptionEditor} type="button">Cancelar</button>
                <button className="rounded-md bg-[#1e3a5f] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#152c48] disabled:cursor-not-allowed disabled:opacity-50" disabled={!descriptionDraft.trim() || descriptionSaving} onClick={() => void saveDescription()} type="button">{descriptionSaving ? "Guardando..." : "Guardar"}</button>
              </div>
            </div>
          ) : hasDescription ? (
             <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#5f6872]">
               {project.description}
             </p>
          ) : canEdit ? (
            <button className="mt-3 text-left text-[14px] text-[#858d91] underline decoration-dashed underline-offset-4 hover:text-[#1e3a5f]" onClick={openDescriptionEditor} type="button">
              Añade una descripción para dar contexto a este proyecto.
            </button>
          ) : (
            <p className="mt-3 text-[14px] text-[#858d91]">Este proyecto todavía no tiene descripción.</p>
          )}
           <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] text-[#5f6872]">
            {project.targetDate && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={15} />
                <span>
                   <strong className="font-semibold text-[#1f2933]">
                    Entrega
                  </strong>{" "}
                  {targetDateLabel(project.targetDate)}
                </span>
              </span>
            )}
            {members.length > 0 && (
              <span className="inline-flex items-center gap-2">
                <AvatarStack members={members} max={4} size="sm" />
                <span>
                  {members.length}{" "}
                  {members.length === 1 ? "persona" : "personas"}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              aria-expanded={moreOpen}
              aria-haspopup="menu"
               className="flex h-10 items-center gap-1.5 rounded-md border border-[#dde1e2] bg-white px-3 text-[13px] font-semibold text-[#5f6872] shadow-[0_1px_2px_rgba(31,41,51,0.03)] transition-colors hover:border-[#b8c0c4] hover:text-[#1e3a5f]"
              onClick={() => setMoreOpen((open) => !open)}
              type="button"
            >
              <MoreHorizontal size={16} />
              <span className="hidden sm:inline">Más</span>
              <ChevronDown size={13} />
            </button>
            {moreOpen && (
              <>
                <button
                  aria-label="Cerrar menú"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setMoreOpen(false)}
                  type="button"
                />
                  <div
                   className="fixed inset-x-4 bottom-4 z-30 w-auto rounded-lg border border-[#dde1e2] bg-white p-1.5 shadow-[0_12px_32px_rgba(31,41,51,0.12)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:bottom-auto sm:w-52"
                  role="menu"
                >
                  <Link
                     className="flex min-h-10 items-center gap-2 rounded-md px-3 text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
                    href={`/tasks?projectId=${encodeURIComponent(project.id)}`}
                    onClick={() => setMoreOpen(false)}
                    role="menuitem"
                  >
                    Planificación global
                  </Link>
                  {canEdit && (
                    <button
                       className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
                      onClick={() => {
                        setMoreOpen(false);
                        onEdit();
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Pencil size={14} /> Editar proyecto
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#c73b52] hover:bg-[#fff1f3]"
                      onClick={() => {
                        setMoreOpen(false);
                        onDelete();
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Trash2 size={14} /> Eliminar proyecto
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
