"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { readPromptState, resetPromptState, NOTIF_KEY } from "@/lib/promptState";
import { serializePushSubscription, urlBase64ToUint8Array } from "@/lib/push";

async function serviceWorkerRegistration() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export function usePushSubscription() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (!supported) {
      setIsLoading(false);
      return;
    }
    try {
      const registration = await serviceWorkerRegistration();
      setSubscription(await registration?.pushManager.getSubscription() ?? null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    void Promise.resolve().then(() => {
      if (active) setIsSupported(supported);
    });
    if (!supported) {
      void Promise.resolve().then(() => {
        if (active) setIsLoading(false);
      });
      return () => { active = false; };
    }
    void serviceWorkerRegistration()
      .then((registration) => registration?.pushManager.getSubscription() ?? null)
      .then((current) => {
        if (active) setSubscription(current);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    let permission: NotificationPermission | null = null;
    try {
      const registration = await serviceWorkerRegistration();
      if (!registration) throw new Error("Este navegador no soporta notificaciones push");
      // Subscribir antes de que el SW esté activo produce "Registration failed - push service error".
      const active = await navigator.serviceWorker.ready;
      // Si ya existía una suscripción (p. ej. de un intento anterior), la reutilizamos en vez
      // de fallar con InvalidStateError por llaves distintas.
      const existing = await active.pushManager.getSubscription();
      if (existing) {
        await api.post("/push/subscribe", serializePushSubscription(existing));
        setSubscription(existing);
        toast.success("¡Notificaciones activadas!");
        return true;
      }
      permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permiso de notificaciones no concedido");
      const keyResponse = await api.get<{ data: { publicKey: string } }>("/push/vapid-public-key");
      const next = await active.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyResponse.data.data.publicKey),
      });
      await api.post("/push/subscribe", serializePushSubscription(next));
      setSubscription(next);
      toast.success("¡Notificaciones activadas!");
      return true;
    } catch (error) {
      const name = error instanceof Error ? error.name : "Unknown";
      const message = error instanceof Error ? error.message : String(error);
      const raw = `${name}: ${message}`;
      // Registrar el fallo en el panel de diagnóstico del backend para depurar.
      void api.post("/push/subscribe-error", { name, message }).catch(() => {});
      // Un fallo no debería bloquear el flujo: olvidamos el estado del prompt para que
      // el aviso vuelva a aparecer pronto. PERO respetamos «no me preguntes más»:
      // si el usuario lo pidió explícitamente, no lo revivimos con cada error.
      if (!readPromptState(NOTIF_KEY).neverAsk) {
        resetPromptState(NOTIF_KEY);
      }
      const permissionDenied =
        raw.includes("NotAllowed") || raw.includes("AbortError") || raw.toLowerCase().includes("permission");
      let friendly: string;
      if (permissionDenied && permission === "granted") {
        // El permiso dice "granted" pero el navegador no deja suscribirse. En Brave
        // ocurre cuando está desactivado el uso de servicios de Google para push.
        friendly = "Tu navegador no dejó activar las notificaciones. Elige «Permitir» de forma permanente (no «solo esta sesión») y vuelve a intentar. Si usas Brave: entra a sus Ajustes, busca «usar los servicios de Google para notificaciones push» y actívalo.";
      } else if (permissionDenied) {
        friendly = "No se concedió el permiso para notificaciones en el navegador.";
      } else if (raw.includes("InvalidStateError")) {
        friendly = "Tu navegador tenía una suscripción anterior de Nisky. Actualiza la página y reinténtalo.";
      } else {
        friendly = "El servicio de notificaciones del navegador no respondió. Vuelve a intentarlo en un momento.";
      }
      toast.error(friendly);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;
    setIsLoading(true);
    try {
      await api.delete("/push/unsubscribe", { data: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
      setSubscription(null);
      toast.success("Notificaciones desactivadas");
      return true;
    } catch {
      toast.error("No pudimos desactivar las notificaciones. Inténtalo de nuevo.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  const sendTest = useCallback(async () => {
    try {
      const response = await api.post<{ data: { sent: number } }>("/push/test");
      toast.success(`Prueba enviada a ${response.data.data.sent} dispositivo(s)`);
      return true;
    } catch {
      toast.error("No pudimos enviar la prueba. Inténtalo de nuevo.");
      return false;
    }
  }, []);

  return { isSupported, isLoading, isSubscribed: Boolean(subscription), subscription, subscribe, unsubscribe, sendTest, reload: load };
}
