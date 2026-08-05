"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { serializePushSubscription, urlBase64ToUint8Array } from "@/lib/push";

async function serviceWorkerRegistration() {
  if (process.env.NODE_ENV !== "production") return null;
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
    try {
      const registration = await serviceWorkerRegistration();
      if (!registration) throw new Error("Este navegador no soporta notificaciones push");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permiso de notificaciones no concedido");
      const keyResponse = await api.get<{ data: { publicKey: string } }>("/push/vapid-public-key");
      const next = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyResponse.data.data.publicKey),
      });
      await api.post("/push/subscribe", serializePushSubscription(next));
      setSubscription(next);
      toast.success("¡Notificaciones activadas!");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos activar las notificaciones.");
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
