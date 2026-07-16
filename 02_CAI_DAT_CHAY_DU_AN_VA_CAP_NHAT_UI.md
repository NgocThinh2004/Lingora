# LINGORA — CÀI ĐẶT, CHẠY DỰ ÁN VÀ CẬP NHẬT UI PROTOTYPE

## 1. Trạng thái có thể chạy

| Phần | Trạng thái |
|---|---|
| Prototype HTML | Chạy được bằng web server tĩnh |
| Database | Đã có migration và seeder MySQL |
| Backend API | Đang ở giai đoạn khung database, chưa có đầy đủ controller/service |
| Frontend Angular | Mới có cấu trúc thư mục, chưa khởi tạo Angular workspace |

Vì vậy hiện tại nhóm có thể chạy prototype và tạo database. Lệnh chạy NestJS/Angular chỉ sử dụng sau khi thành viên phụ trách hoàn thiện phần khởi tạo tương ứng.

## 2. Công cụ cần cài trên máy

1. Git.
2. Node.js phiên bản 20 trở lên, kèm npm.
3. MySQL Server 8 trở lên và MySQL Workbench nếu muốn thao tác bằng giao diện.
4. Visual Studio Code.
5. Extension khuyến nghị: ESLint, Prettier, Angular Language Service.

Kiểm tra:

```powershell
git --version
node --version
npm --version
mysql --version
```

Nếu PowerShell chặn script npm:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Chỉ thay đổi execution policy sau khi đã đọc và đồng ý cảnh báo của Windows.

## 3. Lấy mã nguồn chính

```powershell
git clone <URL_REPOSITORY_CHINH>
cd "HTML Blog"
```

Nếu đã clone:

```powershell
git switch develop
git pull origin develop
```

Không code trực tiếp trên `main` hoặc `develop`. Tạo branch từ `develop`:

```powershell
git switch develop
git pull origin develop
git switch -c feature/ten-chuc-nang
```

## 4. Chạy prototype HTML

Cách không cần cài thư viện toàn cục:

```powershell
cd "HTML Blog"
npx http-server prototype -p 5500
```

Mở `http://localhost:5500`.

Nếu repository UI được đưa vào thư mục `ui-prototype/` bằng Git subtree thì thay lệnh bằng:

```powershell
npx http-server ui-prototype -p 5500
```

Không mở file HTML bằng đường dẫn `file:///`; web server giúp đường dẫn asset và request hoạt động gần với môi trường thật hơn.

## 5. Cài và tạo database backend

### 5.1. Tạo database MySQL

Chạy bằng MySQL Workbench hoặc MySQL CLI:

```sql
CREATE DATABASE lingora_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE lingora_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'lingora_app'@'localhost'
  IDENTIFIED BY 'thay_bang_mat_khau_manh';

GRANT ALL PRIVILEGES ON lingora_dev.* TO 'lingora_app'@'localhost';
GRANT ALL PRIVILEGES ON lingora_test.* TO 'lingora_app'@'localhost';
FLUSH PRIVILEGES;
```

Không dùng tài khoản MySQL `root` trong ứng dụng.

### 5.2. Cài dependencies hiện có

```powershell
cd "D:\HTML Blog\backend"
npm install
```

`npm install` đọc `backend/package.json`, cài NestJS core, Sequelize, MySQL driver, TypeScript, dotenv và Sequelize CLI.

### 5.3. Tạo `.env`

```powershell
Copy-Item .env.example .env
```

Điền thông tin thật:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=lingora_dev
DB_TEST_NAME=lingora_test
DB_USER=lingora_app
DB_PASSWORD=thay_bang_mat_khau_manh
DB_LOGGING=false

JWT_ACCESS_SECRET=thay_bang_chuoi_ngau_nhien_dai
JWT_REFRESH_SECRET=thay_bang_chuoi_ngau_nhien_khac
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
BCRYPT_ROUNDS=12

RESET_TOKEN_TTL_MINUTES=30
RESET_PASSWORD_URL=http://localhost:4200/reset-password

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=replace_me
SMTP_PASSWORD=replace_me
MAIL_FROM=Lingora <no-reply@example.com>

UPLOAD_DIR=storage/uploads
MAX_UPLOAD_MB=5

TRANSLATION_PROVIDER=mock
TRANSLATION_API_URL=
TRANSLATION_API_KEY=
```

Sinh hai JWT secret khác nhau bằng Node.js, chạy lệnh sau hai lần:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Không commit file `.env`.

### 5.4. Tạo bảng và dữ liệu nền

```powershell
npm run db:migrate
npm run db:seed
```

Migration tạo 14 bảng. Seeder tạo role `admin`, `author`, `reader` và ngôn ngữ `vi`, `en`, `zh`.

Hoàn tác migration gần nhất:

```powershell
npm run db:migrate:undo
```

Xóa toàn bộ bảng do migration tạo trong môi trường development:

```powershell
npm run db:migrate:reset
```

Không chạy lệnh reset trên database production.

## 6. Thư viện backend cần cho toàn bộ API

Những thư viện database cơ bản đã nằm trong `package.json`. Khi bắt đầu code đầy đủ các module, cài thêm theo nhóm sau.

### Auth, JWT và validation

```powershell
npm install @nestjs/platform-express @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
npm install -D @types/passport-jwt @types/bcrypt
```

### Upload, email, bảo mật và xử lý HTML

```powershell
npm install multer nodemailer sanitize-html helmet compression
npm install -D @types/multer @types/nodemailer @types/sanitize-html @types/compression
```

### Swagger và test

```powershell
npm install @nestjs/swagger
npm install -D @nestjs/cli @nestjs/schematics @nestjs/testing jest ts-jest supertest @types/jest @types/supertest
```

Không cài package nếu feature chưa dùng. Sau mỗi lần cài phải commit cả `package.json` và lockfile, không commit `node_modules`.

## 7. Khởi tạo và chạy backend NestJS

Backend đã có database layer nên không chạy `nest new` đè lên thư mục hiện tại. Thành viên phụ trách backend tạo các file khởi động còn thiếu:

- `backend/src/main.ts`
- `backend/src/app.module.ts`
- `backend/nest-cli.json`
- `backend/tsconfig.build.json`

Sau đó bổ sung scripts:

```json
{
  "build": "nest build",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "test": "jest --runInBand",
  "test:e2e": "jest --runInBand --config test/jest-e2e.json"
}
```

Chạy development:

```powershell
cd "D:\HTML Blog\backend"
npm run start:dev
```

API dự kiến: `http://localhost:3000/api/v1`.

## 8. Khởi tạo, cài và chạy frontend Angular

Chỉ chạy lệnh khởi tạo một lần khi `frontend/` chưa có `angular.json` và `package.json`:

```powershell
cd "D:\HTML Blog"
npx @angular/cli@latest new lingora-frontend `
  --directory frontend `
  --routing `
  --style scss `
  --strict `
  --skip-git `
  --package-manager npm `
  --force
```

`--force` chỉ dùng ở lần đầu vì thư mục hiện có các file `.gitkeep`. Không dùng lại sau khi frontend đã có code thật.

Cài Bootstrap:

```powershell
cd frontend
npm install bootstrap @popperjs/core
```

Không cài thêm thư viện editor trước khi nhóm thống nhất editor sẽ dùng; tránh hai thành viên chọn hai package không tương thích.

Chạy frontend:

```powershell
npm start
```

Mở `http://localhost:4200`.

Frontend development cấu hình API tại `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};
```

## 9. Chạy toàn dự án sau khi hoàn thiện

Mở ba terminal:

Terminal 1 — MySQL:

- Bảo đảm MySQL Server đang chạy.

Terminal 2 — Backend:

```powershell
cd "D:\HTML Blog\backend"
npm run db:migrate
npm run start:dev
```

Terminal 3 — Frontend:

```powershell
cd "D:\HTML Blog\frontend"
npm start
```

Thứ tự đúng: MySQL → migration → backend → frontend.

## 10. Cập nhật `ui-prototype` khi nó là repository riêng

### Phương án khuyến nghị: Git subtree

Git subtree phù hợp khi muốn giữ UI ở repository riêng nhưng toàn bộ thành viên clone repository chính vẫn nhận được file UI mà không phải chạy thêm lệnh submodule.

Giả sử:

- URL UI: `<URL_REPOSITORY_UI>`
- Branch UI: `main`
- Thư mục trong dự án chính: `ui-prototype`

### 10.1. Thêm UI repository lần đầu

Đứng tại repository chính:

```powershell
cd "D:\HTML Blog"
git remote add ui-prototype <URL_REPOSITORY_UI>
git fetch ui-prototype
git subtree add --prefix=ui-prototype ui-prototype main --squash
git commit -m "chore: import ui prototype repository"
```

Nếu remote đã tồn tại thì không chạy lại `git remote add`; kiểm tra bằng:

```powershell
git remote -v
```

### 10.2. Kéo bản UI mới về sau này

```powershell
cd "D:\HTML Blog"
git switch develop
git pull origin develop
git fetch ui-prototype
git subtree pull --prefix=ui-prototype ui-prototype main --squash
```

Sau khi kiểm tra giao diện:

```powershell
git add ui-prototype
git commit -m "chore: update ui prototype"
git push origin develop
```

### 10.3. Đẩy thay đổi từ dự án chính ngược về repository UI

```powershell
git subtree push --prefix=ui-prototype ui-prototype main
```

Chỉ chạy khi bạn có quyền push repository UI và thay đổi đó thực sự thuộc prototype.

### 10.4. Xử lý thư mục `prototype/` đang có

Không chạy `subtree add` vào một prefix đã có file. Cách an toàn:

1. Commit toàn bộ thay đổi hiện tại.
2. Import repository riêng vào prefix mới `ui-prototype/`.
3. So sánh `prototype/` và `ui-prototype/`.
4. Chuyển các thay đổi còn thiếu về repository UI.
5. Chỉ xóa `prototype/` bằng một commit riêng sau khi cả nhóm xác nhận.

Không nên xóa ngay `prototype/` trước khi chắc chắn mọi thay đổi đã có trên repository UI.

### Phương án thay thế: Git submodule

```powershell
git submodule add <URL_REPOSITORY_UI> ui-prototype
git submodule update --init --recursive
```

Khi clone repository chính, thành viên phải dùng:

```powershell
git clone --recurse-submodules <URL_REPOSITORY_CHINH>
```

Submodule giữ hai lịch sử tách biệt rõ hơn nhưng dễ gây lỗi cho người mới vì repository chính chỉ lưu con trỏ commit. Với nhóm ba người và mục tiêu chạy thuận tiện, subtree dễ sử dụng hơn.

## 11. Build và kiểm tra

Backend:

```powershell
cd "D:\HTML Blog\backend"
npm run build
npm test
npm run test:e2e
```

Frontend:

```powershell
cd "D:\HTML Blog\frontend"
npm run build
npm test
```

Không merge nếu build lỗi, migration không chạy hoặc test luồng chính thất bại.

## 12. Lỗi thường gặp

- `node is not recognized`: cài Node.js rồi mở terminal mới.
- PowerShell chặn npm: kiểm tra execution policy ở mục 2.
- MySQL `Access denied`: kiểm tra user, password, host và quyền trên database.
- Migration không tạo bảng: kiểm tra `.env`, `.sequelizerc` và MySQL đang chạy.
- Frontend nhận CORS: backend phải cho phép đúng origin `http://localhost:4200`.
- Local và deploy khác dữ liệu: prototype dùng `localStorage`; ứng dụng thật phải gọi chung API/MySQL.
- `prefix already exists` khi subtree: dùng prefix mới hoặc xử lý thư mục cũ theo mục 10.4.

## 13. Tài liệu chính thức

- Angular local setup: https://angular.dev/tools/cli/setup-local
- NestJS first steps: https://docs.nestjs.com/first-steps
- NestJS CLI: https://docs.nestjs.com/cli/overview
- Sequelize migrations: https://sequelize.org/docs/v6/other-topics/migrations/
