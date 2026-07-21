# DevA — Kiểm kê prototype và kế hoạch chuyển đổi Angular

## 1. Phạm vi sở hữu

Theo `03_PHAN_CHIA_CONG_VIEC.md`, devA sở hữu:

- A-01: nền tảng NestJS/Angular và contract dùng chung.
- A-02 đến A-04: đăng ký, đăng nhập, phiên đăng nhập và toàn bộ luồng mật khẩu.
- A-05: hồ sơ cá nhân có thể chỉnh sửa và settings.
- A-06 đến A-09: admin users, roles, languages, categories và dashboard shell.

DevA không sở hữu public feed/explore/post detail/subscriptions (devB), author workspace/my posts/moderation/translation (devC).

## 2. Bản đồ 17 trang prototype

| Prototype | Angular đích | Owner | Trạng thái |
|---|---|---|---|
| `login.html` | `features/auth/login` trong `AuthLayout` | A | Đã chuyển đổi |
| `register.html` | `features/auth/register` trong `AuthLayout` | A | Đã chuyển đổi |
| `change-password.html` | `features/auth/change-password` | A | Chưa làm |
| `profile.html` | `features/profile` (edit: A, public: B) | A/B | Chưa tách |
| `settings.html` | `features/settings` | A, phối hợp B | Chưa làm |
| `admin/index.html` | `features/admin/dashboard` trong `AdminLayout` | A | Đã có shell, chưa nối API |
| `admin/manage-users.html` | `features/admin/users` | A | Chưa làm |
| `admin/manage-languages.html` | `features/admin/languages` | A | Chưa làm |
| `admin/manage-categories.html` | `features/admin/categories` | A | Chưa làm |
| `admin/manage-posts.html` | `features/admin/posts` | C | Không chuyển trong nhánh A |
| `index.html` | `features/feed` | B | Không chuyển trong nhánh A |
| `explore.html` | `features/explore` | B | Không chuyển trong nhánh A |
| `post-detail.html` | `features/posts/detail` | B | Không chuyển trong nhánh A |
| `subscriptions.html` | `features/subscriptions` | B | Không chuyển trong nhánh A |
| `layout-template.html` | public layout/components | B | B dùng làm tài liệu đối chiếu |
| `create-post.html` | `features/workspace/editor` | C | Không chuyển trong nhánh A |
| `my-posts.html` | `features/workspace/my-posts` | C | Không chuyển trong nhánh A |

## 3. Thành phần dùng chung đã dựng

- `shared/layouts/auth-layout`: khung responsive cho login/register/forgot/reset/change password.
- `shared/layouts/admin-layout`: sidebar, mobile drawer, user area và `router-outlet`.
- `shared/components/brand`: logo/wordmark duy nhất.
- `shared/components/theme-toggle`: điều khiển theme có keyboard focus.
- `shared/components/locale-selector`: điều khiển locale dạng presentational.
- `shared/components/toast`: thông báo không phụ thuộc biến Bootstrap global.
- `shared/components/ui-state`: loading/empty/error dùng lại giữa các feature.
- `core/services/theme.service`: lưu preference phía thiết bị; devB cần review khi tích hợp B-09.

Không đưa dữ liệu giả từ `prototype/assets/js/core.js` vào ứng dụng thật.

## 4. Audit tiến độ devA

### Đã commit

- `0b985bc`: A-01 foundation cơ bản (exception/response, Angular models/interceptor).
- `18982b3`: API A-02 cho register/login/me.

### Đang ở working tree

- UI Angular login/register và auth service.
- Global style được chuyển từ prototype.
- Shared auth/admin UI và dashboard shell.

### Chưa đạt Definition of Done

- A-01 thiếu pagination DTO, guards dùng chung, health check DB và Jest TypeScript config.
- A-02 chưa lowercase email lúc lưu, chưa có rule username rõ ràng, test hiện chỉ là skeleton.
- Frontend chưa có access-token interceptor và route guard.
- Admin route chưa có role guard; không nối dữ liệu cho đến khi guard/API hoàn tất.
- A-03 đến A-09 chưa triển khai end-to-end.

## 5. Thứ tự triển khai tiếp

1. Chốt A-02: contract register/login/me, validation username/email, auth guard, unit/e2e test.
2. Làm A-03: access-token interceptor, refresh single-flight, logout/logout-all.
3. Làm A-04: change/forgot/reset password trên `AuthLayout`.
4. Làm A-05: tách public profile (B) và editable profile/settings (A); tích hợp upload avatar của C.
5. Làm A-06: admin guard rồi users/roles.
6. Làm A-07 và A-08: languages/categories với modal dùng lại và transaction.
7. Hoàn thiện A-09 bằng aggregate service do B/C export.

Mỗi bước phải có loading/success/empty/error, responsive, API validation, test và build thành công trước khi chuyển bước.

## 6. Quy ước commit

Mỗi commit chỉ chứa một lát cắt có thể review:

```text
feat(shared-ui): add reusable auth controls and feedback states
feat(auth-ui): convert login and register prototypes to Angular
feat(admin-ui): add responsive admin shell and dashboard empty state
test(frontend): update application and home component setup
```

Không dùng `git add .`. Kiểm tra từng nhóm bằng `git diff --staged` trước khi commit. Với `app.routes.ts`, dùng `git add -p` để tách hunk auth khỏi hunk admin nếu cần giữ lịch sử tuyệt đối theo chức năng.
