import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsApi, CalendarEventPayload } from "../api/events";

export function useEventsQuery(from: string, to: string) {
  return useQuery({
    queryKey: ["events", from, to],
    queryFn: () => eventsApi.getEvents(from, to),
  });
}

export function useTodayEventsQuery() {
  return useQuery({
    queryKey: ["events", "today"],
    queryFn: () => eventsApi.getTodayEvents(),
    refetchInterval: 60_000,
  });
}

export function useEventMutations() {
  const queryClient = useQueryClient();

  const createEvent = useMutation({
    mutationFn: eventsApi.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CalendarEventPayload> }) =>
      eventsApi.updateEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    },
  });

  return {
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
