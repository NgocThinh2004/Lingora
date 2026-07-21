import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthorPost, PaginationMeta, PostStatus, PostTranslation } from '../../core/models/post.model';
import { PostsService } from '../../core/services/posts.service';

type AuthorAction = 'submit' | 'archive' | 'restore' | 'trash' | 'restore-trash';

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-posts.component.html',
  styleUrl: './my-posts.component.scss',
})
export class MyPostsComponent implements OnInit {
  private readonly postsService = inject(PostsService);

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
  selectedPostIds = new Set<number>();
  darkMode = false;
  sidebarMenuOpen = false;

  ngOnInit(): void {
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
        limit: 50,
      })
      .subscribe({
        next: (response) => {
          this.posts = response.data;
          this.meta = response.meta;
          this.selectedPostIds.clear();
          this.loading = false;
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
      return 'Trash';
    }

    if (post.status === 'pending_review') {
      return 'Pending';
    }

    return post.status.replace('_', ' ');
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

  trackPost(_index: number, post: AuthorPost): number {
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
