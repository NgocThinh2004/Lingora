import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { SearchModalService } from '../../../core/services/search-modal.service';
import { PostsService } from '../../../features/posts/services/posts.service';
import { CategoryService } from '../../../features/categories/services/category.service';
import { LanguageService } from '../../../core/services/language.service';
import { Post, getPostTranslation } from '../../../features/posts/models/post.model';
import { Category, translateCategory } from '../../../features/categories/models/category.model';
import { User } from '../../../features/users/models/user.model';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.scss',
})
export class SearchModalComponent {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly modalService = inject(SearchModalService);
  private readonly postService = inject(PostsService);
  private readonly categoryService = inject(CategoryService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly results = signal<Post[]>([]);
  readonly searching = signal(false);
  readonly trendingAuthors = signal<User[]>([]);
  readonly trendingCategories = signal<Category[]>([]);

  readonly currentLang = computed(() => this.languageService.current());
  readonly hasQuery = computed(() => this.query().trim().length > 0);

  private readonly queryInput$ = new Subject<string>();
  private trendingLoaded = false;

  constructor() {
    this.queryInput$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q.trim()) {
            this.searching.set(false);
            return [];
          }
          this.searching.set(true);
          return this.postService.list({ q, lang: this.currentLang(), limit: 6 });
        }),
      )
      .subscribe((res) => {
        this.searching.set(false);
        if (res) this.results.set(res.items || []);
      });

    // Focus input + tải dữ liệu trending mỗi khi modal được mở.
    effect(() => {
      if (this.modalService.isOpen()) {
        setTimeout(() => this.searchInputRef?.nativeElement.focus(), 0);
        if (!this.trendingLoaded) this.loadTrending();
      } else {
        this.query.set('');
        this.results.set([]);
      }
    }, { allowSignalWrites: true });
  }

  private loadTrending() {
    this.trendingLoaded = true;

    this.postService.list({ sort: 'top', limit: 8 }).subscribe((res) => {
      const seen = new Set<number>();
      const authors: User[] = [];
      for (const post of res.items) {
        if (!seen.has(post.author.id)) {
          seen.add(post.author.id);
          authors.push(post.author);
        }
      }
      this.trendingAuthors.set(authors.slice(0, 6));
    });

    this.categoryService.findAll().subscribe((categories) => {
      this.trendingCategories.set(categories.slice(0, 6));
    });
  }

  onInput(value: string) {
    this.query.set(value);
    this.queryInput$.next(value);
  }

  clear() {
    this.query.set('');
    this.results.set([]);
  }

  close() {
    this.modalService.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.modalService.isOpen()) this.close();
  }

  translateCategoryName(category: Category) {
    return translateCategory(category, this.currentLang());
  }

  resultTitle(post: Post) {
    return getPostTranslation(post, this.currentLang())?.title ?? '';
  }

  goToPost(postId: number) {
    this.close();
    this.router.navigate(['/post', postId]);
  }

  goToAuthor(userId: number) {
    this.close();
    this.router.navigate(['/profile', userId]);
  }

  goToCategory(slug: string) {
    this.close();
    this.router.navigate(['/explore'], { queryParams: { category: slug } });
  }
}
