import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveQuickNote, createQuickNote, deleteQuickNote, fetchQuickNotes, updateQuickNote } from "../api/quicknotes";
import type { QuickNoteStatus } from "@/types/entities";

export function useQuickNotesQuery(status: QuickNoteStatus = "INBOX") {
  return useQuery({ queryKey: ["quick-notes", status], queryFn: () => fetchQuickNotes(status) });
}

export function useQuickNoteMutations() {
  const client = useQueryClient();
  const invalidate = async () => client.invalidateQueries({ queryKey: ["quick-notes"] });
  const create = useMutation({ mutationFn: createQuickNote, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: { content?: string; status?: QuickNoteStatus } }) => updateQuickNote(id, payload), onSuccess: invalidate });
  const archive = useMutation({ mutationFn: archiveQuickNote, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteQuickNote, onSuccess: invalidate });
  return { create, update, archive, remove };
}
