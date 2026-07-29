import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../services/comment.service';
import { Comment } from '../../models/comment.model';
import { LikeService } from '../../services/like.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/locale/locale.service';
import { RouterModule } from '@angular/router';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.scss']
})
export class CommentSectionComponent implements OnInit, OnChanges {
  @Input({ required: true }) postId!: number;
  @Input({ required: true }) postAuthorId!: number;

  private commentService = inject(CommentService);
  private likeService = inject(LikeService);
  public localeService = inject(LocaleService);
  public authService = inject(AuthService);
  private authModalService = inject(AuthModalService);

  comments = signal<Comment[]>([]);
  totalComments = signal<number>(0);
  loading = signal<boolean>(false);
  
  currentPage = signal<number>(1);
  hasMore = signal<boolean>(false);

  newCommentText = signal<string>('');
  isSubmitting = signal<boolean>(false);

  replyingToCommentId = signal<string | null>(null);
  replyingToText = signal<string>('');

  editingCommentId = signal<string | null>(null);
  editingCommentText = signal<string>('');
  
  translatingIds = signal<Set<string>>(new Set());
  showingTranslationIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadComments(1);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && !changes['postId'].isFirstChange()) {
      this.comments.set([]);
      this.loadComments(1);
    }
  }

  loadComments(page: number = 1): void {
    if (page === 1) this.loading.set(true);
    this.commentService.getCommentsByPost(this.postId.toString(), page).subscribe({
      next: (res) => {
        if (page === 1) {
          this.comments.set(res.items);
        } else {
          this.comments.update(prev => [...prev, ...res.items]);
        }
        this.totalComments.set(res.meta.total);
        this.currentPage.set(res.meta.page);
        this.hasMore.set(res.meta.page < res.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.loadComments(this.currentPage() + 1);
  }

  setReplyTarget(comment: Comment): void {
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }
    this.replyingToCommentId.set(comment.id);
    this.replyingToText.set('');
  }

  handleCommentFocus(event: FocusEvent): void {
    if (!this.authService.isAuthenticated()) {
      (event.target as HTMLElement).blur();
      this.authModalService.open();
    }
  }

  cancelReply(): void {
    this.replyingToCommentId.set(null);
    this.replyingToText.set('');
  }

  submitComment(): void {
    const content = this.newCommentText().trim();
    if (!content) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.isSubmitting.set(true);

    this.commentService.createComment(this.postId.toString(), content).subscribe({
      next: (newComment) => {
        this.isSubmitting.set(false);
        this.newCommentText.set('');
        this.comments.update(prev => [newComment, ...prev]);
        this.totalComments.update(t => t + 1);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  submitReply(target: Comment): void {
    const content = this.replyingToText().trim();
    if (!content) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.isSubmitting.set(true);

    this.commentService.createComment(this.postId.toString(), content, target.id).subscribe({
      next: (newComment) => {
        this.isSubmitting.set(false);
        this.replyingToText.set('');
        this.replyingToCommentId.set(null);
        
        // Mutate array
        this.comments.update(prev => {
          const arr = [...prev];
          const parentId = target.parent_id || target.id;
          const parentIdx = arr.findIndex(c => c.id === parentId);
          if (parentIdx > -1) {
            arr[parentIdx] = { ...arr[parentIdx] };
            if (!arr[parentIdx].replies) arr[parentIdx].replies = [];
            arr[parentIdx].replies.push(newComment);
          }
          return arr;
        });
        this.totalComments.update(t => t + 1);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  toggleLike(comment: Comment): void {
    if (comment.isLiking) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    const previousLiked = comment.liked === true;  // guard: undefined → false
    const previousLikeCount = comment.likeCount ?? 0;
    const nextLiked = !previousLiked;
    const nextLikeCount = nextLiked ? previousLikeCount + 1 : Math.max(0, previousLikeCount - 1);

    comment.liked = nextLiked;
    comment.likeCount = nextLikeCount;
    comment.isLiking = true;

    this.likeService.toggleCommentLike(this.postId, Number(comment.id)).subscribe({
      next: (res) => {
        comment.liked = res.liked;
        comment.likeCount = res.likeCount;
        comment.isLiking = false;
      },
      error: () => {
        comment.liked = previousLiked;
        comment.likeCount = previousLikeCount;
        comment.isLiking = false;
      }
    });
  }

  deleteComment(comment: Comment, parent?: Comment): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    this.commentService.deleteComment(this.postId.toString(), comment.id).subscribe(() => {
      this.comments.update(prev => {
        if (parent) {
          const arr = [...prev];
          const parentIdx = arr.findIndex(c => c.id === parent.id);
          if (parentIdx > -1) {
            arr[parentIdx] = { ...arr[parentIdx] };
            if (arr[parentIdx].replies) {
              arr[parentIdx].replies = arr[parentIdx].replies.filter((r: any) => r.id !== comment.id);
            }
          }
          return arr;
        }
        return prev.filter(c => c.id !== comment.id);
      });
      this.totalComments.update(t => t - 1);
    });
  }

  startEdit(comment: Comment): void {
    this.editingCommentId.set(comment.id);
    this.editingCommentText.set(comment.content);
  }

  cancelEdit(): void {
    this.editingCommentId.set(null);
    this.editingCommentText.set('');
  }

  saveEdit(comment: Comment, parent?: Comment): void {
    const text = this.editingCommentText().trim();
    if (!text || text === comment.content) {
      this.cancelEdit();
      return;
    }
    this.commentService.updateComment(this.postId.toString(), comment.id, text).subscribe({
      next: (updatedComment) => {
        this.cancelEdit();
        this.comments.update(prev => {
          if (parent) {
            const arr = [...prev];
            const pIdx = arr.findIndex(c => c.id === parent.id);
            if (pIdx > -1) {
              arr[pIdx] = { ...arr[pIdx] };
              if (arr[pIdx].replies) {
                const rIdx = arr[pIdx].replies.findIndex((r: any) => r.id === comment.id);
                if (rIdx > -1) arr[pIdx].replies[rIdx] = updatedComment;
              }
            }
            return arr;
          }
          const arr = [...prev];
          const idx = arr.findIndex(c => c.id === comment.id);
          if (idx > -1) arr[idx] = updatedComment;
          return arr;
        });
      }
    });
  }

  canEdit(comment: Comment): boolean {
    const userId = this.authService.currentUser()?.id;
    const authorId = comment.author?.id || comment.user_id;
    return userId !== undefined && String(userId) === String(authorId);
  }

  isPostAuthor(comment: Comment): boolean {
    const authorId = comment.author?.id || comment.user_id;
    return String(authorId) === String(this.postAuthorId);
  }

  canDelete(comment: Comment): boolean {
    const userId = this.authService.currentUser()?.id;
    if (userId === undefined) return false;
    const authorId = comment.author?.id || comment.user_id;
    return String(userId) === String(authorId) || String(userId) === String(this.postAuthorId);
  }

  toggleTranslate(comment: Comment): void {
    const currentLangCode = this.localeService.selectedLocale();
    
    // Check if already showing, then just toggle off
    if (this.isShowingTranslation(comment)) {
      this.showingTranslationIds.update(set => {
        const newSet = new Set(set);
        newSet.delete(comment.id);
        return newSet;
      });
      return;
    }

    // Check if already in cache
    const existingTrans = this.getTranslation(comment);
    if (existingTrans) {
      this.showingTranslationIds.update(set => new Set(set).add(comment.id));
      return;
    }

    // Call API
    this.translatingIds.update(set => new Set(set).add(comment.id));
    this.commentService.translateComment(this.postId.toString(), comment.id, currentLangCode).subscribe({
      next: (res) => {
        if (!comment.translations) comment.translations = [];
        const idx = comment.translations.findIndex(t => t.language_id === res.language_id);
        if (idx > -1) {
          comment.translations[idx] = res;
        } else {
          comment.translations.push(res);
        }
        
        this.translatingIds.update(set => {
          const newSet = new Set(set);
          newSet.delete(comment.id);
          return newSet;
        });
        
        this.showingTranslationIds.update(set => new Set(set).add(comment.id));
      },
      error: () => {
        this.translatingIds.update(set => {
          const newSet = new Set(set);
          newSet.delete(comment.id);
          return newSet;
        });
      }
    });
  }

  getTranslation(comment: Comment): any {
    if (!comment.translations || comment.translations.length === 0) return null;
    const currentLang = this.localeService.selectedLocale();
    return comment.translations.find(t => t.language?.code === currentLang);
  }
  
  isShowingTranslation(comment: Comment): boolean {
    return this.showingTranslationIds().has(comment.id);
  }
  
  isTranslating(comment: Comment): boolean {
    return this.translatingIds().has(comment.id);
  }
}
