import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post, getPostTranslation } from '../../../features/posts/models/post.model';
import { translateCategory } from '../../../features/categories/models/category.model';
import { LanguageService } from '../../../core/services/language.service';
import { LikeService } from '../../../features/posts/services/like.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  private readonly languageService = inject(LanguageService);
  private readonly likeService = inject(LikeService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  @Input({ required: true }) post!: Post;

  readonly currentLang = computed(() => this.languageService.current());

  get translation() {
    return getPostTranslation(this.post, this.currentLang());
  }

  get categoryLabel() {
    return translateCategory(this.post.category, this.currentLang());
  }

  get isVideo() {
    const url = this.post.videoUrl || this.post.imageUrl || '';
    return /\.mp4(\?|$)/i.test(url) || url.includes('/video/upload/');
  }

  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      this.toast.show('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    this.likeService.togglePostLike(this.post.id).subscribe((status) => {
      this.post = { ...this.post, liked: status.liked, likeCount: status.likeCount };
    });
  }
}
