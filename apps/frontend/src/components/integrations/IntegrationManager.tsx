"use client";

import { CheckCircle2, ExternalLink, GraduationCap, Loader2, Network, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cleanIntegrationTasks, connectIntegration, disconnectIntegration, getIntegrations, syncIntegration } from "@/features/integrations/api/integrations";
import { UNIVERSITY_CATALOG, type UniversityCatalogEntry } from "@/features/integrations/universities";
import type { IntegrationAccount, IntegrationProvider } from "@/types/entities";

type ConnectMode = "credentials" | "token";
type ConfirmTarget = { kind: "clean" } | { kind: "disconnect"; account: IntegrationAccount };

const PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  MOODLE: "Moodle",
  CANVAS: "Canvas",
};

function providerIcon(provider: IntegrationProvider) {
  return provider === "MOODLE" ? GraduationCap : Network;
}

export function IntegrationManager() {
  const [selected, setSelected] = useState<UniversityCatalogEntry | null>(null);
  const [otherProvider, setOtherProvider] = useState<IntegrationProvider>("MOODLE");
  const [connectMode, setConnectMode] = useState<ConnectMode>("credentials");
  const [domain, setDomain] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const queryClient = useQueryClient();

  const accountQuery = useQuery({ queryKey: ["integrations"], queryFn: () => getIntegrations() });
  const accounts = accountQuery.data ?? [];

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["integration-tasks"] });
  }

  const connectMutation = useMutation({
    mutationFn: ({ provider, payload }: { provider: IntegrationProvider; payload: { domain: string; username?: string; password?: string; token?: string } }) =>
      connectIntegration(provider, payload),
    onSuccess: async (account) => {
      setDomain("");
      setUsername("");
      setPassword("");
      setToken("");
      setSelected(null);
      invalidateAll();
      await syncMutation.mutateAsync({ provider: account.provider, id: account.id });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo conectar con el proveedor."),
  });

  const syncMutation = useMutation({
    mutationFn: ({ provider, id }: { provider: IntegrationProvider; id: string }) => syncIntegration(provider, id),
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo sincronizar."),
  });

  const disconnectMutation = useMutation({
    mutationFn: ({ provider, id }: { provider: IntegrationProvider; id: string }) => disconnectIntegration(provider, id),
    onSuccess: () => {
      setConfirm(null);
      invalidateAll();
      toast.success("Cuenta desconectada y sus tareas pendientes eliminadas.");
    },
    onError: () => toast.error("No se pudo desconectar la cuenta."),
  });

  const cleanMutation = useMutation({
    mutationFn: () => cleanIntegrationTasks(),
    onSuccess: (removed) => {
      setConfirm(null);
      invalidateAll();
      toast.success(`Tareas pendientes de las integraciones eliminadas (${removed}). Sincroniza para traerlas de nuevo.`);
    },
    onError: () => toast.error("No se pudieron limpiar las tareas."),
  });

  function submitConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const provider = selected.provider ?? otherProvider;
    const payload = {
      domain: selected.domain ?? domain,
      ...(provider === "CANVAS" || selected.credentialsMode === "token-only"
        ? { token }
        : connectMode === "credentials"
          ? { username, password }
          : { token }),
    };
    connectMutation.mutate({ provider, payload });
  }

  const isSupported = typeof window !== "undefined";

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-headline-xs text-headline-xs">Selecciona tu universidad</h2>
        <p className="mt-1 max-w-2xl font-body-sm text-body-sm text-on-surface-variant">
          Elige la institución para conectar su plataforma educativa (Moodle o Canvas), o selecciona «Otra institución» si no está en la lista.
        </p>
        <div className="mt-3 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {UNIVERSITY_CATALOG.map((entry) => (
            <button
              className={`flex min-h-20 flex-col items-center justify-center gap-2 border px-3 py-3 font-label-caps text-label-caps uppercase ${selected?.slug === entry.slug ? "border-primary bg-primary-fixed text-on-primary-fixed" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"}`}
              key={entry.slug}
              onClick={() => setSelected(entry)}
              type="button"
            >
              {entry.logoUrl ? (
                <Image alt="" className="h-8 w-auto max-w-full object-contain" height={32} src={entry.logoUrl} width={96} />
              ) : null}
              <span>{entry.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
          <div className="flex items-start gap-3">
            {selected.logoUrl ? (
              <Image alt={`${selected.name} logo`} height={36} className="h-9 w-auto object-contain" src={selected.logoUrl} width={128} />
            ) : (
              (() => {
                const Icon = providerIcon(selected.provider ?? otherProvider);
                return <Icon className="mt-0.5 text-primary" size={20} />;
              })()
            )}
            <div>
              <h2 className="font-headline-xs text-headline-xs">{selected.name}</h2>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{selected.helpHint}</p>
            </div>
          </div>

          <form className="mt-4 space-y-3 border-t border-outline-variant pt-4" onSubmit={(e) => void submitConnect(e)}>
            {selected.slug === "otra" ? (
              <>
                <div className="flex gap-2">
                  {(["MOODLE", "CANVAS"] as const).map((p) => (
                    <button
                      className={`px-3 py-2 font-body-sm text-body-sm ${otherProvider === p ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                      key={p}
                      onClick={() => setOtherProvider(p)}
                      type="button"
                    >
                      {PROVIDER_LABEL[p]}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Dominio</span>
                  <input
                    className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md outline-none focus:border-primary"
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder={otherProvider === "MOODLE" ? "https://moodle.miescuela.edu.do" : "https://instancia.instructure.com"}
                    required
                    type="url"
                    value={domain}
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Dominio</span>
                <input
                  className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md outline-none focus:border-primary"
                  readOnly
                  type="text"
                  value={selected.domain}
                />
              </label>
            )}

            {selected.slug === "otra" || selected.provider === "MOODLE" ? (
              selected.credentialsMode !== "token-only" ? (
                <>
                  <div className="flex gap-2">
                    {(["credentials", "token"] as const).map((m) => (
                      <button
                        className={`px-3 py-2 font-body-sm text-body-sm ${connectMode === m ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                        key={m}
                        onClick={() => setConnectMode(m)}
                        type="button"
                      >
                        {m === "credentials" ? "Usuario y contraseña" : "Token"}
                      </button>
                    ))}
                  </div>
                  {connectMode === "credentials" ? (
                    <>
                      <label className="block">
                        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Usuario</span>
                        <input
                          className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-base text-body-base outline-none focus:border-primary"
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Tu usuario"
                          required
                          value={username}
                        />
                      </label>
                      <label className="block">
                        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Contraseña</span>
                        <input
                          autoComplete="current-password"
                          className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-base text-body-base outline-none focus:border-primary"
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          type="password"
                          value={password}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="block">
                      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Token del web service</span>
                      <input
                        className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md outline-none focus:border-primary"
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Pega el token generado en Administración › Web services › Tokens"
                        required
                        type="password"
                        value={token}
                      />
                    </label>
                  )}
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="flex items-center gap-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
                      Token del web service
                      {selected.helpUrl ? (
                        <a className="inline-flex items-center gap-1 font-body-sm font-normal normal-case text-primary hover:text-on-surface" href={selected.helpUrl} rel="noreferrer" target="_blank">
                          Abrir página de tokens <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </span>
                    <input
                      className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md outline-none focus:border-primary"
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Pega tu token de Moodle"
                      required
                      type="password"
                      value={token}
                    />
                  </label>
                </>
              )
            ) : (
              <>
                <label className="block">
                  <span className="flex items-center gap-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
                    Token de acceso personal
                    {selected.helpUrl ? (
                      <a className="inline-flex items-center gap-1 font-body-sm font-normal normal-case text-primary hover:text-on-surface" href={selected.helpUrl} rel="noreferrer" target="_blank">
                        Abrir página de tokens <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </span>
                  <input
                    className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md outline-none focus:border-primary"
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Pega tu token personal de Canvas"
                    required
                    type="password"
                    value={token}
                  />
                </label>
              </>
            )}

            {connectMutation.isError && <p className="font-body-sm text-body-sm text-error">{connectMutation.error instanceof Error ? connectMutation.error.message : "No se pudo conectar."}</p>}

            <button
              className="bg-primary-container px-4 py-2 font-body-md text-body-md text-on-primary hover:bg-primary disabled:opacity-50"
              disabled={connectMutation.isPending || !isSupported}
              type="submit"
            >
              {connectMutation.isPending ? <Loader2 className="inline animate-spin" size={16} /> : null}
              Conectar y sincronizar
            </button>
          </form>
        </div>
      ) : null}

      {accountQuery.isLoading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando cuentas…</p>
      ) : accounts.length > 0 ? (
        accounts.map((account) => {
          const Icon = providerIcon(account.provider);
          return (
            <div className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding" key={account.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="text-primary" size={18} />
                    <span className="font-headline-xs text-headline-xs">{new URL(account.domain).host}</span>
                    <span className="bg-surface-container-high px-2 py-0.5 font-label-caps text-label-caps uppercase text-on-surface-variant">
                      {PROVIDER_LABEL[account.provider]}
                    </span>
                    {account.enabled ? <CheckCircle2 className="text-primary" size={16} /> : null}
                  </div>
                  {account.username ? <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Usuario: {account.username}</p> : null}
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                    {account.lastSyncAt ? `Última sincronización: ${new Date(account.lastSyncAt).toLocaleString()}` : "Sin sincronizar"}
                  </p>
                  {account.syncError ? <p className="mt-2 text-xs text-error">{account.syncError}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="border border-outline-variant px-3 py-2 text-sm text-primary hover:bg-surface-container-high disabled:opacity-50"
                    disabled={syncMutation.isPending}
                    onClick={() => syncMutation.mutate({ provider: account.provider, id: account.id })}
                    title="Sincronizar"
                    type="button"
                  >
                    {syncMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  </button>
                  <button
                    className="border border-outline-variant px-3 py-2 text-sm text-error hover:bg-error-container"
                    onClick={() => setConfirm({ kind: "disconnect", account })}
                    title="Desconectar"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding font-body-sm text-body-sm text-on-surface-variant">
          Aún no has conectado ninguna integración.
        </p>
      )}

      <div className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <h3 className="font-headline-xs text-headline-xs">Zona peligrosa</h3>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
          Elimina todas las tareas pendientes de las integraciones (de cuentas conectadas, desconectadas y ajenas). Se conservan las completadas o canceladas. Sincroniza de nuevo para traerlas.
        </p>
        <button
          className="mt-3 border border-outline-variant px-4 py-2 font-body-md text-body-md text-error hover:bg-error-container disabled:opacity-50"
          disabled={cleanMutation.isPending}
          onClick={() => setConfirm({ kind: "clean" })}
          type="button"
        >
          Limpiar tareas de las integraciones
        </button>
      </div>

      {confirm && (
        <ConfirmModal
          confirmLabel={confirm.kind === "clean" ? "Eliminar tareas" : "Desconectar"}
          danger
          loading={disconnectMutation.isPending || cleanMutation.isPending}
          message={
            confirm.kind === "clean"
              ? "Se borrarán todas las tareas pendientes de las integraciones y tendrás que sincronizar de nuevo para tenerlas. Las tareas completadas o canceladas se conservan."
              : "Se eliminará la conexión y se borrarán las tareas pendientes de esta cuenta. Tendrás que conectar la integración de nuevo para tenerlas de vuelta."
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.kind === "clean") cleanMutation.mutate();
            else disconnectMutation.mutate({ provider: confirm.account.provider, id: confirm.account.id });
          }}
          title={confirm.kind === "clean" ? "Limpiar tareas de las integraciones" : `Desconectar ${new URL(confirm.account.domain).host}`}
        />
      )}
    </section>
  );
}
