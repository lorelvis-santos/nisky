import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import type { CreateFeedbackDto, FeedbackQueryDto, UpdateFeedbackDto } from "./feedback.validator";

export class FeedbackService {
  async create(userId: string, data: CreateFeedbackDto) {
    let contactEmail: string | undefined;
    if (data.includeEmail) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      contactEmail = user?.email ?? undefined;
    }
    return prisma.feedback.create({
      data: {
        userId,
        category: data.category,
        message: data.message,
        ...(contactEmail !== undefined ? { contactEmail } : {}),
      },
    });
  }

  async listMine(userId: string) {
    return prisma.feedback.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  async deleteMine(userId: string, id: string) {
    const result = await prisma.feedback.deleteMany({ where: { id, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Feedback no encontrado");
  }

  async listAll(query: FeedbackQueryDto) {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return prisma.feedback.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateStatus(id: string, data: UpdateFeedbackDto) {
    if (data.status === undefined) throw new AppError("BAD_REQUEST", "El estado es requerido");
    const existing = await prisma.feedback.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Feedback no encontrado");
    return prisma.feedback.update({ where: { id }, data: { status: data.status } });
  }

  async deleteAny(id: string) {
    const result = await prisma.feedback.deleteMany({ where: { id } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Feedback no encontrado");
  }
}

export const feedbackService = new FeedbackService();