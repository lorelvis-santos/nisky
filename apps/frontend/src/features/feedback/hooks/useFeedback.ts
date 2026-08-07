import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedbackStatus } from "@/types/entities";
import { createFeedback, deleteAdminFeedback, deleteMyFeedback, fetchAdminFeedback, fetchMyFeedback, updateAdminFeedback, type CreateFeedbackPayload, type FeedbackQuery } from "../api/feedback.api";

export function useMyFeedbackQuery() {
  return useQuery({ queryKey: ["feedback", "mine"], queryFn: fetchMyFeedback });
}

export function useCreateFeedbackMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFeedbackPayload) => createFeedback(payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ["feedback", "mine"] }),
  });
}

export function useDeleteMyFeedbackMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteMyFeedback,
    onSuccess: () => client.invalidateQueries({ queryKey: ["feedback", "mine"] }),
  });
}

export function useAdminFeedbackQuery(params: FeedbackQuery = {}) {
  return useQuery({ queryKey: ["feedback", "admin", params], queryFn: () => fetchAdminFeedback(params) });
}

export function useAdminFeedbackMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["feedback", "admin"] });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) => updateAdminFeedback(id, { status }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteAdminFeedback, onSuccess: invalidate });

  return { update, remove };
}