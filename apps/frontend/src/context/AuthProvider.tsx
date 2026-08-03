"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, refreshAccessToken, setAccessToken } from "@/lib/api";
import type { User } from "@/types/entities";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (result: { accessToken: string; user: User }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuth = useCallback((result: { accessToken: string; user: User }) => {
    setAccessToken(result.accessToken);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* logout is idempotent */ }
    setAccessToken(null);
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    const onRefreshed = (event: Event) => {
      const result = (event as CustomEvent<{ accessToken: string; user: User }>).detail;
      if (result?.accessToken && result.user) setAuth(result);
    };
    const onLogout = () => {
      setAccessToken(null);
      setToken(null);
      setUser(null);
      router.replace("/login");
    };
    window.addEventListener("auth:refreshed", onRefreshed);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      window.removeEventListener("auth:refreshed", onRefreshed);
      window.removeEventListener("auth:logout", onLogout);
    };
  }, [router, setAuth]);

  useEffect(() => {
    let active = true;
    void refreshAccessToken().then((result) => {
      if (!active) return;
      if (result) setAuth(result);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [setAuth]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated: Boolean(user && accessToken), isLoading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
