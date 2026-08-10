import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPat, listPats, revokePat, type PatCreated } from "../api/pat";

export type { PatCreated };

export const PATS_KEY = ["personal-access-tokens"] as const;

export function usePats() {
  return useQuery({ queryKey: PATS_KEY, queryFn: listPats });
}

export function useCreatePat(onSuccess?: (pat: PatCreated) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; expiresInDays?: number }) => createPat(payload),
    onSuccess: (pat) => {
      qc.invalidateQueries({ queryKey: PATS_KEY });
      onSuccess?.(pat);
    },
  });
}

export function useRevokePat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokePat(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PATS_KEY }),
  });
}