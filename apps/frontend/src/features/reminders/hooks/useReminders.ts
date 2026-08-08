import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReminder, deleteReminder, fetchPendingReminders, fetchReminders, resolveReminder, snoozeReminder, updateReminder, type ReminderInput, type ResolveReminderPayload } from "../api/reminders";

export function useRemindersQuery() {
  return useQuery({ queryKey: ["reminders"], queryFn: fetchReminders });
}

export function usePendingRemindersQuery() {
  return useQuery({ queryKey: ["reminders-pending"], queryFn: fetchPendingReminders });
}

export function useReminderMutations() {
  const client = useQueryClient();
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["reminders"] });
    client.invalidateQueries({ queryKey: ["reminders-pending"] });
  };
  return {
    create: useMutation({ mutationFn: (input: ReminderInput) => createReminder(input), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: deleteReminder, onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<ReminderInput> }) => updateReminder(id, input), onSuccess: invalidate }),
    snooze: useMutation({ mutationFn: ({ id, minutes }: { id: string; minutes: number }) => snoozeReminder(id, minutes), onSuccess: invalidate }),
    resolve: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: ResolveReminderPayload }) => resolveReminder(id, payload),
      onSuccess: invalidate,
    }),
  };
}
