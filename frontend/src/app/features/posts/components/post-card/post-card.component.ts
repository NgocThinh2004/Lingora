import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/locale/locale.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { translateCategory } from '../../../categories/models/category.model';
import { Post, getPostTranslation } from '../../models/post.model';
import { LikeService } from '../../services/like.service';
import { AuthModalService } from '../../../../shared/components/auth-modal/auth-modal.service';
import { AuthorTooltipComponent } from '../../../../shared/components/author-tooltip/author-tooltip.component';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthorTooltipComponent, AssetImageDirective],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent implements OnInit {
  private readonly languageService = inject(LocaleService);
  private readonly likeService = inject(LikeService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly sanitizer = inject(DomSanitizer);

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

  ngOnInit() {
  }

  get translation() {
    return getPostTranslation(this.post, this.currentLang());
  }

  get categoryLabel() {
    return translateCategory(this.post.category, this.currentLang());
  }

  get authorAvatar(): string {
    return this.post.author.avatarUrl ?? 'assets/images/lingora-mark.svg';
  }

  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.likeService.togglePostLike(this.post.id).subscribe((status) => {
      this.post = { ...this.post, liked: status.liked, likeCount: status.likeCount };
    });
  }
}
