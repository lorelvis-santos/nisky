import { useQuery } from "@tanstack/react-query";
import { getHabitsMatrix, getHomeActivity, getHomeOverview } from "../api/home";

export function useHomeOverviewQuery() {
  return useQuery({ queryKey: ["home", "overview"], queryFn: getHomeOverview, refetchInterval: 60_000 });
}

export function useHomeActivityQuery(weeks = 12) {
  return useQuery({ queryKey: ["home", "activity", weeks], queryFn: () => getHomeActivity(weeks), refetchInterval: 300_000 });
}

export function useHabitsMatrixQuery() {
  return useQuery({ queryKey: ["home", "habits-matrix"], queryFn: getHabitsMatrix, refetchInterval: 60_000 });
}
