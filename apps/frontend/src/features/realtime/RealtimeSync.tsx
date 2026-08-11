"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket, SocketEvents, type DataChangedPayload, type Domain } from "@/lib/socket";
import { useAuth } from "@/context/AuthProvider";

const INVALIDATIONS: Record<Domain, string[][]> = {
  tasks: [["tasks"], ["task"], ["home"]],
  comments: [["comments"]],
  projects: [
    ["projects"],
    ["projects", "accessible"],
    ["invitations", "pending"],
  ],
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

    const invalidate = (keys: string[][]) => {
      for (const key of keys) void client.invalidateQueries({ queryKey: key });
    };

    const onDataChanged = (payload: DataChangedPayload) => {
      if (payload.domain === "comments" && (payload.kind === "project" || payload.kind === "task")) {
        const key = payload.kind === "project" ? ["comments", "project", payload.projectId ?? ""] : ["comments", "task", payload.taskId ?? ""];
        void client.invalidateQueries({ queryKey: key });
        void client.invalidateQueries({ queryKey: ["comments"] });
        return;
      }
      if (payload.domain === "projects" && payload.projectId) {
        void client.invalidateQueries({ queryKey: ["projects", payload.projectId, "members"] });
        void client.invalidateQueries({ queryKey: ["projects", payload.projectId] });
      }
      invalidate(INVALIDATIONS[payload.domain] ?? []);
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