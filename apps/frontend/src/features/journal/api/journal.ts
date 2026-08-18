import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { JournalDraft, JournalEntry, Paginated } from "@/types/entities";

export interface JournalQueryParams {
  page?: number;
  limit?: number;
  classification?: string;
  tag?: string;
}

export interface JournalEntryPayload {
  title: string;
  content: string;
  classification?: string;
  tags?: string[];
}

export interface JournalDraftPayload {
  title?: string;
  content?: string;
  classification?: string | null;
  tags?: string[];
}

export async function fetchJournalEntries(params: JournalQueryParams) {
  const { data } = await api.get<ApiResponse<Paginated<JournalEntry>>>("/journal", { params });
  return data.data as Paginated<JournalEntry>;
}

export async function createJournalEntry(payload: JournalEntryPayload) {
  const { data } = await api.post<ApiResponse<JournalEntry>>("/journal", payload);
  return data.data as JournalEntry;
}

export async function updateJournalEntry(id: string, payload: Partial<JournalEntryPayload>) {
  const { data } = await api.patch<ApiResponse<JournalEntry>>(`/journal/${id}`, payload);
  return data.data as JournalEntry;
}

export async function deleteJournalEntry(id: string) {
  await api.delete(`/journal/${id}`);
}

export async function fetchJournalDraft() {
  const { data } = await api.get<ApiResponse<JournalDraft | null>>("/journal/draft");
  return data.data;
}

export async function saveJournalDraft(payload: JournalDraftPayload) {
  await api.put("/journal/draft", payload);
}

export async function deleteJournalDraft() {
  await api.delete("/journal/draft");
}
