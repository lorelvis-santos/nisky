import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTimeBlock, deleteTimeBlock, getActiveBlock, getTimeBlockSettings, getTimeBlocks, getTodayBlocks, updateTimeBlock, updateTimeBlockSettings, type CreateTimeBlockPayload, type UpdateTimeBlockPayload } from "../api/timeblocks";
import type { TimeBlock, TimeBlockSettings } from "@/types/entities";

const TIMEBLOCKS_KEY = ["timeblocks"] as const;

export function useTimeBlocksQuery() {
  return useQuery({ queryKey: TIMEBLOCKS_KEY, queryFn: getTimeBlocks });
}

export function useTimeBlockSettingsQuery() {
  return useQuery({ queryKey: ["timeblocks", "settings"], queryFn: getTimeBlockSettings });
}

export function useTimeBlockSettingsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { dayStartMin: number; dayEndMin: number }) => updateTimeBlockSettings(payload),
    onSuccess: (settings: TimeBlockSettings) => {
      client.setQueryData(["timeblocks", "settings"], settings);
    },
  });
}

export function useActiveBlockQuery() {
  return useQuery({ queryKey: ["timeblocks", "active"], queryFn: getActiveBlock, refetchInterval: 60_000 });
}

export function useTodayBlocksQuery() {
  return useQuery({ queryKey: ["timeblocks", "today"], queryFn: getTodayBlocks, refetchInterval: 60_000 });
}

export function useTimeBlockMutations() {
  const client = useQueryClient();
  const invalidateHome = () => client.invalidateQueries({ queryKey: ["home"] });
  const invalidateBlocks = () => client.invalidateQueries({ queryKey: ["timeblocks"] });

  const create = useMutation({
    mutationFn: (payload: CreateTimeBlockPayload) => createTimeBlock(payload),
    onSuccess: (created) => {
      client.setQueryData<TimeBlock[]>(TIMEBLOCKS_KEY, (old) => [...(old ?? []), created]);
      void invalidateHome();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTimeBlockPayload }) => updateTimeBlock(id, payload),
    onMutate: async ({ id, payload }) => {
      await client.cancelQueries({ queryKey: ["timeblocks"] });
      const previous = client.getQueryData<TimeBlock[]>(TIMEBLOCKS_KEY);
      client.setQueryData<TimeBlock[]>(TIMEBLOCKS_KEY, (old) =>
        (old ?? []).map((block) => (block.id === id ? { ...block, ...payload } : block)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(TIMEBLOCKS_KEY, context.previous);
    },
    onSuccess: () => {
      void invalidateBlocks();
      void invalidateHome();
    },
  });

  const remove = useMutation({
    mutationFn: deleteTimeBlock,
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ["timeblocks"] });
      const previous = client.getQueryData<TimeBlock[]>(TIMEBLOCKS_KEY);
      client.setQueryData<TimeBlock[]>(TIMEBLOCKS_KEY, (old) => (old ?? []).filter((block) => block.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) client.setQueryData(TIMEBLOCKS_KEY, context.previous);
    },
    onSuccess: () => {
      void invalidateBlocks();
      void invalidateHome();
    },
  });

  return { create, update, remove };
}
