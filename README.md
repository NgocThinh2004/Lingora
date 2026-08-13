# Lingora

Lingora là nền tảng blog đa ngôn ngữ dành cho độc giả, tác giả và quản trị viên. Hệ thống hỗ trợ xuất bản và kiểm duyệt bài viết, dịch nội dung, bình luận, lượt thích, theo dõi tác giả, tìm kiếm và quản lý ngôn ngữ.

## Chức năng chính

- Độc giả có thể khám phá bài viết theo ngôn ngữ, danh mục và tác giả; tương tác bằng bình luận, lượt thích và theo dõi.
- Tác giả có không gian soạn thảo, lưu nháp, gửi duyệt, quản lý vòng đời bài viết và chọn các ngôn ngữ đích.
- Quản trị viên quản lý người dùng, ngôn ngữ, danh mục, kiểm duyệt bài viết và theo dõi số liệu tổng quan.
- Nội dung bài viết và bình luận có thể được dịch; giao diện sử dụng các gói locale JSON độc lập ở frontend.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Angular 18, TypeScript, SCSS, Bootstrap 5 |
| Backend | NestJS 11, TypeScript, REST API |
| Database | MySQL 8+, Sequelize, `sequelize-typescript` |
| Cache | Redis (chống ghi nhận trùng lượt view) |
| Lưu trữ media | Cloudflare R2 (ảnh, audio và video tải lên) |
| Xác thực | JWT access token, refresh token, phân quyền theo vai trò |
| Kiểm thử | Jasmine/Karma, Jest/Supertest |

## Cấu trúc dự án

```text
Lingora/
├─ frontend/        # Ứng dụng Angular
├─ backend/         # REST API NestJS, migration và seeder
├─ docs/            # Tài liệu kỹ thuật
├─ docker-compose.yml
├─ .env.example     # Mẫu cấu hình cho Docker production
└─ README.md
```

## Tài liệu

- [Tài liệu API](docs/API.md)
- [Thiết kế kiến trúc](docs/ARCHITECTURE.md)
- [Triển khai bằng Docker](docs/DOCKER_DEPLOYMENT.md)
- [Sơ đồ cơ sở dữ liệu](backend/database-schema.dbml)

## Yêu cầu môi trường

- Node.js 20 trở lên và npm.
- MySQL Server 8 trở lên.
- Redis 7 trở lên.
- Chrome hoặc Chromium nếu chạy frontend unit test.

## Cài đặt môi trường phát triển

Sao chép repository và cài đặt dependency cho hai ứng dụng:

```bash
git clone <repository-url>
cd Lingora

cd backend
npm install

cd ../frontend
npm install
```

Tạo database MySQL cho môi trường phát triển và kiểm thử:

```sql
CREATE DATABASE lingora_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE lingora_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lingora_app'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON lingora_dev.* TO 'lingora_app'@'localhost';
GRANT ALL PRIVILEGES ON lingora_test.* TO 'lingora_app'@'localhost';
FLUSH PRIVILEGES;
```

Sao chép file cấu hình mẫu:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Trên macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

Cập nhật thông tin database, JWT secret và các dịch vụ cần dùng trong `backend/.env`, sau đó khởi tạo dữ liệu:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

Không commit `.env`, mật khẩu, JWT secret hoặc API key lên Git. `backend/.env` được sử dụng khi chạy NestJS trực tiếp trong môi trường phát triển; Docker Compose đọc `.env` tại thư mục gốc repository. Quy trình cấu hình production được trình bày trong [hướng dẫn triển khai](docs/DOCKER_DEPLOYMENT.md).

## Khởi chạy môi trường phát triển

Chạy backend:

```bash
cd backend
npm run start:dev
```

API mặc định có địa chỉ `http://localhost:3000/api/v1`.

Chạy frontend trong terminal khác:

```bash
cd frontend
npm start
```

Ứng dụng web mặc định có địa chỉ `http://localhost:4200`.

## Lưu trữ media

Media tải lên được lưu trên Cloudflare R2 và được ghi nhận ở trạng thái `temporary`. Khi avatar hoặc bài viết được lưu, media liên quan chuyển sang trạng thái `attached`. Worker dọn dẹp xóa media tạm không được sử dụng sau thời hạn `TEMP_MEDIA_TTL_HOURS`, mặc định là 24 giờ.

## Kiểm tra chất lượng

Backend:

```bash
cd backend
npm test
npm run test:e2e
npm run build
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run test:ci
npm run build
```

## Quy ước phát triển

- Mọi thay đổi schema phải đi qua migration; không bật `sequelize.sync()` trong production.
- Backend chịu trách nhiệm kiểm tra dữ liệu đầu vào, quyền truy cập và làm sạch nội dung.
- Không commit `node_modules`, `dist`, `.env`, khóa truy cập R2 hoặc thông tin bí mật.
- Chạy các bài kiểm tra và build liên quan trước khi tạo Pull Request.
