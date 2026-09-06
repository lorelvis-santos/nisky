import type { Prisma } from "../../infra/prisma/generated/prisma/client";
import { prisma } from "../../infra/prisma/client";
import { emitToUsers } from "../../config/socket.emit";
import { assertProjectAccess, getProjectAudience } from "./access";
import type { ProjectActivityQueryDto } from "./projects.validator";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";

const ACTOR_SELECT = { id: true, email: true, name: true, username: true, avatarUrl: true };

export type ProjectActivityType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_DELETED"
  | "SUBTASK_CREATED"
  | "SUBTASK_UPDATED"
  | "SUBTASK_DELETED"
  | "NOTE_CREATED"
  | "NOTE_UPDATED"
  | "NOTE_DELETED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED"
  | "COMMENT_CREATED"
  | "RESOURCE_ADDED"
  | "RESOURCE_DELETED";

export class ProjectActivityService {
  async record(input: {
    projectId: string | null | undefined;
    actorId: string;
    type: ProjectActivityType;
    entityId?: string;
    entityTitle?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    if (!input.projectId) return null;

    try {
      const activity = await prisma.projectActivity.create({
        data: {
          projectId: input.projectId,
          actorId: input.actorId,
          type: input.type,
          entityId: input.entityId,
          entityTitle: input.entityTitle,
          ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
        },
        include: { actor: { select: ACTOR_SELECT } },
      });
      emitToUsers(await getProjectAudience(input.projectId), "projects", {
        kind: "activity",
        projectId: input.projectId,
      });
      return activity;
    } catch {
      // Activity must not make the primary project operation fail.
      return null;
    }
  }

  async list(userId: string, projectId: string, query: ProjectActivityQueryDto) {
    await assertProjectAccess(userId, projectId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 30));
    const { skip, take } = getPaginationArgs(page, limit);
    const where = { projectId };
    const [data, totalItems] = await Promise.all([
      prisma.projectActivity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: ACTOR_SELECT } },
      }),
      prisma.projectActivity.count({ where }),
    ]);
    return buildPaginatedResponse(data, totalItems, page, limit);
  }
}

export const projectActivityService = new ProjectActivityService();
