/**
 * ApiResponse<T> - Interface chuẩn hoá cho tất cả response trả về từ API.
 * 
 * Format chuẩn:
 * - Trả về 1 object đơn:  { success: true, data: { ... }, status: 200, message: 'ok' }
 * - Trả về 1 mảng:        { success: true, data: [...], status: 200, message: 'ok' }
 * - Trả về nhiều resource: { success: true, data: { resource1: {...}, resource2: {...} }, status: 200, message: 'ok' }
 * - Trả về phân trang:    { success: true, data: [...], meta: { page, limit, total, totalPages }, status: 200, message: 'ok' }
 * - Khi có lỗi:           { success: false, data: null, status: 4xx|5xx, message: '...', details?: [...] }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message: string;
  /** Dùng cho phân trang — chỉ xuất hiện khi API trả về danh sách có meta phân trang */
  meta?: PaginationMeta;
  /** Chi tiết lỗi — chỉ xuất hiện khi success = false */
  details?: any;
}

/**
 * ApiItemResponse<T> - Alias cho trường hợp API trả về 1 object đơn lẻ.
 * @deprecated Sử dụng ApiResponse<T> thay thế.
 */
export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
  status: number;
  message: string;
}

/**
 * ApiCollectionResponse<T> - Alias cho trường hợp API trả về danh sách có phân trang.
 * Cấu trúc: { success, data: T[], meta: PaginationMeta, status, message }
 * @deprecated Sử dụng ApiResponse<T[]> thay thế.
 */
export interface ApiCollectionResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  status: number;
  message: string;
}

/** Metadata phân trang — đi kèm khi API trả về danh sách có phân trang */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Cấu trúc lỗi chi tiết từ API */
export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
}
