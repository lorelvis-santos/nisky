import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import type { CreatePatDto } from "./pat.validator";

const MAX_ACTIVE_PATS = 10;
const PAT_PREFIX = "nisky_pat_";
const RAW_BYTES = 32;
const PREFIX_LEN = 10;

export class PatService {
  async create(userId: string, dto: CreatePatDto) {
    const activeCount = await prisma.personalAccessToken.count({
      where: { userId, revokedAt: null },
    });
    if (activeCount >= MAX_ACTIVE_PATS) {
      throw new AppError("BAD_REQUEST", "Has alcanzado el límite de tokens activos");
    }

    const dup = await prisma.personalAccessToken.findFirst({
      where: { userId, name: dto.name, revokedAt: null },
      select: { id: true },
    });
    if (dup) throw new AppError("CONFLICT", "Ya tienes un token con ese nombre");

    const raw = `${PAT_PREFIX}${randomBytes(RAW_BYTES).toString("base64url")}`;
    const tokenHash = await bcrypt.hash(raw, 12);
    const prefix = raw.slice(0, PREFIX_LEN);

    const pat = await prisma.personalAccessToken.create({
      data: {
        userId,
        name: dto.name,
        tokenHash,
        prefix,
        expiresAt: dto.expiresInDays
          ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return { raw, ...pat };
  }

  async list(userId: string) {
    return prisma.personalAccessToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revoke(userId: string, id: string) {
    const pat = await prisma.personalAccessToken.findFirst({
      where: { id, userId, revokedAt: null },
      select: { id: true },
    });
    if (!pat) throw new AppError("NOT_FOUND", "Token no encontrado");
    await prisma.personalAccessToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async verify(raw: string) {
    if (!raw.startsWith(PAT_PREFIX)) throw new AppError("UNAUTHORIZED", "Token inválido");
    const prefix = raw.slice(0, PREFIX_LEN);
    const candidates = await prisma.personalAccessToken.findMany({
      where: { prefix, revokedAt: null },
      include: { user: true },
    });
    if (candidates.length === 0) throw new AppError("UNAUTHORIZED", "Token inválido");

    for (const pat of candidates) {
      const match = await bcrypt.compare(raw, pat.tokenHash);
      if (!match) continue;
      if (pat.expiresAt && pat.expiresAt <= new Date()) {
        throw new AppError("UNAUTHORIZED", "Token expirado");
      }
      await prisma.personalAccessToken.update({
        where: { id: pat.id },
        data: { lastUsedAt: new Date() },
      });
      if (!pat.user.isActive) throw new AppError("FORBIDDEN", "Tu cuenta está deshabilitada");
      return pat.user;
    }
    throw new AppError("UNAUTHORIZED", "Token inválido");
  }

  async revokeAllForUser(userId: string) {
    await prisma.personalAccessToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const patService = new PatService();