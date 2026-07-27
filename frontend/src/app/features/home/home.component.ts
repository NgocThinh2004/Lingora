import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/locale/locale.service';
import { Category, translateCategory } from '../categories/models/category.model';
import { CategoriesService } from '../categories/services/categories.service';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { Post } from '../posts/models/post.model';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { AuthService } from '../../core/auth/auth.service';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, AssetImageDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnDestroy {
  private observer?: IntersectionObserver;

  @ViewChild('scrollTrigger') set scrollTrigger(el: ElementRef<HTMLElement> | undefined) {
    if (el) {
      if (!this.observer) {
        this.observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !this.loadingMore() && this.page() < this.totalPages()) {
            this.loadMore();
          }
        }, { rootMargin: '400px' });
      }
      this.observer.observe(el.nativeElement);
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
  private readonly postService = inject(FeedPostsService);
  private readonly categoryService = inject(CategoriesService);
  private readonly languageService = inject(LocaleService);
  private readonly authService = inject(AuthService);

  readonly posts = signal<Post[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly selectedCategorySlug = signal<string>('');
  readonly page = signal(1);
  readonly totalPages = signal(1);

  readonly currentLang = computed(() => this.languageService.current());
  readonly quickDraftAvatar = computed(() => {
    return this.authService.currentUser()?.avatarUrl ?? 'assets/images/default-avatar.svg';
  });

  readonly selectedCategoryLabel = computed(() => {
    const slug = this.selectedCategorySlug();
    if (!slug) return 'Dành cho bạn';
    const cat = this.categories().find((c) => c.slug === slug);
    return cat ? translateCategory(cat, this.currentLang()) : 'Dành cho bạn';
  });

  constructor() {
    this.categoryService.findAll().subscribe({
      next: (categories) => this.categories.set(categories || []),
      error: () => this.categories.set([]),
    });

    // Tải lại feed mỗi khi ngôn ngữ hiển thị thay đổi.
    effect(() => {
      this.currentLang();
      this.loadFeed(1);
    }, { allowSignalWrites: true });
  }

  private loadFeed(page: number) {
    this.loading.set(page === 1);
    this.loadingMore.set(page > 1);

    this.postService
      .list({
        lang: this.currentLang(),
        category: this.selectedCategorySlug() || undefined,
        page,
        limit: 10,
      })
      .subscribe({
        next: (res) => {
          const items = res?.items || [];
          this.posts.set(page === 1 ? items : [...this.posts(), ...items]);
          this.page.set(res?.meta?.page || 1);
          this.totalPages.set(res?.meta?.totalPages || 1);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  selectCategory(slug: string) {
    this.selectedCategorySlug.set(slug);
  }

  loadMore() {
    if (this.page() < this.totalPages()) {
      this.loadFeed(this.page() + 1);
    }
  }

  translateCategoryName(category: Category) {
    return translateCategory(category, this.currentLang());
  }
}
