# LINGORA — PHÂN CHIA CÔNG VIỆC CHI TIẾT

## 1. Phạm vi và nhân sự

Kế hoạch dành cho nhóm 3 thành viên trong 8 tuần:

| Thành viên | Vai trò chính | Phân hệ sở hữu |
|---|---|---|
| Developer A | Tech Lead, Backend/Auth/Admin | Hạ tầng NestJS, database, auth, users, languages, categories, admin |
| Developer B | Frontend/Public/Social | Angular foundation, feed, explore, profile, comments, likes, subscriptions |
| Developer C | Author/Translation/Upload | Posts, workspace tác giả, upload ảnh nội dung, worker dịch và translation attempts |

Mỗi người sở hữu một lát cắt đầy đủ gồm API, UI liên quan, validation và test. “Sở hữu” không có nghĩa chỉ người đó được sửa; thay đổi vào phân hệ của người khác phải báo và được review.

## 2. Nguyên tắc chung

- Backend dùng NestJS, Sequelize và MySQL; không quay lại ExpressJS thuần.
- Frontend sản phẩm dùng Angular; HTML tĩnh chỉ làm tài liệu tham chiếu.
- Database có đúng 14 bảng theo `backend/database-schema.dbml`.
- Không có ảnh bìa người dùng và không có thumbnail bài viết.
- Một bài viết chỉ thuộc một tác giả.
- Không dùng `localStorage` làm database; chỉ dùng tạm cho token/theme nếu cần.
- Mỗi Pull Request phải có ít nhất một người khác review.
- Người tạo feature chịu trách nhiệm cả luồng thành công, lỗi, quyền truy cập và test.

## 3. Phân công Developer A — Tech Lead, Auth và Admin

### A1. Khởi tạo backend

- Hoàn thiện `main.ts`, `app.module.ts`, `nest-cli.json`, `tsconfig.build.json`.
- Import `DatabaseModule`, cấu hình `ConfigModule`, ValidationPipe và prefix `/api/v1`.
- Cấu hình CORS theo `FRONTEND_URL`.
- Tạo response format và exception filter dùng chung.
- Bảo đảm production giữ `synchronize: false` và chỉ dùng migration.

Kết quả bàn giao:

- Backend khởi động được.
- Endpoint health check trả 200.
- Kết nối được `lingora_dev` và `lingora_test`.
- Migration up/down và seeder chạy thành công.

### A2. Database và dữ liệu nền

- Chịu trách nhiệm cuối cùng với migration, foreign key và index.
- Review mọi thay đổi database của B/C.
- Tạo quy trình thêm migration mới; không sửa migration đã chạy trên môi trường chung.
- Seed role, language và tài khoản admin development đọc mật khẩu từ env.
- Viết test xác nhận unique like/follow/translation và quan hệ một tác giả.

### A3. Auth và bảo mật

Backend:

- `POST /auth/register`.
- `POST /auth/login` cấp access token và refresh token.
- `POST /auth/refresh` xoay token và từ chối token hết hạn/revoke.
- `POST /auth/logout` revoke phiên hiện tại.
- `POST /auth/logout-all` revoke toàn bộ phiên của user.
- `POST /auth/change-password` và revoke token cũ.
- `POST /auth/forgot-password` luôn trả thông báo chung.
- `POST /auth/reset-password` kiểm tra token hash, hạn và `used_at`.
- `GET /auth/me` trả user DTO thống nhất.
- Hash password bằng bcrypt; không trả password/token hash trong response.

Frontend:

- Login, register, forgot password, reset password, change password.
- Auth service và auth interceptor.
- Auth guard và admin guard.
- Refresh access token tối đa một lần khi gặp 401, tránh vòng lặp.

Test bắt buộc:

- Email/username trùng.
- Mật khẩu sai.
- User bị banned.
- Refresh token hết hạn hoặc revoked.
- Reset token hết hạn, dùng lại hoặc không hợp lệ.

### A4. Users và Admin

- API admin tìm kiếm/phân trang/lọc user.
- Xem chi tiết user, ban/unban và đổi role theo luật dự án.
- Không cho admin tự khóa tài khoản đang đăng nhập.
- Dashboard: số user, bài theo trạng thái và hàng đợi dịch.
- Angular admin layout, users table và dashboard.
- Kiểm tra quyền admin ở backend, không chỉ ẩn menu frontend.

### A5. Languages và Categories

- CRUD ngôn ngữ; chỉ cho phép một ngôn ngữ mặc định.
- Không tắt ngôn ngữ mặc định nếu chưa chọn ngôn ngữ thay thế.
- CRUD category và `category_translations`.
- Sinh slug, kiểm tra unique và xử lý category đang được bài sử dụng.
- Angular manage languages/categories và validation form.

### A6. Việc review bắt buộc

- Review migration và query phức tạp của B/C.
- Review auth guard, role guard và endpoint admin.
- Chốt API conventions, pagination và error response trước tuần 3.

## 4. Phân công Developer B — Public Frontend và Social

### B1. Angular foundation và UI dùng chung

- Khởi tạo Angular workspace trong `frontend/`.
- Tạo `app.config.ts`, routes và environments.
- Chuyển token màu/layout cần thiết từ prototype sang SCSS.
- Xây public layout, auth layout, admin layout shell.
- Xây header, sidebar, post card, pagination, loading, empty state, toast và confirm dialog.
- Bảo đảm responsive và keyboard focus.

Kết quả bàn giao:

- Angular chạy tại cổng 4200.
- Route lazy-load được.
- Component dùng chung không phụ thuộc dữ liệu giả trong `core.js`.

### B2. Quản lý UI prototype

- Là người duy nhất thực hiện `git subtree pull` định kỳ từ repository `ui-prototype`.
- Ghi changelog những thay đổi UI cần chuyển sang Angular.
- Không copy nguyên `core.js` vào Angular; chỉ chuyển hành vi cần thiết thành service/component.
- Đồng bộ UI tối đa hai lần mỗi tuần để tránh xung đột liên tục.

### B3. Feed và Explore

Backend:

- API feed bài `published`, phân trang và sắp xếp mới nhất/phổ biến.
- Lọc theo category, language và author.
- Search title/summary đã dịch; chỉ trả bản ngôn ngữ phù hợp.
- API chi tiết bài và bài liên quan.
- Tăng view có kiểm soát, tránh tăng nhiều lần trong cùng request.

Frontend:

- Homepage/feed.
- Explore và search results.
- Bộ lọc category/language/sort.
- Post detail và đổi ngôn ngữ nội dung.
- Trạng thái loading, empty và API error.

### B4. Profile

- Public profile theo username.
- Chỉnh `display_name`, `avatar` và `bio`.
- Không làm ảnh bìa.
- Danh sách bài đã xuất bản của tác giả.
- Hiển thị follower/following theo API.
- Phối hợp C cho upload avatar, dùng chung upload validation.

### B5. Comments

Backend:

- Tạo, sửa và xóa bình luận theo quyền sở hữu.
- Bình luận chỉ hiển thị tối đa hai cấp.
- `parent_id` luôn trỏ comment gốc; `reply_to_comment_id` ghi comment cụ thể được trả lời.
- Kiểm tra parent/reply thuộc cùng bài.
- Admin có thể ẩn/reject comment.

Frontend:

- Danh sách comment theo thread.
- Reply comment gốc hoặc reply khác nhưng giao diện vẫn phẳng hai cấp.
- Hiển thị `reply_to_username`.
- Form validation và optimistic UI chỉ khi có rollback lỗi.

### B6. Likes và Subscriptions

- API toggle post like và comment like, xử lý unique conflict an toàn.
- API follow/unfollow, chặn tự follow.
- API following feed và cập nhật `last_viewed_at`.
- Nút like/follow trên Angular phản ánh đúng trạng thái từ server.
- Trang subscriptions, lọc theo tác giả và trạng thái không có dữ liệu.

### B7. Test bắt buộc

- Không like hai lần.
- Không tự follow.
- Không sửa/xóa comment của người khác.
- Reply khác bài bị từ chối.
- Feed không trả draft/rejected/archived.
- UI responsive ở desktop, tablet và mobile.

## 5. Phân công Developer C — Author Workspace, Upload và AI Translation

### C1. Posts backend

- API tạo draft với `author_id` lấy từ JWT, không nhận tùy ý từ request.
- API cập nhật bài chỉ cho tác giả sở hữu.
- API danh sách bài của tôi theo trạng thái.
- API gửi duyệt: `draft/rejected → pending_review`.
- API admin approve/reject; reject phải có `review_note`.
- API publish chỉ cho bài `approved`.
- API archive và xóa mềm/khôi phục theo quy ước nhóm.
- Dùng transaction khi cập nhật `posts` và `post_translations`.

### C2. Author Workspace Angular

- Create/edit post với title, summary, content, category và ngôn ngữ gốc.
- Editor hỗ trợ ảnh bên trong nội dung.
- Preview nội dung đã sanitize.
- My posts: draft, pending, approved, rejected, published, archived.
- Hiển thị `review_note` khi bị từ chối.
- Ma trận trạng thái dịch theo ngôn ngữ.
- Không có trường chọn thumbnail và không cho chọn nhiều tác giả.

### C3. Upload

- Endpoint upload avatar và ảnh editor.
- Kiểm tra MIME thực, extension, kích thước và tên file ngẫu nhiên.
- Không tin tên file/path do client gửi.
- Chỉ trả URL sau khi upload thành công.
- Ảnh editor được chèn dưới dạng URL trong `post_translations.content`.
- Dọn file rác theo chính sách được nhóm thống nhất.

### C4. Translation worker

- Tạo target `post_translations` theo ngôn ngữ được chọn.
- Worker lấy bản `queued`, khóa công việc và chuyển sang `processing`.
- Mỗi lần gọi provider tạo một `translation_attempts`.
- Ghi `provider`, `attempt_order`, status, lỗi, `char_count`, thời gian bắt đầu/kết thúc.
- Fallback provider khi `failed`, `rate_limited` hoặc `timeout`.
- Thành công cập nhật content và `translation_status = completed`.
- Thất bại toàn bộ cập nhật `translation_status = failed`.
- Không dịch lại bản completed nếu nội dung nguồn chưa đổi.

### C5. Translation UI/Admin integration

- Hiển thị trạng thái `not_started`, `queued`, `processing`, `completed`, `failed`.
- Cho phép retry bản failed theo quyền.
- Admin dashboard xem hàng đợi và lỗi gần nhất.
- Không hiển thị error message chứa secret/provider credential.

### C6. Test bắt buộc

- User không sửa bài người khác.
- Không publish bài chưa approved.
- Unique `(post_id, language_id)` được giữ.
- Provider đầu lỗi thì provider sau được gọi đúng thứ tự.
- Một job không bị hai worker xử lý đồng thời.
- File sai MIME/quá dung lượng bị từ chối.

## 6. Kế hoạch 8 tuần

| Tuần | Developer A | Developer B | Developer C | Mốc tích hợp |
|---:|---|---|---|---|
| 1 | Nest bootstrap, DB/env/migration | Angular bootstrap, layout và shared UI | Chốt posts/translation contract, chọn editor/provider mock | Backend/frontend chạy độc lập |
| 2 | Register/login/JWT/guards | Feed/explore UI với API mock | Draft CRUD và post translations | Chốt DTO auth và post |
| 3 | Refresh/logout/forgot/reset password | Feed/search/detail API + UI | Create/edit workspace + upload ảnh editor | Đăng nhập và tạo draft end-to-end |
| 4 | Users admin, ban/unban | Comments backend + UI | Submit/review/publish workflow | Draft → review → publish chạy được |
| 5 | Languages/categories API + admin UI | Likes, profile và subscriptions | Worker dịch + translation attempts | Bài published hiển thị/dịch được |
| 6 | Admin dashboard, hardening auth | Hoàn thiện public/social responsive | Translation matrix, retry/fallback | Feature freeze |
| 7 | Unit/e2e auth/admin/DB | Unit/e2e public/social | Unit/e2e post/upload/translation | Test chéo và sửa tích hợp |
| 8 | Build/deploy backend, tài liệu API | Build frontend, accessibility/UI QA | Worker deployment, dữ liệu demo | Release candidate và demo |

## 7. Quan hệ phụ thuộc và bàn giao

| Bên tạo | Bên sử dụng | Nội dung phải bàn giao |
|---|---|---|
| A | B, C | Auth DTO, JWT guard, current-user decorator, error format |
| A | B | Language/category endpoints và role rules |
| C | B | Post detail/feed DTO, status mapping và translation DTO |
| B | C | Shared form/editor shell, toast, confirm dialog và public post card |
| C | A | Translation queue metrics cho admin dashboard |
| B | A | User/profile UI requirements và admin table components dùng chung |

Mọi API bàn giao phải kèm:

- Method và URL.
- Request DTO mẫu.
- Success response mẫu.
- Các mã lỗi có thể xảy ra.
- Quyền truy cập.
- Test hoặc Postman/Swagger minh họa.

## 8. Git workflow

### Branch

- `main`: bản ổn định để demo/deploy.
- `develop`: nhánh tích hợp.
- `feature/<ten>`: tính năng mới.
- `fix/<ten>`: sửa lỗi.
- `docs/<ten>`: chỉ sửa tài liệu.

Ví dụ:

```text
feature/auth-refresh-token
feature/public-comments
feature/translation-worker
fix/post-status-transition
```

### Quy trình mỗi task

```powershell
git switch develop
git pull origin develop
git switch -c feature/ten-task
```

Sau khi hoàn thành:

```powershell
git add <cac-file-dung-pham-vi>
git commit -m "feat: mo ta ngan gon"
git push -u origin feature/ten-task
```

Tạo Pull Request vào `develop`, không vào thẳng `main`.

### Quy tắc commit

- `feat:` tính năng mới.
- `fix:` sửa lỗi.
- `refactor:` đổi cấu trúc không đổi hành vi.
- `test:` thêm/sửa test.
- `docs:` tài liệu.
- `chore:` dependency, config hoặc đồng bộ prototype.

Không gộp database migration, UI lớn và refactor không liên quan trong cùng một commit.

## 9. Quy tắc tránh xung đột

- B thông báo trước khi đồng bộ `ui-prototype` bằng subtree.
- A duyệt mọi migration; migration đã chạy chung không được sửa nội dung.
- C không thay đổi auth DTO nếu chưa trao đổi với A.
- B không tự đổi post response DTO nếu chưa trao đổi với C.
- File dùng chung như routes, app config và variables SCSS cần chia commit nhỏ.
- Rebase/merge `develop` vào branch trước khi mở PR lớn.

## 10. Definition of Done

Một task chỉ hoàn thành khi đáp ứng tất cả mục liên quan:

- Code build không lỗi.
- Không còn dữ liệu giả trong luồng đã nối API.
- DTO validate đủ trường bắt buộc.
- Backend kiểm tra auth, role và quyền sở hữu.
- Có xử lý loading, empty và error ở frontend.
- Migration có `up` và `down` nếu thay database.
- Unit test cho nghiệp vụ chính; e2e cho luồng quan trọng.
- Không commit `.env`, secret, `node_modules`, `dist` hoặc file upload.
- Đã tự review diff và xóa log/debug code.
- Có ít nhất một thành viên khác approve Pull Request.
- Tài liệu API hoặc hướng dẫn được cập nhật nếu hành vi thay đổi.

## 11. Review chéo

| PR của | Reviewer chính | Reviewer phụ |
|---|---|---|
| Developer A | Developer C | Developer B |
| Developer B | Developer A | Developer C |
| Developer C | Developer B | Developer A |

PR liên quan auth/database cần A tham gia review dù A không phải tác giả. PR liên quan UI shared cần B tham gia. PR liên quan trạng thái bài/dịch cần C tham gia.

## 12. Họp và báo cáo

### Daily 10–15 phút

Mỗi người trả lời:

1. Hôm qua đã hoàn thành gì?
2. Hôm nay làm task nào?
3. Đang bị chặn bởi ai hoặc điều gì?

### Cuối tuần

- Demo trên nhánh `develop`.
- Chạy migration trên database test sạch.
- Chạy test backend và build frontend.
- Kiểm tra tiến độ bảng tuần.
- Chốt API/DB thay đổi cho tuần tiếp theo.

### Bảng theo dõi task

Mỗi task có tối thiểu:

- Người phụ trách.
- Reviewer.
- Deadline.
- Dependency.
- Tiêu chí nghiệm thu.
- Trạng thái: Todo, In Progress, Review, Testing, Done.

## 13. Tiêu chí hoàn thành dự án

- Đăng ký, login, refresh, logout và quên/reset mật khẩu hoạt động.
- Admin quản lý user, language, category và duyệt bài.
- Tác giả tạo draft, gửi duyệt, sửa bài bị từ chối và xuất bản bài được duyệt.
- Độc giả đọc đúng ngôn ngữ, tìm/lọc bài, bình luận, like và follow.
- Worker dịch có provider fallback và lưu lịch sử lần thử.
- Không có ảnh bìa người dùng hoặc thumbnail bài viết trong DB/UI/API.
- Database tạo được hoàn toàn bằng migration và rollback được.
- Frontend/backend build thành công; luồng chính có e2e test.
- Không có secret hoặc dữ liệu production trong Git.
