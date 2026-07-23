import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/locale/locale.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { translateCategory } from '../../../categories/models/category.model';
import { Post, getPostTranslation } from '../../models/post.model';
import { PostLikesService } from '../../services/post-likes.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  private readonly languageService = inject(LocaleService);
  private readonly likeService = inject(PostLikesService);
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

  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      this.toast.show('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    this.likeService.toggle(this.post.id).subscribe((status) => {
      this.post = { ...this.post, liked: status.liked, likeCount: status.likeCount };
    });
  }
}
