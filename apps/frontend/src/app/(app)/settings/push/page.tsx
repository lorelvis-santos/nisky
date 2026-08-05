"use client";

import { PushSubscriptionManager } from "@/components/pwa/PushSubscriptionManager";

export default function PushSettingsPage() {
  return (
    <section className="h-full overflow-y-auto bg-background p-container-padding sm:p-section-gap">
      <div className="mb-6 border-b border-outline-variant pb-4">
        <p className="font-label-caps text-label-caps uppercase text-on-surface-variant">AYUDA PARA NO OLVIDAR</p>
        <h1 className="mt-1 font-headline-sm text-headline-sm text-primary">Notificaciones</h1>
      </div>
      <PushSubscriptionManager />
    </section>
  );
}
