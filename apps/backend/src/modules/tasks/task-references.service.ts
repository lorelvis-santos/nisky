import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { assertTaskAccess } from "../projects/access";
import type { CreateTaskReferenceDto, ReorderTaskReferencesDto, UpdateTaskReferenceDto } from "./tasks.validator";

export class TaskReferenceService {
  async list(userId: string, taskId: string) {
    await assertTaskAccess(userId, taskId);
    return prisma.taskReference.findMany({
      where: { taskId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }

  async create(userId: string, taskId: string, data: CreateTaskReferenceDto) {
    await assertTaskAccess(userId, taskId);
    const last = await prisma.taskReference.findFirst({
      where: { taskId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    return prisma.taskReference.create({
      data: {
        taskId,
        userId,
        title: data.title?.trim() || null,
        url: data.url,
        order: (last?.order ?? -1) + 1,
      },
    });
  }

  async update(userId: string, taskId: string, referenceId: string, data: UpdateTaskReferenceDto) {
    await assertTaskAccess(userId, taskId);
    const reference = await prisma.taskReference.findFirst({ where: { id: referenceId, taskId } });
    if (!reference) throw new AppError("NOT_FOUND", "Referencia no encontrada");
    return prisma.taskReference.update({
      where: { id: reference.id },
      data: {
        ...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
      },
    });
  }

  async remove(userId: string, taskId: string, referenceId: string) {
    await assertTaskAccess(userId, taskId);
    const reference = await prisma.taskReference.findFirst({ where: { id: referenceId, taskId } });
    if (!reference) throw new AppError("NOT_FOUND", "Referencia no encontrada");
    await prisma.taskReference.delete({ where: { id: reference.id } });
    return { success: true };
  }

  async reorder(userId: string, taskId: string, data: ReorderTaskReferencesDto) {
    await assertTaskAccess(userId, taskId);
    const references = await prisma.taskReference.findMany({ where: { taskId }, select: { id: true } });
    const referenceIds = new Set(references.map((reference) => reference.id));
    const submittedIds = new Set(data.items.map((item) => item.id));
    if (submittedIds.size !== data.items.length || submittedIds.size !== referenceIds.size || [...submittedIds].some((id) => !referenceIds.has(id))) {
      throw new AppError("BAD_REQUEST", "Debes enviar todas las referencias de la tarea");
    }
    await prisma.$transaction(
      data.items.map((item) => prisma.taskReference.update({ where: { id: item.id }, data: { order: item.order } })),
    );
    return this.list(userId, taskId);
  }
}

export const taskReferenceService = new TaskReferenceService();
