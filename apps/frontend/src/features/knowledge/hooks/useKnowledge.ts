import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, fetchKnowledgeFacets, fetchNote, fetchNotes, updateNote, type NotePayload, type NoteQueryParams } from "../api/knowledge";

export function useNotesQuery(params: NoteQueryParams = {}) {
  return useQuery({
    queryKey: ["knowledge", params],
    queryFn: () => fetchNotes(params),
  });
}

export function useNoteQuery(id: string | null) {
  return useQuery({
    queryKey: ["knowledge", id],
    queryFn: () => fetchNote(id as string),
    enabled: Boolean(id),
  });
}

export function useFacetsQuery(projectId?: string | null) {
  return useQuery({
    queryKey: ["knowledge-facets", projectId ?? null],
    queryFn: () => fetchKnowledgeFacets(projectId),
  });
}

export function useNoteMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["knowledge"] });
    await client.invalidateQueries({ queryKey: ["knowledge-facets"] });
    await client.invalidateQueries({ queryKey: ["projects"] });
  };

  const create = useMutation({
    mutationFn: (payload: NotePayload) => createNote(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<NotePayload> }) => updateNote(id, payload),
    onSuccess: invalidate,
  });
  const togglePin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => updateNote(id, { pinned }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteNote,
    onSuccess: invalidate,
  });
  return { create, update, togglePin, remove };
}
