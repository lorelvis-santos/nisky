"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthProvider";
import { PomodoroProvider } from "@/context/PomodoroProvider";
import { RealtimeSync } from "@/features/realtime/RealtimeSync";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeSync />
        <PomodoroProvider>{children}</PomodoroProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
