import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService, UiTranslationKey } from '../../core/locale/locale.service';

/**
 * TranslatePipe - Pipe dùng để dịch đa ngôn ngữ trực tiếp trên template
 * 
 * Mục đích: Nhận vào một khóa (key) dịch và trả về chuỗi văn bản tương ứng
 * theo ngôn ngữ hiện tại.
 * Cơ chế: Gọi tới phương thức translate của LocaleService để tra từ điển. 
 * Nếu tham số pure = false, pipe sẽ tự động cập nhật lại view khi ngôn ngữ thay đổi
 * mà không cần phải truyền thêm tham số phụ nào vào Pipe.
 */
@Pipe({
  name: 't',
  standalone: true,
  pure: false, // Pipe không tinh khiết (impure) để Angular tự động gọi lại hàm transform mỗi chu kỳ change detection hoặc khi ngôn ngữ thay đổi
})
export class TranslatePipe implements PipeTransform {
  // Tiêm (inject) LocaleService để dùng hàm tra cứu từ điển
  private readonly locale = inject(LocaleService);

  /**
   * Chuyển đổi key thành văn bản dịch tương ứng.
   * Cú pháp ở HTML: {{ 'hello_world' | t }}
   * Hoặc truyền tham số: {{ 'welcome_user' | t:{ name: 'Thịnh' } }}
   * 
   * @param key Khóa dịch thuộc kiểu UiTranslationKey (được định nghĩa trong LocaleService)
   * @param params (Tùy chọn) Đối tượng chứa các biến động để nội suy vào chuỗi dịch
   */
  transform(key: UiTranslationKey, params?: Record<string, string | number>): string {
    // Gọi hàm dịch, nếu không tồn tại (lỗi lúc inject) thì trả về key nguyên gốc
    return typeof this.locale.translate === 'function'
      ? this.locale.translate(key, params)
      : key;
  }
}
