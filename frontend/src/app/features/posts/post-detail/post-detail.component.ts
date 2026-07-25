import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FeedPostsService } from '../services/feed-posts.service';
import { AuthorPost, Post, PostOptions, getPostTranslation } from '../models/post.model';
import { AuthorPostsService } from '../services/author-posts.service';
import { LocaleService } from '../../../core/locale/locale.service';
import { Title } from '@angular/platform-browser';
import { CommentSectionComponent } from '../components/comment-section/comment-section.component';
import { LikeService } from '../services/like.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { preparePostDetailHtml } from './post-detail-html.util';

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
  private readonly router = inject(Router);
  private readonly postService = inject(FeedPostsService);
  private readonly authorPostsService = inject(AuthorPostsService);
  private localeService = inject(LocaleService);
  private titleService = inject(Title);
  private likeService = inject(LikeService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  post = signal<Post | null>(null);
  relatedPosts = signal<Post[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  authorPreview = signal(false);

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl && /^\/workspace\/posts(?:\?|$)/.test(returnUrl)
      ? returnUrl
      : this.authorPreview()
        ? '/workspace/posts'
        : '/';

    void this.router.navigateByUrl(destination);
  }

  // Computed signal to automatically update translation when language changes
  displayedTranslation = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return null;
    const trans = getPostTranslation(
      currentPost,
      this.localeService.selectedLocale(),
    );
    if (!trans) return null;
    
    return {
      ...trans,
      safeContentHtml: this.sanitizer.bypassSecurityTrustHtml(
        preparePostDetailHtml(trans.contentHtml || ''),
      )
    };
  });


  ngOnInit(): void {
    this.authorPreview.set(Boolean(this.route.snapshot.data['authorPreview']));
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') || this.route.snapshot.queryParamMap.get('id');
      if (id) {
        if (this.authorPreview()) {
          this.loadAuthorPost(Number(id));
        } else {
          this.loadPost(Number(id));
        }
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

  private loadAuthorPost(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    const includeDeleted = this.route.snapshot.queryParamMap.get('trash') === 'true';

    forkJoin({
      post: this.authorPostsService.getAuthorPost(id, includeDeleted),
      options: this.authorPostsService.getPostOptions(),
    }).subscribe({
      next: ({ post, options }) => {
        const previewPost = this.toPreviewPost(post, options);
        this.post.set(previewPost);
        this.relatedPosts.set([]);
        this.loading.set(false);

        const title = this.displayedTranslation()?.title;
        if (title) {
          this.titleService.setTitle(`${title} - Lingora`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error('Error loading author post preview:', err);
        this.error.set('Could not load this article. It may have changed or been removed.');
        this.loading.set(false);
      },
    });
  }

  private toPreviewPost(post: AuthorPost, options: PostOptions): Post {
    const currentUser = this.authService.currentUser();
    const originalLanguageCode =
      options.languages.find(language => language.id === post.originalLanguageId)?.code ?? 'en';
    const categoryOption = options.categories.find(category => category.id === post.categoryId);

    return {
      id: Number(post.id),
      authorId: Number(post.authorId),
      categoryId: post.categoryId,
      originalLanguage: originalLanguageCode,
      status: post.status === 'published' ? 'published' : 'draft',
      viewCount: post.viewCount,
      likeCount: 0,
      commentCount: 0,
      liked: false,
      author: {
        id: Number(currentUser?.id ?? post.authorId),
        name: currentUser?.displayName || currentUser?.username || 'Author',
        email: currentUser?.email,
        handle: currentUser?.username || 'author',
        avatarUrl: currentUser?.avatarUrl ?? null,
        bio: currentUser?.bio ?? null,
        role: currentUser?.role ?? 'member',
        allowShowSubscribers: true,
        allowShowFollowing: true,
      },
      category: categoryOption
        ? {
            id: categoryOption.id,
            slug: categoryOption.label,
            isActive: true,
            translations: [{
              id: categoryOption.id,
              languageCode: originalLanguageCode,
              name: categoryOption.label,
            }],
          }
        : null,
      translations: post.translations
        .filter(translation => Boolean(translation.title || translation.content))
        .map(translation => ({
          id: Number(translation.id),
          languageCode:
            options.languages.find(language => language.id === translation.languageId)?.code ?? `l${translation.languageId}`,
          title: translation.title || 'Untitled',
          contentHtml: translation.content || '',
          source: translation.languageId === post.originalLanguageId
            ? 'original'
            : translation.translationProvider
              ? 'machine'
              : 'human',
        })),
      createdAt: post.createdAt,
    };
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
