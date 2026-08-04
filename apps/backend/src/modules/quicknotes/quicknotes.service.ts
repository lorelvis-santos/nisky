import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import type { CreateQuickNoteDto, QuickNoteQueryDto, UpdateQuickNoteDto } from "./quicknotes.validator";

export class QuickNoteService {
  async list(userId: string, query: QuickNoteQueryDto) {
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 8));
    return prisma.quickNote.findMany({
      where: { userId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async create(userId: string, data: CreateQuickNoteDto) {
    return prisma.quickNote.create({ data: { userId, content: data.content } });
  }

  async update(userId: string, id: string, data: UpdateQuickNoteDto) {
    const note = await prisma.quickNote.findFirst({ where: { id, userId } });
    if (!note) throw new AppError("NOT_FOUND", "Captura no encontrada");
    return prisma.quickNote.update({
      where: { id },
      data: {
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async delete(userId: string, id: string) {
    const result = await prisma.quickNote.deleteMany({ where: { id, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Captura no encontrada");
  }
}

export const quickNoteService = new QuickNoteService();
