import bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import type { LoginDto, RegisterDto } from "./auth.validator";

const MAX_ACTIVE_REFRESH_TOKENS = 5;
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

type RequestMetadata = { userAgent?: string; ip?: string };

function publicUser(user: { id: string; email: string; name: string | null; role: "ADMIN" | "USER"; avatarUrl?: string | null }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl ?? null };
}

function accessTokenFor(user: { id: string; email: string; role: "ADMIN" | "USER" }) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError("INTERNAL", "JWT_ACCESS_SECRET no está configurado");
  const expiresIn = (process.env.ACCESS_TOKEN_TTL ?? "15m") as SignOptions["expiresIn"];
  return jwt.sign({ email: user.email, role: user.role }, secret, { subject: user.id, expiresIn });
}

function newRefreshToken() {
  const id = randomUUID();
  const secret = randomBytes(48).toString("base64url");
  return { id, raw: `${id}.${secret}` };
}

function refreshId(raw: string) {
  const id = raw.split(".", 1)[0];
  return id && id.length > 0 ? id : undefined;
}

export class AuthService {
  private async storeRefreshToken(userId: string, raw: string, metadata: RequestMetadata) {
    const active = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (active.length >= MAX_ACTIVE_REFRESH_TOKENS) {
      const revoke = active.slice(0, active.length - MAX_ACTIVE_REFRESH_TOKENS + 1);
      await prisma.refreshToken.updateMany({
        where: { id: { in: revoke.map((token) => token.id) }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const tokenId = refreshId(raw);
    if (!tokenId) throw new AppError("INTERNAL", "No se pudo generar la sesión");
    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash: await bcrypt.hash(raw, 12),
        userAgent: metadata.userAgent,
        ip: metadata.ip,
        expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  }

  private async issue(user: { id: string; email: string; name: string | null; role: "ADMIN" | "USER"; avatarUrl?: string | null }, metadata: RequestMetadata) {
    const refresh = newRefreshToken();
    await this.storeRefreshToken(user.id, refresh.raw, metadata);
    return { accessToken: accessTokenFor(user), refreshToken: refresh.raw, user: publicUser(user) };
  }

  async login(data: LoginDto, metadata: RequestMetadata) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new AppError("UNAUTHORIZED", "Credenciales inválidas");
    }
    return this.issue(user, metadata);
  }

  async register(data: RegisterDto, metadata: RequestMetadata) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError("CONFLICT", "El correo ya está registrado");

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: "USER",
      },
    });
    return this.issue(user, metadata);
  }

  async refresh(raw: string | undefined, metadata: RequestMetadata) {
    if (!raw) throw new AppError("UNAUTHORIZED", "Refresh token no proporcionado");
    const id = refreshId(raw);
    if (!id) throw new AppError("UNAUTHORIZED", "Refresh token inválido");

    const stored = await prisma.refreshToken.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !(await bcrypt.compare(raw, stored.tokenHash))) {
      throw new AppError("UNAUTHORIZED", "Refresh token inválido o expirado");
    }

    const revoked = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1) throw new AppError("UNAUTHORIZED", "Refresh token ya utilizado");
    return this.issue(stored.user, metadata);
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) throw new AppError("NOT_FOUND", "Usuario no encontrado");
    return user;
  }

  async logout(raw: string | undefined) {
    if (!raw) return;
    const id = refreshId(raw);
    if (id) await prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}

export const authService = new AuthService();
