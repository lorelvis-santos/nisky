import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import { nextOccurrence } from "../../utils/recurrence";
import { projectService } from "../projects/projects.service";
import type { CreateSubtaskDto, CreateTaskDto, ReorderTasksDto, TaskQueryDto, UpdateSubtaskDto, UpdateTaskDto } from "./tasks.validator";

const TASKS_TZ = "America/Santo_Domingo";

function taskDate(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  // Date-only values represent a local calendar day, not midnight UTC.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
}

type RecurrenceSource = {
  dueDate: Date | null;
  recurrenceType: "DAILY" | "WEEKLY" | "MONTHLY" | null;
  recurrenceInterval: number;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceEndsAt: Date | null;
};

function nextTaskOccurrence(task: RecurrenceSource): Date | null {
  if (!task.dueDate || !task.recurrenceType) return null;
  let next = nextOccurrence(
    task.dueDate,
    TASKS_TZ,
    task.recurrenceType,
    task.recurrenceInterval,
    task.recurrenceDaysOfWeek,
    task.recurrenceDayOfMonth ?? null,
  );
  let guard = 0;
  while (next < new Date() && guard < 365) {
    next = nextOccurrence(
      next,
      TASKS_TZ,
      task.recurrenceType,
      task.recurrenceInterval,
      task.recurrenceDaysOfWeek,
      task.recurrenceDayOfMonth ?? null,
    );
    guard += 1;
  }
  if (guard === 365) return null;
  if (task.recurrenceEndsAt && next > task.recurrenceEndsAt) return null;
  return next;
}

function recurrenceData(data: { recurrence?: { repeatType?: "DAILY" | "WEEKLY" | "MONTHLY"; repeatInterval?: number; repeatDaysOfWeek?: number[]; repeatDayOfMonth?: number; repeatEndsAt?: string | null } }) {
  const recurrence = data.recurrence;
  return {
    recurrenceType: recurrence?.repeatType ?? null,
    recurrenceInterval: recurrence?.repeatInterval ?? 1,
    recurrenceDaysOfWeek: recurrence?.repeatDaysOfWeek ?? [],
    recurrenceDayOfMonth: recurrence?.repeatDayOfMonth ?? null,
    recurrenceEndsAt: recurrence?.repeatEndsAt ? new Date(recurrence.repeatEndsAt) : null,
  };
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
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
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
    const projectId = data.projectId ?? (await projectService.getDefaultId(userId));
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
      if (!project) throw new AppError("BAD_REQUEST", "El proyecto no existe");
    }
    return prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: taskDate(data.dueDate),
        source: "MANUAL",
        projectId,
        pomodoroEstimate: data.pomodoroEstimate ?? 0,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
        ...recurrenceData(data),
      },
      include: { subtasks: true },
    }).then(taskProgress);
  }

  async update(userId: string, id: string, data: UpdateTaskDto) {
    await this.getById(userId, id);
    if (data.projectId !== undefined && data.projectId !== null) {
      const project = await prisma.project.findFirst({ where: { id: data.projectId, userId } });
      if (!project) throw new AppError("BAD_REQUEST", "El proyecto no existe");
    }
    const completedAt = data.status === undefined ? undefined : data.status === "COMPLETED" ? new Date() : null;
    const recurrence = data.recurrence;
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.status !== undefined ? { status: data.status, completedAt } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.dueDate !== undefined ? { dueDate: taskDate(data.dueDate) } : {}),
        ...(data.pomodoroEstimate !== undefined ? { pomodoroEstimate: data.pomodoroEstimate } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(recurrence !== undefined ? {
          recurrenceType: recurrence.repeatType ?? null,
          recurrenceInterval: recurrence.repeatInterval ?? 1,
          recurrenceDaysOfWeek: recurrence.repeatDaysOfWeek ?? [],
          recurrenceDayOfMonth: recurrence.repeatDayOfMonth ?? null,
          recurrenceEndsAt: recurrence.repeatEndsAt ? new Date(recurrence.repeatEndsAt) : null,
        } : {}),
      },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });

    if ((data.status === "COMPLETED" || data.status === "CANCELLED") && updated.recurrenceType) {
      const next = nextTaskOccurrence(updated);
      if (next) {
        const templateId = updated.recurrenceParentId ?? updated.id;
        const existing = await prisma.task.findFirst({ where: { recurrenceParentId: templateId, dueDate: next } });
        if (!existing) {
          await prisma.task.create({
            data: {
              userId,
              title: updated.title,
              description: updated.description,
              priority: updated.priority,
              projectId: updated.projectId,
              pomodoroEstimate: updated.pomodoroEstimate,
              dueDate: next,
              source: "MANUAL",
              status: "PENDING",
              recurrenceType: updated.recurrenceType,
              recurrenceInterval: updated.recurrenceInterval,
              recurrenceDaysOfWeek: updated.recurrenceDaysOfWeek,
              recurrenceDayOfMonth: updated.recurrenceDayOfMonth,
              recurrenceEndsAt: updated.recurrenceEndsAt,
              recurrenceParentId: templateId,
            },
          });
        }
      }
    }
    return taskProgress(updated);
  }

  async delete(userId: string, id: string) {
    const task = await this.getById(userId, id);
    if (task.source !== "MANUAL") {
      throw new AppError("FORBIDDEN", "Las tareas de integración no se pueden eliminar. Archívalas para ocultarlas.");
    }
    await prisma.task.deleteMany({ where: { recurrenceParentId: id, status: { in: ["PENDING", "IN_PROGRESS"] } } });
    await prisma.task.delete({ where: { id } });
  }

  async archive(userId: string, id: string, archived: boolean) {
    await this.getById(userId, id);
    return prisma.task.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
      include: { subtasks: { orderBy: { order: "asc" } } },
    }).then(taskProgress);
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
