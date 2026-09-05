"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushSubscriptionManager() {
  const { isSupported, isLoading, isSubscribed, subscribe, unsubscribe, sendTest } = usePushSubscription();
  // Solo mostramos el aviso de Brave cuando ya resolvimos el estado real de la
  // suscripción; mientras carga no hay que parpadear el mensaje de error.
  const stuck =
    !isLoading &&
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted" &&
    !isSubscribed;

  return (
    <section className="max-w-2xl rounded-lg border border-outline-variant bg-surface p-container-padding shadow-cadence-1">
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
             <button className="min-h-11 rounded-md border border-outline-variant bg-surface px-3 py-2 font-body-sm text-body-sm text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-50" disabled={isLoading} onClick={() => void sendTest()} type="button">Enviar prueba</button>
             <button className="min-h-11 rounded-md border border-error bg-surface px-3 py-2 font-body-sm text-body-sm text-error transition-colors hover:bg-error-container disabled:opacity-50" disabled={isLoading} onClick={() => void unsubscribe()} type="button">Desactivar</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 border-t border-outline-variant pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body-sm text-body-sm text-on-surface-variant">Actívalas para no olvidar tus recordatorios.</p>
             <button className="min-h-11 shrink-0 rounded-md bg-primary px-3 py-2 font-body-sm text-body-sm text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50" disabled={isLoading} onClick={() => void subscribe()} type="button">Activar</button>
          </div>
          {stuck && (
             <p className="mt-3 rounded-md border border-tertiary-container bg-tertiary-container/20 px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              ¿Ya diste permiso y aún no se activa? En Brave, entra a sus Ajustes y activa la opción
              <span className="text-tertiary"> «usar los servicios de Google para notificaciones push»</span>, luego vuelve aquí.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
