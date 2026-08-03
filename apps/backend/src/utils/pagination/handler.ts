import type { PaginatedResult, PaginationMeta } from "./index";

export function getPaginationArgs(page = 1, limit = 20) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}

export function buildPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const meta: PaginationMeta = {
    currentPage: page,
    itemsPerPage: limit,
    itemCount: data.length,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
  return { data, meta };
}
