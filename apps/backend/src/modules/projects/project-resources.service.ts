import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { assertProjectAccess, getProjectAudience, getUserRoleInProject } from "./access";
import { emitToUsers } from "../../config/socket.emit";
import { projectActivityService } from "./project-activity.service";
import type { CreateResourceDto } from "./projects.validator";

const CREATOR_SELECT = { id: true, email: true, name: true, username: true, avatarUrl: true };

export class ProjectResourceService {
  async list(userId: string, projectId: string) {
    await assertProjectAccess(userId, projectId);
    return prisma.projectResource.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: CREATOR_SELECT } },
    });
  }

  async create(userId: string, projectId: string, data: CreateResourceDto) {
    await assertProjectAccess(userId, projectId);
    const resource = await prisma.projectResource.create({
      data: {
        projectId,
        createdById: userId,
        title: data.title,
        url: data.url,
        description: data.description ?? null,
      },
      include: { createdBy: { select: CREATOR_SELECT } },
    });
    await projectActivityService.record({
      projectId,
      actorId: userId,
      type: "RESOURCE_ADDED",
      entityId: resource.id,
      entityTitle: resource.title,
    });
    emitToUsers(await getProjectAudience(projectId), "projects", { kind: "resource", projectId });
    return resource;
  }

  async delete(userId: string, projectId: string, resourceId: string) {
    const role = await getUserRoleInProject(userId, projectId);
    if (!role) throw new AppError("FORBIDDEN", "No tienes acceso a este proyecto");
    const resource = await prisma.projectResource.findFirst({ where: { id: resourceId, projectId } });
    if (!resource) throw new AppError("NOT_FOUND", "Recurso no encontrado");
    if (role !== "OWNER" && resource.createdById !== userId) {
      throw new AppError("FORBIDDEN", "Solo puedes eliminar tus propios recursos");
    }
    await prisma.projectResource.delete({ where: { id: resource.id } });
    await projectActivityService.record({
      projectId,
      actorId: userId,
      type: "RESOURCE_DELETED",
      entityId: resource.id,
      entityTitle: resource.title,
    });
    emitToUsers(await getProjectAudience(projectId), "projects", { kind: "resource", projectId });
    return { success: true };
  }
}

export const projectResourceService = new ProjectResourceService();
