import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../core/theme/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * ThemeToggleComponent - Nút chuyển đổi giao diện Sáng / Tối
 * 
 * Mục đích: Giao tiếp với ThemeService để lấy trạng thái giao diện hiện tại
 * và cung cấp hàm toggle để đảo ngược trạng thái (dark <-> light).
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  // Computed signal để kiểm tra xem theme hiện tại có phải là dark hay không
  readonly isDark = computed(() => {
    this.themeService.preference();
    return this.themeService.resolvedTheme() === 'dark';
  });

  /**
   * Gọi tới ThemeService để chuyển đổi qua lại giữa Dark và Light theme
   */
  toggle(): void {
    this.themeService.toggle();
  }
}
