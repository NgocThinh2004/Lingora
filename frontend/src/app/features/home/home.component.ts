import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, ElementRef, ViewChild, HostListener, untracked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, switchMap } from 'rxjs';
import { LocaleService } from '../../core/locale/locale.service';
import { Category, translateCategory } from '../categories/models/category.model';
import { CategoriesService } from '../categories/services/categories.service';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { Post } from '../posts/models/post.model';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { AuthService } from '../../core/auth/auth.service';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
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

  @ViewChild('dropdownWrap') dropdownWrap?: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isDropdownOpen() && this.dropdownWrap?.nativeElement) {
      if (!this.dropdownWrap.nativeElement.contains(event.target as Node)) {
        this.isDropdownOpen.set(false);
      }
    }
  }

  private readonly postService = inject(FeedPostsService);
  private readonly categoryService = inject(CategoriesService);
  private readonly languageService = inject(LocaleService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // Subject carries {page, category, lang} — switchMap cancels in-flight requests
  private readonly feedTrigger$ = new Subject<{ page: number; category: string; lang: string }>();

  readonly posts = signal<Post[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly selectedCategorySlug = signal<string>('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly isDropdownOpen = signal(false);

  readonly currentLang = computed(() => this.languageService.current());
  readonly quickDraftAvatar = computed(() => {
    return this.authService.currentUser()?.avatarUrl ?? 'assets/images/default-avatar.svg';
  });

  readonly selectedCategoryLabel = computed(() => {
    const slug = this.selectedCategorySlug();
    if (!slug) return this.languageService.translate('for_you');
    const cat = this.categories().find((c) => c.slug === slug);
    return cat ? translateCategory(cat, this.currentLang()) : this.languageService.translate('for_you');
  });

  constructor() {
    // Load categories once
    this.categoryService.findAll().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (categories) => this.categories.set(categories || []),
      error: () => this.categories.set([]),
    });

    // switchMap automatically cancels the previous in-flight request
    // when a new filter arrives (category/lang change or loadMore).
    this.feedTrigger$.pipe(
      switchMap(({ page, category, lang }) => {
        this.loading.set(page === 1);
        this.loadingMore.set(page > 1);
        return this.postService.list({ lang, category: category || undefined, page, limit: 10 });
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => {
        const currentPage = res?.meta?.page || 1;
        const items = res?.items || [];
        this.posts.set(currentPage === 1 ? items : [...this.posts(), ...items]);
        this.page.set(currentPage);
        this.totalPages.set(res?.meta?.totalPages || 1);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });

    // Trigger initial load and re-load on language change
    effect(() => {
      const lang = this.currentLang();
      untracked(() => {
        this.page.set(1);
        this.feedTrigger$.next({ page: 1, category: this.selectedCategorySlug(), lang });
      });
    });
  }

  selectCategory(slug: string) {
    this.page.set(1);
    this.selectedCategorySlug.set(slug);
    this.isDropdownOpen.set(false);
    this.feedTrigger$.next({ page: 1, category: slug, lang: this.currentLang() });
  }

  loadMore() {
    if (this.page() < this.totalPages()) {
      const nextPage = this.page() + 1;
      this.feedTrigger$.next({
        page: nextPage,
        category: this.selectedCategorySlug(),
        lang: this.currentLang(),
      });
    }
  }

  translateCategoryName(category: Category) {
    return translateCategory(category, this.currentLang());
  }
}

