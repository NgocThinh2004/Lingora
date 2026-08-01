import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { LocaleOption } from '../../../core/locale/locale.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

export type LocaleMenuPosition = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/**
 * LocaleSelectorComponent - Dropdown chọn ngôn ngữ (Tiếng Việt, English, v.v.)
 * 
 * Mục đích: Cho phép người dùng chuyển đổi ngôn ngữ của ứng dụng.
 * Có thể đóng dropdown khi click ra ngoài hoặc nhấn nút ESC.
 */
@Component({
  selector: 'app-locale-selector',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './locale-selector.component.html',
  styleUrl: './locale-selector.component.scss'
})
export class LocaleSelectorComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() value = 'en';
  @Input() compact = false;
  @Input() small = false;
  @Input() menuPosition: LocaleMenuPosition = 'bottom-start';
  @Input({ required: true }) options: readonly LocaleOption[] = [];
  
  // Phát sự kiện lên component cha mỗi khi ngôn ngữ được chọn đổi
  @Output() valueChange = new EventEmitter<string>();

  // Trạng thái mở/đóng của menu thả xuống
  readonly menuOpen = signal(false);

  /**
   * Tìm và trả về tùy chọn ngôn ngữ hiện đang được chọn
   */
  get selectedOption(): LocaleOption {
    return this.options.find(option => option.code === this.value)
      ?? this.options.find(option => option.isDefault)
      ?? this.options[0]
      ?? { code: this.value, label: this.value.toUpperCase(), flagUrl: 'assets/images/lingora-mark.svg', isDefault: false };
  }

  /**
   * Đảo trạng thái mở/đóng của menu
   */
  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  /**
   * Chọn một ngôn ngữ, đóng menu và phát sự kiện lên cha
   */
  selectLocale(code: string): void {
    this.menuOpen.set(false);
    this.valueChange.emit(code);
  }

  /**
   * Đóng menu nếu click bên ngoài thành phần này (click ra chỗ khác trên trang)
   */
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  /**
   * Đóng menu khi người dùng nhấn phím Escape
   */
  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.menuOpen.set(false);
  }
}
