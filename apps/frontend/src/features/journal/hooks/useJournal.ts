import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJournalEntry, deleteJournalEntry, fetchJournalEntries, updateJournalEntry, type JournalEntryPayload, type JournalQueryParams } from "../api/journal";

export function useJournalQuery(params: JournalQueryParams = {}) {
  return useQuery({
    queryKey: ["journal", params],
    queryFn: () => fetchJournalEntries(params),
  });
}

export function useJournalMutations() {
  const client = useQueryClient();
  const invalidate = async () => client.invalidateQueries({ queryKey: ["journal"] });

  const create = useMutation({
    mutationFn: (payload: JournalEntryPayload) => createJournalEntry(payload),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<JournalEntryPayload> }) => updateJournalEntry(id, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: invalidate,
  });
  return { create, update, remove };
}
