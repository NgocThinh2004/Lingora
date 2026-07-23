import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FeedPostsService } from '../services/feed-posts.service';
import { Post, getPostTranslation } from '../models/post.model';
import { LocaleService } from '../../../core/locale/locale.service';
import { Title } from '@angular/platform-browser';
import { CommentSectionComponent } from '../components/comment-section/comment-section.component';
import { LikeService } from '../services/like.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/notifications/toast.service';

import { AuthorTooltipComponent } from '../../../shared/components/author-tooltip/author-tooltip.component';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CommentSectionComponent, AuthorTooltipComponent],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private readonly postService = inject(FeedPostsService);
  private localeService = inject(LocaleService);
  private titleService = inject(Title);
  private likeService = inject(LikeService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  post = signal<Post | null>(null);
  relatedPosts = signal<Post[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Computed signal to automatically update translation when language changes
  displayedTranslation = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return null;
    return getPostTranslation(currentPost, this.localeService.selectedLocale());
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') || this.route.snapshot.queryParamMap.get('id');
      if (id) {
        this.loadPost(Number(id));
      }
    });
  }

  private loadPost(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.postService.getById(id).subscribe({
      next: (data) => {
        this.post.set(data);
        this.loading.set(false);
        const title = this.displayedTranslation()?.title;
        if (title) this.titleService.setTitle(`${title} - Lingora`);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Fetch related posts
        this.postService.getRelated(id).subscribe({
          next: (relatedData) => {
            this.relatedPosts.set(relatedData);
          },
          error: (err) => {
            console.error('Error loading related posts:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error loading post:', err);
        this.error.set('Could not load post details. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  toggleLike(): void {
    const p = this.post();
    if (!p) return;

    if (!this.authService.isAuthenticated()) {
      this.toast.show('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    this.likeService.togglePostLike(p.id).subscribe((status) => {
      this.post.set({ ...p, liked: status.liked, likeCount: status.likeCount });
    });
  }

  getPostTranslationByLocale(p: Post): any {
    return getPostTranslation(p, this.localeService.selectedLocale());
  }
}
