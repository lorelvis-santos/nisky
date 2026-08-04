import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { QuickNote, QuickNoteStatus } from "@/types/entities";

export async function fetchQuickNotes(status: QuickNoteStatus = "INBOX", limit = 8) {
  const { data } = await api.get<ApiResponse<QuickNote[]>>("/quick-notes", { params: { status, limit } });
  return data.data as QuickNote[];
}

export async function createQuickNote(content: string) {
  const { data } = await api.post<ApiResponse<QuickNote>>("/quick-notes", { content });
  return data.data as QuickNote;
}

export async function updateQuickNote(id: string, payload: { content?: string; status?: QuickNoteStatus }) {
  const { data } = await api.patch<ApiResponse<QuickNote>>(`/quick-notes/${id}`, payload);
  return data.data as QuickNote;
}

export async function archiveQuickNote(id: string) {
  await updateQuickNote(id, { status: "ARCHIVED" });
}

export async function deleteQuickNote(id: string) {
  await api.delete(`/quick-notes/${id}`);
}
