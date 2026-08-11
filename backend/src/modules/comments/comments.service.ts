/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TỔNG QUAN CLASS: CommentsService
 * ═══════════════════════════════════════════════════════════════════════════
 * MỤC ĐÍCH:
 * Xử lý logic nghiệp vụ cho tính năng bình luận. Bao gồm CRUD bình luận, 
 * quản lý luồng trả lời (flat-thread), phân quyền người dùng, và tích hợp dịch tự động.
 *
 * VẤN ĐỀ CẦN GIẢI QUYẾT:
 * 1. Hiển thị bình luận theo luồng (thread) nhưng không để bị lồng nhau vô hạn (nested hell).
 * 2. Tránh N+1 query khi lấy danh sách bình luận kèm theo trả lời.
 * 3. Đồng bộ số lượng comment trên bài viết khi tạo mới/xóa bình luận.
 * 4. Tự động nhận diện ngôn ngữ và hỗ trợ dịch bình luận theo yêu cầu.
 *
 * GIẢI PHÁP:
 * 1. Flat-thread: Tối đa 2 cấp. Nếu reply một reply khác, ta gán parent_id của nó bằng parent_id gốc.
 * 2. Bulk query: Lấy tất cả root comments, sau đó dùng toán tử IN để lấy tất cả replies 1 lần.
 * 3. Dùng DB Transaction: Đảm bảo việc thêm/xoá comment luôn đi kèm với việc cập nhật `comment_count` ở post.
 * 4. Tích hợp thư viện `franc-min` để auto-detect, lưu `translation_status`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Comment } from './models/comment.model';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { Language } from '../languages/models/language.model';
import { CommentTranslation } from './models/comment-translation.model';
// @ts-ignore
const franc = require('franc-min');
import { CommentLike } from '../likes/models/comment-like.model';
import { CreateCommentDto } from './dto/create-comment.dto';
import { TranslationProviderService } from '../translations/translation-provider.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment) private commentModel: typeof Comment,
    @InjectModel(Post) private postModel: typeof Post,
    @InjectModel(Language) private languageModel: typeof Language,
    @InjectModel(CommentTranslation) private commentTranslationModel: typeof CommentTranslation,
    @InjectModel(CommentLike) private commentLikeModel: typeof CommentLike,
    private translationProvider: TranslationProviderService,
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀM: create - LUỒNG XỬ LÝ TẠO BÌNH LUẬN
   * ═══════════════════════════════════════════════════════════════════════════
   * Step 1: Tìm bài viết bằng ID (Báo lỗi nếu không có). SQL: SELECT * FROM "posts" WHERE "id" = postId LIMIT 1
   * Step 2: Nếu là một reply (phản hồi): 
   *    - Tìm comment mục tiêu đang được reply.
   *    - Áp dụng cấu trúc "Flat-thread": tất cả replies đều là con trực tiếp của comment gốc (root), không có reply lồng nhau sâu hơn 2 cấp.
   * Step 3: Nhận dạng tự động (Auto-detect) ngôn ngữ của nội dung bình luận bằng thư viện `franc-min`.
   * Step 4: Tạo bình luận và tăng bộ đếm `comment_count` của bảng `posts` (Gói trong 1 DB Transaction).
   *         SQL: INSERT INTO comments ...
   *         SQL: UPDATE posts SET comment_count = comment_count + 1 WHERE id = ...
   * Step 5: Lấy lại comment vừa tạo, đính kèm thông tin user và trả về client.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async create(postId: string, userId: string, dto: CreateCommentDto): Promise<Comment | null> {
    // TÌM VÀ KIỂM TRA POST TỒN TẠI
    // DB: SELECT * FROM "posts" WHERE "id" = postId LIMIT 1
    const post = await this.postModel.findByPk(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let parentId: string | null = null;
    let replyToUserId: string | null = null;
    let replyToUsername: string | null = null;
    let replyToCommentId: string | null = null;

    // XỬ LÝ NẾU ĐÂY LÀ MỘT REPLY 
    if (dto.reply_to_comment_id) {
      // DB: Lấy comment mục tiêu kèm JOIN bảng users để lấy thông tin tác giả reply
      const replyTarget = await this.commentModel.findByPk(dto.reply_to_comment_id, {
        include: [{ model: User, as: 'author' }],
      });

      // Bắt lỗi các trường hợp không hợp lệ
      if (!replyTarget) {
        throw new BadRequestException('Reply target comment does not exist');
      }
      if (Number(replyTarget.post_id) !== Number(postId)) {
        throw new BadRequestException('Reply target comment belongs to a different post');
      }

      // FLAT THREAD LOGIC (LUỒNG PHẲNG)
      // Nếu replyTarget đã là một reply (có parent_id), ta gán parent_id của comment mới = parent_id của nó.
      // Nếu không, replyTarget là root, gán parent_id = replyTarget.id.
      // Việc này đảm bảo trên UI chỉ có tối đa 2 cấp hiển thị.
      parentId = replyTarget.parent_id || replyTarget.id;
      replyToCommentId = replyTarget.id;
      replyToUserId = replyTarget.user_id;
      replyToUsername = replyTarget.author?.display_name || replyTarget.author?.username || null;
    }

    // AUTO DETECT LANGUAGE (Nhận diện ngôn ngữ)
    // Phương án D: Ưu tiên kiểm tra Unicode script trước franc.
    // Nếu text chứa nhiều hơn 1 script (vd: Latin + CJK + Cyrillic) → đa ngôn ngữ
    // → lưu original_language_id = null để Frontend biết luôn phải hiện nút Dịch.
    let originalLanguageId: number | null = null;
    if (!this.isMultilingual(dto.content)) {
      // Text thuần 1 ngôn ngữ → giao cho franc xử lý bình thường
      // franc trả về mã ngôn ngữ chuẩn ISO 639-3 ('vie', 'eng', 'cmn')
      const detected = franc(dto.content, { minLength: 1, only: ['eng', 'vie', 'cmn'] });
      let langCode = dto.languageCode || 'en';
      if (detected === 'vie') langCode = 'vi';
      else if (detected === 'eng') langCode = 'en';
      else if (detected === 'cmn') langCode = 'zh';

      // DB: SELECT id FROM languages WHERE code = langCode
      const language = await this.languageModel.findOne({ where: { code: langCode } });
      originalLanguageId = language ? language.id : null;
    }
    // Nếu isMultilingual = true → originalLanguageId giữ nguyên là null
    // → Frontend sẽ đọc null này và hiển thị nút Dịch

    // DB TRANSACTION BẢO VỆ DỮ LIỆU
    // Transaction đảm bảo tính chất ACID cho hệ cơ sở dữ liệu
    const comment = await this.sequelize.transaction(async (transaction) => {
      // DB: INSERT INTO "comments" (...) VALUES (...)
      const created = await this.commentModel.create({
        post_id: postId,
        user_id: userId,
        parent_id: parentId,
        reply_to_comment_id: replyToCommentId,
        reply_to_user_id: replyToUserId,
        reply_to_username: replyToUsername,
        content: dto.content,
        status: 'approved', // Mặc định duyệt ngay
        original_language_id: originalLanguageId,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      // DB: UPDATE "posts" SET "comment_count" = "comment_count" + 1 WHERE "id" = postId
      // Thực thi chung transaction với create comment ở trên
      await this.postModel.increment('comment_count', { by: 1, where: { id: postId }, transaction });
      return created;
    });

    // LẤY DỮ LIỆU COMMENT HOÀN CHỈNH ĐỂ TRẢ VỀ CLIENT
    // DB: Lấy comment từ db, bao gồm JOIN sang bảng users (author) và languages (originalLanguage)
    const result = await this.commentModel.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] },
        { model: Language, as: 'originalLanguage', attributes: ['code'] }
      ],
    });
    
    // ĐÍNH KÈM THÔNG TIN PHÂN QUYỀN VÀ TRẢ VỀ
    if (result) {
      const json = result.toJSON() as any;
      json.permissions = {
        canEdit: true, // Vì chính user gọi API tạo comment này nên họ có quyền Edit/Delete
        canDelete: true
      };
      return json;
    }
    return null;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * MAPPING CÁC TRƯỜNG DB → RESPONSE (Comments Data Pipeline - getCommentsByPost)
   * ═══════════════════════════════════════════════════════════════════════════
   * comments.id                  → response.items[].id
   * comments.content             → response.items[].content
   * comments.like_count          → response.items[].likeCount
   * comments.parent_id           → Dùng để nhóm reply vào response.items[].replies
   * 
   * users.username/display_name  → response.items[].author.name
   * users.avatar                 → response.items[].author.avatar
   * 
   * comment_likes                → Xác định response.items[].liked (true/false)
   * 
   * Computed Permissions:
   * - isCommentAuthor || isPostAuthor || isAdmin → canDelete
   * - isCommentAuthor                            → canEdit
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async getCommentsByPost(postId: string, page: number = 1, limit: number = 20, userId?: number, userRole?: string) {
    const offset = (page - 1) * limit;

    // LẤY AUTHOR CỦA BÀI VIẾT
    // DB: SELECT author_id FROM "posts" WHERE id = postId
    const post = await this.postModel.findByPk(postId, { attributes: ['author_id'] });
    const postAuthorId = post?.author_id;

    // LẤY TỔNG SỐ COMMENTS ĐỂ TRẢ VỀ FRONTEND (HIỂN THỊ "15 BÌNH LUẬN")
    // DB: SELECT COUNT(*) FROM "comments" WHERE post_id = postId
    const totalCommentsCount = await this.commentModel.count({
      where: { post_id: postId }
    });

    // Step 1: Lấy root comments: WHERE post_id=? AND parent_id IS NULL
    //   → rootComments.rows: mảng Comment objects
    //   → rootCommentIds: mảng comments.id của các root
    // JOIN (include) với bảng users, comment_translations, languages
    const rootComments = await this.commentModel.findAndCountAll({
      where: { post_id: postId, parent_id: null },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] },
        { model: CommentTranslation, as: 'translations', include: [Language] },
        { model: Language, as: 'originalLanguage', attributes: ['code'] }
      ],
    });

    const rootCommentIds = rootComments.rows.map((c) => c.id);

    // Step 2: Lấy replies: WHERE parent_id IN (rootCommentIds)
    //   → replies: tất cả comment con, dùng comments.parent_id để nhóm
    // Việc query gộp như thế này giảm tránh (N+1 query problem) - không phải query từng reply cho mỗi root.
    const replies = await this.commentModel.findAll({
      where: { parent_id: rootCommentIds },
      order: [['created_at', 'ASC']], // Replies thường hiển thị từ cũ -> mới
      limit: 50, 
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] },
        { model: CommentTranslation, as: 'translations', include: [Language] },
        { model: Language, as: 'originalLanguage', attributes: ['code'] }
      ],
    });

    const allCommentIds = [...rootCommentIds, ...replies.map(r => r.id)];
    
    // Step 3: Lấy like status:
    //   → comment_likes WHERE user_id=? AND comment_id IN (allIds)
    //   → tạo Set<string> của comment_id đã like
    //   → map sang comment.liked = userLikes.has(comment.id)
    let userLikes = new Set<string>();
    if (userId && allCommentIds.length) {
      const userLikeRows = await this.commentLikeModel.findAll({
        where: { user_id: userId, comment_id: allCommentIds },
        attributes: ['comment_id'],
      });
      userLikes = new Set(userLikeRows.map((row: CommentLike) => String(row.comment_id)));
    }

    // HÀM PHỤ TRỢ (HELPER) ĐỂ XỬ LÝ DỮ LIỆU TỪNG COMMENT
    // Gán cờ liked, likeCount và phân quyền frontend (permissions) 
    const processComment = (comment: Comment) => {
      const json = comment.toJSON() as any;
      json.likeCount = comment.like_count || 0;
      json.liked = userLikes.has(String(comment.id));
      
      const isCommentAuthor = String(comment.user_id) === String(userId);
      const isPostAuthor = String(postAuthorId) === String(userId);
      const isAdmin = userRole === 'admin';

      // Quyền Edit: Chỉ tác giả comment được sửa.
      // Quyền Delete: Tác giả comment, chủ bài viết (post author) hoặc admin.
      json.permissions = {
        canEdit: isCommentAuthor,
        canDelete: isCommentAuthor || isPostAuthor || isAdmin
      };

      return json;
    };

    // Step 4: Build Map để gán replies vào đúng cha:
    //   → key: comments.parent_id → value: Reply[]
    //   → rootComments.replies = repliesMap.get(rootComment.id) || []
    const repliesMap = new Map<string, any[]>();
    replies.forEach((reply) => {
      const parentId = reply.parent_id!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(processComment(reply));
    });

    // Gán mảng replies từ Map vào lại các root comments tương ứng
    const items = rootComments.rows.map((comment) => {
      const commentJson = processComment(comment);
      commentJson.replies = repliesMap.get(comment.id) || [];
      return commentJson;
    });

    return {
      items,
      meta: {
        total: totalCommentsCount,
        page,
        limit,
        totalPages: Math.ceil(rootComments.count / limit), // rootComments.count là tổng số parent_id: null
      }
    };
  }

  /**
   * update() - Cập nhật nội dung một bình luận.
   * 
   * Luồng xử lý:
   * 1. Tìm comment, xác thực quyền (phải là tác giả).
   * 2. Cập nhật `content` mới trong DB.
   * 3. Thay đổi trạng thái các bản dịch (translations) cũ sang 'queued' để hệ thống dịch lại sau.
   * 
   * Tác động DB:
   * - SELECT FROM comments
   * - UPDATE comments SET content = new_content
   * - UPDATE comment_translations SET translation_status = 'queued' WHERE comment_id = ...
   */
  async update(commentId: string, userId: string, content: string) {
    // TÌM VÀ KIỂM TRA QUYỀN
    // DB: SELECT * FROM "comments" WHERE id = commentId
    const comment = await this.commentModel.findByPk(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (Number(comment.user_id) !== Number(userId)) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // CẬP NHẬT NỘI DUNG MỚI
    // DB: UPDATE "comments" SET content = content, updated_at = newDate WHERE id = commentId
    await comment.update({ content, updated_at: new Date() });

    // RESET TRẠNG THÁI BẢN DỊCH VỀ QUEDUED
    // Khi nội dung gốc thay đổi, bản dịch hiện tại không còn đúng nữa
    // DB: UPDATE "comment_translations" SET translation_status = 'queued' WHERE comment_id = commentId
    await this.commentTranslationModel.update(
      { translation_status: 'queued' },
      { where: { comment_id: commentId } }
    );

    // LẤY DỮ LIỆU ĐỂ TRẢ VỀ GIAO DIỆN
    const result = await this.commentModel.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] },
        { model: Language, as: 'originalLanguage', attributes: ['code'] }
      ],
    });
    
    if (result) {
      const json = result.toJSON() as any;
      json.permissions = {
        canEdit: true,
        canDelete: true
      };
      return json;
    }

    return comment;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "XÓA BÌNH LUẬN" (Hàm remove)
   * ═══════════════════════════════════════════════════════════════════════════
   * Luồng xử lý chi tiết từ UI xuống DB:
   * 1. Lấy thông tin comment kèm post_id và author bài viết.
   * 2. Xác minh quyền hạn (Tác giả bình luận / Tác giả bài viết / Admin).
   * 3. Mở DB Transaction để bảo đảm an toàn dữ liệu.
   * 4. Thực hiện xóa:
   *    - NẾU XÓA COMMENT CON (REPLY): Nó chỉ xóa duy nhất bản ghi đó.
   *    - NẾU XÓA COMMENT CHA (ROOT): Trong DB đã được cấu hình Foreign Key 
   *      (parent_id) với ON DELETE CASCADE, nên khi xóa cha, CẢ NHÁNH CON
   *      (tất cả replies) sẽ tự động bị xóa khỏi CSDL.
   * 5. Giảm `comment_count` ở post. (Lưu ý: Logic hiện tại chỉ giảm 1, 
   *    nếu xóa cha có nhiều con thì bộ đếm ở post có thể sẽ bị lệch. Cần audit lại).
   * 
   * Tại sao phải dùng Transaction ở đây?
   * - Đảm bảo dữ liệu `comment_count` của post (ở bảng posts) phải giảm 
   *   ĐỒNG THỜI với việc bản ghi comment bị xóa ở bảng comments.
   * - Nếu DB crash ngay giữa chừng, thao tác sẽ bị huỷ, tránh việc xoá comment
   *   xong mà số đếm ở bài viết không giảm.
   * 
   * Tác động DB cụ thể:
   * - BƯỚC 1 (Check quyền): SELECT c.*, p.author_id FROM "comments" c JOIN "posts" p ON c.post_id = p.id WHERE c.id = ?
   * - BƯỚC 2 (Transaction bắt đầu)
   * - BƯỚC 3 (Xóa): DELETE FROM "comments" WHERE id = ? 
   *   (Và DB tự trigger DELETE replies nếu là comment cha)
   * - BƯỚC 4 (Cập nhật Post): UPDATE "posts" SET comment_count = comment_count - 1 WHERE id = ?
   * - BƯỚC 5 (Transaction kết thúc/commit)
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async remove(commentId: string, userId: string, userRole?: string) {
    // LẤY DỮ LIỆU COMMENT VÀ BÀI VIẾT
    // DB: SELECT c.*, p.author_id FROM "comments" c JOIN "posts" p ON c.post_id = p.id
    const comment = await this.commentModel.findByPk(commentId, {
      include: [{ model: Post }]
    });
    if (!comment) throw new NotFoundException('Comment not found');

    // KIỂM TRA QUYỀN
    const isAuthor = Number(comment.user_id) === Number(userId);
    const isPostAuthor = Number(comment.post.author_id) === Number(userId);
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isPostAuthor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    // THỰC THI TRANSACTION
    await this.sequelize.transaction(async (transaction) => {
      // Đếm số lượng reply bị xóa theo (nếu đây là root comment)
      let deletedCount = 1;
      if (!comment.parent_id) {
        const repliesCount = await this.commentModel.count({
          where: { parent_id: comment.id },
          transaction
        });
        deletedCount += repliesCount;
      }

      // Step 1: Xóa bình luận
      // DB: DELETE FROM "comments" WHERE id = commentId
      await comment.destroy({ transaction });

      // Step 2: Giảm tổng số comment hiển thị trên bài viết
      // DB: UPDATE "posts" SET comment_count = comment_count - deletedCount WHERE id = post_id
      await this.postModel.decrement('comment_count', { by: deletedCount, where: { id: comment.post_id }, transaction });
    });

    return { success: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "DỊCH BÌNH LUẬN" (Hàm translate)
   * ═══════════════════════════════════════════════════════════════════════════
   * Luồng xử lý khi người dùng ấn biểu tượng dịch (Translate):
   * 1. UI gửi request kèm ID của comment và mã ngôn ngữ đích (vd: 'vi').
   * 2. Tìm ID ngôn ngữ trong bảng `languages`.
   * 3. KIỂM TRA CACHE (bảng `comment_translations`):
   *    - Tìm xem comment này ĐÃ TỪNG được dịch sang ngôn ngữ này chưa.
   *    - Nếu có và status là 'completed': Không cần gọi API bên thứ 3 (Google/DeepL), 
   *      bỏ qua bước dịch và trả thẳng bản dịch cũ từ DB về cho UI. (Tiết kiệm tiền API).
   * 4. NẾU CHƯA CÓ HOẶC LỖI:
   *    - Tạo một bản ghi mới trong `comment_translations` với status = 'queued'.
   *    - Đổi status sang 'processing'.
   *    - GỌI API EXTERNAL (Provider: Google/DeepL/Azure...) truyền content thô sang.
   * 5. NHẬN KẾT QUẢ API:
   *    - Nếu ok: Cập nhật status = 'completed' và lưu text đã dịch vào trường `content`.
   *    - Nếu lỗi: Cập nhật status = 'failed' (lần sau user bấm dịch sẽ thử lại).
   * 
   * Tác động DB cụ thể:
   * - BƯỚC 1: SELECT id FROM "languages" WHERE code = 'vi'
   * - BƯỚC 2: SELECT * FROM "comment_translations" WHERE comment_id = ? AND language_id = ?
   * - BƯỚC 3: Nếu chưa có -> INSERT INTO "comment_translations" (comment_id, language_id, content, status) VALUES (..., 'queued')
   * - BƯỚC 4: UPDATE "comment_translations" SET translation_status = 'processing'
   * - BƯỚC 5: (Chờ API) -> UPDATE "comment_translations" SET content = 'Nội dung tiếng Việt', translation_status = 'completed'
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async translate(commentId: string, languageCode: string) {
    // TÌM NGÔN NGỮ ĐÍCH
    // DB: SELECT * FROM languages WHERE code = languageCode
    const language = await this.languageModel.findOne({ where: { code: languageCode } });
    if (!language) throw new BadRequestException('Language not found');

    // LẤY BẢN DỊCH HIỆN CÓ
    // DB: Lấy dữ liệu dịch của comment này sang ngôn ngữ đích tương ứng
    let translation = await this.commentTranslationModel.findOne({
      where: { comment_id: commentId, language_id: language.id },
      include: [Language]
    });

    const comment = await this.commentModel.findByPk(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    // TẠO BẢN GHI DỊCH NẾU CHƯA TỒN TẠI
    if (!translation) {
      // DB: INSERT INTO "comment_translations"
      translation = await this.commentTranslationModel.create({
        comment_id: commentId,
        language_id: language.id,
        content: comment.content,
        translation_status: 'queued'
      });
    }

    // TIẾN HÀNH DỊCH (CALL API EXTERNAL)
    // Phát hiện bản dịch bị stale/không hoàn chỉnh bằng 2 heuristic:
    // 1. Content bằng nội dung gốc → chưa được dịch gì cả
    // 2. Target là ngôn ngữ Latin (vi, en, es...) nhưng bản dịch vẫn còn ký tự
    //    CJK/Cyrillic/Arabic → bản dịch cũ bị thiếu (chỉ dịch một phần)
    const isStaleTranslation = translation.translation_status === 'completed'
      && (translation.content === comment.content
        || this.isTranslationIncomplete(translation.content, languageCode));
    if (isStaleTranslation) {
      await translation.update({ translation_status: 'failed' });
    }

    // Nếu trạng thái chưa ổn thì sẽ cập nhật thành 'processing' và gọi API
    if (translation.translation_status === 'failed' || translation.translation_status === 'not_started' || translation.translation_status === 'queued') {
      await translation.update({ translation_status: 'processing' });
      try {
        // Gọi service bên ngoài (Provider: Google/DeepL/Azure...)
        // sourceLanguageCode = 'auto' để API tự detect toàn bộ ngôn ngữ trong câu
        const result = await this.translationProvider.translateWithFallback({
          texts: [comment.content],
          sourceLanguageCode: 'auto',
          targetLanguageCode: languageCode,
          format: 'text',
        });

        // CẬP NHẬT KẾT QUẢ VÀO DB
        if (result.ok) {
          const translatedText = result.texts[0];
          // Kiểm tra Google có thực sự dịch không, hay trả về y nguyên input
          // (xảy ra khi Google auto-detect nhầm source = target language)
          const isUnchanged = translatedText.trim() === comment.content.trim();
          if (isUnchanged) {
            // Google trả về nguyên text → thử lại với sl=zh (buộc dịch từ Trung)
            // vì text đa ngôn ngữ thường có nhiều ký tự CJK mà Google bỏ qua
            const retryResult = await this.translationProvider.translateWithFallback({
              texts: [comment.content],
              sourceLanguageCode: 'zh',
              targetLanguageCode: languageCode,
              format: 'text',
            });
            if (retryResult.ok && retryResult.texts[0].trim() !== comment.content.trim()) {
              await translation.update({ content: retryResult.texts[0], translation_status: 'completed' });
            } else {
              await translation.update({ translation_status: 'failed' });
            }
          } else {
            // DB: UPDATE comment_translations SET content = result.texts[0], status = 'completed'
            await translation.update({ content: translatedText, translation_status: 'completed' });
          }
        } else {
          await translation.update({ translation_status: 'failed' });
        }
      } catch (e) {
        await translation.update({ translation_status: 'failed' });
      }
    }

    // Trả về bản ghi mới nhất
    return this.commentTranslationModel.findByPk(translation.id, { include: [Language] });
  }

  /**
   * getDashboardMetrics() - Thống kê số lượng bình luận cho trang Admin Dashboard.
   * 
   * Tác động DB:
   * - Lấy tổng: SELECT COUNT(*) FROM comments
   * - Gom nhóm trạng thái: SELECT status, COUNT(*) as count FROM comments GROUP BY status
   */
  async getDashboardMetrics() {
    const total = await this.commentModel.count();
    
    // Raw SQL query bằng Sequelize
    const byStatusRows = await this.commentModel.sequelize!.query(
      `SELECT status, COUNT(*) as count FROM comments GROUP BY status`,
      { type: 'SELECT' as any }
    ) as unknown as Array<{ status: string; count: string }>;

    // CHUYỂN ĐỔI DATA MAPPING
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      byStatus[row.status] = Number(row.count);
    }
    return { total, byStatus };
  }

  /**
   * Kiểm tra bản dịch có bị thiếu/không hoàn chỉnh không.
   *
   * Heuristic: Nếu ngôn ngữ đích là Latin-script (vi, en, es, fr...)
   * mà bản dịch vẫn còn chứa ký tự CJK, Cyrillic, Arabic...
   * → Bản dịch bị thiếu (dịch không hết) → cần dịch lại.
   *
   * Không áp dụng cho ngôn ngữ đích là CJK (zh, ja, ko) hay Cyrillic (ru)
   * vì những ngôn ngữ đó dĩ nhiên có ký tự riêng của chúng.
   */
  private isTranslationIncomplete(translatedContent: string, targetLanguageCode: string): boolean {
    const latinScriptLanguages = ['vi', 'en', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'pl', 'ro', 'tr'];
    if (!latinScriptLanguages.includes(targetLanguageCode)) return false;

    // Nếu bản dịch (sang Latin) còn chứa CJK, Cyrillic, Arabic → bị thiếu
    return /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF\u0600-\u06FF]/.test(translatedContent);
  }

  /**
   * Kiểm tra xem đoạn text có chứa nhiều hơn một Unicode script hay không.
   * Nếu có → đây là đoạn text đa ngôn ngữ.
   *
   * Các script được kiểm tra:
   * - CJK (Trung/Nhật/Hàn): U+4E00–U+9FFF, U+3040–U+30FF, U+AC00–U+D7AF
   * - Cyrillic (Nga, Ukraina...): U+0400–U+04FF
   * - Arabic: U+0600–U+06FF
   * - Devanagari (Hindi...): U+0900–U+097F
   * - Latin (Anh, Việt, Tây Ban Nha...): A-Z, a-z, kèm dấu
   *
   * Logic: Đếm số lượng script khác nhau xuất hiện trong text.
   * Nếu > 1 → đa ngôn ngữ → trả về true.
   */
  private isMultilingual(text: string): boolean {
    const scripts: Record<string, RegExp> = {
      latin:      /[A-Za-zÀ-ÖØ-öø-ÿ\u00C0-\u024F]/,
      cjk:        /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/,
      cyrillic:   /[\u0400-\u04FF]/,
      arabic:     /[\u0600-\u06FF]/,
      devanagari: /[\u0900-\u097F]/,
    };

    const detectedScripts = Object.values(scripts).filter(regex => regex.test(text));
    return detectedScripts.length > 1;
  }
}
