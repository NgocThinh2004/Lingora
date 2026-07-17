# LINGORA — HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN CHO THÀNH VIÊN MỚI

Tài liệu này hướng dẫn các bước cài đặt để chạy dự án trên máy cá nhân. Mọi mã nguồn khởi tạo (NestJS và Angular) đã được cấu hình sẵn trên Git, thành viên mới chỉ cần kéo về và chạy theo các bước sau.

## 1. Yêu cầu Công cụ
- **Git**
- **Node.js** (từ bản 20 trở lên)
- **MySQL Server** (từ bản 8 trở lên) & **MySQL Workbench**

## 2. Kéo mã nguồn về máy
Mở Terminal (hoặc Git Bash) và chạy lệnh:
```bash
git clone <URL_REPOSITORY_CHINH>
cd "HTML Blog"
git switch develop
```

## 3. Thiết lập Cơ sở dữ liệu (Database)

**Bước 3.1: Tạo Database trên MySQL**
Mở MySQL Workbench và chạy đoạn script SQL sau (hãy tự thay mật khẩu ở phần `IDENTIFIED BY`):
```sql
CREATE DATABASE lingora_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE lingora_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lingora_app'@'localhost' IDENTIFIED BY 'mat_khau_cua_ban_o_day';
GRANT ALL PRIVILEGES ON lingora_dev.* TO 'lingora_app'@'localhost';
GRANT ALL PRIVILEGES ON lingora_test.* TO 'lingora_app'@'localhost';
FLUSH PRIVILEGES;
```

**Bước 3.2: Thiết lập file cấu hình môi trường (.env)**
Mở Terminal, đi vào thư mục `backend` và copy file cấu hình mẫu:
```bash
cd backend
cp .env.example .env
```
Mở file `.env` vừa được tạo ra bằng VS Code, tìm dòng `DB_PASSWORD` và điền chính xác mật khẩu mà bạn đã thiết lập ở bước 3.1.

## 4. Tải Thư viện & Bơm dữ liệu mẫu

**Thiết lập thư mục Backend:**
Vẫn đứng tại thư mục `backend`, chạy lần lượt các lệnh sau:
```bash
npm install
npm run db:migrate
npm run db:seed
```
*(Các lệnh trên sẽ tải thư viện API, tự động tạo các bảng và bơm dữ liệu quyền/ngôn ngữ mặc định vào Database)*

**Thiết lập thư mục Frontend:**
Mở thêm một cửa sổ Terminal khác, di chuyển vào thư mục `frontend` và chạy:
```bash
cd frontend
npm install
```

## 5. Khởi chạy toàn bộ dự án
Để làm việc, bạn cần duy trì **2 cửa sổ Terminal chạy song song**:

**Terminal 1 (Chạy Backend):**
```bash
cd backend
npm run start:dev
```
*(Chờ tới khi hiện thông báo: `Nest application successfully started`)*

**Terminal 2 (Chạy Frontend):**
```bash
cd frontend
npm start
```
*(Chờ ứng dụng Angular biên dịch xong, sau đó mở trình duyệt và truy cập: `http://localhost:4200`)*

---
**Các lỗi phổ biến có thể gặp:**
- **Lỗi `Access denied` khi chạy lệnh db:migrate:** Do bạn gõ sai mật khẩu MySQL trong file `.env`. Hãy sửa lại cho đúng.
- **Lỗi báo đỏ ở file `tsconfig.json`:** Đây là lỗi ảo của VS Code khi chưa nạp xong thư viện. Hãy bấm `Ctrl + Shift + P` -> gõ `Restart TS server` -> chọn mục đầu tiên để sửa.
