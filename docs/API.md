# Tài liệu API Lingora

Tài liệu này mô tả REST API đang được triển khai trong `backend/src`. Danh sách endpoint được đối chiếu từ các NestJS controller và DTO tại thời điểm cập nhật tài liệu.

## 1. Quy ước chung

### Base URL

```text
http://localhost:3000/api/v1
```

Tiền tố `/api/v1` được cấu hình bằng biến `API_PREFIX`. File upload được phục vụ trực tiếp qua `/uploads/{fileName}`, không nằm dưới tiền tố API.

### Xác thực và phân quyền

Các endpoint được ký hiệu theo bốn mức truy cập:

| Ký hiệu | Ý nghĩa |
|---|---|
| Công khai | Không yêu cầu token |
| JWT tùy chọn | Không bắt buộc token; nếu có token hợp lệ, phản hồi có thể chứa trạng thái cá nhân hóa |
| JWT | Yêu cầu access token hợp lệ |
| Admin | Yêu cầu access token và vai trò `admin` |

Gửi access token trong header:

```http
Authorization: Bearer <access-token>
```

Access token hết hạn có thể được cấp lại bằng `POST /auth/refresh`. Refresh token được gửi trong request body và được xoay vòng khi làm mới phiên.

### Định dạng phản hồi

Phản hồi thành công sử dụng trường `data` và có thể có `meta`:

```json
{
  "data": {
    "id": "123",
    "title": "Example"
  }
}
```

Danh sách phân trang có metadata do từng module cung cấp. Dạng thường gặp:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Một số feed trả `items` và metadata bên trong `data`:

```json
{
  "data": {
    "items": [],
    "meta": {}
  }
}
```

Phản hồi lỗi có cấu trúc:

```json
{
  "data": null,
  "meta": {
    "error": {
      "statusCode": 400,
      "message": "Validation failed",
      "details": []
    }
  }
}
```

Backend loại bỏ các thuộc tính không khai báo trong DTO, chuyển đổi kiểu dữ liệu phù hợp và áp dụng giới hạn mặc định 60 request/phút.

## 2. Xác thực và hồ sơ hiện tại

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `POST` | `/auth/register` | Công khai | `RegisterDto` | Đăng ký tài khoản |
| `POST` | `/auth/login` | Công khai | `LoginDto` | Đăng nhập và tạo phiên |
| `POST` | `/auth/refresh` | Công khai | `RefreshTokenDto` | Đổi refresh token lấy cặp token mới |
| `POST` | `/auth/logout` | Công khai | `RefreshTokenDto` | Thu hồi một refresh token |
| `POST` | `/auth/forgot-password` | Công khai | `{ email }` | Gửi OTP đặt lại mật khẩu |
| `POST` | `/auth/reset-password` | Công khai | `ResetPasswordDto` | Đặt mật khẩu mới bằng OTP |
| `POST` | `/auth/change-password` | JWT | `ChangePasswordDto` | Đổi mật khẩu tài khoản hiện tại |
| `POST` | `/auth/logout-all` | JWT | Không có | Thu hồi mọi phiên của người dùng |
| `GET` | `/auth/me` | JWT | Không có | Lấy hồ sơ và thông tin phiên hiện tại |
| `PATCH` | `/auth/me` | JWT | `UpdateProfileDto` | Cập nhật hồ sơ cá nhân |

Các body chính:

```ts
type RegisterDto = {
  fullName: string;       // tối thiểu 2 ký tự
  email: string;
  password: string;       // tối thiểu 8 ký tự
};

type LoginDto = {
  emailOrUsername: string;
  password: string;
};

type RefreshTokenDto = {
  refreshToken: string;
};

type ResetPasswordDto = {
  email: string;
  otp: string;            // đúng 6 chữ số
  newPassword: string;    // tối thiểu 8 ký tự
};

type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
};

type UpdateProfileDto = {
  displayName?: string;
  username?: string;      // 3-30 chữ, số hoặc dấu gạch dưới
  bio?: string;
  avatarUrl?: string;     // đường dẫn /uploads/...
  accentColor?: string;   // màu hex 6 chữ số
  backgroundColor?: string;
};
```

## 3. Người dùng và theo dõi

### Hồ sơ công khai

| Method | Endpoint | Truy cập | Query | Mục đích |
|---|---|---|---|---|
| `GET` | `/users/recommended` | JWT tùy chọn | `q`, `page`, `limit` | Danh sách tác giả đề xuất |
| `GET` | `/users/:id/followers` | Công khai | Không có | Người đang theo dõi tài khoản |
| `GET` | `/users/:id/following` | Công khai | Không có | Tài khoản được người dùng theo dõi |
| `GET` | `/users/:id` | JWT tùy chọn | Không có | Hồ sơ công khai; có trạng thái theo dõi nếu đã đăng nhập |

### Subscription của người dùng hiện tại

| Method | Endpoint | Truy cập | Query | Mục đích |
|---|---|---|---|---|
| `GET` | `/subscriptions/followers` | JWT | Không có | Danh sách người theo dõi mình |
| `GET` | `/subscriptions/following` | JWT | `q`, `page`, `limit` | Danh sách mình đang theo dõi |
| `GET` | `/subscriptions/feed` | JWT | `author`, `lang`, `page`, `limit` | Feed từ các tác giả đang theo dõi |
| `POST` | `/subscriptions/:authorId` | JWT | Không có | Theo dõi tác giả |
| `DELETE` | `/subscriptions/:authorId` | JWT | Không có | Bỏ theo dõi tác giả |

### Quản trị người dùng

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `GET` | `/admin/users` | Admin | `search`, `role`, `status`, `page`, `limit` | Danh sách người dùng |
| `GET` | `/admin/users/:id` | Admin | Không có | Chi tiết người dùng |
| `PATCH` | `/admin/users/:id` | Admin | `UpdateAdminUserDto` | Cập nhật hồ sơ, vai trò hoặc trạng thái |

`role` nhận `admin` hoặc `member`. `status` nhận `active`, `inactive` hoặc `banned`.

```ts
type UpdateAdminUserDto = {
  displayName?: string;
  bio?: string;
  role?: 'admin' | 'member';
  status?: 'active' | 'inactive' | 'banned';
};
```

## 4. Ngôn ngữ

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `GET` | `/languages` | Công khai | Không có | Danh sách ngôn ngữ đang hoạt động |
| `GET` | `/admin/languages` | Admin | `page`, `limit` | Danh sách quản trị kèm tỷ lệ dịch |
| `GET` | `/admin/languages/:id` | Admin | Không có | Chi tiết một ngôn ngữ |
| `POST` | `/admin/languages` | Admin | `CreateAdminLanguageDto` | Tạo ngôn ngữ |
| `PATCH` | `/admin/languages/:id` | Admin | `UpdateAdminLanguageDto` | Cập nhật ngôn ngữ |

```ts
type CreateAdminLanguageDto = {
  code: string;           // ví dụ en, vi, zh, pt-br
  name: string;
  nativeName: string;
  flagCode?: string;      // mã quốc gia 2 ký tự
  isDefault?: boolean;
  isActive?: boolean;
};

type UpdateAdminLanguageDto = Partial<
  Omit<CreateAdminLanguageDto, 'code'>
>;
```

Mỗi ngôn ngữ trả về ở trang quản trị có thể chứa `translationCoverage` gồm `translatedPosts`, `totalPosts`, `percent` và `available`.

## 5. Danh mục

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `GET` | `/categories` | Công khai | `q`, `lang`, `limit` | Danh mục đang hoạt động; cache 5 phút |
| `GET` | `/categories/:slug` | Công khai | Không có | Chi tiết danh mục theo slug; cache 5 phút |
| `GET` | `/admin/categories` | Admin | Bộ lọc bên dưới | Danh sách quản trị |
| `GET` | `/admin/categories/:id` | Admin | Không có | Chi tiết danh mục |
| `GET` | `/admin/categories/:id/posts` | Admin | `language` | Bài viết thuộc danh mục |
| `POST` | `/admin/categories` | Admin | `CreateAdminCategoryDto` | Tạo danh mục và các bản dịch |
| `PATCH` | `/admin/categories/:id` | Admin | `UpdateAdminCategoryDto` | Cập nhật danh mục |
| `DELETE` | `/admin/categories/:id` | Admin | Không có | Xóa danh mục; thành công trả `204` |

Bộ lọc quản trị gồm:

- `search`: chuỗi tìm kiếm.
- `status`: `all`, `active`, `inactive`.
- `postFilter`: `all`, `with-posts`, `without-posts`.
- `sort`: `newest`, `oldest`, `name`, `posts`.
- `page` và `limit`; `limit` tối đa 100.

```ts
type CategoryTranslationInput = {
  languageId: number;
  name: string;
  slug?: string;
};

type CreateAdminCategoryDto = {
  slug?: string;
  isActive?: boolean;
  translations: CategoryTranslationInput[];
};

type UpdateAdminCategoryDto = {
  slug?: string;
  isActive?: boolean;
  translations?: CategoryTranslationInput[];
};
```

## 6. Bài viết

### Bài viết công khai

| Method | Endpoint | Truy cập | Query | Mục đích |
|---|---|---|---|---|
| `GET` | `/posts/options` | Công khai | Không có | Ngôn ngữ và danh mục dùng trong form bài viết |
| `GET` | `/posts` | JWT tùy chọn | `lang`, `category`, `q`, `sort`, `authorId`, `page`, `limit` | Feed bài viết công khai |
| `GET` | `/posts/:id/related` | JWT tùy chọn | `lang` | Bài viết liên quan |
| `GET` | `/posts/:id` | JWT tùy chọn | `lang` | Chi tiết bài viết và trạng thái tương tác |

### Không gian tác giả

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `POST` | `/author/posts` | JWT | `CreateAuthorPostDto` | Tạo bài nháp |
| `GET` | `/author/posts` | JWT | Bộ lọc bên dưới | Danh sách bài của tác giả |
| `GET` | `/author/posts/options/filters` | JWT | Không có | Tùy chọn cho bộ lọc workspace |
| `GET` | `/author/posts/:id` | JWT | `trash=true` nếu cần | Lấy bài để chỉnh sửa |
| `PATCH` | `/author/posts/:id` | JWT | `UpdateAuthorPostDto` | Cập nhật bài |
| `POST` | `/author/posts/:id/submit` | JWT | Không có | Gửi bài để duyệt |
| `POST` | `/author/posts/:id/archive` | JWT | Không có | Lưu trữ bài |
| `POST` | `/author/posts/:id/restore` | JWT | Không có | Khôi phục bài lưu trữ về nháp |
| `POST` | `/author/posts/:id/trash` | JWT | Không có | Đưa bài vào thùng rác |
| `POST` | `/author/posts/:id/restore-trash` | JWT | Không có | Khôi phục bài từ thùng rác |
| `DELETE` | `/author/posts/:id` | JWT | Không có | Xóa vĩnh viễn bài trong phạm vi được phép |
| `GET` | `/author/posts/:id/preview` | JWT | `trash=true` nếu cần | Xem trước bài của tác giả |

Bộ lọc danh sách tác giả gồm `status`, `search`, `trash`, `categoryId`, `originalLanguageId`, `updatedMonth` theo dạng `YYYY-MM`, `page` và `limit`. `status` có thể là `all`, `public` hoặc một trạng thái bài viết.

```ts
type CreateAuthorPostDto = {
  title: string;
  categoryId?: number;
  originalLanguageId: number;
  targetLanguageIds?: number[];
  content: string;
};

type UpdateAuthorPostDto = {
  title?: string;
  categoryId?: number | null;
  originalLanguageId?: number;
  targetLanguageIds?: number[];
  content?: string;
};
```

### Kiểm duyệt bài viết

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `GET` | `/admin/posts` | Admin | `search`, `status`, `categoryId`, `language`, `page`, `limit` | Danh sách chờ duyệt và lịch sử |
| `GET` | `/admin/posts/:id` | Admin | `language` | Chi tiết bài để kiểm duyệt |
| `PATCH` | `/admin/posts/:id/review` | Admin | `ReviewAdminPostDto`; query `language` | Duyệt hoặc từ chối bài/bản dịch |

```ts
type ReviewAdminPostDto = {
  decision: 'approve' | 'reject';
  note?: string; // bắt buộc khi reject
};
```

## 7. Bình luận và lượt thích

| Method | Endpoint | Truy cập | Body/query | Mục đích |
|---|---|---|---|---|
| `POST` | `/posts/:postId/comments` | JWT | `CreateCommentDto` | Tạo bình luận hoặc trả lời |
| `GET` | `/posts/:postId/comments` | JWT tùy chọn | `page`, `limit` | Danh sách bình luận |
| `PUT` | `/posts/:postId/comments/:commentId` | JWT | `{ content }` | Sửa bình luận của mình |
| `DELETE` | `/posts/:postId/comments/:commentId` | JWT | Không có | Xóa bình luận; admin có thể xóa theo quyền |
| `POST` | `/posts/:postId/comments/:commentId/translate` | Công khai | `{ languageCode }` | Dịch bình luận sang ngôn ngữ đích |
| `POST` | `/posts/:postId/like` | JWT | Không có | Bật/tắt thích bài viết |
| `POST` | `/posts/:postId/comments/:commentId/like` | JWT | Không có | Bật/tắt thích bình luận |

```ts
type CreateCommentDto = {
  content: string;              // tối đa 1000 ký tự
  reply_to_comment_id?: string;
  languageCode?: string;
};
```

## 8. Tìm kiếm

| Method | Endpoint | Truy cập | Query | Mục đích |
|---|---|---|---|---|
| `GET` | `/search` | JWT tùy chọn | `q` | Tìm kiếm tổng hợp bài viết, tác giả và dữ liệu liên quan |

## 9. Dịch bài viết

Tất cả endpoint trong nhóm này yêu cầu JWT. Người dùng chỉ truy cập được bài do mình sở hữu, trừ quản trị viên.

| Method | Endpoint | Truy cập | Body/path | Mục đích |
|---|---|---|---|---|
| `GET` | `/translations/posts/:postId/matrix` | JWT | `postId` | Ma trận trạng thái bản dịch của bài |
| `GET` | `/translations/posts/:postId/preview/:languageId` | JWT | `postId`, `languageId` | Bản dịch đã lưu cho một ngôn ngữ |
| `POST` | `/translations/preview` | JWT | `PreviewTranslationDto` | Dịch thử, không xếp hàng |
| `POST` | `/translations/queue` | JWT | `QueueTranslationDto` | Xếp các ngôn ngữ đích vào hàng đợi |
| `GET` | `/translations/:id/attempts` | JWT | ID bản dịch | Lịch sử lần thử provider |
| `POST` | `/translations/retry` | JWT | `RetryTranslationDto` | Xếp lại một bản dịch thất bại |
| `POST` | `/translations/worker/run-once` | Admin | Không có | Chạy thủ công một chu kỳ worker |
| `GET` | `/translations/metrics` | Admin | Không có | Tổng số bản dịch theo trạng thái |

```ts
type PreviewTranslationDto = {
  title: string;
  content: string;
  sourceLanguageId: number;
  targetLanguageId: number;
};

type QueueTranslationDto = {
  postId: string;
  targetLanguageIds: number[];
};

type RetryTranslationDto = {
  postTranslationId: string;
};
```

Trạng thái bản dịch gồm `not_started`, `queued`, `processing`, `completed` và `failed`. Worker thử provider theo `TRANSLATION_PROVIDER_ORDER` cho đến khi thành công hoặc hết provider.

## 10. Upload nội dung

Các endpoint nhận `multipart/form-data`, yêu cầu JWT và chỉ sử dụng file đầu tiên trong request.

| Method | Endpoint | Truy cập | Loại file | Giới hạn |
|---|---|---|---|---|
| `POST` | `/uploads/editor-image` | JWT | JPEG, PNG, WebP, GIF | 5 MB |
| `POST` | `/uploads/editor-audio` | JWT | AAC, MP3/MPEG, MP4 audio, OGG, WAV, WebM | 25 MB |
| `POST` | `/uploads/editor-video` | JWT | MP4, OGG, QuickTime, WebM | 100 MB |
| `POST` | `/uploads/editor-media` | JWT | Ảnh, âm thanh hoặc video hợp lệ | Theo giới hạn từng loại, tối đa 100 MB |

Ví dụ:

```bash
curl -X POST http://localhost:3000/api/v1/uploads/editor-image \
  -H "Authorization: Bearer <access-token>" \
  -F "image=@cover.png"
```

Phản hồi upload chứa đường dẫn công khai dạng `/uploads/{generated-file-name}`.

## 11. Dashboard quản trị

| Method | Endpoint | Truy cập | Query | Mục đích |
|---|---|---|---|---|
| `GET` | `/admin/dashboard` | Admin | `lang` | Số liệu tổng quan, hoạt động và xếp hạng cho dashboard |

## 12. Mã trạng thái thường gặp

| Mã | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo tài nguyên thành công |
| `204` | Xóa thành công, không có response body |
| `400` | Dữ liệu không hợp lệ hoặc vi phạm trạng thái nghiệp vụ |
| `401` | Thiếu token, token hết hạn hoặc token không hợp lệ |
| `403` | Đã xác thực nhưng không có quyền |
| `404` | Không tìm thấy tài nguyên |
| `409` | Xung đột dữ liệu, chẳng hạn giá trị duy nhất đã tồn tại |
| `429` | Vượt giới hạn request |
| `500` | Lỗi máy chủ chưa được xử lý |

## 13. Nguồn cần cập nhật cùng tài liệu

Khi API thay đổi, cần đối chiếu các vị trí sau:

- Controller: `backend/src/modules/**/*.controller.ts`.
- DTO và validation: `backend/src/modules/**/dto/*.ts`.
- Response envelope: `backend/src/common/interceptors/response.interceptor.ts`.
- Error envelope: `backend/src/common/filters/global-exception.filter.ts`.
- Prefix, CORS, static upload và middleware: `backend/src/main.ts`.
