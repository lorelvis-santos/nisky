"use client";

import { AlarmClock, Bell, Trash2 } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useReminderMutations, useRemindersQuery } from "@/features/reminders/hooks/useReminders";

function localDateTime(value: string) {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function RemindersContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const query = useRemindersQuery();
  const mutations = useReminderMutations();
  const [title, setTitle] = useState(() => searchParams.get("title") ?? "");
  const [body, setBody] = useState("");
  const [triggerAt, setTriggerAt] = useState("");
  const [repeatType, setRepeatType] = useState<"" | "DAILY" | "WEEKLY" | "MONTHLY">("");

  const create = async () => {
    if (!title.trim() || !triggerAt) {
      toast.error("Escribe un título y elige cuándo avisarte.");
      return;
    }
    try {
      await mutations.create.mutateAsync({
        title: title.trim(),
        body: body.trim() || undefined,
        triggerAt: new Date(triggerAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(repeatType ? { repeatType, repeatInterval: 1, repeatDaysOfWeek: repeatType === "WEEKLY" ? [new Date(triggerAt).getDay()] : [] } : {}),
        payload: taskId ? { type: "TASK_DUE", taskId } : { type: "CUSTOM" },
      });
      setTitle("");
      setBody("");
      setTriggerAt("");
      setRepeatType("");
      toast.success("¡Recordatorio creado!");
    } catch {
      toast.error("Ups, no pudimos crear el recordatorio. Inténtalo de nuevo.");
    }
  };

  const remove = async (id: string) => {
    try {
      await mutations.remove.mutateAsync(id);
      toast.success("Recordatorio eliminado");
    } catch {
      toast.error("Ups, no pudimos eliminar el recordatorio. Inténtalo de nuevo.");
    }
  };

  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap">
      <div className="mb-6 border-b border-outline-variant pb-4">
        <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">PARA NO OLVIDAR</p>
        <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Recordatorios</h1>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Un aviso a tiempo puede quitarte algo de la cabeza.</p>
      </div>
      <div className="grid max-w-5xl gap-section-gap lg:grid-cols-[minmax(0,24rem)_1fr]">
        <section className="border border-outline-variant bg-surface-container-lowest p-container-padding">
          <div className="flex items-center gap-2"><Bell className="text-primary" size={18} /><h2 className="font-headline-xs text-headline-xs">Nuevo recordatorio</h2></div>
          <div className="mt-4 space-y-3">
            <label className="block"><span className="font-label-caps text-label-caps text-on-surface-variant">QUÉ RECORDAR</span><input className="field mt-1" onChange={(event) => setTitle(event.target.value)} placeholder="Ej: llamar al médico" value={title} /></label>
            <label className="block"><span className="font-label-caps text-label-caps text-on-surface-variant">DETALLE (OPCIONAL)</span><textarea className="field mt-1 min-h-20 resize-y py-2" onChange={(event) => setBody(event.target.value)} placeholder="Añade un poco de contexto" value={body} /></label>
            <label className="block"><span className="font-label-caps text-label-caps text-on-surface-variant">CUÁNDO</span><input className="field mt-1" onChange={(event) => setTriggerAt(event.target.value)} type="datetime-local" value={triggerAt} /></label>
            <label className="block"><span className="font-label-caps text-label-caps text-on-surface-variant">REPETIR</span><select className="field mt-1" onChange={(event) => setRepeatType(event.target.value as typeof repeatType)} value={repeatType}><option value="">No repetir</option><option value="DAILY">Cada día</option><option value="WEEKLY">Cada semana</option><option value="MONTHLY">Cada mes</option></select></label>
            <button className="flex w-full items-center justify-center gap-2 bg-primary-container px-4 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:opacity-50" disabled={mutations.create.isPending} onClick={() => void create()} type="button"><AlarmClock size={15} /> Guardar recordatorio</button>
          </div>
        </section>
        <section className="border border-outline-variant bg-surface-container-lowest p-container-padding">
          <h2 className="font-headline-xs text-headline-xs">Próximos avisos</h2>
          {query.isLoading ? <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">Cargando recordatorios...</p> : query.isError ? <p className="mt-4 font-body-sm text-body-sm text-error">Ups, no pudimos cargar tus recordatorios.</p> : query.data?.length === 0 ? <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">Todavía no tienes recordatorios.</p> : <div className="mt-4 divide-y divide-outline-variant border-y border-outline-variant">{query.data?.map((reminder) => <div className="flex items-start justify-between gap-3 py-4" key={reminder.id}><div className="min-w-0"><p className="font-body-md text-body-md">{reminder.title}</p>{reminder.body && <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{reminder.body}</p>}<p className="mt-2 font-data-mono text-data-mono text-xs text-primary">{localDateTime(reminder.triggerAt)}{reminder.repeatType ? ` · ${reminder.repeatType === "DAILY" ? "Cada día" : reminder.repeatType === "WEEKLY" ? "Cada semana" : "Cada mes"}` : ""}</p></div><button aria-label={`Eliminar ${reminder.title}`} className="shrink-0 p-1 text-on-surface-variant hover:text-error" onClick={() => void remove(reminder.id)} type="button"><Trash2 size={16} /></button></div>)}</div>}
        </section>
      </div>
    </section>
  );
}

export default function RemindersPage() {
  return <Suspense fallback={<div className="flex h-full items-center justify-center font-body-sm text-body-sm text-on-surface-variant">Cargando recordatorios...</div>}><RemindersContent /></Suspense>;
}
