# LINGORA — GIỚI THIỆU VÀ CẤU TRÚC DỰ ÁN

## 1. Mục tiêu

Lingora là hệ thống blog đa ngôn ngữ, hỗ trợ ba nhóm người dùng:

- Độc giả: đọc, tìm kiếm, thích, bình luận và theo dõi tác giả.
- Tác giả: tạo bài, lưu nháp, gửi duyệt, theo dõi trạng thái dịch và quản lý bài cá nhân.
- Quản trị viên: quản lý người dùng, danh mục, ngôn ngữ và kiểm duyệt bài.

Nội dung bài được lưu theo từng ngôn ngữ. Hệ thống có thể gọi nhiều nhà cung cấp dịch, ghi lại từng lần thử và chuyển sang nhà cung cấp dự phòng khi gặp lỗi hoặc giới hạn lượt gọi.

## 2. Công nghệ thống nhất

| Thành phần | Công nghệ |
|---|---|
| UI tham chiếu | HTML, CSS, JavaScript tĩnh trong `prototype/` hoặc repository `ui-prototype` |
| Frontend sản phẩm | Angular, TypeScript, SCSS, Bootstrap |
| Backend | NestJS, TypeScript, REST API |
| ORM | Sequelize + `sequelize-typescript` |
| Database | MySQL 8+ |
| Xác thực | JWT access token + refresh token |
| Upload | Multer, ban đầu lưu file local |
| Dịch tự động | Background worker gọi API dịch và có fallback provider |

## 3. Trạng thái hiện tại

- `prototype/` chứa giao diện HTML tĩnh để đối chiếu chức năng và thiết kế.
- `frontend/` mới là khung thư mục, chưa khởi tạo ứng dụng Angular hoàn chỉnh.
- `backend/` đã có thiết kế DBML, migration MySQL, Sequelize model, seeder và cấu hình kết nối database.
- Controller, service và giao diện Angular sẽ được ba thành viên triển khai theo file `03_PHAN_CHIA_CONG_VIEC.md`.

## 4. Cấu trúc thư mục

```text
HTML Blog/
├─ prototype/                         # UI HTML/CSS/JS tĩnh để đối chiếu
│  ├─ admin/                          # Các màn hình quản trị
│  ├─ assets/
│  │  ├─ css/                         # Style của prototype
│  │  ├─ images/                      # Logo và tài nguyên tĩnh
│  │  └─ js/                          # Dữ liệu giả và hành vi UI
│  └─ *.html                          # Các trang người đọc/tác giả
│
├─ frontend/                          # Ứng dụng Angular
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ core/                     # Auth, guard, interceptor, model, service dùng chung
│  │  │  ├─ shared/                   # Layout và component tái sử dụng
│  │  │  └─ features/                 # Từng nhóm màn hình nghiệp vụ
│  │  ├─ assets/                      # Ảnh, style, file dịch giao diện
│  │  └─ environments/                # URL API development/production
│  └─ tests/e2e/                      # Kiểm thử luồng trình duyệt
│
├─ backend/                           # NestJS REST API
│  ├─ database-schema.dbml            # Sơ đồ database 14 bảng
│  ├─ package.json                    # Thư viện và script database
│  ├─ .env.example                    # Biến môi trường mẫu
│  ├─ .sequelizerc                    # Đường dẫn migration/seeder
│  ├─ src/
│  │  ├─ common/                      # Guard, decorator, filter, pipe, DTO chung
│  │  ├─ config/                      # Cấu hình ứng dụng và database
│  │  ├─ database/
│  │  │  ├─ migrations/               # Tạo và thay đổi cấu trúc MySQL theo phiên bản
│  │  │  ├─ seeders/                  # Role và ngôn ngữ ban đầu
│  │  │  ├─ models.ts                 # Sequelize model của 14 bảng
│  │  │  └─ database.module.ts        # Module kết nối Sequelize với NestJS
│  │  └─ modules/                     # Module nghiệp vụ NestJS
│  ├─ storage/uploads/                # Avatar và ảnh chèn trong nội dung
│  └─ test/                           # Unit test và e2e test backend
│
├─ 01_GIOI_THIEU_VA_CAU_TRUC_DU_AN.md
├─ 02_CAI_DAT_CHAY_DU_AN_VA_CAP_NHAT_UI.md
└─ 03_PHAN_CHIA_CONG_VIEC.md
```

## 5. Cấu trúc frontend Angular

### `core/`

Chỉ chứa thành phần dùng một lần cho toàn ứng dụng:

- `guards/`: chặn route khi chưa đăng nhập hoặc không đủ role.
- `interceptors/`: gắn access token, refresh khi nhận 401 và chuẩn hóa lỗi API.
- `models/`: kiểu dữ liệu TypeScript như `User`, `Post`, `Comment`, `Language`.
- `services/`: auth, API base, theme và ngôn ngữ giao diện.

### `shared/`

Chứa thành phần có thể tái sử dụng ở nhiều feature:

- Layout công khai, auth và admin.
- Header, sidebar, post card, phân trang, dialog xác nhận.
- Loading, empty state, toast, pipe định dạng ngày và trạng thái.

Không đặt logic riêng của một trang vào `shared/`.

### `features/`

| Feature | Chức năng |
|---|---|
| `auth/` | Login, register, forgot/reset/change password |
| `feed/` | Trang chủ, lọc danh mục và ngôn ngữ |
| `explore/` | Tìm bài, tác giả và danh mục |
| `posts/` | Chi tiết bài, thích và bình luận |
| `workspace/` | Tạo/sửa bài, preview, bài của tôi và trạng thái dịch |
| `profile/` | Hồ sơ công khai, sửa avatar và bio; không có ảnh bìa |
| `settings/` | Theme và tùy chọn giao diện phía frontend |
| `subscriptions/` | Tác giả đang theo dõi và following feed |
| `admin/` | Dashboard, users, posts, categories và languages |

## 6. Cấu trúc backend NestJS

Mỗi module trong `backend/src/modules/<module>/` sử dụng quy ước:

```text
<module>/
├─ dto/                     # Validate request và query
├─ models/                  # Chỉ tách model khỏi database/models.ts khi module được triển khai
├─ <module>.module.ts       # Đăng ký controller/provider/model
├─ <module>.controller.ts   # Khai báo endpoint, không query DB trực tiếp
└─ <module>.service.ts      # Nghiệp vụ, phân quyền và transaction
```

| Module | Trách nhiệm |
|---|---|
| `auth` | Register, login, refresh, logout, change/forgot/reset password |
| `users` | Hồ sơ người dùng và quản trị tài khoản |
| `languages` | CRUD ngôn ngữ, bật/tắt và chọn mặc định |
| `categories` | CRUD danh mục và tên/slug theo ngôn ngữ |
| `posts` | Draft, gửi duyệt, duyệt/từ chối, publish, archive và feed |
| `translations` | Hàng đợi dịch, provider fallback và lịch sử lần thử |
| `comments` | Bình luận hai cấp và trả lời một bình luận cụ thể |
| `likes` | Thích/bỏ thích bài và bình luận |
| `subscriptions` | Theo dõi/bỏ theo dõi tác giả |
| `uploads` | Avatar và ảnh chèn trong nội dung bài |
| `admin` | Dashboard tổng hợp và điều phối nghiệp vụ quản trị |

## 7. Database chính thức

Database hiện có 14 bảng:

| Nhóm | Bảng |
|---|---|
| Cấu hình | `roles`, `languages` |
| Người dùng và auth | `users`, `password_reset_tokens`, `refresh_tokens` |
| Danh mục | `categories`, `category_translations` |
| Bài viết và dịch | `posts`, `post_translations`, `translation_attempts` |
| Tương tác | `comments`, `post_likes`, `comment_likes`, `subscriptions` |

Quy tắc quan trọng:

- Một bài viết có đúng một `author_id`.
- `posts.status` là trạng thái duy nhất: `draft`, `pending_review`, `approved`, `rejected`, `published`, `archived`.
- Không có `review_status`; lý do từ chối gần nhất nằm trong `review_note`.
- Không có thumbnail bài viết và không có ảnh bìa người dùng.
- Ảnh bên trong bài được upload rồi URL ảnh được lưu trong HTML của `post_translations.content`.
- Mỗi bài chỉ có một bản nội dung cho mỗi ngôn ngữ nhờ unique `(post_id, language_id)`.
- Mỗi người chỉ thích một bài/bình luận một lần nhờ unique index.
- Refresh token và reset token chỉ được lưu dưới dạng hash.
- `translation_attempts` lưu từng lần thử provider, lỗi và số ký tự để debug/thống kê.

## 8. Luồng dữ liệu chính

### Đăng nhập lâu dài

1. Backend xác minh email và mật khẩu đã hash.
2. Backend cấp access token ngắn hạn và refresh token dài hạn.
3. Hash refresh token được lưu trong `refresh_tokens` theo thiết bị.
4. Khi access token hết hạn, frontend dùng refresh token để xin token mới.
5. Logout cập nhật `revoked_at`; token đã revoke không được dùng lại.

### Đăng bài

1. Tác giả tạo `posts` với trạng thái `draft`.
2. Nội dung gốc được lưu tại `post_translations`.
3. Tác giả gửi duyệt: `pending_review`.
4. Admin chuyển sang `approved` hoặc `rejected`; khi từ chối ghi `review_note`.
5. Bài đã duyệt mới được chuyển sang `published` và ghi `published_at`.

### Dịch tự động

1. Tạo bản đích trong `post_translations` với trạng thái `queued`.
2. Worker chuyển sang `processing` và gọi provider đầu tiên.
3. Mỗi lần gọi tạo một `translation_attempts`.
4. Nếu lỗi/rate limit, worker thử provider tiếp theo.
5. Thành công thì lưu nội dung, provider và chuyển trạng thái thành `completed`.

## 9. Nguyên tắc kiến trúc

- Frontend không truy cập MySQL trực tiếp; mọi dữ liệu đi qua API.
- Backend kiểm tra quyền, không dựa vào việc ẩn nút trên giao diện.
- Production dùng migration, không bật `sequelize.sync()`.
- Controller không chứa query hoặc luật nghiệp vụ.
- DTO phải validate dữ liệu đầu vào; nội dung HTML phải sanitize ở backend.
- Secret và `.env` không được commit lên Git.
- Prototype chỉ là đặc tả giao diện, không phải nguồn dữ liệu thật.
