"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushSubscriptionManager() {
  const { isSupported, isLoading, isSubscribed, subscribe, unsubscribe, sendTest } = usePushSubscription();
  const stuck =
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    !isSubscribed;

  return (
    <section className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 text-primary" size={20} />
        <div>
          <h2 className="font-headline-xs text-headline-xs">Notificaciones</h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Recibe avisos de tus recordatorios aunque Nisky no esté abierto.</p>
        </div>
      </div>
      {!isSupported ? (
        <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">Este navegador no permite notificaciones push.</p>
      ) : isSubscribed ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
          <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface"><CheckCircle2 className="text-primary" size={16} /> Notificaciones activadas</span>
          <div className="flex gap-2">
            <button className="border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-primary hover:bg-surface-container-high disabled:opacity-50" disabled={isLoading} onClick={() => void sendTest()} type="button">Enviar prueba</button>
            <button className="border border-error px-3 py-2 font-body-sm text-body-sm text-error hover:bg-error-container disabled:opacity-50" disabled={isLoading} onClick={() => void unsubscribe()} type="button">Desactivar</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-t border-outline-variant pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body-sm text-body-sm text-on-surface-variant">Actívalas para no olvidar tus recordatorios.</p>
            <button className="shrink-0 bg-primary-container px-3 py-2 font-body-sm text-body-sm text-on-primary hover:bg-primary disabled:opacity-50" disabled={isLoading} onClick={() => void subscribe()} type="button">Activar</button>
          </div>
          {stuck && (
            <p className="mt-3 border border-tertiary-container bg-tertiary-container/20 px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              ¿Ya diste permiso y aún no se activa? En Brave, entra a sus Ajustes y activa la opción
              <span className="text-tertiary"> «usar los servicios de Google para notificaciones push»</span>, luego vuelve aquí.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
