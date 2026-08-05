import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, ChangeDetectorRef, HostBinding } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SubscriptionsService } from '../../services/subscriptions.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * SubscribeButtonComponent - Nút theo dõi (Subscribe/Follow)
 * 
 * Component độc lập xử lý hành động follow/unfollow một tác giả.
 */
@Component({
  selector: 'app-subscribe-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './subscribe-button.component.html',
  styleUrl: './subscribe-button.component.scss'
})
export class SubscribeButtonComponent implements OnChanges {
  @Input({ required: true }) authorId!: number | string;
  @Input() fullWidth = false;
  // Bắn sự kiện ra ngoài component cha khi trạng thái follow thay đổi
  @Output() followChange = new EventEmitter<boolean>();

  @HostBinding('style.width') get hostWidth() { return this.fullWidth ? '100%' : null; }
  @HostBinding('style.display') get hostDisplay() { return this.fullWidth ? 'block' : null; }
  
  isSubscribed = false;
  loading = false;

  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  // Dùng ReplaySubject(1) để cache ID tác giả, khi ID thay đổi sẽ switchMap gọi kiểm tra API trạng thái
  private readonly authorId$ = new ReplaySubject<number | string>(1);

  constructor() {
    this.authorId$.pipe(
      // switchMap hủy kiểm tra trạng thái cũ nếu ID đổi quá nhanh
      switchMap(id => this.subscriptionsService.isFollowingState(id)),
      takeUntilDestroyed()
    ).subscribe(isSub => {
      this.isSubscribed = isSub;
      this.cdr.markForCheck(); // Yêu cầu Angular cập nhật view
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['authorId']) {
      this.authorId$.next(changes['authorId'].currentValue);
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "FOLLOW" / "UNFOLLOW"
   * ═══════════════════════════════════════════════════════════════════════════
   * Cơ chế Optimistic Update (Cập nhật lạc quan) & Xử lý state:
   * Component này thực hiện hành động Follow/Unfollow. Nó kết hợp Loading Spinner 
   * cục bộ với Optimistic Update đối với Component Cha (như trang Profile hay List).
   * 
   * Quy trình xử lý tại Component này:
   * 
   * 1. KIỂM TRA & KHÓA UI (PRE-API):
   *    - Bắt sự kiện bấm nút. Chặn event sủi bọt (stopPropagation).
   *    - Nếu chưa login -> Mở Modal đăng nhập.
   *    - Nếu hợp lệ -> `this.loading = true` để hiện vòng quay Spinner.
   *      (Tránh việc user bấm liên tiếp quá nhiều lần gọi API rác).
   * 
   * 2. GỌI API (BACKGROUND CALL):
   *    - Nếu đang follow (`isSubscribed = true`) -> Gọi DELETE API để Hủy theo dõi.
   *    - Nếu chưa follow (`isSubscribed = false`) -> Gọi POST API để Bắt đầu theo dõi.
   * 
   * 3. SYNC & OPTIMISTIC EVENT (KHI API THÀNH CÔNG):
   *    - Nếu API trả về OK:
   *      + Đảo ngược trạng thái UI nội bộ (`this.isSubscribed = true/false`).
   *      + Tắt Loading spinner (`this.loading = false`).
   *      + GỬI SỰ KIỆN LẠC QUAN: Phát event `followChange.emit(...)` ra Component Cha.
   *      + Component Cha khi nhận được event này sẽ "lạc quan" tự mutate state của nó
   *        (Ví dụ: tự tăng `followerCount = followerCount + 1` trên giao diện) mà
   *        KHÔNG CẦN phải gọi lại API GET nguyên danh sách tác giả hay đếm lại số liệu.
   *        Đây là một phần của kỹ thuật Optimistic Update dành cho dữ liệu cha.
   * 
   * 4. ROLLBACK & ERROR HANDLING (KHI API THẤT BẠI):
   *    - Nếu API trả về LỖI (Ví dụ: Timeout, Server 500, Hết phiên đăng nhập):
   *      + Tắt Loading spinner (`this.loading = false`).
   *      + GIỮ NGUYÊN trạng thái cũ (`isSubscribed` KHÔNG đổi).
   *      + (Sự kiện Rollback: UI trở lại trạng thái y như trước khi user bấm nút).
   */
  toggleSubscribe(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.authorId) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.loading = true; // Khóa UI chờ API
    if (this.isSubscribed) {
      // Logic Hủy theo dõi (Unfollow)
      this.subscriptionsService.unsubscribe(this.authorId).subscribe({
        next: () => {
          this.isSubscribed = false; // Đổi UI thành chưa follow
          this.loading = false;
          // Bắn event: Thông báo cập nhật lạc quan cho component cha biết tác giả này vừa bị unfollow
          this.followChange.emit(false);
          this.cdr.markForCheck();
        },
        error: () => { 
          // Rollback: Xử lý lỗi, tắt loading, giữ nguyên UI
          this.loading = false; 
          this.cdr.markForCheck(); 
        }
      });
    } else {
      // Logic Bắt đầu theo dõi (Follow)
      this.subscriptionsService.subscribe(this.authorId).subscribe({
        next: () => {
          this.isSubscribed = true; // Đổi UI thành đang follow
          this.loading = false;
          // Bắn event: Component cha có thể dựa vào đây để lạc quan tăng số follower lên +1 lập tức
          this.followChange.emit(true);
          this.cdr.markForCheck();
        },
        error: () => { 
          // Rollback: Xử lý lỗi, tắt loading, giữ nguyên UI
          this.loading = false; 
          this.cdr.markForCheck(); 
        }
      });
    }
  }
}
