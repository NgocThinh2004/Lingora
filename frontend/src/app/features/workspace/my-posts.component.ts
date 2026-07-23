import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthorPost, PaginationMeta, PostStatus, PostTranslation } from '../../core/models/post.model';
import { LocaleService, UiTranslationKey } from '../../core/services/locale.service';
import { PostsService } from '../../core/services/posts.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

type AuthorAction = 'submit' | 'archive' | 'restore' | 'trash' | 'restore-trash';
type ConfirmationAction = 'trash' | 'delete-permanent';

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppSidebarComponent],
  templateUrl: './my-posts.component.html',
  styleUrl: './my-posts.component.scss',
})
export class MyPostsComponent implements OnInit {
  private readonly postsService = inject(PostsService);
  private readonly locale = inject(LocaleService);

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
  allCount = 0;
  draftCount = 0;
  publishedCount = 0;
  trashCount = 0;
  page = 1;
  status: PostStatus | 'all' = 'all';
  search = '';
  languageFilter = 'all';
  dateFilter = 'all';
  categoryFilter = 'all';
  trash = false;
  loading = false;
  busyKey = '';
  notice = '';
  error = '';
  selectedPostIds = new Set<string>();
  darkMode = false;
  sidebarMenuOpen = false;
  categoryOptions: Array<{ id: number; label: string }> = [];
  confirmationAction: ConfirmationAction | null = null;
  confirmationPostIds: string[] = [];
  confirmationBusy = false;

  ngOnInit(): void {
    this.locale.load();
    this.postsService.getPostOptions().subscribe({
      next: options => this.categoryOptions = options.categories,
    });
    this.loadPostCounts();
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading = true;
    this.notice = '';
    this.error = '';

    this.postsService
      .listAuthorPosts({
        status: this.status,
        trash: this.trash,
        search: this.search.trim() || undefined,
        page: this.page,
        limit: 50,
      })
      .subscribe({
        next: (response) => {
          this.posts = response.data;
          this.meta = response.meta;
          this.selectedPostIds.clear();
          this.loading = false;
          if (!this.trash && this.status === 'all' && !this.search.trim()) {
            this.allCount = response.meta.total;
          }
        },
        error: (error: unknown) => {
          this.error = this.formatError(error);
          this.loading = false;
        },
      });
  }

  runAction(post: AuthorPost, action: AuthorAction): void {
    this.busyKey = `${post.id}:${action}`;
    this.error = '';
    this.notice = '';

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
      next: (updatedPost) => {
        this.notice = `Bài #${updatedPost.id} đã chuyển sang ${updatedPost.deletedAt ? 'trash' : updatedPost.status}.`;
        this.busyKey = '';
        this.loadPostCounts();
        this.loadPosts();
      },
      error: (error: unknown) => {
        this.error = this.formatError(error);
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

  visiblePosts(): AuthorPost[] {
    if (this.loading) {
      return [];
    }

    const searchTerm = this.search.trim().toLowerCase();

    return this.posts.filter((post) => {
      const source = this.primaryTranslation(post);
      const text = `${source?.title ?? ''} ${source?.summary ?? ''} ${source?.content ?? ''}`.toLowerCase();
      const languageMatches =
        this.languageFilter === 'all' || this.languageCode(post.originalLanguageId).toLowerCase() === this.languageFilter;
      const dateMatches = this.dateFilter === 'all' || post.updatedAt.startsWith(this.dateFilter);
      const categoryMatches =
        this.categoryFilter === 'all' || String(post.categoryId ?? '').toLowerCase() === this.categoryFilter;

      return (!searchTerm || text.includes(searchTerm)) && languageMatches && dateMatches && categoryMatches;
    });
  }

  postSearchText(post: AuthorPost): string {
    const source = this.primaryTranslation(post);
    return `${source?.title ?? ''} ${source?.summary ?? ''}`.trim();
  }

  languageCode(languageId: number): string {
    const codes: Record<number, string> = {
      1: 'VI',
      2: 'EN',
      3: 'ZH',
    };

    return codes[languageId] ?? `L${languageId}`;
  }

  flagClass(languageId: number): string {
    const flags: Record<number, string> = {
      1: 'fi fi-vn',
      2: 'fi fi-us',
      3: 'fi fi-cn',
    };

    return flags[languageId] ?? 'fi fi-un';
  }

  translate(key: UiTranslationKey): string {
    return this.locale.translate(key);
  }

  categoryLabel(post: AuthorPost): string {
    return this.categoryOptions.find(category => category.id === post.categoryId)?.label ?? '-';
  }

  formatDate(value: string): string {
    const localeCode: Record<string, string> = {
      en: 'en-US',
      vi: 'vi-VN',
      zh: 'zh-CN',
    };

    return new Intl.DateTimeFormat(localeCode[this.locale.selectedLocale()] ?? 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  visibleItemsLabel(): string {
    const count = this.visiblePosts().length;
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
    const posts = this.visiblePosts();
    if (checked) {
      posts.forEach((post) => this.selectedPostIds.add(post.id));
      return;
    }

    posts.forEach((post) => this.selectedPostIds.delete(post.id));
  }

  areAllVisibleSelected(): boolean {
    const posts = this.visiblePosts();
    return posts.length > 0 && posts.every((post) => this.selectedPostIds.has(post.id));
  }

  runBulkAction(action: AuthorAction): void {
    const selected = this.posts.filter((post) => this.selectedPostIds.has(post.id));
    selected.forEach((post) => this.runAction(post, action));
  }

  requestTrash(post: AuthorPost): void {
    this.openConfirmation('trash', [post]);
  }

  requestPermanentDelete(post: AuthorPost): void {
    this.openConfirmation('delete-permanent', [post]);
  }

  requestBulkDelete(): void {
    const selected = this.posts.filter(post => this.selectedPostIds.has(post.id));
    if (!selected.length) {
      return;
    }

    this.openConfirmation(this.trash ? 'delete-permanent' : 'trash', selected);
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
    this.error = '';
    forkJoin(requests).subscribe({
      next: () => {
        this.confirmationBusy = false;
        this.confirmationAction = null;
        this.confirmationPostIds = [];
        this.selectedPostIds.clear();
        this.loadPostCounts();
        this.loadPosts();
      },
      error: (error: unknown) => {
        this.error = this.formatError(error);
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

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    document.documentElement.setAttribute('data-bs-theme', this.darkMode ? 'dark' : 'light');
  }

  toggleSidebarMenu(event: Event): void {
    event.stopPropagation();
    this.sidebarMenuOpen = !this.sidebarMenuOpen;
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.sidebarMenuOpen = false;
  }

  isBusy(post: AuthorPost, action: AuthorAction): boolean {
    return this.busyKey === `${post.id}:${action}`;
  }

  applySearch(): void {
    this.page = 1;
    this.loadPosts();
  }

  goToPage(page: number): void {
    const totalPages = this.meta?.totalPages ?? 1;
    if (page < 1 || page > totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.loadPosts();
  }

  private loadPostCounts(): void {
    forkJoin({
      all: this.postsService.listAuthorPosts({ status: 'all', limit: 1 }),
      drafts: this.postsService.listAuthorPosts({ status: 'draft', limit: 1 }),
      approved: this.postsService.listAuthorPosts({ status: 'approved', limit: 1 }),
      published: this.postsService.listAuthorPosts({ status: 'published', limit: 1 }),
      trash: this.postsService.listAuthorPosts({ status: 'all', trash: true, limit: 1 }),
    }).subscribe({
      next: response => {
        this.allCount = response.all.meta.total;
        this.draftCount = response.drafts.meta.total;
        this.publishedCount = response.approved.meta.total + response.published.meta.total;
        this.trashCount = response.trash.meta.total;
      },
    });
  }

  private openConfirmation(action: ConfirmationAction, posts: AuthorPost[]): void {
    this.confirmationAction = action;
    this.confirmationPostIds = posts.map(post => post.id);
  }

  private formatError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message as string | string[] | undefined;
      if (Array.isArray(message)) {
        return message.join(' ');
      }

      return message || error.message;
    }

    return 'Có lỗi xảy ra, hãy kiểm tra backend đang chạy.';
  }
}
