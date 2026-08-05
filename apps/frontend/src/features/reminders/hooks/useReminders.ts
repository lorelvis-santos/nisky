import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReminder, deleteReminder, fetchReminders, snoozeReminder, type ReminderInput } from "../api/reminders";

export function useRemindersQuery() {
  return useQuery({ queryKey: ["reminders"], queryFn: fetchReminders });
}

export function useReminderMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["reminders"] });
  return {
    create: useMutation({ mutationFn: (input: ReminderInput) => createReminder(input), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: deleteReminder, onSuccess: invalidate }),
    snooze: useMutation({ mutationFn: ({ id, minutes }: { id: string; minutes: number }) => snoozeReminder(id, minutes), onSuccess: invalidate }),
  };
}
