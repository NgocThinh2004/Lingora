import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { LocaleService } from '../../core/locale/locale.service';
import { Category, translateCategory } from '../categories/models/category.model';
import { CategoriesService } from '../categories/services/categories.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/services/users.service';
import { SearchService, SearchResults } from './services/search.service';
import { SearchModalService } from './search-modal.service';
import { AuthorTooltipComponent } from '../users/components/author-tooltip/author-tooltip.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, AuthorTooltipComponent, AssetImageDirective, TranslatePipe],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.scss',
})
export class SearchModalComponent {
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly modalService = inject(SearchModalService);
  private readonly globalSearchService = inject(SearchService);
  private readonly categoryService = inject(CategoriesService);
  private readonly userService = inject(UsersService);
  private readonly languageService = inject(LocaleService);
  private readonly router = inject(Router);

  readonly query = signal('');
  readonly results = signal<SearchResults>({ users: [], categories: [], posts: [] });
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
          return this.globalSearchService.globalSearch(q).pipe(
            catchError(() => {
              this.searching.set(false);
              return of({ users: [], categories: [], posts: [] });
            })
          );
        }),
      )
      .subscribe((res) => {
        this.searching.set(false);
        if (res && !Array.isArray(res)) this.results.set(res);
      });

    // Focus input + tải dữ liệu trending mỗi khi modal được mở.
    effect(() => {
      if (this.modalService.isOpen()) {
        setTimeout(() => this.searchInputRef?.nativeElement.focus(), 0);
        if (!this.trendingLoaded) this.loadTrending();
      } else {
        this.query.set('');
        this.results.set({ users: [], categories: [], posts: [] });
      }
    }, { allowSignalWrites: true });
  }

  private loadTrending() {
    this.trendingLoaded = true;

    this.userService.getRecommended(undefined, 6).subscribe((res) => {
      this.trendingAuthors.set(res.items);
    });

    this.categoryService.findAll(undefined, undefined, 6).subscribe((categories) => {
      this.trendingCategories.set(categories.filter(c => (c.postCount || 0) > 0));
    });
  }

  onInput(value: string) {
    this.query.set(value);
    this.queryInput$.next(value);
  }

  clear() {
    this.query.set('');
    this.results.set({ users: [], categories: [], posts: [] });
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
