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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AvatarStack } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Project, ProjectMember } from "@/types/entities";

function targetDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function resizeDescriptionInput(input: HTMLTextAreaElement) {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
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
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const cancelDescriptionRef = useRef(false);
  const isMobile = useIsMobile(639);
  const isShared = !project.isDefault && members.length > 1;
  const hasDescription = Boolean(project.description?.trim());

  const openDescriptionEditor = () => {
    cancelDescriptionRef.current = false;
    setDescriptionDraft(project.description ?? "");
    setDescriptionOpen(true);
  };

  const closeDescriptionEditor = () => {
    cancelDescriptionRef.current = true;
    setDescriptionOpen(false);
    setDescriptionDraft(project.description ?? "");
  };

  useEffect(() => {
    if (!descriptionOpen || !descriptionInputRef.current) return;
    const input = descriptionInputRef.current;
    resizeDescriptionInput(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [descriptionOpen]);

  const saveDescription = async () => {
    if (descriptionSaving) return;
    if (cancelDescriptionRef.current) {
      cancelDescriptionRef.current = false;
      return;
    }
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

  const closeMore = () => setMoreOpen(false);
  const editProject = () => {
    closeMore();
    onEdit();
  };
  const deleteProject = () => {
    closeMore();
    onDelete();
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
            <textarea
                aria-busy={descriptionSaving}
                aria-label="Descripción del proyecto"
                className="mt-3 block min-h-6 w-full max-w-2xl resize-none overflow-hidden border-0 bg-transparent p-0 text-[14px] leading-6 text-[#5f6872] outline-none placeholder:text-[#858d91] focus:border-0 focus:outline-none focus:ring-0"
                maxLength={2000}
                onBlur={() => void saveDescription()}
                onChange={(event) => {
                  setDescriptionDraft(event.target.value);
                  resizeDescriptionInput(event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void saveDescription();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeDescriptionEditor();
                  }
                }}
                placeholder="Qué contexto debe conocer el equipo..."
                ref={descriptionInputRef}
                value={descriptionDraft}
              />
          ) : hasDescription ? (
            canEdit ? (
              <button
                aria-label="Editar descripción del proyecto"
                className="group mt-3 flex w-full max-w-2xl items-start gap-2 rounded-md text-left text-[14px] leading-6 text-[#5f6872] transition-colors hover:text-[#1e3a5f]"
                onClick={openDescriptionEditor}
                title="Editar descripción"
                type="button"
              >
                <span className="min-w-0 flex-1">{project.description}</span>
                <Pencil aria-hidden="true" className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" size={13} />
              </button>
            ) : (
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#5f6872]">
                {project.description}
              </p>
            )
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
              aria-haspopup={isMobile ? "dialog" : "menu"}
               className="flex h-10 items-center gap-1.5 rounded-md border border-[#dde1e2] bg-white px-3 text-[13px] font-semibold text-[#5f6872] shadow-[0_1px_2px_rgba(31,41,51,0.03)] transition-colors hover:border-[#b8c0c4] hover:text-[#1e3a5f]"
              onClick={() => setMoreOpen((open) => !open)}
              type="button"
            >
              <MoreHorizontal size={16} />
              <span className="hidden sm:inline">Más</span>
              <ChevronDown size={13} />
            </button>
            {moreOpen && !isMobile && (
              <>
                <button
                  aria-label="Cerrar menú"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={closeMore}
                  type="button"
                />
                <div
                  className="absolute right-0 top-12 z-30 w-52 rounded-lg border border-[#dde1e2] bg-white p-1.5 shadow-[0_12px_32px_rgba(31,41,51,0.12)]"
                  role="menu"
                >
                  <Link
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
                    href={`/tasks?projectId=${encodeURIComponent(project.id)}`}
                    onClick={closeMore}
                    role="menuitem"
                  >
                    Planificación global
                  </Link>
                  {canEdit && (
                    <button
                      className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
                      onClick={editProject}
                      role="menuitem"
                      type="button"
                    >
                      <Pencil size={14} /> Editar proyecto
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-[13px] text-[#c73b52] hover:bg-[#fff1f3]"
                      onClick={deleteProject}
                      role="menuitem"
                      type="button"
                    >
                      <Trash2 size={14} /> Eliminar proyecto
                    </button>
                  )}
                </div>
              </>
            )}
            <BottomSheet
              description="Acciones disponibles para este proyecto."
              onClose={closeMore}
              open={moreOpen && isMobile}
              title="Acciones del proyecto"
            >
              <div className="space-y-1 p-4">
                <Link
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[14px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
                  href={`/tasks?projectId=${encodeURIComponent(project.id)}`}
                  onClick={closeMore}
                >
                  <CalendarDays size={17} />
                  Planificación global
                </Link>
                {canEdit && (
                  <button
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] text-[#4f5a63] hover:bg-[#eff1f0] hover:text-[#1e3a5f]"
                    onClick={editProject}
                    type="button"
                  >
                    <Pencil size={17} />
                    Editar proyecto
                  </button>
                )}
                {canDelete && (
                  <button
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] text-[#c73b52] hover:bg-[#fff1f3]"
                    onClick={deleteProject}
                    type="button"
                  >
                    <Trash2 size={17} />
                    Eliminar proyecto
                  </button>
                )}
              </div>
            </BottomSheet>
          </div>
        </div>
      </div>
    </header>
  );
}
