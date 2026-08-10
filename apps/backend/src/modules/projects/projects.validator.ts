import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid("El identificador no es válido") });

export const createProjectSchema = z.object({
  name: z.string("El nombre es requerido").trim().min(1, "El nombre es requerido").max(100),
  color: z.string().trim().max(20).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectIdParamSchema = z.object({ projectId: z.uuid("El proyecto no es válido") });
export const invitationIdParamSchema = z.object({ invitationId: z.uuid("La invitación no es válida") });
export const memberIdParamSchema = z.object({
  projectId: z.uuid("El proyecto no es válido"),
  memberId: z.uuid("El miembro no es válido"),
});
export const inviteMemberSchema = z.object({ email: z.email("Email inválido") });
export const updateMemberRoleSchema = z.object({ role: z.enum(["OWNER", "MEMBER"]) });

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
