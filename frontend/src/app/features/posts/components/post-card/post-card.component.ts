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

  private _post = signal<Post>({} as Post);
  
  @Input({ required: true })
  set post(value: Post) {
    this._post.set(value);
  }
  get post(): Post {
    return this._post();
  }
  
  @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;

  private videoObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    const videoEl = this.videoElRef?.nativeElement;
    if (!videoEl) return;

    this.videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoEl.play().catch(() => null);
        } else {
          videoEl.pause();
        }
      },
      { threshold: 0.3 }
    );
    this.videoObserver.observe(videoEl);
  }

  ngOnDestroy(): void {
    this.videoObserver?.disconnect();
  }

  readonly currentLang = computed(() => this.languageService.current());
  
  readonly translation = computed(() => {
    const p = this._post();
    if (!p) return undefined;
    return getPostTranslation(p, this.currentLang())
      ?? p.translations?.find(t => t.languageCode === p.originalLanguage)
      ?? p.translations?.[0];
  });

  readonly isFallback = computed(() => {
    const languageCode = this.translation()?.languageCode;
    return Boolean(languageCode && languageCode !== this.currentLang());
  });

  readonly fallbackLanguageCode = computed(() =>
    this.translation()?.languageCode || this._post().originalLanguage || '',
  );
  
  readonly categoryLabel = computed(() => translateCategory(this._post().category, this.currentLang()));
  
  readonly excerpt = computed(() => {
    // 17. FE tự cắt excerpt từ HTML content -> Đã xử lý bằng cách lấy BE excerpt
    return this.translation()?.excerpt || '';
  });


  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.post.isLiking) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    const currentPost = this.post;
    const previousLiked = currentPost.liked === true;   // guard: undefined → false
    const previousLikeCount = currentPost.likeCount ?? 0;
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    this._post.set({ ...currentPost, liked: nextLiked, likeCount: nextLikeCount, isLiking: true });

    this.likeService.togglePostLike(currentPost.id).subscribe({
      next: (status) => {
        this._post.set({ ...this._post(), liked: status.liked, likeCount: status.likeCount, isLiking: false });
      },
      error: () => {
        this._post.set({ ...this._post(), liked: previousLiked, likeCount: previousLikeCount, isLiking: false });
      }
    });
  }
}
