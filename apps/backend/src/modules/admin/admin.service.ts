import bcrypt from "bcrypt";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import { clearPublicSignupCache, getPublicSignup } from "../../utils/settings/publicSignup";
import type { AdminUsersQueryDto, CreateAdminUserDto, UpdateAdminUserDto, UpdateSettingsDto } from "./admin.validator";

export class AdminService {
  async listUsers(query: AdminUsersQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const { skip, take } = getPaginationArgs(page, limit);
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] } : {}),
    };
    const orderBy = { [query.sort]: query.order };

    const [data, totalItems] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);
    return buildPaginatedResponse(data, totalItems, page, limit);
  }

  async createUser(data: CreateAdminUserDto) {
    const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) throw new AppError("CONFLICT", "El correo ya está registrado");
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
  }

  async updateUser(id: string, data: UpdateAdminUserDto, requesterId: string) {
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing) throw new AppError("NOT_FOUND", "Usuario no encontrado");

    const demotingSelf = id === requesterId && data.role !== undefined && data.role !== "ADMIN";
    const deactivatingSelf = id === requesterId && data.isActive === false;
    if (demotingSelf) throw new AppError("BAD_REQUEST", "No puedes quitarte el rol de administrador");
    if (deactivatingSelf) throw new AppError("BAD_REQUEST", "No puedes deshabilitar tu propia cuenta");

    const demotingLastAdmin = existing.role === "ADMIN" && data.role === "USER";
    if (demotingLastAdmin) {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) throw new AppError("BAD_REQUEST", "No puedes quitar el rol al último administrador");
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.password !== undefined ? { passwordHash: await bcrypt.hash(data.password, 12) } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
  }

  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId) throw new AppError("BAD_REQUEST", "No puedes eliminar tu propia cuenta");
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing) throw new AppError("NOT_FOUND", "Usuario no encontrado");
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (existing.role === "ADMIN" && adminCount <= 1) throw new AppError("BAD_REQUEST", "No puedes eliminar al último administrador");
    await prisma.user.delete({ where: { id } });
  }

  async getSettings() {
    return { publicSignup: await getPublicSignup() };
  }

  async updateSettings(data: UpdateSettingsDto) {
    await prisma.setting.upsert({
      where: { key: "publicSignup" },
      update: { value: data.publicSignup ? "true" : "false" },
      create: { key: "publicSignup", value: data.publicSignup ? "true" : "false", description: "Permite que cualquier persona cree una cuenta" },
    });
    clearPublicSignupCache();
    return { publicSignup: data.publicSignup };
  }
}

export const adminService = new AdminService();