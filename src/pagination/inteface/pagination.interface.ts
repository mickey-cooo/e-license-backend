export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemPerPage: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export interface PaginationMeta {
  skip: number;
  take: number;
  currentPage: number;
}
