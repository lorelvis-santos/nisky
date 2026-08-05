import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, fetchKnowledgeFacets, fetchNotes, updateNote, type NotePayload, type NoteQueryParams } from "../api/knowledge";

export function useNotesQuery(params: NoteQueryParams = {}) {
  return useQuery({
    queryKey: ["knowledge", params],
    queryFn: () => fetchNotes(params),
  });
}

export function useFacetsQuery() {
  return useQuery({
    queryKey: ["knowledge-facets"],
    queryFn: fetchKnowledgeFacets,
  });
}

export function useNoteMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["knowledge"] });
    await client.invalidateQueries({ queryKey: ["knowledge-facets"] });
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
