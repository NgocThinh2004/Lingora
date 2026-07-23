import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Comment } from './models/comment.model';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { Language } from '../languages/models/language.model';
import { CommentTranslation } from './models/comment-translation.model';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment) private commentModel: typeof Comment,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Post) private postModel: typeof Post,
    @InjectModel(Language) private languageModel: typeof Language,
    @InjectModel(CommentTranslation) private commentTranslationModel: typeof CommentTranslation,
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

    if (originalLanguageId) {
      // Background translation job
      this.triggerBackgroundTranslation(comment.id, originalLanguageId, dto.content);
    }

    return this.commentModel.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar'] }],
    });
  }

  private async triggerBackgroundTranslation(commentId: string, originalLanguageId: number, content: string) {
    try {
      const targetLanguages = await this.languageModel.findAll({
        where: { is_active: true }
      });

      const translationsToCreate = targetLanguages
        .filter(lang => lang.id !== originalLanguageId)
        .map(lang => ({
          comment_id: commentId,
          language_id: lang.id,
          content: content, // Temporary content
          translation_status: 'queued' as const,
        }));

      if (translationsToCreate.length > 0) {
        await this.commentTranslationModel.bulkCreate(translationsToCreate);

        // Simulate background processing
        setTimeout(async () => {
          for (const target of translationsToCreate) {
            try {
              // Simulated translation (mock)
              const translatedText = `[Translated to lang ${target.language_id}]: ${content}`;
              await this.commentTranslationModel.update(
                { content: translatedText, translation_status: 'completed' },
                { where: { comment_id: commentId, language_id: target.language_id } }
              );
            } catch (e) {
              await this.commentTranslationModel.update(
                { translation_status: 'failed' },
                { where: { comment_id: commentId, language_id: target.language_id } }
              );
            }
          }
        }, 3000); // 3 seconds simulated delay
      }
    } catch (error) {
      console.error('Background translation failed to trigger', error);
    }
  }

  async getCommentsByPost(postId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    // Fetch root comments
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

    // Group replies by parent_id
    const repliesMap = new Map<string, Comment[]>();
    replies.forEach((reply) => {
      const parentId = reply.parent_id!;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(reply);
    });

    // Attach replies to root comments
    const items = rootComments.rows.map((comment) => {
      const commentJson = comment.toJSON();
      commentJson.replies = repliesMap.get(comment.id) || [];
      return commentJson;
    });

    return {
      items,
      total: rootComments.count,
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

    // Set translations back to queued
    await this.commentTranslationModel.update(
      { translation_status: 'queued' },
      { where: { comment_id: commentId } }
    );

    // Retrigger background translation for queued
    if (comment.original_language_id) {
      this.triggerBackgroundTranslation(comment.id, comment.original_language_id, content);
    }

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
      // Simulate translation
      setTimeout(async () => {
        try {
          const translatedText = `[Manual Translation to ${languageCode}]: ${comment.content}`;
          await translation.update({ content: translatedText, translation_status: 'completed' });
        } catch (e) {
          await translation.update({ translation_status: 'failed' });
        }
      }, 2000);
    }

    return this.commentTranslationModel.findByPk(translation.id, { include: [Language] });
  }
}
