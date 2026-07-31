import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PaginationMeta } from '../../../core/http/api-response.model';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { AdminCategory } from '../categories/models/admin-category.model';
import { AdminCategoriesService } from '../categories/services/admin-categories.service';
import { AdminPost, AdminPostTranslation } from './models/admin-post.model';
import { AdminPostsService } from './services/admin-posts.service';
import { AssetImageDirective } from '../../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocalizedDatePipe } from '../../../shared/pipes/localized-date.pipe';

@Component({
  selector: 'app-admin-posts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent, UiStateComponent, AssetImageDirective, TranslatePipe, LocalizedDatePipe],
  templateUrl: './admin-posts.component.html',
  styleUrl: './admin-posts.component.scss',
})
export class AdminPostsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly postsService = inject(AdminPostsService);
  private readonly categoriesService = inject(AdminCategoriesService);
  private readonly localeService = inject(LocaleService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();
  private detailRequestVersion = 0;

  readonly posts = signal<AdminPost[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly selectedPost = signal<AdminPost | null>(null);
  readonly panelOpen = signal(false);
  readonly noteInvalid = signal(false);
  readonly pagination = signal<PaginationMeta>({ total: 0, page: 1, limit: 8, totalPages: 0 });
  readonly selectedLocale = this.localeService.selectedLocale;

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: ['all' as 'all' | 'pending' | 'approved' | 'rejected'],
    categoryId: [''],
  });
  readonly reviewForm = this.fb.nonNullable.group({ note: [''] });

  ngOnInit(): void {
    this.loadCategories();
    this.loadPosts();
    this.filters.valueChanges.pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.loadPosts(1));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPosts(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const filters = this.filters.getRawValue();
    this.postsService.getPosts({
      search: filters.search.trim(),
      status: filters.status,
      categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
      language: this.selectedLocale(),
      page,
      limit: this.pagination().limit,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.posts.set(response.data);
        if (response.meta?.pagination) this.pagination.set(response.meta.pagination);
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(this.localeService.translate('unable_load_posts'));
        this.loading.set(false);
      },
    });
  }

  loadCategories(): void {
    this.categoriesService.getCategories({ search: '', status: 'all', postFilter: 'all', sort: 'name', page: 1, limit: 100 })
      .pipe(takeUntil(this.destroy$)).subscribe({ next: response => this.categories.set(response.data) });
  }

  openReview(post: AdminPost): void {
    const requestVersion = ++this.detailRequestVersion;
    this.panelOpen.set(true);
    this.detailLoading.set(true);
    this.selectedPost.set(post);
    this.noteInvalid.set(false);
    this.reviewForm.reset({ note: '' });
    this.postsService.getPost(post.id, this.selectedLocale()).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        if (requestVersion !== this.detailRequestVersion || !this.panelOpen()) return;
        this.selectedPost.set(response.data);
        this.reviewForm.setValue({ note: response.data.reviewNote || '' });
        this.detailLoading.set(false);
      },
      error: () => {
        if (requestVersion !== this.detailRequestVersion || !this.panelOpen()) return;
        this.detailLoading.set(false);
        this.closePanel();
        this.toastService.showError(this.localeService.translate('unable_load_post'));
      },
    });
  }

  openFromKeyboard(event: KeyboardEvent, post: AdminPost): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openReview(post);
    }
  }

  closePanel(event?: Event): void {
    event?.stopPropagation();
    if (this.saving()) return;
    this.detailRequestVersion += 1;
    this.panelOpen.set(false);
    this.detailLoading.set(false);
    this.selectedPost.set(null);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.panelOpen()) this.closePanel();
  }

  review(decision: 'approve' | 'reject'): void {
    const post = this.selectedPost();
    if (!post || this.saving()) return;
    const note = this.reviewForm.controls.note.value.trim();
    if (decision === 'reject' && !note) {
      this.noteInvalid.set(true);
      return;
    }
    this.noteInvalid.set(false);
    this.saving.set(true);
    this.postsService.reviewPost(post.id, { decision, note: note || undefined }, this.selectedLocale())
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.saving.set(false);
          this.closePanel();
          this.toastService.showSuccess(this.localeService.translate(decision === 'approve' ? 'post_approved_message' : 'post_rejected_message'));
          this.loadPosts(this.pagination().page);
        },
        error: error => {
          this.saving.set(false);
          this.toastService.showError(this.localeService.translate('unable_review_post'));
        },
      });
  }

  targetTranslations(post: AdminPost): AdminPostTranslation[] {
    return post.translations.filter(item => !item.isOriginal);
  }

  translationSummary(post: AdminPost): string {
    return this.targetTranslations(post).slice(1)
      .map(item => `${item.name}: ${this.translationStatusLabel(item.status)}`)
      .join(', ');
  }

  translationStatusLabel(status: AdminPostTranslation['status']): string {
    const labels: Record<AdminPostTranslation['status'], string> = {
      not_started: 'Not started',
      queued: 'Queued',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
    };
    return labels[status];
  }

  categoryName(category: AdminCategory): string {
    return category.translations[0]?.name || category.slug;
  }

  flagUrl(flagCode: string | null): string {
    return `https://flagcdn.com/w40/${(flagCode || 'un').toLowerCase()}.png`;
  }

  postCode(id: string): string {
    const raw = String(id || '').replace(/^pending-/i, '');
    const normalized = raw.replace(/[^a-z0-9]/gi, '').slice(-10).toUpperCase();
    return `P-${normalized || 'UNKNOWN'}`;
  }

}
