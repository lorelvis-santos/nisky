import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import type { CreateSubtaskDto, CreateTaskDto, ReorderTasksDto, TaskQueryDto, UpdateSubtaskDto, UpdateTaskDto } from "./tasks.validator";

function taskDate(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  // Date-only values represent a local calendar day, not midnight UTC.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
}

function taskProgress<T extends { subtasks?: Array<{ completed: boolean }> }>(task: T) {
  const subtasks = task.subtasks ?? [];
  return {
    ...task,
    subtaskCount: subtasks.length,
    completedSubtasks: subtasks.filter((subtask) => subtask.completed).length,
  };
}

export class TaskService {
  async list(userId: string, query: TaskQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const { skip, take } = getPaginationArgs(page, limit);
    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.q ? { OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }] } : {}),
    };

    const orderBy = query.sort === "priority"
      ? [{ priority: query.order }, { order: "asc" as const }, { createdAt: "desc" as const }]
      : query.sort === "dueDate"
        ? [{ dueDate: query.order }, { order: "asc" as const }, { createdAt: "desc" as const }]
        : { [query.sort]: query.order };

    const [data, totalItems] = await Promise.all([
      prisma.task.findMany({ where, skip, take, orderBy, include: { subtasks: { orderBy: { order: "asc" } } } }),
      prisma.task.count({ where }),
    ]);
    return buildPaginatedResponse(data.map(taskProgress), totalItems, page, limit);
  }

  async getById(userId: string, id: string) {
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });
    if (!task) throw new AppError("NOT_FOUND", "Tarea no encontrada");
    return taskProgress(task);
  }

  async create(userId: string, data: CreateTaskDto) {
    return prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: taskDate(data.dueDate),
        pomodoroEstimate: data.pomodoroEstimate ?? 0,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
      },
      include: { subtasks: true },
    }).then(taskProgress);
  }

  async update(userId: string, id: string, data: UpdateTaskDto) {
    await this.getById(userId, id);
    const completedAt = data.status === undefined ? undefined : data.status === "COMPLETED" ? new Date() : null;
    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.status !== undefined ? { status: data.status, completedAt } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: taskDate(data.dueDate) } : {}),
        ...(data.pomodoroEstimate !== undefined ? { pomodoroEstimate: data.pomodoroEstimate } : {}),
      },
      include: { subtasks: { orderBy: { order: "asc" } } },
    }).then(taskProgress);
  }

  async delete(userId: string, id: string) {
    await this.getById(userId, id);
    await prisma.task.delete({ where: { id } });
  }

  async reorder(userId: string, data: ReorderTasksDto) {
    const ids = data.items.map((item) => item.id);
    const owned = await prisma.task.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });
    if (owned.length !== new Set(ids).size) {
      throw new AppError("NOT_FOUND", "Tarea no encontrada");
    }
    await prisma.$transaction(
      data.items.map((item) => prisma.task.update({
        where: { id: item.id },
        data: { order: item.order },
      })),
    );
  }

  async listSubtasks(userId: string, taskId: string) {
    await this.getById(userId, taskId);
    return prisma.subtask.findMany({ where: { userId, taskId }, orderBy: { order: "asc" } });
  }

  async createSubtask(userId: string, taskId: string, data: CreateSubtaskDto) {
    await this.getById(userId, taskId);
    const last = await prisma.subtask.findFirst({ where: { userId, taskId }, orderBy: { order: "desc" }, select: { order: true } });
    return prisma.subtask.create({ data: { userId, taskId, title: data.title, order: (last?.order ?? -1) + 1 } });
  }

  async updateSubtask(userId: string, taskId: string, subtaskId: string, data: UpdateSubtaskDto) {
    await this.getById(userId, taskId);
    const subtask = await prisma.subtask.findFirst({ where: { id: subtaskId, taskId, userId } });
    if (!subtask) throw new AppError("NOT_FOUND", "Subtarea no encontrada");
    return prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.completed !== undefined ? { completed: data.completed, completedAt: data.completed ? new Date() : null } : {}),
      },
    });
  }

  async deleteSubtask(userId: string, taskId: string, subtaskId: string) {
    await this.getById(userId, taskId);
    const result = await prisma.subtask.deleteMany({ where: { id: subtaskId, taskId, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Subtarea no encontrada");
  }
}

export const taskService = new TaskService();
