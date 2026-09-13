import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTaskReference,
  deleteTaskReference,
  fetchTaskReferences,
  reorderTaskReferences,
  updateTaskReference,
  type TaskReferencePayload,
  type TaskReferenceUpdatePayload,
} from "../api/references";

export function useTaskReferences(taskId: string | null) {
  return useQuery({
    queryKey: ["task-references", taskId],
    queryFn: () => fetchTaskReferences(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useTaskReferenceMutations(taskId: string) {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["task-references", taskId] });
    await client.invalidateQueries({ queryKey: ["task", taskId] });
    await client.invalidateQueries({ queryKey: ["tasks"] });
  };
  const create = useMutation({
    mutationFn: (payload: TaskReferencePayload) => createTaskReference(taskId, payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ referenceId, payload }: { referenceId: string; payload: TaskReferenceUpdatePayload }) => updateTaskReference(taskId, referenceId, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (referenceId: string) => deleteTaskReference(taskId, referenceId),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (items: { id: string; order: number }[]) => reorderTaskReferences(taskId, items),
    onSuccess: invalidate,
  });
  return { create, update, remove, reorder };
}
