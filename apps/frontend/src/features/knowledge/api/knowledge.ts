import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api.types";
import type { KnowledgeFacets, Note, Paginated } from "@/types/entities";

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
