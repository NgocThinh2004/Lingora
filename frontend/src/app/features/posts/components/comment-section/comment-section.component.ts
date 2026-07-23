import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../services/comment.service';
import { Comment } from '../../models/comment.model';
import { LikeService } from '../../services/like.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LocaleService } from '../../../../core/services/locale.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.scss']
})
export class CommentSectionComponent implements OnInit {
  @Input({ required: true }) postId!: number;
  @Input({ required: true }) postAuthorId!: number;
  
  private commentService = inject(CommentService);
  private likeService = inject(LikeService);
  public localeService = inject(LocaleService);
  public authService = inject(AuthService);

  comments = signal<Comment[]>([]);
  totalComments = signal<number>(0);
  loading = signal<boolean>(false);
  
  newCommentText = signal<string>('');
  isSubmitting = signal<boolean>(false);
  
  replyingToCommentId = signal<string | null>(null);
  replyingToText = signal<string>('');
  
  editingCommentId = signal<string | null>(null);
  editingCommentText = signal<string>('');

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.loading.set(true);
    this.commentService.getCommentsByPost(this.postId.toString()).subscribe({
      next: (res) => {
        this.comments.set(res.items);
        this.totalComments.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setReplyTarget(comment: Comment): void {
    this.replyingToCommentId.set(comment.id);
    this.replyingToText.set('');
  }

  cancelReply(): void {
    this.replyingToCommentId.set(null);
    this.replyingToText.set('');
  }

  submitComment(): void {
    const content = this.newCommentText().trim();
    if (!content || !this.authService.isAuthenticated()) return;

    this.isSubmitting.set(true);
    
    this.commentService.createComment(this.postId.toString(), content).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.newCommentText.set('');
        this.loadComments();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  submitReply(target: Comment): void {
    const content = this.replyingToText().trim();
    if (!content || !this.authService.isAuthenticated()) return;

    this.isSubmitting.set(true);
    
    this.commentService.createComment(this.postId.toString(), content, target.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.replyingToText.set('');
        this.replyingToCommentId.set(null);
        this.loadComments();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  toggleLike(comment: Comment): void {
    if (!this.authService.isAuthenticated()) return;
    this.likeService.toggleCommentLike(this.postId, Number(comment.id)).subscribe((res) => {
      comment.liked = res.liked;
      comment.likeCount = res.likeCount;
    });
  }

  deleteComment(comment: Comment): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    this.commentService.deleteComment(this.postId.toString(), comment.id).subscribe(() => {
      this.loadComments();
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

  saveEdit(comment: Comment): void {
    const text = this.editingCommentText().trim();
    if (!text || text === comment.content) {
      this.cancelEdit();
      return;
    }
    this.commentService.updateComment(this.postId.toString(), comment.id, text).subscribe({
      next: () => {
        this.cancelEdit();
        this.loadComments();
      }
    });
  }

  canEdit(comment: Comment): boolean {
    const userId = this.authService.currentUser()?.id;
    const authorId = comment.author?.id || comment.user_id;
    return userId !== undefined && String(userId) === String(authorId);
  }

  canDelete(comment: Comment): boolean {
    const userId = this.authService.currentUser()?.id;
    if (userId === undefined) return false;
    const authorId = comment.author?.id || comment.user_id;
    return String(userId) === String(authorId) || String(userId) === String(this.postAuthorId);
  }

  translateComment(comment: Comment): void {
    const currentLangCode = this.localeService.selectedLocale();
    this.commentService.translateComment(this.postId.toString(), comment.id, currentLangCode).subscribe((res) => {
      if (!comment.translations) comment.translations = [];
      const idx = comment.translations.findIndex(t => t.language_id === res.language_id);
      if (idx > -1) {
        comment.translations[idx] = res;
      } else {
        comment.translations.push(res);
      }
    });
  }

  getTranslation(comment: Comment): any {
    if (!comment.translations || comment.translations.length === 0) return null;
    const currentLang = this.localeService.selectedLocale();
    return comment.translations.find(t => t.language?.code === currentLang);
  }
}
