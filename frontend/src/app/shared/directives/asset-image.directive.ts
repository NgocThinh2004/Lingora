import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, Input, OnChanges, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * AssetImageDirective - Directive xử lý và hiển thị ảnh một cách an toàn
 * 
 * Mục đích: 
 * - Tự động chuẩn hóa đường dẫn ảnh (xử lý URL tuyệt đối, tương đối).
 * - Giải quyết vấn đề ảnh lỗi (404) bằng cách tự động gán ảnh mặc định (fallback).
 * - Đảm bảo ảnh luôn hiển thị đúng tỉ lệ 1:1, bo tròn (thích hợp cho avatar).
 */
@Directive({
  // Sử dụng directive này bằng cách thêm thuộc tính appAssetImage vào thẻ <img>
  selector: 'img[appAssetImage]',
  standalone: true,
})
export class AssetImageDirective implements OnChanges, AfterViewInit {
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  
  // Tách baseUrl bỏ qua phần /api/v1 ở cuối để lấy đường dẫn gốc của server tĩnh (static server) chứa file tải lên
  private readonly staticBaseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  private fallbackApplied = false;

  // Đầu vào: đường dẫn file ảnh. Nếu rỗng, tự dùng fallback.
  @Input() appAssetImage: string | null | undefined;
  // Đầu vào tùy chọn: ảnh mặc định khi bị lỗi.
  @Input() assetFallback = 'assets/images/default-avatar.svg';

  // Định dạng CSS mặc định cho ảnh: tỉ lệ 1:1, cắt ảnh vừa khung, bo tròn
  @HostBinding('style.aspect-ratio') readonly aspectRatio = '1 / 1';
  @HostBinding('style.object-fit') readonly objectFit = 'cover';
  @HostBinding('style.border-radius') readonly borderRadius = '50%';

  ngOnChanges(): void {
    // Reset trạng thái fallback mỗi khi input nguồn thay đổi
    this.fallbackApplied = false;
    // Cập nhật src cho thẻ img bằng URL đã được chuẩn hóa. 
    // Nếu không có đầu vào, lấy luôn ảnh fallback mặc định.
    this.image.src = this.resolveUrl(this.appAssetImage || this.assetFallback);
  }

  ngAfterViewInit(): void {
    // Ép kích thước hiển thị theo width/height được cấu hình sẵn trong HTML attributes (nếu có)
    const width = this.image.getAttribute('width');
    const height = this.image.getAttribute('height');
    if (width && height && /^\d+$/.test(width) && width === height) {
      this.image.style.width = `${width}px`;
      this.image.style.height = `${height}px`;
    }
  }

  /**
   * Giải thích onerror fallback:
   * Lắng nghe sự kiện (event) 'error' được trình duyệt tự phát ra khi ảnh bị lỗi (chẳng hạn 404 Not Found, không lấy được file).
   * Khi ảnh chính bị lỗi, tự động tráo đổi src sang ảnh mặc định (assetFallback).
   * Cờ `fallbackApplied` được dùng để chặn vòng lặp vô hạn nếu rủi ro file fallback cũng bị lỗi tải.
   */
  @HostListener('error')
  handleError(): void {
    if (this.fallbackApplied) {
      return; 
    }

    this.fallbackApplied = true;
    this.image.src = this.resolveUrl(this.assetFallback);
  }

  /**
   * Giải thích cách xây dựng URL (resolveUrl):
   * Mục tiêu: Đưa bất kỳ đường dẫn nào về dạng tuyệt đối có thể dùng được trên thẻ <img>.
   * 
   * - Nếu là URL tuyệt đối đầy đủ có protocol (`http://`, `https://`): Giữ nguyên.
   * - Nếu là `data:` hoặc `blob:` uri (base64 mã hóa ảnh thẳng trong text): Giữ nguyên.
   * - Nếu là đường dẫn `assets/` ở thư mục tĩnh frontend nội bộ: Giữ nguyên.
   * 
   * Khi nào dùng API base URL?
   * - Nếu đường dẫn bắt đầu bằng `uploads/` hoặc `/uploads/`, điều đó có nghĩa là 
   *   ảnh này do người dùng tải lên và được backend lưu trữ. Ta phải nối thêm `staticBaseUrl` 
   *   của backend vào trước để trình duyệt biết tải ảnh từ đâu trên mạng.
   */
  private resolveUrl(url: string): string {
    const normalized = url.trim();
    if (
      /^(?:https?:)?\/\//i.test(normalized)
      || /^(?:data|blob):/i.test(normalized)
      || normalized.startsWith('assets/')
      || normalized.startsWith('/assets/')
    ) {
      return normalized;
    }

    // Ảnh nằm trên server backend
    if (normalized.startsWith('/uploads/')) {
      return `${this.staticBaseUrl}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${this.staticBaseUrl}/${normalized}`;
    }

    return normalized;
  }
}
