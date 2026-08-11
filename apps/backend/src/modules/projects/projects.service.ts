import type { Prisma } from "../../infra/prisma/generated/prisma/client";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { pushService } from "../push/push.service";
import { assertProjectAccess, assertProjectOwner, getProjectAudience, getUserRoleInProject } from "./access";
import type { CreateProjectDto, UpdateProjectDto } from "./projects.validator";
import { emitToUsers } from "../../config/socket.emit";

const DEFAULT_COLOR = "#303e51";

export class ProjectService {
  private defaultCache = new Map<string, string | null>();

  async list(userId: string) {
    const merged = await this.listUserProjects(userId);
    // Mezclar sin duplicar
    const map = new Map<string, (typeof merged)[number]>();
    for (const p of merged) map.set(p.id, p);
    return [...map.values()].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  async getById(userId: string, projectId: string) {
    await assertProjectAccess(userId, projectId);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    return project;
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
    const role = await getUserRoleInProject(userId, id);
    if (!role) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (role !== "OWNER") throw new AppError("FORBIDDEN", "Solo el propietario puede editar el proyecto");
    const project = await prisma.project.findFirst({ where: { id } });
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
    const role = await getUserRoleInProject(userId, id);
    if (!role) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (role !== "OWNER") throw new AppError("FORBIDDEN", "Solo el propietario puede cambiar el proyecto predeterminado");
    const project = await prisma.project.findFirst({ where: { id } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (project.isDefault) return project;
    const [, updated] = await prisma.$transaction([
      prisma.project.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
      prisma.project.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return updated;
  }

  async delete(userId: string, id: string) {
    await assertProjectOwner(userId, id);
    const project = await prisma.project.findFirst({ where: { id } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (project.isDefault) throw new AppError("FORBIDDEN", "El proyecto por defecto no se puede eliminar");
    const fallback = await this.getDefault(userId);
    if (!fallback) throw new AppError("CONFLICT", "No existe un proyecto por defecto");
    await prisma.$transaction([
      prisma.task.updateMany({ where: { userId, projectId: id }, data: { projectId: fallback.id } }),
      prisma.timeBlock.updateMany({ where: { userId, projectId: id }, data: { projectId: null } }),
      prisma.projectInvitation.deleteMany({ where: { projectId: id } }),
      prisma.projectMember.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);
    if (this.defaultCache.get(userId) === id) this.defaultCache.delete(userId);
    return { success: true, fallbackProjectId: fallback.id };
  }

  async listUserProjects(userId: string) {
    const projectInclude = {
      _count: { select: { tasks: { where: { archivedAt: null } } } },
      members: {
        take: 4,
        include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      },
    } satisfies Prisma.ProjectInclude;
    const [owned, memberships] = await Promise.all([
      prisma.project.findMany({ where: { userId }, include: projectInclude, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
      prisma.projectMember.findMany({
        where: { userId },
        include: { project: { include: projectInclude } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const memberProjects = memberships.map(m => m.project);
    const seen = new Set<string>();
    return [...owned, ...memberProjects].filter((project) => {
      if (seen.has(project.id)) return false;
      seen.add(project.id);
      return true;
    });
  }

  async listMembers(userId: string, projectId: string) {
    await assertProjectAccess(userId, projectId);
    const [members, project] = await Promise.all([
      prisma.projectMember.findMany({
        where: { projectId },
        include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      }),
      prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } }),
    ]);
    // Incluir al owner como miembro virtual si no está en la tabla
    const ownerInMembers = members.some(m => m.userId === project?.userId);
    if (project && !ownerInMembers) {
      const owner = await prisma.user.findUnique({
        where: { id: project.userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
      if (owner) {
        members.unshift({
          id: `owner-${owner.id}`,
          projectId,
          userId: owner.id,
          user: owner,
          role: "OWNER",
          createdAt: new Date(0),
        });
      }
    }
    return members;
  }

  async inviteMember(userId: string, projectId: string, email: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
    if (project.isDefault) throw new AppError("FORBIDDEN", "El proyecto por defecto no se puede compartir");

    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (email === inviter?.email) throw new AppError("BAD_REQUEST", "No puedes invitarte a ti mismo");

    const invitee = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!invitee) throw new AppError("NOT_FOUND", "El usuario no existe en Nisky");

    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: invitee.id } },
    });
    if (existingMember) throw new AppError("CONFLICT", "El usuario ya es miembro");

    const existingInvite = await prisma.projectInvitation.findUnique({
      where: { projectId_email: { projectId, email } },
    });
    if (existingInvite && existingInvite.status === "PENDING")
      throw new AppError("CONFLICT", "Ya hay una invitación pendiente para este email");

    // Si existe una ACCEPTED o DECLINED anterior, la reemplazamos
    if (existingInvite) {
      await prisma.projectInvitation.delete({ where: { id: existingInvite.id } });
    }

    const invitation = await prisma.projectInvitation.create({
      data: { projectId, invitedById: userId, email },
    });

    await pushService.sendToUser(invitee.id, {
      title: "Nueva invitación a proyecto",
      body: `${inviter?.name ?? inviter?.email} te invitó a "${project.name}"`,
      url: "/",
      tag: `invite-${project.id}`,
      data: { type: "PROJECT_INVITATION", projectId: project.id },
    });

    emitToUsers([invitee.id, ...(await getProjectAudience(projectId))], "projects", { kind: "invitation", projectId });

    return invitation;
  }

  async listPendingInvitations(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return [];
    return prisma.projectInvitation.findMany({
      where: { email: user.email, status: "PENDING" },
      include: {
        project: { select: { id: true, name: true, color: true, userId: true } },
        invitedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new AppError("NOT_FOUND", "Usuario no encontrado");
    const invitation = await prisma.projectInvitation.findFirst({
      where: { id: invitationId, email: user.email, status: "PENDING" },
    });
    if (!invitation) throw new AppError("NOT_FOUND", "No hay invitación pendiente");
    const projectId = invitation.projectId;
    await prisma.$transaction([
      prisma.projectMember.create({ data: { projectId, userId, role: "MEMBER" } }),
      prisma.projectInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } }),
    ]);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true, name: true } });
    if (project) {
      await pushService.sendToUser(project.userId, {
        title: "Invitación aceptada",
        body: `${user.email} aceptó tu invitación a "${project.name}"`,
        url: `/projects`,
        tag: `invite-accepted-${projectId}`,
        data: { type: "PROJECT_INVITATION_ACCEPTED", projectId },
      });
    }
    emitToUsers([...(await getProjectAudience(projectId))], "projects", { kind: "invitation_accepted", projectId });
    return { success: true };
  }

  async declineInvitation(userId: string, invitationId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) throw new AppError("NOT_FOUND", "Usuario no encontrado");
    const invitation = await prisma.projectInvitation.findFirst({
      where: { id: invitationId, email: user.email, status: "PENDING" },
    });
    if (!invitation) throw new AppError("NOT_FOUND", "No hay invitación pendiente");
    await prisma.projectInvitation.update({ where: { id: invitation.id }, data: { status: "DECLINED" } });
    return { success: true };
  }

  async removeMember(userId: string, projectId: string, memberId: string) {
    await assertProjectOwner(userId, projectId);
    const project = await prisma.project.findFirst({ where: { id: projectId }, select: { isDefault: true } });
    if (project?.isDefault) throw new AppError("FORBIDDEN", "El proyecto por defecto es personal y no tiene miembros");
    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) throw new AppError("NOT_FOUND", "Miembro no encontrado");
    if (member.userId === userId) throw new AppError("FORBIDDEN", "No puedes eliminarte a ti mismo");
    await prisma.$transaction([
      prisma.task.updateMany({ where: { projectId, assigneeId: member.userId }, data: { assigneeId: null } }),
      prisma.task.updateMany({ where: { projectId, userId: member.userId }, data: { userId } }),
      prisma.projectMember.delete({ where: { id: member.id } }),
    ]);
    emitToUsers([member.userId, ...(await getProjectAudience(projectId))], "projects", { kind: "member_removed", projectId, userId: member.userId });
    return { success: true };
  }

  async updateMemberRole(userId: string, projectId: string, memberId: string, role: "OWNER" | "MEMBER") {
    await assertProjectOwner(userId, projectId);
    const project = await prisma.project.findFirst({ where: { id: projectId }, select: { isDefault: true } });
    if (project?.isDefault) throw new AppError("FORBIDDEN", "El proyecto por defecto es personal y no tiene miembros");
    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) throw new AppError("NOT_FOUND", "Miembro no encontrado");
    if (member.userId === userId) throw new AppError("FORBIDDEN", "No puedes cambiar tu propio rol");
    if (role === "OWNER") {
      await prisma.$transaction([
        prisma.project.update({ where: { id: projectId }, data: { userId: member.userId } }),
        prisma.projectMember.update({ where: { id: member.id }, data: { role: "OWNER" } }),
        prisma.projectMember.upsert({
          where: { projectId_userId: { projectId, userId } },
          create: { projectId, userId, role: "MEMBER" },
          update: { role: "MEMBER" },
        }),
      ]);
    } else {
      await prisma.projectMember.update({
        where: { id: member.id },
        data: { role: "MEMBER" },
      });
    }
    emitToUsers(await getProjectAudience(projectId), "projects", { kind: "member_role_changed", projectId, userId: member.userId, role });
    return { success: true };
  }
}

export const projectService = new ProjectService();
