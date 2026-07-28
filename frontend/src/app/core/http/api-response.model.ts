export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    error?: ApiError;
    [key: string]: any;
  };
}

export interface ApiItemResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
}
