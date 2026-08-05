import { prisma } from "../../infra/prisma/client";
import { AppError } from "../../utils/errors/handler";
import { decryptJournalContent, encryptJournalContent } from "../../utils/journal/crypto";
import { getJournalKey } from "../../utils/journal/keyStore";
import { buildPaginatedResponse, getPaginationArgs } from "../../utils/pagination/handler";
import type { CreateJournalEntryDto, JournalQueryDto, UpdateJournalEntryDto } from "./journal.validator";

function requireKey(sessionId: string | undefined, userId: string) {
  const key = sessionId ? getJournalKey(sessionId, userId) : undefined;
  if (!key) throw new AppError("FORBIDDEN", "Inicia sesión de nuevo para abrir el diario");
  return key;
}

function toEntry(entry: { id: string; title: string; classification: string | null; tags: string[]; createdAt: Date; updatedAt: Date; contentCipher: Uint8Array; iv: Uint8Array; authTag: Uint8Array }, key: Uint8Array) {
  return {
    id: entry.id,
    title: entry.title,
    classification: entry.classification,
    tags: entry.tags,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    content: decryptJournalContent(entry.contentCipher, entry.iv, entry.authTag, key),
  };
}

export class JournalService {
  async list(userId: string, sessionId: string | undefined, query: JournalQueryDto) {
    const key = requireKey(sessionId, userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const { skip, take } = getPaginationArgs(page, limit);
    const where = {
      userId,
      ...(query.classification ? { classification: query.classification } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
    };

    const [data, totalItems] = await Promise.all([
      prisma.journalEntry.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.journalEntry.count({ where }),
    ]);
    return buildPaginatedResponse(data.map((entry) => toEntry(entry, key)), totalItems, page, limit);
  }

  async getById(userId: string, sessionId: string | undefined, id: string) {
    const key = requireKey(sessionId, userId);
    const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new AppError("NOT_FOUND", "Entrada no encontrada");
    return toEntry(entry, key);
  }

  async create(userId: string, sessionId: string | undefined, data: CreateJournalEntryDto) {
    const key = requireKey(sessionId, userId);
    const encrypted = encryptJournalContent(data.content, key);
    return prisma.journalEntry.create({
      data: {
        userId,
        title: data.title,
        contentCipher: encrypted.contentCipher,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        classification: data.classification ?? null,
        tags: data.tags ?? [],
      },
    }).then((entry) => ({ id: entry.id, title: entry.title, classification: entry.classification, tags: entry.tags, createdAt: entry.createdAt, updatedAt: entry.updatedAt, content: data.content }));
  }

  async update(userId: string, sessionId: string | undefined, id: string, data: UpdateJournalEntryDto) {
    const key = requireKey(sessionId, userId);
    const entry = await prisma.journalEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new AppError("NOT_FOUND", "Entrada no encontrada");

    const encrypted = data.content !== undefined ? encryptJournalContent(data.content, key) : undefined;
    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(encrypted ? { contentCipher: encrypted.contentCipher, iv: encrypted.iv, authTag: encrypted.authTag } : {}),
        ...(data.classification !== undefined ? { classification: data.classification } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
      },
    });
    return toEntry(updated, key);
  }

  async delete(userId: string, sessionId: string | undefined, id: string) {
    requireKey(sessionId, userId);
    const result = await prisma.journalEntry.deleteMany({ where: { id, userId } });
    if (result.count !== 1) throw new AppError("NOT_FOUND", "Entrada no encontrada");
  }
}

export const journalService = new JournalService();
