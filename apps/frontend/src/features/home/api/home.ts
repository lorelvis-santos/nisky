import { api } from "@/lib/api";
import type { HabitsMatrix, HomeActivityPoint, HomeOverview } from "@/types/entities";

export async function getHomeOverview() {
  const { data } = await api.get<{ data: HomeOverview }>("/home/overview");
  return data.data;
}

export async function getHomeActivity(weeks = 12) {
  const { data } = await api.get<{ data: HomeActivityPoint[] }>("/home/activity", { params: { weeks } });
  return data.data;
}

export async function getHabitsMatrix() {
  const { data } = await api.get<{ data: HabitsMatrix }>("/home/habits-matrix");
  return data.data;
}
