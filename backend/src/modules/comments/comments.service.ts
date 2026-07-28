import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Comment } from './models/comment.model';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { Language } from '../languages/models/language.model';
import { CommentTranslation } from './models/comment-translation.model';
import { CommentLike } from '../likes/models/comment-like.model';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ConfigService } from '@nestjs/config';
import { TranslationProviderService } from '../translations/translation-provider.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment) private commentModel: typeof Comment,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Post) private postModel: typeof Post,
    @InjectModel(Language) private languageModel: typeof Language,
    @InjectModel(CommentTranslation) private commentTranslationModel: typeof CommentTranslation,
    @InjectModel(CommentLike) private commentLikeModel: typeof CommentLike,
    private configService: ConfigService,
    private translationProvider: TranslationProviderService,
  ) {}

  async create(postId: string, userId: string, dto: CreateCommentDto): Promise<Comment | null> {
    const post = await this.postModel.findByPk(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let parentId: string | null = null;
    let replyToUserId: string | null = null;
    let replyToUsername: string | null = null;
    let replyToCommentId: string | null = null;

    if (dto.reply_to_comment_id) {
      const replyTarget = await this.commentModel.findByPk(dto.reply_to_comment_id, {
        include: [{ model: User, as: 'author' }],
      });

      if (!replyTarget) {
        throw new BadRequestException('Reply target comment does not exist');
      }
      if (Number(replyTarget.post_id) !== Number(postId)) {
        throw new BadRequestException('Reply target comment belongs to a different post');
      }

      // Flat thread logic: If target is already a reply, its parent is the root.
      // Otherwise, the target itself is the root.
      parentId = replyTarget.parent_id || replyTarget.id;
      replyToCommentId = replyTarget.id;
      replyToUserId = replyTarget.user_id;
      replyToUsername = replyTarget.author?.display_name || replyTarget.author?.username || null;
    }

    const langCode = dto.languageCode || 'en';
    const language = await this.languageModel.findOne({ where: { code: langCode } });
    const originalLanguageId = language ? language.id : null;

    const comment = await this.commentModel.create({
      post_id: postId,
      user_id: userId,
      parent_id: parentId,
      reply_to_comment_id: replyToCommentId,
      reply_to_user_id: replyToUserId,
      reply_to_username: replyToUsername,
      content: dto.content,
      status: 'approved', // Default, could be pending based on moderation
      original_language_id: originalLanguageId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.postModel.increment('comment_count', { by: 1, where: { id: postId } });

    return this.commentModel.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] }],
    });
  }



  async getCommentsByPost(postId: string, page: number = 1, limit: number = 20, userId?: number) {
    const offset = (page - 1) * limit;

    // Fetch root comments
    // Count all comments for this post (including replies) to return the true total
    const totalCommentsCount = await this.commentModel.count({
      where: { post_id: postId }
    });

    const rootComments = await this.commentModel.findAndCountAll({
      where: { post_id: postId, parent_id: null },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] },
        { model: CommentTranslation, as: 'translations', include: [Language] }
      ],
    });

    const rootCommentIds = rootComments.rows.map((c) => c.id);

    // Fetch replies for these root comments
    const replies = await this.commentModel.findAll({
      where: { parent_id: rootCommentIds },
      order: [['created_at', 'ASC']],
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] },
        { model: CommentTranslation, as: 'translations', include: [Language] }
      ],
    });

    const allCommentIds = [...rootCommentIds, ...replies.map(r => r.id)];
    
    // Batch query user likes (if logged in)
    let userLikes = new Set<string>();
    if (userId && allCommentIds.length) {
      const userLikeRows = await this.commentLikeModel.findAll({
        where: { user_id: userId, comment_id: allCommentIds },
        attributes: ['comment_id'],
      });
      userLikes = new Set(userLikeRows.map((row: any) => String(row.comment_id)));
    }

    const processComment = (comment: Comment) => {
      const json = comment.toJSON() as any;
      json.likeCount = comment.like_count || 0;
      json.liked = userLikes.has(String(comment.id));
      return json;
    };

    // Group replies by parent_id
    const repliesMap = new Map<string, any[]>();
    replies.forEach((reply) => {
      const parentId = reply.parent_id!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(processComment(reply));
    });

    // Attach replies to root comments
    const items = rootComments.rows.map((comment) => {
      const commentJson = processComment(comment);
      commentJson.replies = repliesMap.get(comment.id) || [];
      return commentJson;
    });

    return {
      items,
      total: totalCommentsCount,
      page,
      limit,
      totalPages: Math.ceil(rootComments.count / limit),
    };
  }



  async update(commentId: string, userId: string, content: string) {
    const comment = await this.commentModel.findByPk(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (Number(comment.user_id) !== Number(userId)) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    await comment.update({ content, updated_at: new Date() });

    // Set translations back to queued so they can be re-translated if someone clicks "Translate" again
    await this.commentTranslationModel.update(
      { translation_status: 'queued' },
      { where: { comment_id: commentId } }
    );

    return comment;
  }

  async remove(commentId: string, userId: string, userRole?: string) {
    const comment = await this.commentModel.findByPk(commentId, {
      include: [{ model: Post }]
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const isAuthor = Number(comment.user_id) === Number(userId);
    const isPostAuthor = Number(comment.post.author_id) === Number(userId);
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isPostAuthor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    await comment.destroy();
    
    await this.postModel.decrement('comment_count', { by: 1, where: { id: comment.post_id } });

    return { success: true };
  }

  async translate(commentId: string, languageCode: string) {
    const language = await this.languageModel.findOne({ where: { code: languageCode } });
    if (!language) throw new BadRequestException('Language not found');

    let translation = await this.commentTranslationModel.findOne({
      where: { comment_id: commentId, language_id: language.id },
      include: [Language]
    });

    const comment = await this.commentModel.findByPk(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    if (!translation) {
      translation = await this.commentTranslationModel.create({
        comment_id: commentId,
        language_id: language.id,
        content: comment.content,
        translation_status: 'queued'
      });
    }

    if (translation.translation_status === 'failed' || translation.translation_status === 'not_started' || translation.translation_status === 'queued') {
      await translation.update({ translation_status: 'processing' });
      try {
        const sourceLanguage = comment.original_language_id 
          ? await this.languageModel.findByPk(comment.original_language_id)
          : null;
        const sourceLanguageCode = sourceLanguage ? sourceLanguage.code : 'en';

        const request = {
          title: '', // Comments don't have titles
          content: comment.content,
          sourceLanguageCode: sourceLanguageCode,
          targetLanguageCode: languageCode,
        };

        const providerOrderStr = this.configService.get<string>('TRANSLATION_PROVIDER_ORDER') ||
                                 this.configService.get<string>('TRANSLATION_PROVIDER') || 'google,libretranslate,deepl';
        const providers = providerOrderStr.split(',').map(p => p.trim()).filter(Boolean);

        let success = false;
        let translatedText = '';

        for (const provider of providers) {
          const result = await this.translationProvider.translate(provider, request);
          if (result.ok) {
            translatedText = result.content;
            success = true;
            break;
          }
        }

        if (success) {
          await translation.update({ content: translatedText, translation_status: 'completed' });
        } else {
          await translation.update({ translation_status: 'failed' });
        }
      } catch (e) {
        await translation.update({ translation_status: 'failed' });
      }
    }

    return this.commentTranslationModel.findByPk(translation.id, { include: [Language] });
  }

  async getDashboardMetrics() {
    const total = await this.commentModel.count();
    const byStatusRows = await this.commentModel.sequelize!.query(
      `SELECT status, COUNT(*) as count FROM comments GROUP BY status`,
      { type: 'SELECT' as any }
    ) as unknown as Array<{ status: string; count: string }>;

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      byStatus[row.status] = Number(row.count);
    }
    return { total, byStatus };
  }
}
