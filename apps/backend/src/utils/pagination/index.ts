export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  itemCount: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
