import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProject, deleteProject, getProjects, setDefaultProject, updateProject, type CreateProjectPayload, type UpdateProjectPayload } from "../api/projects";

export function useProjectsQuery() {
  return useQuery({ queryKey: ["projects"], queryFn: getProjects });
}

export function useProjectMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.invalidateQueries({ queryKey: ["projects"] });
    await client.invalidateQueries({ queryKey: ["tasks"] });
    await client.invalidateQueries({ queryKey: ["timeblocks"] });
    await client.invalidateQueries({ queryKey: ["home"] });
  };
  const create = useMutation({ mutationFn: (payload: CreateProjectPayload) => createProject(payload), onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) => updateProject(id, payload), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteProject, onSuccess: invalidate });
  const setDefault = useMutation({ mutationFn: setDefaultProject, onSuccess: invalidate });
  return { create, update, remove, setDefault };
}
