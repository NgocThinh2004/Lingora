# LINGORA — PHÂN CHIA CÔNG VIỆC THEO CHỨC NĂNG

## 1. Nguyên tắc phân chia

Kế hoạch dành cho nhóm 3 thành viên trong 8 tuần. Công việc được chia theo **chức năng hoàn chỉnh**, không chia theo frontend/backend.

Người sở hữu một chức năng phải làm xuyên suốt:

1. Phân tích hành vi từ HTML prototype.
2. Giao diện Angular và các trạng thái loading/empty/error.
3. API NestJS, DTO validation, auth/role/ownership.
4. Sequelize model/query/migration liên quan.
5. Unit test, integration/e2e test và tài liệu API.

Ví dụ: Developer B sở hữu bình luận thì B làm component Angular, API NestJS, query bảng `comments`, kiểm tra quyền và test bình luận. Không giao phần giao diện bình luận cho B rồi giao API đó cho người khác.

## 2. Phạm vi chính thức sau khi cập nhật prototype

- Angular + TypeScript + SCSS + Bootstrap.
- NestJS + Sequelize + MySQL 8+.
- JWT access token, refresh token và reset password token.
- Một bài viết chỉ có một tác giả.
- Không có ảnh bìa người dùng hoặc thumbnail bài viết.
- Chỉ upload avatar và ảnh nằm trong nội dung bài.
- Nội dung đa ngôn ngữ lưu ở `post_translations`.
- Dịch AI có nhiều provider và lưu từng lần thử ở `translation_attempts`.
- Bình luận tối đa hai cấp; reply vẫn ghi nhận comment/người được trả lời.

Các thay đổi so với kế hoạch cũ:

| Cũ | Chính thức mới |
|---|---|
| ExpressJS | NestJS |
| `post_languages` | `post_translations` |
| JWT cơ bản | Access + refresh token, logout/revoke phiên |
| Chỉ đổi mật khẩu | Thêm quên và đặt lại mật khẩu |
| Hai homepage | Một feed thay đổi theo trạng thái đăng nhập |
| About và trang lỗi dịch riêng | Không bắt buộc; lỗi dịch hiển thị ngay trong post detail |
| Comment cây nhiều tầng | Comment phẳng tối đa hai cấp |
| Chưa có follow/explore/settings | Có subscriptions, explore, profile/settings |
| Admin cơ bản | Thêm dashboard và kiểm duyệt bài |
| Hai trường status/review status | Một `posts.status` duy nhất |
| Chưa lưu fallback dịch | Có provider, thứ tự lần thử và lỗi |

## 3. Bảng sở hữu chức năng

| Thành viên | Chức năng sở hữu trọn vẹn | Bảng chính |
|---|---|---|
| Developer A — Platform, Identity & Admin Master Data | Nền tảng, auth, phiên đăng nhập, tài khoản/settings, admin users, roles, languages, categories, dashboard shell | `roles`, `users`, `refresh_tokens`, `password_reset_tokens`, `languages`, `categories`, `category_translations` |
| Developer B — Reader & Social | Public layout, feed, explore, đọc bài, public profile, comments, likes, subscriptions | `comments`, `post_likes`, `comment_likes`, `subscriptions`; đọc dữ liệu bài/user |
| Developer C — Author, Moderation & Translation | Tạo/quản lý bài, admin duyệt bài, upload ảnh nội dung, dịch AI và lịch sử provider | `posts`, `post_translations`, `translation_attempts` |

## 4. Developer A — Platform, Identity và Admin Master Data

### A-01. Nền tảng dự án

Thực hiện cả cấu hình backend và frontend dùng chung:

- Hoàn thiện NestJS bootstrap, `main.ts`, `app.module.ts`, ConfigModule và DatabaseModule.
- Global prefix `/api/v1`, ValidationPipe, CORS, exception filter và response `{data, meta}`.
- Pagination DTO, current-user decorator, roles decorator và guards dùng chung.
- Khởi tạo Angular workspace, router, HttpClient, environments và error interceptor.
- Tạo model/contract chung cho user summary, language, category, pagination và API error.
- Bảo đảm production dùng migration, không bật `sequelize.sync()`.

Nghiệm thu: backend/frontend khởi động, health check kết nối DB, migration/seeder chạy được và B/C có module mẫu để phát triển.

### A-02. Register, login và tài khoản hiện tại

Angular:

- Trang register/login, validation, hiện/ẩn password và điều hướng theo role.
- AuthService lưu trạng thái đăng nhập; không lưu password/token hash.

NestJS/API:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- Lowercase email, unique username/email, bcrypt password.
- Chặn user `banned/inactive`; response không bao giờ chứa password.

Test: dữ liệu sai, email/username trùng, password sai, tài khoản bị khóa và phân quyền role.

### A-03. JWT, refresh token và logout

Angular:

- Interceptor gắn access token.
- Khi 401 chỉ refresh một lần; thất bại thì xóa phiên và về login.
- Logout phiên hiện tại và logout mọi thiết bị.

NestJS/API:

- `POST /auth/refresh`, `/auth/logout`, `/auth/logout-all`.
- Chỉ lưu hash refresh token; quản lý device, IP, hạn, lần dùng cuối và revoke.
- Rotation token: refresh thành công phải revoke token cũ.

Database: `refresh_tokens`.

Test: token hết hạn/revoke/sai hash, logout một thiết bị, logout-all và hai request refresh đồng thời.

### A-04. Đổi, quên và reset password

Angular: change password, forgot password, reset password nhận token từ URL.

NestJS/API:

- `POST /auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`.
- Forgot luôn trả thông báo chung để không lộ email.
- Gửi token gốc qua email nhưng DB chỉ lưu hash.
- Reset thành công đặt `used_at` và revoke refresh token cũ.

Database: `password_reset_tokens`, `refresh_tokens`, `users`.

Test: token sai/hết hạn/đã dùng, một token không dùng lại và password cũ hết hiệu lực.

### A-05. Hồ sơ cá nhân và settings

- Xem/sửa display name, username theo luật, avatar và bio; không có ảnh bìa.
- Theme, ngôn ngữ UI và tùy chọn giao diện có thể lưu local nếu DB không có trường.
- A làm form Angular, API `GET/PATCH /users/me` và quyền chỉ sửa chính mình.
- Avatar dùng upload service của C nhưng A chịu trách nhiệm tích hợp end-to-end.

### A-06. Admin users và roles

- Angular admin users: search, role/status filter, pagination, detail, ban/unban.
- API `GET /admin/users`, `GET /admin/users/:id`, cập nhật status/role.
- Chỉ admin; không cho admin tự ban mình; ban user phải revoke phiên.
- Test 403, filter/pagination và user bị ban không login/refresh được.

### A-07. Admin languages

A làm toàn bộ UI/API/query:

- List/create/update/enable/disable language.
- Chọn đúng một ngôn ngữ mặc định.
- Không tắt default nếu chưa chọn ngôn ngữ thay thế.
- Unique language code; hiển thị native name và flag code.
- Độ phủ dịch lấy metric do C export, không tự query lại nghiệp vụ dịch.

### A-08. Admin categories và bản dịch danh mục

- Angular table/modal tạo sửa, search/filter, status và số bài.
- CRUD `categories` cùng `category_translations` trong transaction.
- Sinh slug, cho admin chỉnh và giữ unique `(category_id, language_id)`.
- Xóa category không xóa bài; bài nhận `category_id = null`.

### A-09. Admin dashboard shell

A sở hữu trang và endpoint tổng hợp:

- Thống kê user/role/status từ module A.
- Thống kê comment/like/follow gọi service B export.
- Thống kê bài chờ duyệt/dịch lỗi gọi service C export.
- Không viết lại query trực tiếp vào bảng B/C sở hữu.

## 5. Developer B — Reader Experience và Social

### B-01. Public layout và UI đọc chung

- Chuyển header/sidebar/mobile navigation/footer từ prototype sang Angular.
- Header có search, auth/user menu và chọn ngôn ngữ.
- Post card dùng chung cho feed, explore, profile và subscriptions.
- Category/language/sort filter, pagination, loading/empty/error.
- Responsive và keyboard focus; không chuyển dữ liệu giả từ `core.js` sang app thật.

### B-02. Feed trang chủ

Angular:

- Một feed duy nhất, thay action theo trạng thái đăng nhập.
- Hiển thị author, category, language, view/like/comment count.
- Lọc category/language, sắp xếp mới nhất/phổ biến và phân trang.

NestJS/API:

- `GET /posts` cho luồng public.
- Chỉ trả `published`, chưa xóa và có bản dịch phù hợp.
- Trả liked/followed khi request có user.

B sở hữu read query; C sở hữu create/update/status. Hai người chốt `PublicPostDto` trước khi làm.

### B-03. Explore và search

- Angular search bài, tác giả, danh mục; debounce và đồng bộ query lên URL.
- API search title/summary đúng ngôn ngữ, username/display name và category translation.
- Không trả bài chưa publish hoặc user bị banned/deleted.
- Test query rỗng, hoa/thường và pagination.

### B-04. Post detail và bài liên quan

- Render title/summary/content HTML, author, category, thời gian publish.
- Chuyển ngôn ngữ; nếu thiếu bản dịch hiển thị trạng thái ngay tại trang.
- API chi tiết chỉ trả published; preview draft dùng API C.
- Tăng view có kiểm soát và trả bài liên quan.
- Sanitize trước render; C sanitize ở lúc lưu.

### B-05. Public profile tác giả

- Avatar, display name, username, bio, follower/following và bài published.
- Không có ảnh bìa, không trả email/dữ liệu phiên.
- B sở hữu trang/query public; A sở hữu form sửa hồ sơ cá nhân.

### B-06. Post likes và comment likes

- Angular like/unlike có pending state, count và rollback khi lỗi.
- API like/unlike post/comment.
- Dùng unique `(post_id,user_id)` và `(comment_id,user_id)`.
- Test double click/request đồng thời không tạo bản ghi trùng.

### B-07. Comments hai cấp

Angular:

- Comment gốc và reply thụt đúng một cấp.
- Reply một reply vẫn ở cấp hai và hiển thị “trả lời @username”.
- Tạo/sửa/xóa, confirm và trạng thái hidden/rejected.

NestJS:

- CRUD comments và quyền sở hữu.
- `parent_id` của reply luôn trỏ comment gốc.
- `reply_to_comment_id` trỏ comment cụ thể; kiểm tra cùng post.
- Không tạo tầng thứ ba hoặc reply chéo bài.

Database: `comments`, `comment_likes`.

### B-08. Follow và subscriptions

- Follow/unfollow ở post detail và public profile.
- Trang subscriptions, lọc feed theo author và gợi ý tác giả.
- API follow/unfollow/list/following-feed/update `last_viewed_at`.
- Chặn tự follow và duplicate follow.
- Feed chỉ chứa bài published của author đang theo dõi.

### B-09. UI language và theme

- Service i18n cho label/menu, tách biệt với ngôn ngữ nội dung bài.
- Theme light/dark/system và compact view nếu giữ.
- B sở hữu service toàn app; A tích hợp điều khiển tại Settings.

## 6. Developer C — Author, Moderation và AI Translation

### C-01. State machine bài viết

```text
draft → pending_review → approved → published → archived
   ↑          ↓
   └────── rejected
```

- Tạo bài là `draft`; `author_id` lấy từ JWT.
- Chỉ tác giả sở hữu được sửa.
- Draft/rejected mới gửi duyệt; admin mới approve/reject.
- Reject bắt buộc `review_note`; approved mới publish và ghi `published_at`.
- Archive/xóa mềm/khôi phục phải có transition và test rõ ràng.

### C-02. Create/Edit Post

Angular:

- Title, summary, category, source/target languages, WYSIWYG content.
- Lưu draft, preview, gửi duyệt và cảnh báo rời trang chưa lưu.
- Chèn ảnh trong content; không có thumbnail hoặc chọn nhiều tác giả.

NestJS/API:

- Create/get/update/submit author post.
- Cập nhật `posts` và bản nguồn `post_translations` trong transaction.
- Sinh slug theo ngôn ngữ, unique `(slug,language_id)` và sanitize HTML.

### C-03. My Posts, archive và thùng rác

- Angular list/search/filter theo toàn bộ status và hiển thị `review_note`.
- Sửa, archive, xóa mềm/khôi phục theo quyền/trạng thái.
- Ma trận translation status từng ngôn ngữ.
- API luôn giới hạn `author_id = currentUser.id`.

### C-04. Preview

- Draft preview chỉ author sở hữu/admin xem được, không lộ qua public route.
- Tái sử dụng component render của B.
- C cung cấp Preview DTO tương thích PublicPostDto nhưng thêm status/review note.

### C-05. Admin kiểm duyệt bài

Chức năng đặt trong admin layout A nhưng thuộc C vì nằm trong vòng đời bài:

- Angular manage posts: filter author/category/language/status/date, preview, approve/reject.
- API list/detail/approve/reject/publish cho admin.
- Reject bắt buộc note; kiểm tra state trong transaction.
- Test role, trạng thái sai và hai admin thao tác đồng thời.
- Không có `review_status`; chỉ dùng `posts.status` và `review_note`.

### C-06. Upload

- Service Multer dùng chung cho avatar và ảnh editor.
- Kiểm MIME thật, dung lượng, tên ngẫu nhiên và path traversal.
- Không có endpoint cover/thumbnail.
- Ảnh editor trả URL để lưu trong `post_translations.content`.
- A tích hợp avatar nhưng C sở hữu service/validation upload.

### C-07. Translation targets và status matrix

- Một target cho mỗi `(post_id,language_id)`, không tạo trùng.
- Bản nguồn là nội dung author; bản đích bắt đầu `not_started/queued`.
- API ma trận status dùng chung cho My Posts và Admin Posts.

### C-08. Translation worker và fallback provider

1. Lấy target `queued`, khóa job và chuyển `processing`.
2. Gọi provider theo thứ tự cấu hình.
3. Mỗi lần gọi insert `translation_attempts` với provider, order, status, error, char count và thời gian.
4. Failed/rate-limited/timeout thì thử provider tiếp theo.
5. Thành công cập nhật content/provider/status `completed`; hết provider thì `failed`.

Test bắt buộc: provider fallback đúng thứ tự, thành công không gọi tiếp, hai worker không xử lý trùng, restart không mất job và không ghi API key vào log/DB.

### C-09. Retry và thay đổi nội dung nguồn

- Retry thủ công target failed theo quyền.
- Khi nguồn thay đổi phải đánh dấu bản dịch cần cập nhật theo quy tắc đã chốt.
- Không ghi đè bản dịch human-edited nếu chưa xác nhận.
- Export metrics bài/dịch cho dashboard A.

## 7. Hợp đồng phối hợp

| Hạng mục | Owner | Người phối hợp |
|---|---|---|
| Nest structure, env, error format, auth guards | A | B, C |
| Angular config/interceptors | A | B, C |
| Public layout, PublicPostDto, i18n/theme | B | A, C |
| Post state machine, preview/translation DTO | C | A, B |
| Migration convention và schema review | A | B, C |
| Upload service | C | A |
| Admin layout shell | A | C |

Mọi API bàn giao phải có method/URL, quyền, request/response mẫu, lỗi có thể xảy ra, Swagger và test tối thiểu.

## 8. Lịch 8 tuần

Mỗi tuần mọi người đều làm cả Angular và NestJS của chức năng mình.

| Tuần | A | B | C | Mốc tích hợp |
|---:|---|---|---|---|
| 1 | Bootstrap Nest/Angular, DB/env, contract chung | Public layout/post card, phân tích feed | State machine, Post DTO, editor/provider spike | Frontend/backend/DB chạy |
| 2 | Register/login/me + UI | Feed API + UI | Create draft API + UI | Login và tạo/xem draft |
| 3 | Refresh/logout/change password | Explore/search/detail | Edit/preview/submit + upload content | Draft gửi duyệt, detail dùng DTO chung |
| 4 | Forgot/reset + profile/settings | Comments + likes | My Posts + admin moderation | Review/publish/social chạy end-to-end |
| 5 | Admin users/roles | Public profile + subscriptions | Translation worker/fallback | Published post vào following feed và dịch |
| 6 | Languages/categories/dashboard | Social responsive + i18n/theme | Matrix/retry + metrics | Feature freeze |
| 7 | Test auth/admin/migration/security | Test reader/social/accessibility | Test post/upload/worker concurrency | Test chéo DB sạch |
| 8 | Build/deploy backend, API docs | Build frontend, UI QA/demo | Deploy worker, demo content | Release candidate |

## 9. Git workflow

Nhánh theo chức năng, không tạo `frontend-all` hoặc `backend-all`:

```text
feature/auth-refresh-session
feature/public-comments
feature/admin-categories
feature/author-post-moderation
feature/translation-provider-fallback
```

Một branch chức năng có thể chứa các commit riêng:

```text
feat(comments): add comments API
feat(comments): add Angular comment threads
test(comments): reject cross-post replies
```

PR vào `develop`, ít nhất một reviewer phải chạy cả UI và API của chức năng.

## 10. Database và review

- Owner đề xuất migration cho bảng chức năng mình; A review index/FK/type.
- Migration đã chạy chung không được sửa; tạo migration mới.
- PR database phải cập nhật migration, model, DBML và test.
- PR A: C review chính; B thêm review nếu thay shared Angular.
- PR B: A review chính; C thêm review nếu thay Post DTO/query.
- PR C: B review chính; A thêm review nếu thay migration/auth/admin guard.

## 11. Definition of Done

Một chức năng chỉ Done khi:

- Angular có loading/success/empty/error và responsive cần thiết.
- API có DTO validation, auth/role/ownership.
- Query/transaction/index phù hợp.
- Không còn dữ liệu giả trong luồng đã nối API.
- Có unit test nghiệp vụ và integration/e2e test luồng chính/lỗi.
- Build frontend/backend thành công.
- Swagger/tài liệu được cập nhật.
- Không commit `.env`, secret, API key, `node_modules`, `dist`, uploads.
- Owner đã chạy từ trình duyệt tới database và PR được approve.

## 12. Tiêu chí hoàn thành dự án

- Register/login/refresh/logout/change/forgot/reset password hoạt động.
- Admin quản lý user/language/category và kiểm duyệt bài.
- Author tạo draft, gửi duyệt, sửa bài rejected và publish bài approved.
- Reader đọc đúng bản dịch, search/filter, comment, like và follow.
- Worker có provider fallback và lịch sử từng lần thử.
- Không có ảnh bìa, thumbnail hoặc nhiều tác giả trong UI/API/DB.
- Database tạo/rollback bằng migration.
- Mỗi cụm có một owner chịu trách nhiệm Angular → NestJS → MySQL → test.
