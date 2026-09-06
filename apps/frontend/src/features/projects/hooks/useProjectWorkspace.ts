import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProjectResource,
  deleteProjectResource,
  fetchProjectActivity,
  fetchProjectResources,
  fetchProjectSummary,
  type ProjectResourcePayload,
} from "../api/workspace";

export function useProjectSummary(projectId: string | null) {
  return useQuery({
    queryKey: ["projects", projectId, "summary"],
    queryFn: () => fetchProjectSummary(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useProjectActivity(projectId: string | null, page = 1) {
  return useQuery({
    queryKey: ["projects", projectId, "activity", page],
    queryFn: () => fetchProjectActivity(projectId as string, { page, limit: 30 }),
    enabled: Boolean(projectId),
  });
}

export function useProjectResources(projectId: string | null) {
  return useQuery({
    queryKey: ["projects", projectId, "resources"],
    queryFn: () => fetchProjectResources(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useProjectResourceMutations(projectId: string) {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["projects", projectId, "resources"] });
    await client.invalidateQueries({ queryKey: ["projects", projectId, "activity"] });
    await client.invalidateQueries({ queryKey: ["projects", projectId, "summary"] });
  };
  const create = useMutation({
    mutationFn: (payload: ProjectResourcePayload) => createProjectResource(projectId, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (resourceId: string) => deleteProjectResource(projectId, resourceId),
    onSuccess: invalidate,
  });
  return { create, remove };
}
