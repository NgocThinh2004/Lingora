# Lingora

Lingora là nền tảng blog đa ngôn ngữ dành cho độc giả, tác giả và quản trị viên. Hệ thống hỗ trợ xuất bản và kiểm duyệt bài viết, bản dịch nội dung, bình luận, lượt thích, theo dõi tác giả, tìm kiếm và quản lý ngôn ngữ.

## 1. Chức năng chính

### Độc giả

- Đọc và tìm kiếm bài viết theo ngôn ngữ, danh mục và tác giả.
- Thích bài viết, bình luận và theo dõi tác giả.
- Xem hồ sơ công khai và bảng tin từ các tác giả đang theo dõi.
- Chọn ngôn ngữ giao diện, chế độ sáng/tối và tùy chọn đọc.

### Tác giả

- Tạo, lưu nháp, chỉnh sửa và xem trước bài viết.
- Chọn ngôn ngữ nguồn và các ngôn ngữ cần dịch cho từng bài.
- Gửi bài cho quản trị viên duyệt và theo dõi trạng thái bài/bản dịch.
- Quản lý bài đã xuất bản, bị từ chối, lưu trữ hoặc trong thùng rác.

### Quản trị viên

- Quản lý người dùng, vai trò và trạng thái tài khoản.
- Duyệt hoặc từ chối bài viết.
- Quản lý danh mục và bản dịch danh mục.
- Quản lý các ngôn ngữ đang hoạt động và ngôn ngữ mặc định.
- Theo dõi số liệu tổng quan trên dashboard.

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Angular 18, TypeScript, SCSS, Bootstrap 5 |
| Backend | NestJS 11, TypeScript, REST API |
| Database | MySQL 8+, Sequelize và `sequelize-typescript` |
| Xác thực | JWT access token, refresh token, phân quyền theo vai trò |
| Upload | Multer, lưu avatar và ảnh nội dung trong `backend/storage/uploads` |
| Dịch nội dung | Provider có thứ tự dự phòng: DeepL, Azure, Google Cloud, Google Free và LibreTranslate |
| Kiểm thử | Jasmine/Karma cho frontend, Jest/Supertest cho backend |

## 3. Cấu trúc dự án

```text
Lingora/
├─ frontend/
│  ├─ public/locales/             # JSON ngôn ngữ giao diện được quản lý thủ công
│  ├─ src/app/core/               # Auth, HTTP, locale, notification và theme
│  ├─ src/app/shared/             # Layout, pipe, directive và component dùng chung
│  ├─ src/app/features/           # Các chức năng Angular
│  └─ src/environments/           # API URL development/production
├─ backend/
│  ├─ src/common/                 # Guard, decorator, filter và interceptor dùng chung
│  ├─ src/config/                 # Cấu hình ứng dụng/database
│  ├─ src/database/               # Migration, seeder và model dùng chung
│  ├─ src/modules/                # Các module nghiệp vụ NestJS
│  ├─ storage/uploads/            # File upload runtime, không commit lên Git
│  └─ database-schema.dbml        # Sơ đồ database
├─ prototype/                     # Giao diện HTML cũ dùng để tham khảo
└─ README.md
```

Các module backend chính gồm `auth`, `users`, `languages`, `categories`, `posts`, `translations`, `comments`, `likes`, `subscriptions`, `search`, `uploads` và `dashboard`.

## 4. Yêu cầu môi trường

- Git.
- Node.js 20 trở lên và npm.
- MySQL Server 8 trở lên.
- Chrome/Chromium nếu chạy frontend unit test.

## 5. Cài đặt lần đầu

### 5.1. Lấy mã nguồn

```bash
git clone <repository-url>
cd Lingora
git switch develop
```

### 5.2. Tạo database

Chạy bằng tài khoản MySQL có quyền quản trị và thay mật khẩu mẫu:

```sql
CREATE DATABASE lingora_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE lingora_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lingora_app'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON lingora_dev.* TO 'lingora_app'@'localhost';
GRANT ALL PRIVILEGES ON lingora_test.* TO 'lingora_app'@'localhost';
FLUSH PRIVILEGES;
```

### 5.3. Cấu hình backend

Windows PowerShell:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

Cập nhật tối thiểu các biến sau trong `backend/.env`:

```dotenv
DB_NAME=lingora_dev
DB_TEST_NAME=lingora_test
DB_USER=lingora_app
DB_PASSWORD=your_secure_password
JWT_ACCESS_SECRET=replace_with_a_long_random_value
JWT_REFRESH_SECRET=replace_with_another_long_random_value
FRONTEND_URL=http://localhost:4200
```

Không commit `.env`, mật khẩu, JWT secret hoặc API key lên Git.

### 5.4. Cài thư viện và khởi tạo dữ liệu

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
```

Mở terminal khác:

```bash
cd frontend
npm install
```

## 6. Chạy môi trường phát triển

Terminal backend:

```bash
cd backend
npm run start:dev
```

Backend mặc định chạy tại `http://localhost:3000/api/v1`.

Terminal frontend:

```bash
cd frontend
npm start
```

Frontend chạy tại `http://localhost:4200` và gọi backend theo cấu hình trong `frontend/src/environments/environment.development.ts`.

## 7. Các lệnh thường dùng

### Backend

```bash
npm run start:dev       # Chạy và tự tải lại khi code thay đổi
npm run build           # Build NestJS vào backend/dist
npm run start:prod      # Chạy bản đã build
npm test                # Chạy unit test
npm run test:e2e        # Chạy end-to-end API test
npm run db:migrate      # Chạy migration mới
npm run db:migrate:undo # Hoàn tác migration gần nhất
npm run db:seed         # Thêm dữ liệu mẫu
```

### Frontend

```bash
npm start               # Chạy Angular development server
npm run typecheck       # Kiểm tra kiểu dữ liệu TypeScript
npm test                # Chạy Karma ở chế độ tương tác
npm run test:ci         # Chạy toàn bộ test một lần bằng Chrome Headless
npm run build           # Build production
```

Kết quả build frontend nằm tại `frontend/dist/lingora-frontend/browser`.

## 8. Kiến trúc đa ngôn ngữ

Lingora tách riêng ba loại dữ liệu ngôn ngữ:

1. Text giao diện tĩnh được lưu trong JSON frontend.
2. Bản dịch danh mục được nhập thủ công và lưu trong database.
3. Nội dung bài viết/bình luận sử dụng dữ liệu dịch nghiệp vụ và các translation provider riêng.

### 8.1. Ngôn ngữ giao diện

Các file giao diện nằm tại:

```text
frontend/public/locales/en.json
frontend/public/locales/vi.json
frontend/public/locales/zh.json
```

Backend không tạo, lưu hoặc tự động dịch các file này. Frontend tải file tương ứng từ `/locales/{languageCode}.json`.

Quy trình thêm một ngôn ngữ mới, ví dụ tiếng Nhật:

1. Sao chép `frontend/public/locales/en.json` thành `frontend/public/locales/ja.json`.
2. Dịch thủ công toàn bộ value; giữ nguyên key và placeholder như `{name}`, `{status}`, `{code}`.
3. Chạy frontend và kiểm tra `http://localhost:4200/locales/ja.json` trả về JSON hợp lệ.
4. Đảm bảo file `/locales/ja.json` tồn tại trong phiên bản frontend đang chạy.
5. Vào trang quản trị và thêm ngôn ngữ với mã `ja`.

Trang quản trị kiểm tra file JSON trước khi gửi yêu cầu tạo ngôn ngữ. Nếu file chưa tồn tại, backend không nhận yêu cầu và database không tạo bản ghi mới.

### 8.2. Danh mục

- Khi thêm ngôn ngữ mới, danh mục cũ hiển thị thêm trường của ngôn ngữ đó nhưng để trống và không bắt buộc.
- Quản trị viên có thể bổ sung bản dịch cho từng danh mục cũ khi cần.
- Khi tạo danh mục mới, phải nhập đủ tất cả ngôn ngữ đang hoạt động.
- Danh mục không gọi API dịch tự động.

### 8.3. Ngôn ngữ mặc định

Ngôn ngữ mặc định được dùng khi người dùng chưa có lựa chọn đã lưu hoặc lựa chọn cũ không còn hoạt động. Nó cũng là bản dịch dự phòng cho một số dữ liệu quản trị. Thay đổi mặc định không ghi đè lựa chọn ngôn ngữ đã lưu trong trình duyệt của từng người dùng.

### 8.4. Dịch bài viết và bình luận

Các provider được cấu hình trong `backend/.env` bằng `TRANSLATION_PROVIDER_ORDER`. API key của DeepL, Azure và Google Cloud là tùy chọn; Google Free có thể hoạt động không cần key khi `GOOGLE_FREE_ENABLED=true`, nhưng chịu giới hạn và không nên được coi là cam kết ổn định cho production.

Text giao diện và danh mục không sử dụng các provider này.

## 9. Luồng bài viết

```text
draft → pending_review → approved/published → archived
                   └──→ rejected → pending_review
archived → draft
```

- Tác giả có thể chỉnh sửa bài ở trạng thái `draft`, `pending_review` hoặc `rejected` theo luật hiện tại.
- Quản trị viên duyệt bài sẽ đưa bài vào trạng thái công khai; từ chối phải lưu lý do.
- Chỉ bài công khai và chưa bị xóa mềm xuất hiện ở feed/search.
- Bản dịch của bài được quản lý độc lập theo từng ngôn ngữ đã chọn.

## 10. Nguyên tắc phát triển

- Frontend không truy cập database trực tiếp; mọi dữ liệu nghiệp vụ đi qua REST API.
- Backend luôn kiểm tra quyền, không dựa vào việc ẩn nút trên giao diện.
- Production sử dụng migration; không dùng `sequelize.sync()` để thay schema.
- Migration đã dùng chung không được sửa; thay đổi schema phải tạo migration mới.
- DTO phải validate input và backend phải sanitize HTML trước khi lưu.
- Không commit `node_modules`, `dist`, `.env`, secret, API key hoặc file upload runtime.
- Mỗi thay đổi phải chạy typecheck/test/build phù hợp trước khi tạo Pull Request.

## 11. Git workflow

Tạo nhánh theo chức năng từ `develop`:

```bash
git switch develop
git pull origin develop
git switch -c feature/ten-chuc-nang
```

Trước khi commit:

```bash
cd frontend
npm run typecheck
npm run test:ci
npm run build
```

Nếu thay backend:

```bash
cd backend
npm test
npm run build
```

Sau đó commit, push và tạo Pull Request vào `develop`:

```bash
git add .
git commit -m "type(scope): short description"
git push -u origin feature/ten-chuc-nang
```

Các prefix commit thường dùng: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.

## 12. Xử lý lỗi thường gặp

### Không kết nối được MySQL

Kiểm tra MySQL đang chạy và các biến `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` trong `backend/.env`.

### Migration báo `Access denied`

Tài khoản database chưa đúng mật khẩu hoặc chưa được cấp quyền cho `lingora_dev`/`lingora_test`.

### Frontend không gọi được backend

Kiểm tra backend đang chạy ở cổng `3000`, `environment.development.ts` trỏ đúng API và `FRONTEND_URL` chứa `http://localhost:4200`.

### Ngôn ngữ mới không được tạo

Mở trực tiếp `http://localhost:4200/locales/{code}.json`. Nếu nhận `404`, hãy tạo file JSON trong `frontend/public/locales` và khởi động lại development server nếu cần.

### Test frontend không mở được Chrome

Cài Chrome/Chromium và chạy `npm run test:ci`; cấu hình `ChromeHeadlessCI` đã tắt GPU và sandbox dành cho môi trường CI.
