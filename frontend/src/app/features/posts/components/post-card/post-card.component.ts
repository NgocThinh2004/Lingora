import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
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

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  private readonly languageService = inject(LocaleService);
  private readonly likeService = inject(LikeService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);

  @Input({ required: true }) post!: Post;

  readonly currentLang = computed(() => this.languageService.current());
  
  readonly excerpt = computed(() => {
    const translation = getPostTranslation(this.post, this.currentLang());
    if (translation?.contentHtml) {
      // Strip HTML tags and decode common entities for a clean text excerpt
      let stripped = translation.contentHtml.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      return stripped.length > 200 ? stripped.substring(0, 200) + '...' : stripped;
    }
    return '';
  });

  get translation() {
    return getPostTranslation(this.post, this.currentLang());
  }

  get categoryLabel() {
    return translateCategory(this.post.category, this.currentLang());
  }


  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.post.isLiking) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    const previousLiked = this.post.liked === true;   // guard: undefined → false
    const previousLikeCount = this.post.likeCount ?? 0;
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    this.post = { ...this.post, liked: nextLiked, likeCount: nextLikeCount, isLiking: true };

    this.likeService.togglePostLike(this.post.id).subscribe({
      next: (status) => {
        this.post = { ...this.post, liked: status.liked, likeCount: status.likeCount, isLiking: false };
      },
      error: () => {
        this.post = { ...this.post, liked: previousLiked, likeCount: previousLikeCount, isLiking: false };
      }
    });
  }
}
