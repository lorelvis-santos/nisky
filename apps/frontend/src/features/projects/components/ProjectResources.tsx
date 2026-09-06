"use client";

import { ExternalLink, Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthProvider";
import type { Project, ProjectResource } from "@/types/entities";
import { useProjectResourceMutations, useProjectResources } from "../hooks/useProjectWorkspace";

export function ProjectResources({ project }: { project: Project }) {
  const { user } = useAuth();
  const query = useProjectResources(project.id);
  const mutations = useProjectResourceMutations(project.id);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectResource | null>(null);
  const resources = query.data ?? [];

  const reset = () => {
    setTitle("");
    setUrl("");
    setDescription("");
    setFormOpen(false);
  };

  const create = async () => {
    if (!title.trim() || !url.trim()) return;
    try {
      await mutations.create.mutateAsync({ title: title.trim(), url: url.trim(), description: description.trim() || null });
      reset();
      toast.success("Recurso añadido");
    } catch (error) {
      toast.error((error as { message?: string })?.message ?? "No pudimos añadir el recurso.");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await mutations.remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Recurso eliminado");
    } catch {
      toast.error("No pudimos eliminar el recurso.");
    }
  };

  return (
    <section className="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="project-eyebrow">REFERENCIAS</p>
           <h2 className="mt-1 text-[19px] font-semibold text-[#1f2933]">Recursos del proyecto</h2>
           <p className="mt-1 text-[13px] text-[#5f6872]">Enlaces útiles para mantener el contexto cerca del trabajo.</p>
        </div>
         <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#1e3a5f] px-3.5 text-[13px] font-semibold text-white hover:bg-[#152c48]" onClick={() => setFormOpen((value) => !value)} type="button">
          <Plus size={16} /> Añadir enlace
        </button>
      </div>

      {formOpen && (
        <div className="project-panel mb-4 space-y-3 p-5">
          <input aria-label="Título del recurso" className="project-input" onChange={(event) => setTitle(event.target.value)} placeholder="Título del enlace" value={title} />
          <input aria-label="URL del recurso" className="project-input" onChange={(event) => setUrl(event.target.value)} placeholder="https://..." type="url" value={url} />
          <textarea aria-label="Descripción del recurso" className="project-input min-h-20 resize-y py-2" onChange={(event) => setDescription(event.target.value)} placeholder="Descripción opcional" value={description} />
          <div className="flex justify-end gap-2">
             <button className="min-h-10 rounded-md border border-[#dde1e2] px-3 text-[13px] font-semibold text-[#5f6872]" onClick={reset} type="button">Cancelar</button>
             <button className="min-h-10 rounded-md bg-[#1e3a5f] px-3 text-[13px] font-semibold text-white disabled:opacity-50" disabled={!title.trim() || !url.trim() || mutations.create.isPending} onClick={() => void create()} type="button">Guardar enlace</button>
          </div>
        </div>
      )}

      {query.isLoading ? (
        <div className="project-panel h-48 animate-pulse" />
      ) : query.isError ? (
        <div className="project-panel flex min-h-48 flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="text-[#c73b52]" size={22} />
           <p className="text-[13px] text-[#5f6872]">No pudimos cargar los recursos del proyecto.</p>
           <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dde1e2] px-3 text-[13px] font-semibold text-[#1e3a5f] hover:bg-[#eff1f0]" onClick={() => void query.refetch()} type="button">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : resources.length === 0 ? (
        <div className="project-panel flex min-h-48 flex-col items-center justify-center gap-2 text-center">
           <Link2 className="text-[#1e3a5f]" size={24} />
           <p className="text-[13px] font-medium text-[#2f3b45]">Aún no hay enlaces.</p>
           <p className="text-[12px] text-[#5f6872]">Añade una referencia para que el equipo la encuentre aquí.</p>
           <button className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dde1e2] px-3 text-[12px] font-semibold text-[#1e3a5f]" onClick={() => setFormOpen(true)} type="button">
            <Plus size={14} /> Añadir enlace
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <article className="project-panel flex min-w-0 items-start gap-3 p-5" key={resource.id}>
               <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e7e9e8] text-[#1e3a5f]"><Link2 size={17} /></span>
              <div className="min-w-0 flex-1">
                 <a className="inline-flex max-w-full items-center gap-1.5 text-[14px] font-semibold text-[#2f3b45] hover:text-[#1e3a5f]" href={resource.url} rel="noreferrer" target="_blank">
                  <span className="truncate">{resource.title}</span>
                  <ExternalLink className="shrink-0" size={13} />
                </a>
                 <p className="mt-1 break-all text-[12px] text-[#1e3a5f]">{resource.url}</p>
                 {resource.description && <p className="mt-2 text-[13px] leading-5 text-[#5f6872]">{resource.description}</p>}
                 <p className="mt-3 text-[11px] text-[#858d91]">Añadido por {resource.createdBy.name ?? resource.createdBy.email}</p>
              </div>
              {(resource.createdById === user?.id || project.userId === user?.id) && (
                <button aria-label={`Eliminar ${resource.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#8a95a8] hover:bg-[#fff1f3] hover:text-[#c73b52]" onClick={() => setDeleteTarget(resource)} type="button">
                  <Trash2 size={15} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          danger
          loading={mutations.remove.isPending}
          message={<>¿Eliminar <strong>{deleteTarget.title}</strong> de este proyecto?</>}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void remove()}
          title="¿Eliminar enlace?"
        />
      )}
    </section>
  );
}
