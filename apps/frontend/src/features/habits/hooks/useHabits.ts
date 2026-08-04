import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHabit, deleteHabit, fetchHabits, toggleHabitEntry, updateHabit, type CreateHabitPayload, type UpdateHabitPayload } from "../api/habits";

export function useHabitsQuery() {
  return useQuery({ queryKey: ["habits"], queryFn: fetchHabits });
}

export function useHabitMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["habits"] });
    await client.invalidateQueries({ queryKey: ["habit-entries"] });
  };
  const create = useMutation({ mutationFn: (payload: CreateHabitPayload) => createHabit(payload), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateHabitPayload }) => updateHabit(id, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteHabit, onSuccess: invalidate });
  const toggleEntry = useMutation({ mutationFn: ({ id, date }: { id: string; date: string }) => toggleHabitEntry(id, date), onSuccess: invalidate });
  return { create, update, remove, toggleEntry };
}
