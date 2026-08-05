import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, OnDestroy, AfterViewInit, ElementRef, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/locale/locale.service';
import { translateCategory } from '../../../categories/models/category.model';
import { Post, getPostTranslation } from '../../models/post.model';
import { LikeService } from '../../services/like.service';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

/**
 * PostCardComponent - Component tái sử dụng hiển thị thẻ bài viết tóm tắt
 * 
 * Component này nhận đầu vào là một object Post và render ra giao diện thẻ (card).
 * Bao gồm ảnh bìa, tiêu đề, tác giả, đoạn trích ngắn (excerpt),
 * cùng các thống kê cơ bản như lượt thích, lượt xem, lượt bình luận.
 */
@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, TranslatePipe, LocalizedDatePipe],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent implements OnDestroy, AfterViewInit {
  private readonly languageService = inject(LocaleService);
  private readonly likeService = inject(LikeService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);

  // Signal chứa dữ liệu bài viết hiện tại của card
  private _post = signal<Post>({} as Post);
  
  /** 
   * @Input post: Nhận dữ liệu bài viết từ component cha (Feed, Trang cá nhân, Subscriptions...).
   * Thông qua setter để cập nhật signal `_post`.
   * 
   * Giải thích từng field trong object `post` được hiển thị ở đâu trong UI và lấy từ DB như thế nào:
   * - `post.translations`: Chứa mảng các bản dịch của bài viết. Dùng hàm `getPostTranslation()` để lấy translation phù hợp với ngôn ngữ hiện tại của user, qua đó hiển thị `title` (tiêu đề bài viết).
   * - `post.coverImageUrl`: Ảnh bìa của bài viết (được BE parse tự động từ nội dung HTML của `post_translations.content` để trích xuất thẻ <img> đầu tiên).
   * - `post.viewCount`: Số lượt xem, map trực tiếp từ cột `posts.view_count` trong cơ sở dữ liệu.
   * - `post.likeCount`: Số lượt thích, map trực tiếp từ cột `posts.like_count`.
   * - `post.commentCount`: Số lượng bình luận, map trực tiếp từ cột `posts.comment_count`.
   * - `post.author.name`: Tên tác giả hiển thị. Lấy từ bảng `users`, cụ thể là lấy `users.display_name` nếu có, nếu không sẽ fallback về `users.username`.
   * - `post.author.avatarUrl`: Ảnh đại diện của tác giả. Map từ cột `users.avatar` trong DB.
   */
  @Input({ required: true })
  set post(value: Post) {
    this._post.set(value);
  }
  get post(): Post {
    return this._post();
  }
  
  @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;

  private videoObserver?: IntersectionObserver;

  // Sử dụng IntersectionObserver để tự động phát video thu nhỏ khi lướt tới
  ngAfterViewInit(): void {
    const videoEl = this.videoElRef?.nativeElement;
    if (!videoEl) return;

    this.videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => null); // Chơi video nếu thấy trên màn hình
        } else {
          videoEl.pause(); // Dừng nếu vuốt qua
        }
      },
      { threshold: 0.3 }
    );
    this.videoObserver.observe(videoEl);
  }

  ngOnDestroy(): void {
    this.videoObserver?.disconnect(); // Dọn dẹp listener
  }

  // Lấy ngôn ngữ hiện tại đang chọn
  readonly currentLang = computed(() => this.languageService.current());
  
  // Tính toán bản dịch của bài viết dựa vào ngôn ngữ hiện tại
  readonly translation = computed(() => {
    const p = this._post();
    if (!p) return undefined;
    return getPostTranslation(p, this.currentLang());
  });

  // Dịch tên danh mục bài viết
  readonly categoryLabel = computed(() => {
    return translateCategory(this._post().category, this.currentLang());
  });

  readonly categoryIsHidden = computed(() => this._post().category?.isActive === false);
  
  // Lấy đoạn trích (excerpt) đã được Backend tạo sẵn
  readonly excerpt = computed(() => {
    return this.translation()?.excerpt || '';
  });


  /**
   * Xử lý hành động Like bài viết tại thẻ card
   * 
   * Áp dụng Optimistic Update giống PostDetailComponent.
   * Thay đổi trạng thái thích (liked) và số lượt (likeCount) ngay lập tức trên frontend
   * để tạo cảm giác phản hồi nhanh, sau đó gọi API. Nếu lỗi thì tự rollback.
   */
  toggleLike(event: Event) {
    event.preventDefault();   // Ngăn thẻ link điều hướng
    event.stopPropagation();  // Ngăn chặn sự kiện nổi bọt lên các thẻ cha

    if (this.post.isLiking) return; // Ngăn người dùng spam nút like

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    const currentPost = this.post;
    const previousLiked = currentPost.liked === true;
    const previousLikeCount = currentPost.likeCount ?? 0;
    
    // Đảo trạng thái và tính like mới
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    // Optimistic Update: Cập nhật giao diện thẻ bài viết lập tức
    this._post.set({ ...currentPost, liked: nextLiked, likeCount: nextLikeCount, isLiking: true });

    // Gọi API
    this.likeService.togglePostLike(currentPost.id).subscribe({
      next: (status) => {
        // Đồng bộ lại với database
        this._post.set({ ...this._post(), liked: status.liked, likeCount: status.likeCount, isLiking: false });
      },
      error: () => {
        // Rollback lại giá trị nếu API lỗi
        this._post.set({ ...this._post(), liked: previousLiked, likeCount: previousLikeCount, isLiking: false });
      }
    });
  }
}
