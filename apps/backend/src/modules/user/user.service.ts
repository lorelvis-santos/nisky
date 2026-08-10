import { prisma } from "../../infra/prisma/client";
import { StorageFactory } from "../storage/storage.factory";
import type { UpdateProfileDto } from "./user.validator";

export class UserService {
  async updateProfile(userId: string, data: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: { ...(data.name !== undefined ? { name: data.name } : {}) },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const oldAvatar = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    const result = await StorageFactory.getProvider("image").uploadImage(file, "avatars");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.url },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
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
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });
  }
}

export const userService = new UserService();