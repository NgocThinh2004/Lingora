import { Component, OnDestroy, computed, inject, signal, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, switchMap, Subscription } from 'rxjs';
import { FeedPostsService } from '../services/feed-posts.service';
import { AuthorPost, Post, PostOptions, getPostTranslation } from '../models/post.model';
import { translateCategory } from '../../categories/models/category.model';
import { AuthorPostsService } from '../services/author-posts.service';
import { LocaleService } from '../../../core/locale/locale.service';
import { Title } from '@angular/platform-browser';
import { CommentSectionComponent } from '../components/comment-section/comment-section.component';
import { LikeService } from '../services/like.service';
import { AuthService } from '../../../core/auth/auth.service';
import { preparePostDetailHtml } from './post-detail-html.util';
import { AuthModalService } from '../../../core/auth/auth-modal.service';
import { AuthorTooltipComponent } from '../../users/components/author-tooltip/author-tooltip.component';
import { CompactNumberPipe } from '../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CommentSectionComponent, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, TranslatePipe, LocalizedDatePipe],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly postService = inject(FeedPostsService);
  private readonly authorPostsService = inject(AuthorPostsService);
  private localeService = inject(LocaleService);
  private titleService = inject(Title);
  private likeService = inject(LikeService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private authModalService = inject(AuthModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  @ViewChild('articleContent') articleContentRef?: ElementRef<HTMLElement>;
  @ViewChild('centerFeed') centerFeedRef?: ElementRef<HTMLElement>;

  post = signal<Post | null>(null);
  relatedPosts = signal<Post[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  authorPreview = signal(false);

  private likeSub?: Subscription;
  private videoObservers: IntersectionObserver[] = [];

  ngOnDestroy(): void {
    this.cleanupVideoObservers();
    this.likeSub?.unsubscribe();
  }

  private cleanupVideoObservers(): void {
    this.videoObservers.forEach(obs => obs.disconnect());
    this.videoObservers = [];
  }

  /** Call after post content is rendered to observe all videos in the article */
  private setupVideoObservers(): void {
    if (typeof document === 'undefined') return;
    this.cleanupVideoObservers();

    // Wait one tick for Angular to render [innerHTML]
    setTimeout(() => {
      const articleEl = this.articleContentRef?.nativeElement;
      if (!articleEl) return;

      articleEl.querySelectorAll<HTMLVideoElement>('video').forEach(videoEl => {
        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              videoEl.play().catch(() => null);
            } else {
              videoEl.pause();
            }
          },
          { threshold: 0.25 }
        );
        obs.observe(videoEl);
        this.videoObservers.push(obs);
      });
    }, 100);
  }

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
    const selectedLocale = this.localeService.selectedLocale();
    const trans = getPostTranslation(currentPost, selectedLocale);
    if (!trans) return null;
    
    return {
      ...trans,
      safeContentHtml: this.sanitizer.bypassSecurityTrustHtml(
        preparePostDetailHtml(trans.contentHtml || ''),
      )
    };
  });

  readonly isFallback = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return false;
    return !getPostTranslation(currentPost, this.localeService.selectedLocale());
  });


  ngOnInit(): void {
    this.authorPreview.set(Boolean(this.route.snapshot.data['authorPreview']));

    // switchMap cancels the previous request if the user navigates to another post
    // before the previous one finishes loading — prevents race condition.
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id') || this.route.snapshot.queryParamMap.get('id'));
        this.loading.set(true);
        this.error.set(null);
        const language = this.localeService.selectedLocale();

        if (this.authorPreview()) {
          const includeDeleted = this.route.snapshot.queryParamMap.get('trash') === 'true';
          return forkJoin({
            post: this.authorPostsService.getAuthorPost(id, includeDeleted),
            options: this.authorPostsService.getPostOptions(),
            mode: Promise.resolve('author' as const),
          });
        } else {
          return forkJoin({
            post: this.postService.getById(id, language),
            related: this.postService.getRelated(id, language),
            mode: Promise.resolve('public' as const),
          });
        }
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (result) => {
        if (result.mode === 'author') {
          const { post, options } = result as any;
          const previewPost = this.toPreviewPost(post, options);
          this.post.set(previewPost);
          this.relatedPosts.set([]);
        } else {
          const { post, related } = result as any;
          this.post.set(post);
          this.relatedPosts.set(related);
        }
        this.loading.set(false);

        const title = this.displayedTranslation()?.title;
        if (title) this.titleService.setTitle(`${title} - Lingora`);

        // Scroll center-feed to top
        const scrollContainer = this.document.querySelector('.center-feed');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });

        this.setupVideoObservers();
      },
      error: () => {
        this.error.set(this.localeService.translate(
          this.authorPreview() ? 'article_unavailable' : 'post_details_load_failed'
        ));
        this.loading.set(false);
      }
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
    if (p.isLiking) return; // Throttling: prevent spam clicks

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    // Optimistic UI update
    const previousLiked = p.liked;
    const previousLikeCount = p.likeCount || 0;
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    this.post.set({ ...p, liked: nextLiked, likeCount: nextLikeCount, isLiking: true });

    this.likeSub?.unsubscribe();
    this.likeSub = this.likeService.togglePostLike(p.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (status) => {
        // Sync with server state
        const updatedPost = this.post();
        if (updatedPost && updatedPost.id === p.id) {
          this.post.set({ ...updatedPost, liked: status.liked, likeCount: status.likeCount, isLiking: false });
        }
      },
      error: (err) => {
        // Rollback on error
        const currentPost = this.post();
        if (currentPost && currentPost.id === p.id) {
          this.post.set({ ...currentPost, liked: previousLiked, likeCount: previousLikeCount, isLiking: false });
        }
      }
    });
  }

  getPostTranslationByLocale(post: Post): import('../models/post.model').FeedPostTranslation | undefined {
    return getPostTranslation(post, this.localeService.selectedLocale());
  }

  getCategoryTranslation(category: any): string {
    return translateCategory(category, this.localeService.selectedLocale());
  }
}
