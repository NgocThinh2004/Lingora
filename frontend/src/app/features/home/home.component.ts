import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostService } from '../posts/services/post.service';
import { CategoryService } from '../categories/services/category.service';
import { LanguageService } from '../../core/services/language.service';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
import { Post } from '../posts/models/post.model';
import { Category, translateCategory } from '../categories/models/category.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly categoryService = inject(CategoryService);
  private readonly languageService = inject(LanguageService);

  @ViewChild('sentinel') sentinelRef?: ElementRef<HTMLDivElement>;

  readonly posts = signal<Post[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly selectedCategorySlug = signal<string>('');
  readonly page = signal(1);
  readonly totalPages = signal(1);

  private observer?: IntersectionObserver;

  readonly currentLang = computed(() => this.languageService.current());

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

    // Tải lại feed mỗi khi ngôn ngữ hiển thị hoặc danh mục thay đổi.
    effect(
      () => {
        this.currentLang();
        this.selectedCategorySlug();
        this.loadFeed(1);
      },
      { allowSignalWrites: true }
    );
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          this.triggerInfiniteScroll();
        }
      },
      { rootMargin: '300px' }
    );

    if (this.sentinelRef?.nativeElement) {
      this.observer.observe(this.sentinelRef.nativeElement);
    }
  }

  private triggerInfiniteScroll() {
    if (!this.loading() && !this.loadingMore() && this.page() < this.totalPages()) {
      this.loadMore();
    }
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
          this.reobserveSentinel();
        },
        error: () => {
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  private reobserveSentinel() {
    setTimeout(() => {
      if (this.observer && this.sentinelRef?.nativeElement) {
        this.observer.disconnect();
        this.observer.observe(this.sentinelRef.nativeElement);
      }
    }, 100);
  }

  selectCategory(slug: string) {
    this.selectedCategorySlug.set(slug);
  }

  loadMore() {
    if (this.page() < this.totalPages() && !this.loadingMore()) {
      this.loadFeed(this.page() + 1);
    }
  }

  translateCategoryName(category: Category) {
    return translateCategory(category, this.currentLang());
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
