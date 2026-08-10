import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createComment, deleteComment, listProjectComments, listTaskComments, updateComment } from "../api";

export function useProjectComments(projectId: string | null, params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["comments", "project", projectId, params],
    queryFn: () => listProjectComments(projectId as string, params),
    enabled: Boolean(projectId),
  });
}

export function useTaskComments(taskId: string | null, params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["comments", "task", taskId, params],
    queryFn: () => listTaskComments(taskId as string, params),
    enabled: Boolean(taskId),
  });
}

export function useCommentMutations() {
  const client = useQueryClient();

  const create = useMutation({
    mutationFn: ({ kind, id, body }: { kind: "project" | "task"; id: string; body: string }) =>
      createComment(kind, id, body),
    onSuccess: (_data, vars) => {
      const key = vars.kind === "project" ? ["comments", "project", vars.id] : ["comments", "task", vars.id];
      void client.invalidateQueries({ queryKey: key });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateComment(id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  return { create, update, remove };
}