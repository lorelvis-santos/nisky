import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import type { CreateProjectDto, UpdateProjectDto } from "./projects.validator";

const DEFAULT_COLOR = "#303e51";

export class ProjectService {
  private defaultCache = new Map<string, string | null>();

  async list(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async getDefault(userId: string) {
    return prisma.project.findFirst({ where: { userId, isDefault: true } });
  }

  async getDefaultId(userId: string) {
    if (this.defaultCache.has(userId)) return this.defaultCache.get(userId);
    const project = await this.getDefault(userId);
    this.defaultCache.set(userId, project?.id ?? null);
    return project?.id ?? null;
  }

  async create(userId: string, data: CreateProjectDto) {
    const count = await prisma.project.count({ where: { userId } });
    if (count >= 20) throw new AppError("BAD_REQUEST", "Has alcanzado el límite de proyectos");
    return prisma.project.create({
      data: {
        userId,
        name: data.name,
        color: data.color ?? DEFAULT_COLOR,
        isDefault: false,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateProjectDto) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (project.isDefault && data.name !== undefined && data.name !== project.name) {
      throw new AppError("FORBIDDEN", "El proyecto por defecto no se puede renombrar");
    }
    return prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      },
    });
  }

  async setDefault(userId: string, id: string) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (project.isDefault) return project;
    const [, updated] = await prisma.$transaction([
      prisma.project.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
      prisma.project.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return updated;
  }

  async delete(userId: string, id: string) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (project.isDefault) throw new AppError("FORBIDDEN", "El proyecto por defecto no se puede eliminar");
    const fallback = await this.getDefault(userId);
    if (!fallback) throw new AppError("CONFLICT", "No existe un proyecto por defecto");
    await prisma.$transaction([
      prisma.task.updateMany({ where: { userId, projectId: id }, data: { projectId: fallback.id } }),
      prisma.timeBlock.updateMany({ where: { userId, projectId: id }, data: { projectId: null } }),
      prisma.project.delete({ where: { id } }),
    ]);
    if (this.defaultCache.get(userId) === id) this.defaultCache.delete(userId);
    return { success: true, fallbackProjectId: fallback.id };
  }
}

export const projectService = new ProjectService();
