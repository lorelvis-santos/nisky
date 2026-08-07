import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { Feedback, FeedbackCategory, FeedbackStatus, FeedbackWithAuthor } from "@/types/entities";

export interface FeedbackQuery {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  limit?: number;
}

export interface CreateFeedbackPayload {
  category: FeedbackCategory;
  message: string;
  includeEmail?: boolean;
}

export async function createFeedback(payload: CreateFeedbackPayload) {
  const { data } = await api.post<ApiResponse<Feedback>>("/feedback", payload);
  return data.data as Feedback;
}

export async function fetchMyFeedback() {
  const { data } = await api.get<ApiResponse<Feedback[]>>("/feedback/mine");
  return data.data as Feedback[];
}

export async function deleteMyFeedback(id: string) {
  await api.delete(`/feedback/${id}`);
}

export async function fetchAdminFeedback(params: FeedbackQuery = {}) {
  const { data } = await api.get<ApiResponse<FeedbackWithAuthor[]>>("/feedback/admin", { params });
  return data.data as FeedbackWithAuthor[];
}

export async function updateAdminFeedback(id: string, payload: { status: FeedbackStatus }) {
  const { data } = await api.patch<ApiResponse<Feedback>>(`/feedback/admin/${id}`, payload);
  return data.data as Feedback;
}

export async function deleteAdminFeedback(id: string) {
  await api.delete(`/feedback/admin/${id}`);
}