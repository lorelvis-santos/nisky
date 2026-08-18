import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import { getAccessibleProjectIds } from "../projects/access";
import type { CreateNoteDto, NoteQueryDto, SaveNoteDraftDto, UpdateNoteDto } from "./knowledge.validator";

function countByName(items: Array<{ name: string }>) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export class KnowledgeService {
  async list(userId: string, query: NoteQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const { skip, take } = getPaginationArgs(page, limit);
    const where = {
      userId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.pinned !== undefined ? { pinned: query.pinned } : {}),
      ...(query.q ? { AND: [{ OR: [{ title: { contains: query.q } }, { content: { contains: query.q } }] }] } : {}),
    };

    const [data, totalItems] = await Promise.all([
      prisma.note.findMany({
        where,
        skip,
        take,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      }),
      prisma.note.count({ where }),
    ]);
    return buildPaginatedResponse(data, totalItems, page, limit);
  }

  async getById(userId: string, id: string) {
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) throw new AppError("NOT_FOUND", "Nota no encontrada");
    return note;
  }

  async create(userId: string, data: CreateNoteDto) {
    if (data.projectId) {
      const accessible = await getAccessibleProjectIds(userId);
      if (!accessible.includes(data.projectId)) throw new AppError("FORBIDDEN", "No tienes acceso a este proyecto");
    }
    return prisma.note.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        category: data.category ?? null,
        tags: data.tags ?? [],
        projectId: data.projectId ?? null,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateNoteDto) {
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) throw new AppError("NOT_FOUND", "Nota no encontrada");
    if (data.projectId !== undefined && data.projectId) {
      const accessible = await getAccessibleProjectIds(userId);
      if (!accessible.includes(data.projectId)) throw new AppError("FORBIDDEN", "No tienes acceso a este proyecto");
    }
    return prisma.note.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      },
    });
  }

  async delete(userId: string, id: string) {
    const result = await prisma.note.deleteMany({ where: { id, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Nota no encontrada");
    return { success: true };
  }

  async getDraft(userId: string) {
    const draft = await prisma.noteDraft.findUnique({ where: { userId } });
    if (!draft) return null;
    return {
      title: draft.title,
      content: draft.content,
      category: draft.category,
      tags: draft.tags,
      pinned: draft.pinned,
      projectId: draft.projectId,
      updatedAt: draft.updatedAt,
    };
  }

  async saveDraft(userId: string, data: SaveNoteDraftDto) {
    if (data.projectId) {
      const accessible = await getAccessibleProjectIds(userId);
      if (!accessible.includes(data.projectId)) throw new AppError("FORBIDDEN", "No tienes acceso a este proyecto");
    }
    await prisma.noteDraft.upsert({
      where: { userId },
      create: {
        userId,
        title: data.title ?? "",
        content: data.content ?? "",
        category: data.category ?? null,
        tags: data.tags ?? [],
        pinned: data.pinned ?? false,
        projectId: data.projectId ?? null,
      },
      update: {
        ...(data.title !== undefined ? { title: data.title ?? "" } : {}),
        ...(data.content !== undefined ? { content: data.content ?? "" } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned ?? false } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
      },
    });
    return { saved: true };
  }

  async deleteDraft(userId: string) {
    await prisma.noteDraft.deleteMany({ where: { userId } });
    return { success: true };
  }

  async facets(userId: string) {
    const where = { userId };
    const [categories, tags] = await Promise.all([
      prisma.note.groupBy({
        by: ["category"],
        where: { ...where, category: { not: null } },
        _count: { _all: true },
      }),
      prisma.note.findMany({ where, select: { tags: true } }),
    ]);

    return {
      categories: categories
        .filter((group) => group.category !== null)
        .map((group) => ({ name: group.category as string, count: group._count._all }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      tags: countByName(tags.flatMap((note) => note.tags).map((tag) => ({ name: tag }))),
    };
  }
}

export const knowledgeService = new KnowledgeService();