import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { StorageFactory } from "../storage/storage.factory";
import type { UpdateProfileDto } from "./user.validator";

const userSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
} as const;

export class UserService {
  async updateProfile(userId: string, data: UpdateProfileDto) {
    if (data.username !== undefined && data.username !== null) {
      const existing = await prisma.user.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== userId) throw new AppError("CONFLICT", "Ese nombre de usuario ya está en uso");
    }
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.username !== undefined ? { username: data.username } : {}),
      },
      select: userSelect,
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const oldAvatar = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    const result = await StorageFactory.getProvider("image").uploadImage(file, "avatars");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.url },
      select: userSelect,
    });
    // Borrar avatar anterior de Cloudinary
    if (oldAvatar?.avatarUrl) {
      try {
        const key = oldAvatar.avatarUrl.split("/").slice(-2).join("/");
        await StorageFactory.getProvider("image").deleteImage(key);
      } catch { /* best effort */ }
    }
    return updated;
  }

  async removeAvatar(userId: string) {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    if (current?.avatarUrl) {
      try {
        const key = current.avatarUrl.split("/").slice(-2).join("/");
        await StorageFactory.getProvider("image").deleteImage(key);
      } catch { /* best effort */ }
    }
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: userSelect,
    });
  }
}

export const userService = new UserService();