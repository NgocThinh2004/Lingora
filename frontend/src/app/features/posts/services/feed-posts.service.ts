import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResult, Post } from '../models/post.model';
import { ApiResponse } from '../../../core/http/api-response.model';

/**
 * Interface chứa các điều kiện truy vấn khi lấy danh sách bài viết.
 * Dùng làm đầu vào (input) cho các hàm lấy danh sách từ API.
 */
export interface PostQuery {
  lang?: string;
  category?: string;
  q?: string;
  authorId?: string | number;
  sort?: 'top' | 'newest' | 'trending';
  page?: number;
  limit?: number;
}

/**
 * FeedPostsService - Service xử lý việc gọi API liên quan đến bài viết (Post)
 * 
 * Mục đích: Tập trung toàn bộ logic tương tác HTTP cho việc lấy danh sách, chi tiết và bài viết liên quan,
 * chuyển đổi định dạng và truyền về component sử dụng.
 * 
 * - Service này sử dụng RxJS (cụ thể là `map` operator) để pipe (lọc/chuyển đổi) response `ApiResponse<T>` từ backend,
 *   chỉ lấy đúng phần data (`res.data`) trước khi đưa cho các Component.
 * 
 * DB: Các API này tương tác chủ yếu với bảng `posts` (thông tin gốc của bài viết),
 * bảng `post_translations` (nội dung đa ngôn ngữ), và bảng `categories`.
 * Lượt xem (view count) được ghi nhận qua endpoint POST /posts/:id/view và chống spam bằng Redis (TTL 24h).
 */
@Injectable({ providedIn: 'root' })
export class FeedPostsService {
  private readonly baseUrl = `${environment.apiUrl}/posts`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Lấy danh sách bài viết có phân trang dựa trên các tham số truyền vào.
   * Chuyển đổi PostQuery thành HttpParams để gửi lên API.
   * Dữ liệu Input: đối tượng PostQuery
   * Dữ liệu Output: Observable của một PaginatedResult chứa mảng bài viết và meta data phân trang
   * 
   * RxJS: Dùng pipe và map để trích xuất `data` từ ApiResponse.
   */
  list(query: PostQuery = {}): Observable<PaginatedResult<Post>> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      // Chỉ thêm tham số nếu có giá trị thực (không bị null, undefined hoặc rỗng)
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<ApiResponse<Post[]>>(this.baseUrl, { params })
      .pipe(map((res) => ({
        items: Array.isArray(res.data) ? res.data : [],
        meta: res.meta as any
      })));
  }

  /**
   * Lấy chi tiết một bài viết theo ID.
   * Tham số lang được sử dụng để lấy nội dung bài viết theo ngôn ngữ ưu tiên của người đọc.
   */
  getById(id: number, lang?: string): Observable<Post> {
    const params = lang ? new HttpParams().set('lang', lang) : undefined;
    return this.http
      .get<ApiResponse<Post>>(`${this.baseUrl}/${id}`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Lấy danh sách các bài viết liên quan (thường dựa trên danh mục, thẻ, hoặc độ tương đồng).
   * Cũng hỗ trợ tham số lang để lọc nội dung đúng ngôn ngữ.
   */
  getRelated(id: number, lang?: string): Observable<Post[]> {
    const params = lang ? new HttpParams().set('lang', lang) : undefined;
    return this.http
      .get<ApiResponse<Post[]>>(`${this.baseUrl}/${id}/related`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * Ghi nhận 1 lượt xem hợp lệ khi người dùng đã đọc >= 50% nội dung bài viết.
   * Được gọi từ PostDetailComponent sau khi:
   *   (1) IntersectionObserver phát hiện sentinel tại giữa bài đã vào viewport
   *   (2) Người dùng đã ở trang ít nhất 3 giây
   * Backend sẽ tự kiểm tra Redis để chống spam (TTL 24h).
   */
  trackView(id: number): Observable<{ counted: boolean }> {
    return this.http
      .post<ApiResponse<{ counted: boolean }>>(`${this.baseUrl}/${id}/view`, {})
      .pipe(map((res) => res.data));
  }

}
