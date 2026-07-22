import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostService } from '../../core/services/post.service';
import { CategoryService } from '../../core/services/category.service';
import { LanguageService } from '../../core/services/language.service';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
import { Post } from '../../core/models/post.model';
import { Category, translateCategory } from '../../core/models/category.model';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly postService = inject(PostService);
  private readonly categoryService = inject(CategoryService);
  private readonly languageService = inject(LanguageService);

  readonly posts = signal<Post[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly selectedCategorySlug = signal<string>('');
  readonly page = signal(1);
  readonly totalPages = signal(1);

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
