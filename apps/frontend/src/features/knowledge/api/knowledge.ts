import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { KnowledgeFacets, Note, NoteDraft, Paginated } from "@/types/entities";

export interface NoteQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  pinned?: boolean;
  q?: string;
}

export interface NotePayload {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  pinned?: boolean;
  projectId?: string;
}

export interface NoteDraftPayload {
  title?: string;
  content?: string;
  category?: string | null;
  tags?: string[];
  pinned?: boolean;
  projectId?: string | null;
}

export async function fetchNotes(params: NoteQueryParams) {
  const { data } = await api.get<ApiResponse<Paginated<Note>>>("/knowledge", { params });
  return data.data as Paginated<Note>;
}

export async function fetchKnowledgeFacets() {
  const { data } = await api.get<ApiResponse<KnowledgeFacets>>("/knowledge/facets");
  return data.data as KnowledgeFacets;
}

export async function createNote(payload: NotePayload) {
  const { data } = await api.post<ApiResponse<Note>>("/knowledge", payload);
  return data.data as Note;
}

export async function updateNote(id: string, payload: Partial<NotePayload>) {
  const { data } = await api.patch<ApiResponse<Note>>(`/knowledge/${id}`, payload);
  return data.data as Note;
}

export async function deleteNote(id: string) {
  await api.delete(`/knowledge/${id}`);
}

export async function fetchNoteDraft() {
  const { data } = await api.get<ApiResponse<NoteDraft | null>>("/knowledge/draft");
  return data.data;
}

export async function saveNoteDraft(payload: NoteDraftPayload) {
  await api.put("/knowledge/draft", payload);
}

export async function deleteNoteDraft() {
  await api.delete("/knowledge/draft");
}
