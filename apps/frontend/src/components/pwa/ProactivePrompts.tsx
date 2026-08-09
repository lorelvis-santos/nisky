"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Download } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";

type PromptState = {
  dismissCount: number;
  dismissedAt: string | null;
  neverAsk: boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const NOTIF_KEY = "nisky:prompt-notif";
const INSTALL_KEY = "nisky:prompt-install";
const REASK_DAYS = 7;
const MAX_DISMISS = 2;

function readState(key: string): PromptState {
  if (typeof window === "undefined") return { dismissCount: 0, dismissedAt: null, neverAsk: false };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { dismissCount: 0, dismissedAt: null, neverAsk: false };
    return { dismissCount: 0, dismissedAt: null, neverAsk: false, ...(JSON.parse(raw) as Partial<PromptState>) };
  } catch {
    return { dismissCount: 0, dismissedAt: null, neverAsk: false };
  }
}

function writeState(key: string, state: PromptState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // privacidad: si el storage no está disponible, no rompemos nada
  }
}

function shouldShow(key: string): boolean {
  const state = readState(key);
  if (state.neverAsk) return false;
  if (state.dismissCount >= MAX_DISMISS) return false;
  if (state.dismissedAt) {
    const elapsed = Date.now() - new Date(state.dismissedAt).getTime();
    if (elapsed < REASK_DAYS * 86_400_000) return false;
  }
  return true;
}

const NOTIF_BODY = "Te avisamos cuando una tarea vence, un bloque de agenda empieza o un hábito te espera.";
const INSTALL_BODY = "Ábrela desde tu inicio como una app de verdad, sin navegador y sin distracciones.";

export function ProactivePrompts() {
  const { isSubscribed, subscribe } = usePushSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifBlocked, setNotifBlocked] = useState(false);
  const [notifDismissCount, setNotifDismissCount] = useState(0);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [installDismissCount, setInstallDismissCount] = useState(0);
  const [isIos, setIsIos] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStandalone = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthPage) return;
    isStandalone.current =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (typeof Notification === "undefined") return;

    // Tarjeta de permisos: solo preguntar si nunca se pidió (default) o guiar si está bloqueado.
    const showNotifAfter = () => {
      if (!shouldShow(NOTIF_KEY)) return;
      const permission = Notification.permission;
      setNotifDismissCount(readState(NOTIF_KEY).dismissCount);
      if (permission === "default") {
        setNotifVisible(true);
      } else if (permission === "denied") {
        setNotifBlocked(true);
      }
    };
    timerRef.current = setTimeout(showNotifAfter, 3000);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (!installEvent) setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallDismissCount(readState(INSTALL_KEY).dismissCount);
      setInstallVisible(!isStandalone.current && shouldShow(INSTALL_KEY));
    };
    const onInstalled = () => {
      writeState(INSTALL_KEY, { dismissCount: MAX_DISMISS, dismissedAt: null, neverAsk: true });
      setInstallVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isApple && !isStandalone.current && installEvent === null && shouldShow(INSTALL_KEY)) {
      setIsIos(true);
      setInstallDismissCount(readState(INSTALL_KEY).dismissCount);
      setInstallVisible(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthPage]);

  const dismissNotif = useCallback(() => {
    const next = { ...readState(NOTIF_KEY), dismissCount: readState(NOTIF_KEY).dismissCount + 1, dismissedAt: new Date().toISOString() };
    writeState(NOTIF_KEY, next);
    setNotifVisible(false);
    setNotifBlocked(false);
  }, []);

  const neverAskNotif = useCallback(() => {
    writeState(NOTIF_KEY, { dismissCount: MAX_DISMISS, dismissedAt: null, neverAsk: true });
    setNotifVisible(false);
    setNotifBlocked(false);
  }, []);

  const acceptNotif = useCallback(async () => {
    const ok = await subscribe();
    if (ok) {
      writeState(NOTIF_KEY, { dismissCount: MAX_DISMISS, dismissedAt: null, neverAsk: true });
      setNotifVisible(false);
      toast.success("¡Listo! Aquí estaremos en cada vencimiento y bloque.");
    } else {
      dismissNotif();
    }
  }, [subscribe, dismissNotif]);

  const dismissInstall = useCallback(() => {
    const next = { ...readState(INSTALL_KEY), dismissCount: readState(INSTALL_KEY).dismissCount + 1, dismissedAt: new Date().toISOString() };
    writeState(INSTALL_KEY, next);
    setInstallVisible(false);
  }, []);

  const neverAskInstall = useCallback(() => {
    writeState(INSTALL_KEY, { dismissCount: MAX_DISMISS, dismissedAt: null, neverAsk: true });
    setInstallVisible(false);
  }, []);

  const acceptInstall = useCallback(async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        writeState(INSTALL_KEY, { dismissCount: MAX_DISMISS, dismissedAt: null, neverAsk: true });
        setInstallVisible(false);
      } else {
        dismissInstall();
      }
    } catch {
      dismissInstall();
    }
  }, [installEvent, dismissInstall]);

  // Prioridad: notificaciones > instalación. Nunca dos a la vez.
  const showInstall = installVisible && !notifVisible && !notifBlocked;

  useEffect(() => {
    if (isSubscribed) {
      writeState(NOTIF_KEY, { dismissCount: MAX_DISMISS, dismissedAt: null, neverAsk: true });
      setNotifVisible(false);
    }
  }, [isSubscribed]);

  return (
    <>
      {(notifVisible || notifBlocked) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-md border border-outline-variant bg-surface-container-lowest p-6">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 shrink-0 text-primary" size={20} />
              <div className="min-w-0 flex-1">
                <p className="font-headline-sm font-bold text-on-surface">
                  {notifBlocked ? "Nisky está en silencio" : "¿Quieres que te avisemos?"}
                </p>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {notifBlocked ? "Las notificaciones están apagadas en tu navegador. Para reactivarlas entra a Ajustes." : NOTIF_BODY}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {notifBlocked ? (
                    <button
                      className="bg-primary px-3 py-2 font-body-sm text-body-sm font-bold text-on-primary hover:bg-primary-container"
                      onClick={() => router.push("/settings")}
                      type="button"
                    >
                      Ir a Ajustes
                    </button>
                  ) : (
                    <button
                      className="bg-primary px-3 py-2 font-body-sm text-body-sm font-bold text-on-primary hover:bg-primary-container"
                      onClick={() => void acceptNotif()}
                      type="button"
                    >
                      Sí, quiero avisos
                    </button>
                  )}
                  <button
                    className="border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    onClick={dismissNotif}
                    type="button"
                  >
                    {notifBlocked ? "Tal vez después" : "No, me quiero perder mis pendientes"}
                  </button>
                </div>
                {!notifBlocked && notifDismissCount >= 1 && (
                  <button className="mt-2 font-body-xs text-body-xs text-on-surface-variant underline hover:text-primary" onClick={neverAskNotif} type="button">
                    No me preguntes más
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-md border border-outline-variant bg-surface-container-lowest p-6">
            <div className="flex items-start gap-3">
              <Download className="mt-0.5 shrink-0 text-primary" size={20} />
              <div className="min-w-0 flex-1">
                <p className="font-headline-sm font-bold text-on-surface">Lleva Nisky a tu pantalla de inicio</p>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {isIos ? "En tu iPhone o iPad: toca Compartir y elige «Añadir a pantalla de inicio»." : INSTALL_BODY}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isIos ? (
                    <button
                      className="bg-primary px-3 py-2 font-body-sm text-body-sm font-bold text-on-primary hover:bg-primary-container"
                      onClick={dismissInstall}
                      type="button"
                    >
                      Entendido
                    </button>
                  ) : (
                    <button
                      className="bg-primary px-3 py-2 font-body-sm text-body-sm font-bold text-on-primary hover:bg-primary-container"
                      onClick={() => void acceptInstall()}
                      type="button"
                    >
                      Instalar Nisky
                    </button>
                  )}
                  <button
                    className="border border-outline-variant px-3 py-2 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    onClick={dismissInstall}
                    type="button"
                  >
                    {isIos ? "Ahora no" : "No, prefiero entrar desde el navegador"}
                  </button>
                </div>
                {installDismissCount >= 1 && (
                  <button className="mt-2 font-body-xs text-body-xs text-on-surface-variant underline hover:text-primary" onClick={neverAskInstall} type="button">
                    No me preguntes más
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}