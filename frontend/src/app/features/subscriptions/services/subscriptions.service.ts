import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ApiItemResponse } from '../../../core/http/api-response.model';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionAuthor, SubscriptionAuthorsPage, SubscriptionAuthorView } from '../models/subscription.model';
import { Post } from '../../posts/models/post.model';

/**
 * SubscriptionsService - Dịch vụ quản lý theo dõi tác giả (Follow/Unfollow)
 * và đồng bộ trạng thái follow giữa TẤT CẢ các component trong ứng dụng.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VẤN ĐỀ CẦN GIẢI QUYẾT: Đồng bộ trạng thái Follow giữa nhiều nơi
 * ═══════════════════════════════════════════════════════════════════════════
 * Ứng dụng hiển thị nút Follow/Unfollow ở RẤT NHIỀU nơi cùng lúc:
 *   - Nút trong SubscribeButtonComponent trên trang subscriptions
 *   - Nút trong SubscribeButtonComponent trên trang explore (danh sách tác giả)
 *   - Nút trong AuthorTooltipComponent (popup hover trên avatar bất kỳ đâu)
 *   - Nút trong trang profile tác giả
 *
 * Vấn đề: Nếu user bấm Follow ở AuthorTooltip trên trang Home, làm sao nút
 * SubscribeButton ở trang Subscriptions biết mà cập nhật thành "Đang theo dõi"?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GIẢI PHÁP: BehaviorSubject như một Global State (Mini-Store)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `followedAuthorIds` là một BehaviorSubject<Set<string>> — một "nguồn sự thật duy nhất"
 * (Single Source of Truth) cho trạng thái follow của người dùng hiện tại.
 *
 * Cơ chế hoạt động:
 *
 *   [KHỞI TẠO - khi app load]:
 *   initFollowingState() được gọi 1 lần →
 *   → GET /subscriptions/following → lấy danh sách author_id đang follow
 *   → followedAuthorIds.next(new Set(['5', '12', '37', ...])) → lưu vào BehaviorSubject
 *
 *   [ĐỌC - ở mọi component có nút Follow]:
 *   subscribeButtonComponent, authorTooltipComponent, profileComponent... đều gọi:
 *   → isFollowingState(authorId) → trả về Observable<boolean>
 *   → pipe(map(set => set.has(String(authorId)))) → true/false
 *   → Component dùng `| async` để subscribe, tự re-render khi Set thay đổi
 *
 *   [GHI - khi user bấm Follow]:
 *   subscribe(authorId) → POST /subscriptions/:authorId
 *   → tap(() => set.add(authorId) → followedAuthorIds.next(newSet))
 *   → BehaviorSubject phát giá trị mới → TẤT CẢ component đang listen đều tự cập nhật
 *
 *   [GHI - khi user bấm Unfollow]:
 *   unsubscribe(authorId) → DELETE /subscriptions/:authorId
 *   → tap(() => set.delete(authorId) → followedAuthorIds.next(newSet))
 *   → BehaviorSubject phát giá trị mới → TẤT CẢ component đang listen đều tự cập nhật
 *
 * Sơ đồ luồng dữ liệu khi Follow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  User bấm Follow trên AuthorTooltip (hover avatar trên trang Home)      │
 * │         ↓                                                                │
 * │  subscriptionsService.subscribe(authorId=5)                             │
 * │         ↓ (HTTP POST /subscriptions/5)                                  │
 * │  tap: followedAuthorIds Set thêm '5' → .next(newSet)                   │
 * │         ↓ (BehaviorSubject tự động phát tới mọi subscriber)             │
 * │  ┌──────────────────────────────────────────────────────┐               │
 * │  │ SubscribeButton (explore)   isFollowingState(5) → ✅ │               │
 * │  │ SubscribeButton (sub page)  isFollowingState(5) → ✅ │               │
 * │  │ AuthorTooltip (home)        isFollowingState(5) → ✅ │               │
 * │  │ ProfilePage                 isFollowingState(5) → ✅ │               │
 * │  └──────────────────────────────────────────────────────┘               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Tại sao dùng BehaviorSubject thay vì gọi lại API mỗi lần?
 *   → Tránh N request thừa (mỗi nút gọi 1 API kiểm tra)
 *   → Instant update: không có độ trễ network khi cập nhật UI
 *   → Tất cả nút sync cùng lúc mà không cần component cha truyền @Input/@Output
 *
 * DB: Tương tác với bảng `subscriptions` (subscriber_id, author_id, created_at)
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/subscriptions`;

  /**
   * Global State: BehaviorSubject lưu Set các author_id (string) mà user hiện tại đang follow.
   *
   * Tại sao dùng Set thay vì Array?
   *   → Set.has() = O(1), Array.includes() = O(n) → nhanh hơn khi kiểm tra nhiều nút cùng lúc
   *   → Set tự loại bỏ trùng lặp (không thể có 2 record follow cùng 1 author)
   *
   * Tại sao dùng string thay vì number cho ID?
   *   → Backend trả về BIGINT (có thể là string ở JS), string đảm bảo so sánh chính xác
   *   → isFollowingState() cũng ép về String(authorId) trước khi .has()
   *
   * Giá trị ban đầu: Set rỗng (chưa fetch từ server)
   * Giá trị sau initFollowingState(): Set chứa tất cả author_id đang follow
   */
  private followedAuthorIds = new BehaviorSubject<Set<string>>(new Set());

  /**
   * Cờ ngăn chặn gọi initFollowingState() nhiều lần.
   * false → chưa khởi tạo, true → đã khởi tạo (đã hoặc đang fetch từ server).
   * isFollowingState() tự gọi init nếu chưa khởi tạo (lazy init).
   */
  private initialized = false;

  /**
   * Khởi tạo trạng thái follow từ server.
   * Gọi một lần duy nhất khi user đăng nhập hoặc lần đầu cần biết trạng thái.
   *
   * API: GET /subscriptions/following
   * DB: SELECT author_id FROM subscriptions WHERE subscriber_id = currentUserId
   * → Lấy toàn bộ danh sách author_id đang follow → lưu vào followedAuthorIds Set
   *
   * Sau khi init xong, tất cả component gọi isFollowingState() sẽ có dữ liệu chính xác.
   */
  initFollowingState(): void {
    if (!this.authService.isAuthenticated()) return; // Không fetch nếu chưa đăng nhập
    this.initialized = true;
    this.following().subscribe({
      next: data => {
        // Map mảng author objects → Set các ID dạng string để lookup O(1)
        // DB: items[] lấy từ subscriptions JOIN users WHERE subscriber_id = me
        this.followedAuthorIds.next(new Set(data.items.map(author => String(author.id))));
      },
      error: () => { this.initialized = false; } // Reset flag để cho phép thử lại
    });
  }

  /**
   * Lấy Observable<boolean> biểu thị trạng thái follow của user với một tác giả cụ thể.
   *
   * Đây là phương thức QUAN TRỌNG NHẤT của service — cầu nối giữa BehaviorSubject và UI.
   *
   * Cách dùng trong component:
   *   ```typescript
   *   isFollowing$ = this.subscriptionsService.isFollowingState(authorId);
   *   ```
   *   ```html
   *   <button>{{ (isFollowing$ | async) ? 'Đang theo dõi' : 'Theo dõi' }}</button>
   *   ```
   *
   * Cơ chế:
   *   1. Lazy init: nếu chưa fetch server → gọi initFollowingState() tự động
   *   2. followedAuthorIds.asObservable(): expose BehaviorSubject dưới dạng Observable (read-only)
   *   3. pipe(map(set => set.has(String(authorId)))): chuyển Set → boolean cho từng authorId
   *   4. Mỗi khi followedAuthorIds được .next(newSet) → Observable này tự emit giá trị mới
   *      → `| async` trong template tự re-render nút Follow/Unfollow
   *
   * @param authorId ID của tác giả cần kiểm tra (từ users.id)
   * @returns Observable<boolean> — true nếu đang follow, false nếu chưa
   */
  isFollowingState(authorId: string | number): Observable<boolean> {
    // Lazy init: đảm bảo state được load trước khi bất kỳ component nào dùng
    if (!this.initialized && this.authService.isAuthenticated()) {
      this.initFollowingState();
    }
    return this.followedAuthorIds.asObservable().pipe(
      map(set => set.has(String(authorId))) // Set.has() = O(1), nhanh hơn Array.includes()
    );
  }

  /**
   * Lấy danh sách bài viết từ các tác giả đang follow (Feed trang Subscriptions).
   *
   * API: GET /subscriptions/feed
   * DB Backend:
   *   1. SELECT author_id FROM subscriptions WHERE subscriber_id = currentUserId
   *   2. SELECT * FROM posts WHERE author_id IN (authorIds) AND status IN ('approved', 'published')
   *      JOIN post_translations, users, categories
   *   → Trả về mảng Post objects đầy đủ
   *
   * @param author Lọc theo author_id cụ thể (không bắt buộc)
   * @param lang   Lọc theo ngôn ngữ (không bắt buộc)
   * @param page   Số trang (cho infinite scroll)
   * @param limit  Số bài mỗi trang
   */
  getFeed(author?: string, lang?: string, page?: number, limit?: number): Observable<{ items: Post[], meta: any }> {
    let params = new HttpParams();
    if (author) params = params.set('author', author);
    if (lang) params = params.set('lang', lang);
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    return this.http.get<ApiResponse<Post[]>>(`${this.baseUrl}/feed`, { params })
      .pipe(map(response => ({ items: Array.isArray(response.data) ? response.data : [], meta: response.meta })));
  }

  /**
   * Lấy danh sách tác giả mà user hiện tại đang follow.
   *
   * API: GET /subscriptions/following
   * DB: SELECT u.* FROM users u
   *     JOIN subscriptions s ON s.author_id = u.id
   *     WHERE s.subscriber_id = currentUserId
   *
   * Dùng trong:
   *   - initFollowingState(): lấy danh sách ID để khởi tạo BehaviorSubject
   *   - SubscriptionsComponent: hiển thị danh sách tác giả đang theo dõi
   *
   * @param q     Từ khóa tìm kiếm trong danh sách following
   * @param page  Số trang phân trang
   * @param limit Số lượng mỗi trang
   */
  following(q?: string, page?: number, limit?: number): Observable<SubscriptionAuthorsPage> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    return this.http
      .get<ApiResponse<SubscriptionAuthor[]>>(`${this.baseUrl}/following`, { params })
      .pipe(map(response => ({ items: Array.isArray(response.data) ? response.data : [], meta: response.meta as any })));
  }

  /**
   * Lấy danh sách người đang follow user hiện tại (Followers).
   *
   * API: GET /subscriptions/followers
   * DB: SELECT u.* FROM users u
   *     JOIN subscriptions s ON s.subscriber_id = u.id
   *     WHERE s.author_id = currentUserId
   */
  followers(): Observable<SubscriptionAuthor[]> {
    return this.http
      .get<ApiItemResponse<SubscriptionAuthor[]>>(`${this.baseUrl}/followers`)
      .pipe(map(response => response.data));
  }

  /**
   * Hủy theo dõi một tác giả và đồng bộ trạng thái toàn cục ngay lập tức.
   *
   * API: DELETE /subscriptions/:authorId
   * DB: DELETE FROM subscriptions WHERE subscriber_id = currentUserId AND author_id = authorId
   *
   * Cơ chế đồng bộ (tap - side effect):
   *   1. API DELETE thành công
   *   2. tap: Tạo bản sao Set hiện tại → xóa authorId → phát Set mới qua BehaviorSubject
   *   3. Tất cả component đang dùng isFollowingState(authorId) | async nhận giá trị mới (false)
   *   4. UI các nút Follow/Unfollow tự cập nhật mà không cần reload trang hay gọi thêm API
   *
   * @param authorId ID tác giả cần hủy follow (= subscriptions.author_id)
   */
  unsubscribe(authorId: string | number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${authorId}`).pipe(
      tap(() => {
        const set = new Set(this.followedAuthorIds.value); // Copy để không mutate giá trị cũ
        set.delete(String(authorId));           // Xóa khỏi Set
        this.followedAuthorIds.next(set);       // Phát Set mới → tất cả listener tự cập nhật
      })
    );
  }

  /**
   * Theo dõi một tác giả và đồng bộ trạng thái toàn cục ngay lập tức.
   *
   * API: POST /subscriptions/:authorId
   * DB: INSERT INTO subscriptions (subscriber_id, author_id) VALUES (currentUserId, authorId)
   *     (UNIQUE INDEX (subscriber_id, author_id) → DB tự chặn insert trùng)
   *     Hoặc findOrCreate nếu BE dùng Sequelize: không INSERT nếu đã tồn tại
   *
   * Cơ chế đồng bộ (tap - side effect):
   *   1. API POST thành công → trả về { authorId, subscribed: true }
   *   2. tap: Tạo bản sao Set hiện tại → thêm authorId → phát Set mới qua BehaviorSubject
   *   3. Tất cả component đang dùng isFollowingState(authorId) | async nhận giá trị mới (true)
   *   4. UI đồng bộ ngay: nút ở explore, tooltip, trang subscriptions đều đổi thành "Đang theo dõi"
   *
   * @param authorId ID tác giả cần follow (= subscriptions.author_id trong DB)
   * @returns Observable<{ authorId: string; subscribed: boolean }>
   */
  subscribe(authorId: string | number): Observable<{ authorId: string; subscribed: boolean }> {
    return this.http.post<ApiItemResponse<{ authorId: string; subscribed: boolean }>>(`${this.baseUrl}/${authorId}`, {}).pipe(
      map(res => res.data),
      tap(() => {
        const set = new Set(this.followedAuthorIds.value); // Copy để không mutate giá trị cũ
        set.add(String(authorId));              // Thêm vào Set
        this.followedAuthorIds.next(set);       // Phát Set mới → tất cả listener tự cập nhật
      })
    );
  }

}
