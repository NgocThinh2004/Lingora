import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, forkJoin, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocaleService, UiTranslationKey } from '../../core/locale/locale.service';
import { getApiErrorMessage } from '../../core/http/api-error.util';
import { PaginationMeta } from '../../core/http/api-response.model';
import { AuthorPost, PostListParams, PostStatus, PostTranslation } from '../posts/models/post.model';
import { AuthorPostsService } from '../posts/services/author-posts.service';
import { ToastService } from '../../core/notifications/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

type AuthorAction = 'submit' | 'archive' | 'restore' | 'trash' | 'restore-trash';
type ConfirmationAction = 'trash' | 'delete-permanent';

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './my-posts.component.html',
  styleUrl: './my-posts.component.scss',
})
export class MyPostsComponent implements OnInit {
  private readonly postsService = inject(AuthorPostsService);
  private readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  readonly statuses: Array<PostStatus | 'all'> = [
    'all',
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'published',
    'archived',
  ];

  posts: AuthorPost[] = [];
  meta: PaginationMeta | null = null;
  readonly pageSize = 10;
  allCount = 0;
  draftCount = 0;
  pendingCount = 0;
  publishedCount = 0;
  trashCount = 0;
  page = 1;
  status: PostStatus | 'all' | 'public' = 'all';
  search = '';
  searchInput = '';
  languageFilter = 'all';
  categoryFilter = 'all';
  trash = false;
  loading = false;
  busyKey = '';
  selectedPostIds = new Set<string>();
  selectingAll = false;
  bulkActionBusy = false;
  categoryOptions: Array<{ id: number; label: string }> = [];
  languageOptions: Array<{ id: number; code: string; label: string; nativeLabel: string; flagCode: string | null }> = [];
  confirmationAction: ConfirmationAction | null = null;
  confirmationPostIds: string[] = [];
  confirmationBusy = false;
  translationMenuPost: AuthorPost | null = null;
  translationMenuTop = 0;
  translationMenuLeft = 0;

  ngOnInit(): void {
    this.locale.load();
    this.searchChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(value => this.applySearch(value));
    this.restoreListState();
    this.postsService.getAuthorPostFilterOptions().subscribe({
      next: options => {
        this.categoryOptions = options.categories;
        this.languageOptions = options.languages;
        this.loadPosts();
      },
      error: () => this.loadPosts(),
    });
    this.loadPostCounts();
  }

  loadPosts(): void {
    this.loading = true;

    this.postsService
      .listAuthorPosts(this.buildListParams(this.page, this.pageSize))
      .subscribe({
        next: (response) => {
          if (this.page > response.meta.totalPages) {
            this.page = response.meta.totalPages;
            this.syncListState();
            this.loadPosts();
            return;
          }

          this.posts = response.data;
          this.meta = response.meta;
          this.closeTranslationMenu();
          this.loading = false;
          if (!this.trash && this.status === 'all' && !this.search.trim()) {
            this.allCount = response.meta.total;
          }
        },
        error: (error: unknown) => {
          this.toast.showError(this.formatError(error));
          this.loading = false;
        },
      });
  }

  runAction(post: AuthorPost, action: AuthorAction): void {
    this.busyKey = `${post.id}:${action}`;

    const request$ =
      action === 'submit'
        ? this.postsService.submitAuthorPost(post.id)
        : action === 'archive'
          ? this.postsService.archiveAuthorPost(post.id)
          : action === 'restore'
            ? this.postsService.restoreAuthorPost(post.id)
            : action === 'trash'
              ? this.postsService.trashAuthorPost(post.id)
              : this.postsService.restoreAuthorPostFromTrash(post.id);

    request$.subscribe({
      next: () => {
        this.toast.showSuccess(this.locale.translate('post_status_changed'));
        this.busyKey = '';
        this.loadPostCounts();
        this.loadPosts();
      },
      error: (error: unknown) => {
        this.toast.showError(this.formatError(error));
        this.busyKey = '';
      },
    });
  }

  primaryTranslation(post: AuthorPost): PostTranslation | null {
    return (
      post.translations.find((translation) => translation.languageId === post.originalLanguageId) ??
      post.translations[0] ??
      null
    );
  }

  canSubmit(post: AuthorPost): boolean {
    return post.status === 'draft' || post.status === 'rejected';
  }

  canEdit(post: AuthorPost): boolean {
    return post.status === 'draft' || post.status === 'pending_review' || post.status === 'rejected';
  }

  canArchive(post: AuthorPost): boolean {
    return ['draft', 'approved', 'rejected', 'published'].includes(post.status);
  }

  canRestore(post: AuthorPost): boolean {
    return post.status === 'archived';
  }

  statusBadgeClass(post: AuthorPost): string {
    if (this.trash || post.deletedAt) {
      return 'is-trash';
    }

    if (post.status === 'published' || post.status === 'approved') {
      return 'is-published';
    }

    if (post.status === 'pending_review') {
      return 'is-pending';
    }

    return 'is-draft';
  }

  statusLabel(post: AuthorPost): string {
    if (this.trash || post.deletedAt) {
      return this.translate('status_trash');
    }

    if (post.status === 'pending_review') {
      return this.translate('status_pending');
    }

    if (post.status === 'published' || post.status === 'approved') {
      return this.translate('status_published');
    }

    return this.translate('status_draft');
  }

  translatedLanguageSummary(post: AuthorPost): string {
    const targets = post.translationMatrix.filter((translation) => translation.languageId !== post.originalLanguageId);
    if (!targets.length) {
      return '-';
    }

    return targets.map((translation) => `L${translation.languageId}: ${translation.status}`).join(', ');
  }

  targetMatrix(post: AuthorPost) {
    return post.translationMatrix.filter((translation) => translation.languageId !== post.originalLanguageId);
  }

  remainingTargetMatrix(post: AuthorPost) {
    return this.targetMatrix(post).slice(1);
  }

  toggleTranslationMenu(post: AuthorPost, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.translationMenuPost?.id === post.id) {
      this.closeTranslationMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const triggerRect = trigger.getBoundingClientRect();
    const itemCount = Math.max(1, this.remainingTargetMatrix(post).length);
    const menuWidth = 90;
    const estimatedMenuHeight = 16 + itemCount * 38;
    const viewportMargin = 8;
    const gap = 6;
    const opensAbove = triggerRect.bottom + gap + estimatedMenuHeight > window.innerHeight - viewportMargin;

    this.translationMenuTop = opensAbove
      ? Math.max(viewportMargin, triggerRect.top - estimatedMenuHeight - gap)
      : triggerRect.bottom + gap;
    this.translationMenuLeft = Math.min(
      Math.max(viewportMargin, triggerRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportMargin,
    );
    this.translationMenuPost = post;
  }

  closeTranslationMenu(): void {
    this.translationMenuPost = null;
  }

  isTranslationMenuOpen(post: AuthorPost): boolean {
    return this.translationMenuPost?.id === post.id;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeTranslationMenu();
  }

  @HostListener('document:keydown.escape')
  @HostListener('window:resize')
  closeTranslationMenuFromViewportChange(): void {
    this.closeTranslationMenu();
  }

  visiblePosts(): AuthorPost[] {
    if (this.loading) {
      return [];
    }

    return this.posts;
  }

  postSearchText(post: AuthorPost): string {
    return this.postTitle(post);
  }

  postDetailLink(post: AuthorPost): string[] {
    return !this.trash && (post.status === 'approved' || post.status === 'published')
      ? ['/post', post.id]
      : ['/workspace/posts', post.id, 'view'];
  }

  postDetailQueryParams(): Record<string, string> {
    return {
      ...(this.trash ? { trash: 'true' } : {}),
      returnUrl: this.listReturnUrl(),
    };
  }

  editQueryParams(): Record<string, string> {
    return { returnUrl: this.listReturnUrl() };
  }

  postTitle(post: AuthorPost): string {
    const source = this.primaryTranslation(post);
    return source?.title?.trim() || this.translate('untitled');
  }

  languageCode(languageId: number): string {
    return this.languageOptions.find(language => language.id === languageId)?.code.toUpperCase()
      ?? `L${languageId}`;
  }

  flagUrl(languageId: number): string {
    const flagCode = this.languageOptions.find(language => language.id === languageId)?.flagCode;
    return flagCode
      ? `https://flagcdn.com/w40/${flagCode.toLowerCase()}.png`
      : 'assets/images/lingora-mark.svg';
  }

  translate(key: UiTranslationKey): string {
    return this.locale.translate(key);
  }

  categoryLabel(post: AuthorPost): string {
    return this.categoryOptions.find(category => category.id === post.categoryId)?.label ?? '-';
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.locale.selectedLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  visibleItemsLabel(): string {
    const count = this.meta?.total ?? this.visiblePosts().length;
    return `${count} ${this.translate(count === 1 ? 'item' : 'items')}`;
  }

  trackPost(_index: number, post: AuthorPost): string {
    return post.id;
  }

  trackMatrix(_index: number, translation: { languageId: number }): number {
    return translation.languageId;
  }

  isSelected(post: AuthorPost): boolean {
    return this.selectedPostIds.has(post.id);
  }

  togglePostSelection(post: AuthorPost, checked: boolean): void {
    if (checked) {
      this.selectedPostIds.add(post.id);
    } else {
      this.selectedPostIds.delete(post.id);
    }
  }

  toggleVisibleSelection(checked: boolean): void {
    if (!checked) {
      this.selectedPostIds.clear();
      return;
    }

    this.selectAllMatchingPosts();
  }

  areAllVisibleSelected(): boolean {
    const total = this.meta?.total ?? 0;
    return total > 0 && this.selectedPostIds.size === total;
  }

  isSelectionIndeterminate(): boolean {
    const total = this.meta?.total ?? 0;
    return this.selectedPostIds.size > 0 && this.selectedPostIds.size < total;
  }

  runBulkAction(action: AuthorAction): void {
    const ids = [...this.selectedPostIds];
    if (!ids.length || this.bulkActionBusy) {
      return;
    }

    const requests = ids.map(id =>
      action === 'submit'
        ? this.postsService.submitAuthorPost(id)
        : action === 'archive'
          ? this.postsService.archiveAuthorPost(id)
          : action === 'restore'
            ? this.postsService.restoreAuthorPost(id)
            : action === 'trash'
              ? this.postsService.trashAuthorPost(id)
              : this.postsService.restoreAuthorPostFromTrash(id),
    );

    this.bulkActionBusy = true;
    forkJoin(requests).subscribe({
      next: () => {
        this.bulkActionBusy = false;
        this.selectedPostIds.clear();
        this.loadPostCounts();
        this.loadPosts();
      },
      error: (error: unknown) => {
        this.bulkActionBusy = false;
        this.toast.showError(this.formatError(error));
      },
    });
  }

  requestTrash(post: AuthorPost): void {
    this.openConfirmation('trash', [post]);
  }

  requestPermanentDelete(post: AuthorPost): void {
    this.openConfirmation('delete-permanent', [post]);
  }

  requestBulkDelete(): void {
    const ids = [...this.selectedPostIds];
    if (!ids.length) {
      return;
    }

    this.openConfirmationIds(this.trash ? 'delete-permanent' : 'trash', ids);
  }

  closeConfirmation(): void {
    if (this.confirmationBusy) {
      return;
    }

    this.confirmationAction = null;
    this.confirmationPostIds = [];
  }

  confirmPendingAction(): void {
    const action = this.confirmationAction;
    const ids = [...this.confirmationPostIds];
    if (!action || !ids.length || this.confirmationBusy) {
      return;
    }

    const requests = ids.map(id => action === 'trash'
      ? this.postsService.trashAuthorPost(id)
      : this.postsService.deleteAuthorPostPermanently(id));

    this.confirmationBusy = true;
    forkJoin(requests).subscribe({
      next: () => {
        this.toast.showSuccess(this.locale.translate(
          action === 'trash' ? 'posts_moved_to_trash' : 'posts_deleted_permanently',
          { count: ids.length },
        ));
        this.confirmationBusy = false;
        this.confirmationAction = null;
        this.confirmationPostIds = [];
        this.selectedPostIds.clear();
        this.loadPostCounts();
        this.loadPosts();
      },
      error: (error: unknown) => {
        this.toast.showError(this.formatError(error));
        this.confirmationBusy = false;
      },
    });
  }

  confirmationTitle(): string {
    return this.translate(this.confirmationAction === 'delete-permanent'
      ? 'delete_confirm_title'
      : 'trash_confirm_title');
  }

  confirmationMessage(): string {
    return this.translate(this.confirmationAction === 'delete-permanent'
      ? 'confirm_delete_permanent'
      : 'confirm_trash');
  }

  confirmationWarning(): string {
    return this.translate(this.confirmationAction === 'delete-permanent'
      ? 'delete_confirm_warning'
      : 'trash_confirm_warning');
  }

  confirmationButtonLabel(): string {
    return this.translate(this.confirmationAction === 'delete-permanent'
      ? 'delete_confirm_action'
      : 'trash_confirm_action');
  }

  isBusy(post: AuthorPost, action: AuthorAction): boolean {
    return this.busyKey === `${post.id}:${action}`;
  }

  onSearchInput(value: string): void {
    this.searchChanges.next(value.trim());
  }

  applySearch(value = this.searchInput): void {
    this.search = value.trim();
    this.selectedPostIds.clear();
    this.page = 1;
    this.syncListState();
    this.loadPosts();
  }

  applyFilters(): void {
    this.selectedPostIds.clear();
    this.page = 1;
    this.syncListState();
    this.loadPosts();
  }

  setPostFilter(status: PostStatus | 'all' | 'public', trash: boolean): void {
    this.status = status;
    this.trash = trash;
    this.selectedPostIds.clear();
    this.page = 1;
    this.syncListState();
    this.loadPosts();
  }

  goToPage(page: number): void {
    const totalPages = this.meta?.totalPages ?? 1;
    if (page < 1 || page > totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.syncListState();
    this.loadPosts();
  }

  private loadPostCounts(): void {
    forkJoin({
      all: this.postsService.listAuthorPosts({ status: 'all', limit: 1 }),
      drafts: this.postsService.listAuthorPosts({ status: 'draft', limit: 1 }),
      pending: this.postsService.listAuthorPosts({ status: 'pending_review', limit: 1 }),
      approved: this.postsService.listAuthorPosts({ status: 'approved', limit: 1 }),
      published: this.postsService.listAuthorPosts({ status: 'published', limit: 1 }),
      trash: this.postsService.listAuthorPosts({ status: 'all', trash: true, limit: 1 }),
    }).subscribe({
      next: response => {
        this.allCount = response.all.meta.total;
        this.draftCount = response.drafts.meta.total;
        this.pendingCount = response.pending.meta.total;
        this.publishedCount = response.approved.meta.total + response.published.meta.total;
        this.trashCount = response.trash.meta.total;
      },
    });
  }

  private selectAllMatchingPosts(): void {
    if (this.selectingAll) {
      return;
    }

    const batchSize = 50;
    this.selectingAll = true;
    this.postsService.listAuthorPosts(this.buildListParams(1, batchSize)).subscribe({
      next: firstPage => {
        const remainingPages = Array.from(
          { length: Math.max(0, firstPage.meta.totalPages - 1) },
          (_, index) => index + 2,
        );

        if (!remainingPages.length) {
          this.finishSelectAll([firstPage.data]);
          return;
        }

        forkJoin(
          remainingPages.map(page => this.postsService.listAuthorPosts(this.buildListParams(page, batchSize))),
        ).subscribe({
          next: responses => this.finishSelectAll([
            firstPage.data,
            ...responses.map(response => response.data),
          ]),
          error: (error: unknown) => this.failSelectAll(error),
        });
      },
      error: (error: unknown) => this.failSelectAll(error),
    });
  }

  private finishSelectAll(postPages: AuthorPost[][]): void {
    this.selectedPostIds = new Set(postPages.flat().map(post => post.id));
    this.selectingAll = false;
  }

  private failSelectAll(error: unknown): void {
    this.selectingAll = false;
    this.toast.showError(this.formatError(error));
  }

  private buildListParams(page: number, limit: number): PostListParams {
    const selectedLanguage = this.languageOptions.find(
      language => language.code.toLowerCase() === this.languageFilter,
    );

    return {
      status: this.status,
      trash: this.trash,
      search: this.search.trim() || undefined,
      originalLanguageId: selectedLanguage?.id,
      categoryId: this.categoryFilter === 'all' ? undefined : Number(this.categoryFilter),
      page,
      limit,
    };
  }

  private restoreListState(): void {
    const params = this.route.snapshot.queryParamMap;
    const requestedStatus = params.get('status');
    const allowedStatuses = new Set<string>([...this.statuses, 'public']);
    const requestedPage = Number(params.get('page'));

    this.status = requestedStatus && allowedStatuses.has(requestedStatus)
      ? requestedStatus as PostStatus | 'all' | 'public'
      : 'all';
    this.trash = params.get('trash') === 'true';
    this.page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    this.search = params.get('search') ?? '';
    this.searchInput = this.search;
    this.languageFilter = params.get('language') ?? 'all';
    this.categoryFilter = params.get('category') ?? 'all';
  }

  private syncListState(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.listStateQueryParams(),
      replaceUrl: true,
    });
  }

  private listReturnUrl(): string {
    return this.router.serializeUrl(
      this.router.createUrlTree(['/workspace/posts'], {
        queryParams: this.listStateQueryParams(),
      }),
    );
  }

  private listStateQueryParams(): Record<string, string | number | boolean | null> {
    return {
      page: this.page > 1 ? this.page : null,
      status: this.status !== 'all' ? this.status : null,
      trash: this.trash || null,
      search: this.search.trim() || null,
      language: this.languageFilter !== 'all' ? this.languageFilter : null,
      category: this.categoryFilter !== 'all' ? this.categoryFilter : null,
    };
  }

  private openConfirmation(action: ConfirmationAction, posts: AuthorPost[]): void {
    this.openConfirmationIds(action, posts.map(post => post.id));
  }

  private openConfirmationIds(action: ConfirmationAction, ids: string[]): void {
    this.confirmationAction = action;
    this.confirmationPostIds = ids;
  }

  private formatError(error: unknown): string {
    return getApiErrorMessage(error, this.locale.translate('request_failed'), true);
  }
}
