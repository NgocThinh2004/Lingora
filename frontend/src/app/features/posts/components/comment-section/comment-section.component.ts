import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../services/comment.service';
import { Comment } from '../../models/comment.model';
import { LikeService } from '../../services/like.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { LocaleService } from '../../../../core/locale/locale.service';
import { RouterModule, RouterLink } from '@angular/router';
import { AuthorTooltipComponent } from '../../../users/components/author-tooltip/author-tooltip.component';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { CompactNumberPipe } from '../../../../shared/pipes/compact-number.pipe';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENT TỔNG QUAN: CommentSectionComponent
 * ═══════════════════════════════════════════════════════════════════════════
 * Component chịu trách nhiệm quản lý hiển thị, tạo mới, chỉnh sửa, xóa và
 * xử lý các tương tác (like, reply, dịch thuật) cho các bình luận của bài viết.
 * 
 * Hỗ trợ cấu trúc comment 2 cấp (Level 1: Root comments, Level 2: Replies).
 */
@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, AuthorTooltipComponent, CompactNumberPipe, AssetImageDirective, TranslatePipe, LocalizedDatePipe],
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
  private toastService = inject(ToastService);

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL STATE / DB FIELD MAPPING
  // ═══════════════════════════════════════════════════════════════════════════
  
  // comments (Signal): Danh sách bình luận gốc (Root comments).
  // - map từ bảng comments có parent_id = null.
  // - Mỗi comment chứa mảng `replies` map từ các comments có parent_id = id_của_nó.
  comments = signal<Comment[]>([]);
  
  // totalComments: map từ COUNT() các records liên quan trong DB.
  totalComments = signal<number>(0);
  loading = signal<boolean>(false);
  
  // Trạng thái phân trang
  currentPage = signal<number>(1);
  hasMore = signal<boolean>(false);

  newCommentText = '';
  isSubmitting = signal<boolean>(false);

  // ID của comment đang được người dùng bấm 'Reply' (map từ comment.id / comments.id)
  replyingToCommentId = signal<string | null>(null);
  replyingToText = '';

  editingCommentId = signal<string | null>(null);
  editingCommentText = '';
  
  commentToDelete = signal<{ comment: Comment, parent?: Comment } | null>(null);
  
  translatingIds = signal<Set<string>>(new Set());
  showingTranslationIds = signal<Set<string>>(new Set());

  // Set lưu trữ ID của các bình luận đang được mở rộng (Read More)
  expandedCommentIds = signal<Set<string>>(new Set());

  toggleExpand(commentId: string): void {
    const current = this.expandedCommentIds();
    const next = new Set(current);
    if (next.has(commentId)) {
      next.delete(commentId);
    } else {
      next.add(commentId);
    }
    this.expandedCommentIds.set(next);
  }

  isExpanded(commentId: string): boolean {
    return this.expandedCommentIds().has(commentId);
  }

  ngOnInit(): void {
    this.loadComments(1);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && !changes['postId'].isFirstChange()) {
      this.comments.set([]);
      this.loadComments(1); // Reset và load lại nếu chuyển sang bài viết khác
    }
  }

  /**
   * ══════════════════════════════════════════════════════
   * PIPELINE LOAD COMMENTS
   * ══════════════════════════════════════════════════════
   * API 1: getCommentsByPost(postId, page) → lấy danh sách root comments & replies
   * Map từ DB:
   * - parent_id IS NULL -> Root Comments
   * - parent_id IS NOT NULL -> Nằm trong mảng `replies`
   */
  loadComments(page: number = 1): void {
    if (page === 1) this.loading.set(true);
    this.commentService.getCommentsByPost(this.postId.toString(), page).subscribe({
      next: (res) => {
        if (page === 1) {
          // Trang 1: Thay thế toàn bộ mảng
          this.comments.set(res.items);
        } else {
          // Trang > 1: Lấy mảng cũ, trải nghiệm (spread) và nối kết quả mới vào cuối mảng.
          // Đây là kỹ thuật Load More (Append), giữ nguyên những gì người dùng đang xem.
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

  // Gán ID comment mục tiêu khi người dùng nhấn "Trả lời"
  setReplyTarget(comment: Comment, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }
    this.replyingToCommentId.set(comment.id);
    this.replyingToText = '';
    this.editingCommentId.set(null);
    this.editingCommentText = '';
  }

  handleCommentFocus(event: FocusEvent): void {
    if (!this.authService.isAuthenticated()) {
      (event.target as HTMLElement).blur();
      this.authModalService.open();
    }
  }

  cancelReply(): void {
    this.replyingToCommentId.set(null);
    this.replyingToText = '';
  }

  /**
   * Đăng một bình luận gốc (Root comment) mới
   */
  submitComment(): void {
    const content = this.newCommentText.trim();
    if (!content) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.isSubmitting.set(true);

    this.commentService.createComment(this.postId.toString(), content).subscribe({
      next: (newComment) => {
        this.isSubmitting.set(false);
        this.newCommentText = '';
        // Đẩy comment mới lên đầu mảng
        this.comments.update(prev => [newComment, ...prev]);
        this.totalComments.update(t => t + 1);
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  /**
   * submitReply() - Gửi bình luận trả lời (Reply)
   * Phía BE áp dụng thiết kế Flat-Thread (chuỗi phẳng):
   * `parent_id` của comment mới luôn là Root.id. 
   * Update ngay trên local mảng replies của root tương ứng.
   */
  submitReply(target: Comment): void {
    const content = this.replyingToText.trim();
    if (!content) return;
    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.isSubmitting.set(true);

    this.commentService.createComment(this.postId.toString(), content, target.id).subscribe({
      next: (newComment) => {
        this.isSubmitting.set(false);
        this.replyingToText = '';
        this.replyingToCommentId.set(null);
        
        // Cập nhật State UI cục bộ (Mutate array):
        this.comments.update(prev => {
          const arr = [...prev];
          // Nếu `target` là một reply, parentId của nó sẽ là ID của Root comment.
          // Ngược lại, nếu `target` chính là Root, lấy ID của nó.
          const parentId = target.parent_id || target.id;
          
          // Tìm index của Root comment trong danh sách
          const parentIdx = arr.findIndex(c => c.id === parentId);
          if (parentIdx > -1) {
            arr[parentIdx] = { ...arr[parentIdx] };
            if (!arr[parentIdx].replies) arr[parentIdx].replies = [];
            // Push reply mới vào đúng mảng `rootComment.replies[]`
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

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * CƠ CHẾ OPTIMISTIC UPDATE (khi like/unlike comment)
   * ═══════════════════════════════════════════════════════════════════════════
   * 1. Lập tức đổi UI (liked = !liked, likeCount ± 1) TRƯỚC KHI gọi API.
   * 2. Gọi API thay đổi dữ liệu trong table `comment_likes`
   * 3. Thành công → cập nhật lại likeCount chính xác từ DB.
   * 4. Thất bại → Rollback UI về trạng thái cũ.
   */
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

    // FE optimistic: thay đổi trước
    comment.liked = nextLiked;
    comment.likeCount = nextLikeCount;
    comment.isLiking = true;

    // Thay đổi comment_likes table phía BE
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

  // Xóa bình luận
  deleteComment(comment: Comment, parent?: Comment): void {
    this.commentToDelete.set({ comment, parent });
    document.body.classList.add('modal-open'); // Hiển thị modal confirm
  }

  cancelDelete(): void {
    this.commentToDelete.set(null);
    document.body.classList.remove('modal-open');
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER XÁC NHẬN "XÓA" BÌNH LUẬN (confirmDelete)
   * ═══════════════════════════════════════════════════════════════════════════
   * Điều gì xảy ra khi user bấm nút đỏ "Xóa" trên Modal?
   * 
   * 1. GỌI API: Gửi DELETE request lên BE (`/comments/:id`).
   * 2. XỬ LÝ BE (như đã nói ở CommentsService):
   *    - DB xóa comment (nếu là comment cha thì DB tự xóa luôn các reply con nhờ CASCADE).
   *    - BE trừ `comment_count` của post.
   * 3. XỬ LÝ FE (Sau khi API báo thành công):
   *    - Tắt Modal (`cancelDelete`).
   *    - Hiện thông báo Toast xanh "Đã xóa bình luận".
   *    - CẬP NHẬT GIAO DIỆN KHÔNG CẦN TẢI LẠI TRANG (Mutate Array):
   *      + TRƯỜNG HỢP XÓA COMMENT CON (REPLY): 
   *        -> Tìm thằng Root Comment (parent) của nó.
   *        -> Lọc (filter) bỏ comment bị xóa ra khỏi mảng `replies` của thằng Root.
   *      + TRƯỜNG HỢP XÓA COMMENT CHA (ROOT):
   *        -> Lọc (filter) bỏ comment đó ra khỏi mảng `comments` gốc ngoài cùng.
   *        -> Kéo theo việc toàn bộ mảng `replies` con của nó biến mất khỏi UI.
   *    - Giảm tổng số `totalComments` trên giao diện đi 1 (Lưu ý: FE cũng bị chung 
   *      tình trạng với BE là chỉ trừ 1, mặc dù nếu xoá cha thì mất thêm cả chục cái con).
   * ═══════════════════════════════════════════════════════════════════════════
   */
  confirmDelete(): void {
    const target = this.commentToDelete();
    if (!target) return;
    const { comment, parent } = target;
    
    this.commentService.deleteComment(this.postId.toString(), comment.id).subscribe(() => {
      this.cancelDelete();
      this.toastService.showSuccess(this.localeService.translate('comment_deleted'));
      
      let deletedCount = 1;
      
      this.comments.update(prev => {
        // Tương tự submitReply, nếu xóa reply thì phải vào trong array replies của cha để filter loại bỏ nó
        if (parent) {
          const arr = [...prev];
          const parentIdx = arr.findIndex(c => c.id === parent.id);
          if (parentIdx > -1) {
            arr[parentIdx] = { ...arr[parentIdx] };
            if (arr[parentIdx].replies) {
              arr[parentIdx].replies = arr[parentIdx].replies.filter((r: Comment) => r.id !== comment.id);
            }
          }
          return arr;
        }
        // Nếu xóa root comment thì filter trực tiếp trên mảng ngoài cùng
        // Đồng thời đếm số lượng replies bị xóa theo
        const targetRoot = prev.find(c => c.id === comment.id);
        if (targetRoot && targetRoot.replies) {
          deletedCount += targetRoot.replies.length;
        }
        
        return prev.filter(c => c.id !== comment.id);
      });
      this.totalComments.update(t => t - deletedCount);
    });
  }

  // Bắt đầu chỉnh sửa bình luận
  startEdit(comment: Comment, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingCommentId.set(comment.id);
    this.editingCommentText = comment.content;
    this.replyingToCommentId.set(null);
    this.replyingToText = '';
  }

  cancelEdit(): void {
    this.editingCommentId.set(null);
    this.editingCommentText = '';
  }

  saveEdit(comment: Comment, parent?: Comment): void {
    const text = this.editingCommentText.trim();
    if (!text || text === comment.content) {
      this.cancelEdit();
      return;
    }
    this.commentService.updateComment(this.postId.toString(), comment.id, text).subscribe({
      next: (updatedComment) => {
        this.cancelEdit();
        // Cập nhật lại UI sau khi sửa thành công bằng cách thay thế đối tượng comment trong mảng
        this.comments.update(prev => {
          if (parent) {
            const arr = [...prev];
            const pIdx = arr.findIndex(c => c.id === parent.id);
            if (pIdx > -1) {
              arr[pIdx] = { ...arr[pIdx] };
              if (arr[pIdx].replies) {
                const rIdx = arr[pIdx].replies.findIndex((r: Comment) => r.id === comment.id);
                if (rIdx > -1) {
                  arr[pIdx].replies = [...arr[pIdx].replies];
                  arr[pIdx].replies[rIdx] = { ...arr[pIdx].replies[rIdx], ...updatedComment };
                }
              }
            }
            return arr;
          }
          const arr = [...prev];
          const idx = arr.findIndex(c => c.id === comment.id);
          if (idx > -1) {
            arr[idx] = { 
              ...arr[idx], 
              ...updatedComment, 
              replies: arr[idx].replies, 
              likeCount: arr[idx].likeCount !== undefined ? arr[idx].likeCount : updatedComment.likeCount,
              liked: arr[idx].liked !== undefined ? arr[idx].liked : updatedComment.liked
            };
          }
          return arr;
        });
      }
    });
  }

  canEdit(comment: Comment): boolean {
    return !!comment.permissions?.canEdit;
  }

  isPostAuthor(comment: Comment): boolean {
    const authorId = comment.author?.id || comment.user_id;
    return String(authorId) === String(this.postAuthorId);
  }

  isCommentEdited(comment: Comment): boolean {
    if (!comment.updated_at || !comment.created_at) return false;
    const created = new Date(comment.created_at).getTime();
    const updated = new Date(comment.updated_at).getTime();
    return updated > created;
  }

  canDelete(comment: Comment): boolean {
    return !!comment.permissions?.canDelete;
  }

  shouldShowTranslateButton(comment: Comment): boolean {
    const currentLangCode = this.localeService.selectedLocale();
    if (comment.originalLanguage?.code) {
      return comment.originalLanguage.code !== currentLangCode;
    }
    return false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (this.replyingToCommentId()) {
      if (!target.closest('.reply-container')) {
        this.cancelReply();
      }
    }
    
    if (this.editingCommentId()) {
      if (!target.closest('.edit-container')) {
        this.cancelEdit();
      }
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "DỊCH BÌNH LUẬN" (toggleTranslate)
   * ═══════════════════════════════════════════════════════════════════════════
   * Điều gì xảy ra khi user click vào nút "Dịch"?
   * 
   * 1. NẾU BẢN DỊCH ĐANG MỞ -> Bấm để tắt:
   *    - Loại bỏ ID của comment khỏi tập hợp `showingTranslationIds`.
   *    - Giao diện (HTML) thấy ID bị loại -> ẩn thẻ chứa bản dịch, hiện text gốc.
   * 
   * 2. NẾU ĐÃ DỊCH TỪ TRƯỚC VÀ ĐANG CACHE TRONG BỘ NHỚ (FE):
   *    - Check biến `comment.translations` xem có bản dịch của ngôn ngữ hiện tại chưa.
   *    - Nếu có -> chỉ việc thêm ID vào `showingTranslationIds` để bật UI, 
   *      KHÔNG gọi API để tránh tốn tài nguyên.
   * 
   * 3. NẾU CHƯA DỊCH BAO GIỜ (Hoặc chưa có ngôn ngữ này):
   *    - Thêm ID vào `translatingIds` -> UI hiện hiệu ứng Spinner Loading "Đang dịch...".
   *    - GỌI API: GET /translations/:commentId?lang=vi
   *    - (Phía BE sẽ check DB xem có cache chưa, nếu chưa sẽ gọi Google/DeepL).
   *    - SAU KHI API TRẢ VỀ:
   *      + Lưu bản dịch (res) vào mảng `comment.translations` để lần sau bấm sẽ dùng cache (Bước 2).
   *      + Xóa ID khỏi `translatingIds` (Tắt loading).
   *      + Thêm ID vào `showingTranslationIds` (Hiện text đã dịch).
   * ═══════════════════════════════════════════════════════════════════════════
   */
  toggleTranslate(comment: Comment): void {
    const currentLangCode = this.localeService.selectedLocale();
    
    // Nếu đang hiện thì tắt đi
    if (this.isShowingTranslation(comment)) {
      this.showingTranslationIds.update(set => {
        const newSet = new Set(set);
        newSet.delete(comment.id);
        return newSet;
      });
      return;
    }

    // Nếu đã dịch và cache rồi thì chỉ bật lên
    const existingTrans = this.getTranslation(comment);
    if (existingTrans) {
      this.showingTranslationIds.update(set => new Set(set).add(comment.id));
      return;
    }

    // Nếu chưa dịch thì gọi API backend dịch máy
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
