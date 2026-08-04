"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useHabitsQuery, useHabitMutations } from "../hooks/useHabits";

export function HabitManager({ onClose }: { onClose: () => void }) {
  const query = useHabitsQuery({ includeArchived: true });
  const mutations = useHabitMutations();
  const [newName, setNewName] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await mutations.create.mutateAsync({ name, frequency: "DAILY" });
      setNewName("");
      toast.success("Hábito añadido");
    } catch {
      toast.error("No se pudo crear el hábito");
    }
  };

  const rename = async (id: string) => {
    const name = names[id]?.trim();
    const original = query.data?.find((habit) => habit.id === id)?.name;
    if (!name || name === original) return;
    try {
      await mutations.update.mutateAsync({ id, payload: { name } });
    } catch {
      toast.error("No se pudo actualizar el hábito");
    }
  };

  const archive = async (id: string) => {
    try {
      await mutations.update.mutateAsync({ id, payload: { archived: true } });
      toast.success("Hábito archivado");
    } catch {
      toast.error("No se pudo archivar el hábito");
    }
  };

  const restore = async (id: string) => {
    try {
      await mutations.update.mutateAsync({ id, payload: { archived: false } });
      toast.success("Hábito restaurado");
    } catch {
      toast.error("No se pudo restaurar el hábito");
    }
  };

  const remove = async (id: string) => {
    if (deleteId !== id) {
      setDeleteId(id);
      return;
    }
    try {
      await mutations.remove.mutateAsync(id);
      setDeleteId(null);
      toast.success("Hábito eliminado");
    } catch {
      toast.error("No se pudo eliminar el hábito");
    }
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-on-surface/20 p-4 backdrop-blur-[1px]" role="dialog">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col border border-outline-variant bg-surface">
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-5 py-4">
          <h2 className="font-headline-xs text-headline-xs font-bold text-primary">Gestionar hábitos</h2>
          <button aria-label="Cerrar" className="text-on-surface-variant hover:text-on-surface" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="flex gap-2">
            <input className="field" onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void create(); }} placeholder="Nuevo hábito..." value={newName} />
            <button className="border border-outline-variant px-3 font-body-sm text-body-sm hover:bg-surface-container-high" onClick={() => void create()} type="button">Añadir</button>
          </div>
          {query.isLoading ? <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando hábitos...</p> : (query.data ?? []).length === 0 ? <p className="font-body-sm text-body-sm text-on-surface-variant">No tienes hábitos configurados.</p> : (
            <div className="space-y-4">
              <div className="divide-y divide-outline-variant border-y border-outline-variant">
              {(query.data ?? []).filter((habit) => !habit.archived).map((habit) => (
                <div className="flex items-center gap-2 py-2" key={habit.id}>
                  <input className="field h-8" onBlur={() => void rename(habit.id)} onChange={(event) => setNames((current) => ({ ...current, [habit.id]: event.target.value }))} value={names[habit.id] ?? habit.name} />
                  <button aria-label={`Archivar ${habit.name}`} className="shrink-0 text-on-surface-variant hover:text-primary" onClick={() => void archive(habit.id)} type="button"><Archive size={16} /></button>
                  <button aria-label={`Eliminar ${habit.name}`} className={`shrink-0 text-on-surface-variant hover:text-error ${deleteId === habit.id ? "bg-error px-1 py-1 text-error-foreground" : ""}`} onClick={() => void remove(habit.id)} type="button"><Trash2 className={deleteId === habit.id ? "text-on-primary" : undefined} size={16} /></button>
                </div>
              ))}
              {(query.data ?? []).filter((habit) => !habit.archived).length === 0 && <p className="py-3 font-body-sm text-body-sm text-on-surface-variant">No hay hábitos activos.</p>}
              </div>
              {(query.data ?? []).some((habit) => habit.archived) && <section className="border-t border-outline-variant pt-3">
                <h3 className="mb-2 font-label-caps text-label-caps text-on-surface-variant">ARCHIVADOS</h3>
                <div className="divide-y divide-outline-variant border-y border-outline-variant">
                  {(query.data ?? []).filter((habit) => habit.archived).map((habit) => (
                    <div className="flex items-center gap-2 py-2" key={habit.id}>
                      <span className="flex-1 font-body-sm text-body-sm text-on-surface-variant">{habit.name}</span>
                      <button aria-label={`Desarchivar ${habit.name}`} className="flex items-center gap-1 font-body-sm text-body-sm text-primary hover:underline" onClick={() => void restore(habit.id)} type="button"><ArchiveRestore size={16} /> Desarchivar</button>
                      <button aria-label={`Eliminar ${habit.name}`} className={`shrink-0 text-on-surface-variant hover:text-error ${deleteId === habit.id ? "bg-error px-1 py-1 text-error-foreground" : ""}`} onClick={() => void remove(habit.id)} type="button"><Trash2 className={deleteId === habit.id ? "text-on-primary" : undefined} size={16} /></button>
                    </div>
                  ))}
                </div>
              </section>}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-outline-variant bg-surface-container-low px-5 py-4"><button className="border border-outline-variant px-4 py-2 font-body-sm text-body-sm hover:bg-surface-container-high" onClick={onClose} type="button">Cerrar</button></div>
      </div>
    </div>
  );
}
