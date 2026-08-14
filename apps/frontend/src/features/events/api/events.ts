import { api } from "@/lib/api";
import { CalendarEvent } from "@/types/entities";

export interface CalendarEventPayload {
  title: string;
  date: string;
  allDay: boolean;
  startMin?: number;
  endMin?: number;
  location?: string;
  color?: string;
}

export const eventsApi = {
  getEvents: async (from: string, to: string) => {
    const res = await api.get<{ data: CalendarEvent[] }>("/events", { params: { from, to } });
    return res.data.data;
  },

  getTodayEvents: async () => {
    const res = await api.get<{ data: CalendarEvent[] }>("/events/today");
    return res.data.data;
  },

  createEvent: async (payload: CalendarEventPayload) => {
    const res = await api.post<{ data: CalendarEvent }>("/events", payload);
    return res.data.data;
  },

  updateEvent: async (id: string, payload: Partial<CalendarEventPayload>) => {
    const res = await api.patch<{ data: CalendarEvent }>(`/events/${id}`, payload);
    return res.data.data;
  },

  deleteEvent: async (id: string) => {
    const res = await api.delete<{ data: { success: true } }>(`/events/${id}`);
    return res.data.data;
  },
};
