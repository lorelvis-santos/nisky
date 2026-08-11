"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket, SocketEvents, type Domain } from "@/lib/socket";
import { useAuth } from "@/context/AuthProvider";

const INVALIDATIONS: Record<Domain, string[][]> = {
  tasks: [["tasks"], ["task"], ["home"]],
  comments: [["comments"]],
};

export function RealtimeSync() {
  const { accessToken } = useAuth();
  const client = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      socket.disconnect();
      return;
    }

    socket.auth = { token: accessToken };
    socket.connect();

    const onDataChanged = (payload: { domain: Domain }) => {
      const keys = INVALIDATIONS[payload.domain] ?? [];
      for (const key of keys) {
        void client.invalidateQueries({ queryKey: key });
      }
    };

    const onConnectError = (err: Error) => {
      if (err.message.includes("Autenticación denegada")) {
        socket.disconnect();
      }
    };

    socket.on(SocketEvents.DATA_CHANGED, onDataChanged);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off(SocketEvents.DATA_CHANGED, onDataChanged);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [accessToken, client]);

  return null;
}
