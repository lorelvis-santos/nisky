import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";

export async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  const [owned, member] = await Promise.all([
    prisma.project.findMany({ where: { userId }, select: { id: true } }),
    prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
  ]);
  return [...new Set([...owned.map(p => p.id), ...member.map(m => m.projectId)])];
}

export async function assertProjectAccess(userId: string, projectId: string): Promise<void> {
  const accessible = await getAccessibleProjectIds(userId);
  if (!accessible.includes(projectId)) {
    throw new AppError("FORBIDDEN", "No tienes acceso a este proyecto");
  }
}

export async function assertProjectOwner(userId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new AppError("FORBIDDEN", "Solo el propietario puede realizar esta acción");
}

export async function getUserRoleInProject(userId: string, projectId: string): Promise<"OWNER" | "MEMBER" | null> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (project) return "OWNER";
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export async function assertTaskAccess(userId: string, taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { userId: true, projectId: true } });
  if (!task) throw new AppError("NOT_FOUND", "Tarea no encontrada");
  if (task.userId === userId) return;
  if (task.projectId) {
    const accessible = await getAccessibleProjectIds(userId);
    if (accessible.includes(task.projectId)) return;
  }
  throw new AppError("FORBIDDEN", "No tienes acceso a esta tarea");
}

export async function assertNoteAccess(userId: string, noteId: string): Promise<void> {
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { userId: true } });
  if (!note) throw new AppError("NOT_FOUND", "Nota no encontrada");
  if (note.userId === userId) return;
  throw new AppError("FORBIDDEN", "No tienes acceso a esta nota");
}

export async function getProjectAudience(projectId: string): Promise<string[]> {
  const [project, members] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } }),
    prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
  ]);
  const ids = members.map((member) => member.userId);
  if (project?.userId) ids.push(project.userId);
  return [...new Set(ids)];
}