import type { Prisma } from "../../infra/prisma/generated/prisma/client";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import { nextOccurrence } from "../../utils/recurrence";
import { assertTaskAccess, getAccessibleProjectIds, getProjectAudience, getUserRoleInProject } from "../projects/access";
import { projectService } from "../projects/projects.service";
import { emitToUsers } from "../../config/socket.emit";
import type { CreateSubtaskDto, CreateTaskDto, ReorderTasksDto, TaskQueryDto, UpdateSubtaskDto, UpdateTaskDto } from "./tasks.validator";

const TASKS_TZ = "America/Santo_Domingo";

const taskInclude = {
  subtasks: { orderBy: { order: "asc" } },
  assignee: { select: { id: true, email: true, name: true, avatarUrl: true } },
  project: { select: { id: true, name: true, color: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

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

function taskProgress<T extends { _count?: { comments: number }; subtasks?: Array<{ completed: boolean }> }>(task: T) {
  const { _count, subtasks, ...rest } = task;
  return {
    ...rest,
    subtaskCount: subtasks?.length ?? 0,
    completedSubtasks: subtasks?.filter((subtask) => subtask.completed).length ?? 0,
    commentCount: _count?.comments ?? 0,
  };
}

export class TaskService {
  private async audience(projectId: string | null, userId: string): Promise<string[]> {
    if (!projectId) return [userId];
    const projectAudience = await getProjectAudience(projectId);
    return [...new Set([userId, ...projectAudience])];
  }

  async list(userId: string, query: TaskQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const { skip, take } = getPaginationArgs(page, limit);
    const accessible = await getAccessibleProjectIds(userId);
    const where = {
      OR: [{ userId }, { projectId: { in: accessible } }],
      archivedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.q ? { AND: [{ OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }] }] } : {}),
    };

    const orderBy = query.sort === "priority"
      ? [{ priority: query.order }, { order: "asc" as const }, { createdAt: "desc" as const }]
      : query.sort === "dueDate"
        ? [{ dueDate: query.order }, { order: "asc" as const }, { createdAt: "desc" as const }]
        : { [query.sort]: query.order };

    const [data, totalItems] = await Promise.all([
      prisma.task.findMany({ where, skip, take, orderBy, include: taskInclude }),
      prisma.task.count({ where }),
    ]);
    return buildPaginatedResponse(data.map(taskProgress), totalItems, page, limit);
  }

  async getById(userId: string, id: string) {
    const accessible = await getAccessibleProjectIds(userId);
    const task = await prisma.task.findFirst({
      where: { id, OR: [{ userId }, { projectId: { in: accessible } }] },
      include: taskInclude,
    });
    if (!task) throw new AppError("NOT_FOUND", "Tarea no encontrada");
    return taskProgress(task);
  }

  async create(userId: string, data: CreateTaskDto) {
    const projectId = data.projectId ?? (await projectService.getDefaultId(userId));
    if (projectId) {
      const role = await getUserRoleInProject(userId, projectId);
      if (!role) throw new AppError("BAD_REQUEST", "El proyecto no existe");
    }
    if (data.assigneeId) {
      if (!projectId) throw new AppError("BAD_REQUEST", "La tarea debe pertenecer a un proyecto para asignarla");
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: data.assigneeId } },
      });
      // También verificar si es el owner del proyecto
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: data.assigneeId } });
      if (!member && !project) throw new AppError("BAD_REQUEST", "El asignado debe ser miembro del proyecto");
    }
    const created = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: taskDate(data.dueDate),
        source: "MANUAL",
        projectId,
        assigneeId: data.assigneeId ?? null,
        pomodoroEstimate: data.pomodoroEstimate ?? 0,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
        ...recurrenceData(data),
      },
      include: { subtasks: true },
    });
    emitToUsers(await this.audience(projectId ?? null, userId), "tasks");
    return taskProgress(created);
  }

  async update(userId: string, id: string, data: UpdateTaskDto) {
    await assertTaskAccess(userId, id);
    const existing = await prisma.task.findUnique({ where: { id }, select: { projectId: true, assigneeId: true } });
    if (!existing) throw new AppError("NOT_FOUND", "Tarea no encontrada");

    // Validar assigneeId
    if (data.assigneeId !== undefined) {
      if (data.assigneeId) {
        const targetProjectId = data.projectId ?? existing.projectId;
        if (!targetProjectId) throw new AppError("BAD_REQUEST", "La tarea debe pertenecer a un proyecto para asignarla");
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: targetProjectId, userId: data.assigneeId } },
        });
        const owner = await prisma.project.findFirst({ where: { id: targetProjectId, userId: data.assigneeId } });
        if (!member && !owner) throw new AppError("BAD_REQUEST", "El asignado debe ser miembro del proyecto");
      }
    }

    // Si cambia projectId, validar assigneeId
    if (data.projectId !== undefined && data.projectId !== null && existing.assigneeId && data.assigneeId === undefined) {
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: data.projectId, userId: existing.assigneeId } },
      });
      if (!member) {
        data.assigneeId = null; // Auto-null si el assignee no es miembro del nuevo proyecto
      }
    }

    if (data.projectId !== undefined && data.projectId !== null) {
      const role = await getUserRoleInProject(userId, data.projectId);
      if (!role) throw new AppError("BAD_REQUEST", "El proyecto no existe");
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
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
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

    const newProjectId = data.projectId !== undefined ? data.projectId : existing.projectId;
    const audiences = [...(await this.audience(newProjectId, userId))];
    if (data.projectId !== undefined && data.projectId !== existing.projectId && existing.projectId) {
      audiences.push(...(await this.audience(existing.projectId, userId)));
    }
    emitToUsers(audiences, "tasks");

    if ((data.status === "COMPLETED" || data.status === "CANCELLED") && updated.recurrenceType) {
      const next = nextTaskOccurrence(updated);
      if (next) {
        const templateId = updated.recurrenceParentId ?? updated.id;
        const existing = await prisma.task.findFirst({ where: { recurrenceParentId: templateId, dueDate: next } });
        if (!existing) {
          const created = await prisma.task.create({
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
          emitToUsers(await this.audience(created.projectId, userId), "tasks");
        }
      }
    }
    return taskProgress(updated);
  }

  async delete(userId: string, id: string) {
    await assertTaskAccess(userId, id);
    const task = await prisma.task.findUnique({ where: { id }, select: { source: true, projectId: true } });
    if (!task) throw new AppError("NOT_FOUND", "Tarea no encontrada");
    if (task.source === "MANUAL") {
      await prisma.task.deleteMany({ where: { recurrenceParentId: id, status: { in: ["PENDING", "IN_PROGRESS"] } } });
      await prisma.task.delete({ where: { id } });
      emitToUsers(await this.audience(task.projectId, userId), "tasks");
      return "deleted";
    }
    await prisma.task.update({ where: { id }, data: { archivedAt: new Date() } });
    emitToUsers(await this.audience(task.projectId, userId), "tasks");
    return "archived";
  }

  async bulkDelete(userId: string, ids: string[]) {
    const tasks = await prisma.task.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, source: true, projectId: true },
    });
    if (tasks.length !== new Set(ids).size) {
      throw new AppError("NOT_FOUND", "Tarea no encontrada");
    }
    const manualIds = tasks.filter((task) => task.source === "MANUAL").map((task) => task.id);
    const integrationIds = tasks.filter((task) => task.source !== "MANUAL").map((task) => task.id);
    if (integrationIds.length > 0) {
      await prisma.task.updateMany({ where: { id: { in: integrationIds } }, data: { archivedAt: new Date() } });
    }
    if (manualIds.length > 0) {
      await prisma.task.deleteMany({ where: { recurrenceParentId: { in: manualIds }, status: { in: ["PENDING", "IN_PROGRESS"] } } });
      await prisma.task.deleteMany({ where: { id: { in: manualIds } } });
    }
    const audiences = await Promise.all(tasks.map((task) => this.audience(task.projectId, userId)));
    emitToUsers(audiences.flat(), "tasks");
    return { deleted: manualIds.length, archived: integrationIds.length };
  }

  async bulkMove(userId: string, ids: string[], projectId: string | null) {
    for (const id of ids) {
      await assertTaskAccess(userId, id);
    }
    if (projectId) {
      const role = await getUserRoleInProject(userId, projectId);
      if (!role) throw new AppError("NOT_FOUND", "Proyecto no encontrado");
      const tasks = await prisma.task.findMany({
        where: { id: { in: ids }, assigneeId: { not: null } },
        select: { id: true, assigneeId: true },
      });
      for (const task of tasks) {
        if (!task.assigneeId) continue;
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: task.assigneeId } },
        });
        const owner = await prisma.project.findFirst({ where: { id: projectId, userId: task.assigneeId } });
        if (!member && !owner) {
          await prisma.task.update({ where: { id: task.id }, data: { assigneeId: null } });
        }
      }
    }
    const movedTasks = await prisma.task.findMany({
      where: { id: { in: ids } },
      select: { projectId: true },
    });
    await prisma.task.updateMany({ where: { id: { in: ids }, userId }, data: { projectId } });
    const oldAudiences = await Promise.all(movedTasks.map((task) => this.audience(task.projectId, userId)));
    const targetAudience = await this.audience(projectId, userId);
    emitToUsers([...oldAudiences.flat(), ...targetAudience], "tasks");
    return { moved: ids.length };
  }

  async archive(userId: string, id: string, archived: boolean) {
    await assertTaskAccess(userId, id);
    const existing = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
    const updated = await prisma.task.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });
    emitToUsers(await this.audience(existing?.projectId ?? null, userId), "tasks");
    return taskProgress(updated);
  }

  async reorder(userId: string, data: ReorderTasksDto) {
    const ids = data.items.map((item) => item.id);
    for (const id of ids) {
      await assertTaskAccess(userId, id);
    }
    const items = await prisma.task.findMany({
      where: { id: { in: ids } },
      select: { projectId: true },
    });
    await prisma.$transaction(
      data.items.map((item) => prisma.task.update({
        where: { id: item.id },
        data: { order: item.order },
      })),
    );
    const audiences = await Promise.all(items.map((task) => this.audience(task.projectId, userId)));
    emitToUsers(audiences.flat(), "tasks");
  }

  async listSubtasks(userId: string, taskId: string) {
    await assertTaskAccess(userId, taskId);
    return prisma.subtask.findMany({ where: { userId, taskId }, orderBy: { order: "asc" } });
  }

  async createSubtask(userId: string, taskId: string, data: CreateSubtaskDto) {
    await assertTaskAccess(userId, taskId);
    const last = await prisma.subtask.findFirst({ where: { userId, taskId }, orderBy: { order: "desc" }, select: { order: true } });
    const parent = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    const subtask = await prisma.subtask.create({ data: { userId, taskId, title: data.title, order: (last?.order ?? -1) + 1 } });
    emitToUsers(await this.audience(parent?.projectId ?? null, userId), "tasks");
    return subtask;
  }

  async updateSubtask(userId: string, taskId: string, subtaskId: string, data: UpdateSubtaskDto) {
    await assertTaskAccess(userId, taskId);
    const subtask = await prisma.subtask.findFirst({ where: { id: subtaskId, taskId, userId } });
    if (!subtask) throw new AppError("NOT_FOUND", "Subtarea no encontrada");
    const parent = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.completed !== undefined ? { completed: data.completed, completedAt: data.completed ? new Date() : null } : {}),
      },
    });
    emitToUsers(await this.audience(parent?.projectId ?? null, userId), "tasks");
    return updated;
  }

  async deleteSubtask(userId: string, taskId: string, subtaskId: string) {
    await assertTaskAccess(userId, taskId);
    const parent = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    const result = await prisma.subtask.deleteMany({ where: { id: subtaskId, taskId, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Subtarea no encontrada");
    emitToUsers(await this.audience(parent?.projectId ?? null, userId), "tasks");
  }
}

export const taskService = new TaskService();
