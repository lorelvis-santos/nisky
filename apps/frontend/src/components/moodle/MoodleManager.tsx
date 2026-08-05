"use client";

import { CheckCircle2, ExternalLink, GraduationCap, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MoodleAccount } from "@/types/entities";

type ConnectMode = "credentials" | "token";

export function MoodleManager() {
  const [accounts, setAccounts] = useState<MoodleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [domain, setDomain] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<ConnectMode>("credentials");
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      const { data } = await api.get<ApiResponse<MoodleAccount[]>>("/moodle");
      setAccounts(data.data);
    } catch {
      setError("No se pudieron cargar las cuentas de Moodle.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConnecting(true);
    try {
      const payload =
        mode === "credentials"
          ? { domain, username, password }
          : { domain, token };
      const { data } = await api.post<ApiResponse<MoodleAccount>>("/moodle", payload);
      await loadAccounts();
      setDomain("");
      setUsername("");
      setPassword("");
      setToken("");
      void sync(data.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con Moodle.");
    } finally {
      setConnecting(false);
    }
  }

  async function sync(id: string) {
    setSyncingId(id);
    setError(null);
    try {
      await api.post(`/moodle/${id}/sync`);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo sincronizar.");
    } finally {
      setSyncingId(null);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/moodle/${id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desconectar.");
    }
  }

  const isSupported = typeof window !== "undefined";

  return (
    <section className="space-y-4">
      <div className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 text-primary" size={20} />
          <div>
            <h2 className="font-headline-xs text-headline-xs">Moodle</h2>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Conecta tu Moodle para ver tus tareas y entregas próximas. Solo se guarda el token cifrado; la contraseña nunca se almacena.
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-3 border-t border-outline-variant pt-4" onSubmit={(e) => void connect(e)}>
          <div className="flex gap-2">
            {(["credentials", "token"] as const).map((m) => (
              <button
                className={`px-3 py-2 font-body-sm text-body-sm ${mode === m ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                key={m}
                onClick={() => setMode(m)}
                type="button"
              >
                {m === "credentials" ? "Usuario y contraseña" : "Token"}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Dominio Moodle</span>
            <input
              className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md outline-none focus:border-primary"
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://moodle.miescuela.edu.do"
              required
              type="url"
              value={domain}
            />
          </label>

          {mode === "credentials" ? (
            <>
              <label className="block">
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Usuario</span>
                <input
                  className="mt-1 w-full border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-base text-body-base outline-none focus:border-primary"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu usuario de Moodle"
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

          {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

          <button
            className="bg-primary-container px-4 py-2 font-body-md text-body-md text-on-primary hover:bg-primary disabled:opacity-50"
            disabled={connecting || !isSupported}
            type="submit"
          >
            {connecting ? <Loader2 className="inline animate-spin" size={16} /> : null}
            Conectar y sincronizar
          </button>
        </form>
      </div>

      {loading ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Cargando cuentas…</p>
      ) : accounts.length > 0 ? (
        accounts.map((account) => (
          <div className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding" key={account.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-primary" size={18} />
                  <span className="font-headline-xs text-headline-xs">{new URL(account.domain).host}</span>
                  {account.enabled ? <CheckCircle2 className="text-primary" size={16} /> : null}
                </div>
                {account.username ? <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Usuario: {account.username}</p> : null}
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {account.lastSyncAt ? `Última sincronización: ${new Date(account.lastSyncAt).toLocaleString()}` : "Sin sincronizar"}
                </p>
                {account.syncError ? <p className="mt-2 text-xs text-error">{account.syncError}</p> : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="border border-outline-variant px-3 py-2 text-sm text-primary hover:bg-surface-container-high disabled:opacity-50" disabled={syncingId === account.id} onClick={() => void sync(account.id)} type="button" title="Sincronizar">
                  {syncingId === account.id ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                </button>
                <button className="border border-outline-variant px-3 py-2 text-sm text-error hover:bg-error-container" onClick={() => void remove(account.id)} type="button" title="Desconectar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="max-w-2xl border border-outline-variant bg-surface-container-lowest p-container-padding font-body-sm text-body-sm text-on-surface-variant">
          Aún no has conectado tu Moodle.
        </p>
      )}
    </section>
  );
}

type ApiResponse<T> = { data: T };