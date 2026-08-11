import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import { assertProjectAccess, assertTaskAccess, getProjectAudience } from "../projects/access";
import { pushService } from "../push/push.service";
import { emitToUsers } from "../../config/socket.emit";

const COMMENT_AUTHOR_SELECT = { id: true, email: true, name: true, avatarUrl: true };

export class CommentService {
  private async emitCommentsChanged(projectId: string | null, taskId: string | null): Promise<void> {
    let resolvedProjectId = projectId;
    if (!resolvedProjectId && taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
      resolvedProjectId = task?.projectId ?? null;
    }
    if (!resolvedProjectId) return;
    emitToUsers(await getProjectAudience(resolvedProjectId), "comments");
  }
  async listProjectComments(userId: string, projectId: string, query: { page?: number; limit?: number; order?: "asc" | "desc" }) {
    await assertProjectAccess(userId, projectId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const order = query.order === "desc" ? "desc" : "asc";
    const { skip, take } = getPaginationArgs(page, limit);
    const where = { projectId };

    const [data, totalItems] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: order },
        skip,
        take,
        include: { author: { select: COMMENT_AUTHOR_SELECT } },
      }),
      prisma.comment.count({ where }),
    ]);
    return buildPaginatedResponse(data, totalItems, page, limit);
  }

  async createProjectComment(userId: string, projectId: string, body: string) {
    await assertProjectAccess(userId, projectId);
    const comment = await prisma.comment.create({
      data: { projectId, authorId: userId, body },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    });
    await this.notifyProjectMembers(projectId, userId, comment);
    emitToUsers(await getProjectAudience(projectId), "comments");
    return comment;
  }

  async listTaskComments(userId: string, taskId: string, query: { page?: number; limit?: number; order?: "asc" | "desc" }) {
    await assertTaskAccess(userId, taskId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const order = query.order === "desc" ? "desc" : "asc";
    const { skip, take } = getPaginationArgs(page, limit);
    const where = { taskId };

    const [data, totalItems] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: order },
        skip,
        take,
        include: { author: { select: COMMENT_AUTHOR_SELECT } },
      }),
      prisma.comment.count({ where }),
    ]);
    return buildPaginatedResponse(data, totalItems, page, limit);
  }

  async createTaskComment(userId: string, taskId: string, body: string) {
    await assertTaskAccess(userId, taskId);
    const comment = await prisma.comment.create({
      data: { taskId, authorId: userId, body },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    });
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
    if (task?.projectId) {
      await this.notifyProjectMembers(task.projectId, userId, comment, taskId);
      emitToUsers(await getProjectAudience(task.projectId), "comments");
    }
    return comment;
  }

  async updateComment(userId: string, id: string, body: string) {
    const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true, projectId: true, taskId: true } });
    if (!comment) throw new AppError("NOT_FOUND", "Comentario no encontrado");
    if (comment.authorId !== userId) throw new AppError("FORBIDDEN", "No puedes editar este comentario");

    const updated = await prisma.comment.update({
      where: { id },
      data: { body },
      include: { author: { select: COMMENT_AUTHOR_SELECT } },
    });
    await this.emitCommentsChanged(comment.projectId, comment.taskId);
    return updated;
  }

  async deleteComment(userId: string, id: string) {
    const comment = await prisma.comment.findUnique({ where: { id }, select: { authorId: true, projectId: true, taskId: true } });
    if (!comment) throw new AppError("NOT_FOUND", "Comentario no encontrado");
    if (comment.authorId !== userId) throw new AppError("FORBIDDEN", "No puedes borrar este comentario");

    await prisma.comment.delete({ where: { id } });
    await this.emitCommentsChanged(comment.projectId, comment.taskId);
    return { success: true };
  }

  private async notifyProjectMembers(
    projectId: string,
    authorId: string,
    comment: { id: string; body: string; author: { name: string | null; email: string } },
    taskId?: string,
  ) {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });
    const pushTargets = members.map((member) => member.userId); // Sin excluir al autor

    const authorName = comment.author.name ?? comment.author.email;
    const preview = comment.body.length > 80 ? `${comment.body.slice(0, 80)}…` : comment.body;
    const url = taskId ? `/tasks?taskId=${encodeURIComponent(taskId)}` : `/projects/${projectId}#comments`;

    await Promise.all(
      pushTargets.map((userId) =>
        pushService
          .sendToUser(userId, {
            title: "Nuevo comentario",
            body: `${authorName}: ${preview}`,
            url,
            tag: `comment-${comment.id}`,
            data: { type: "COMMENT", commentId: comment.id, projectId, taskId },
          })
          .catch(() => undefined), // best effort
      ),
    );
  }
}

export const commentService = new CommentService();