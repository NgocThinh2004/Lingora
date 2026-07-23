import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { RefreshToken } from '../modules/auth/models/refresh-token.model';
import { CategoryTranslation } from '../modules/categories/models/category-translation.model';
import { Category } from '../modules/categories/models/category.model';
import { Language } from '../modules/languages/models/language.model';
import { PostTranslation } from '../modules/posts/models/post-translation.model';
import { Post } from '../modules/posts/models/post.model';
import { Role } from '../modules/users/models/role.model';
import { User } from '../modules/users/models/user.model';
import { Comment } from '../modules/comments/models/comment.model';
import { CommentLike } from '../modules/comments/models/comment-like.model';
import { CommentTranslation } from '../modules/comments/models/comment-translation.model';
import { PostLike } from '../modules/likes/models/post-like.model';

export { RefreshToken, Category, CategoryTranslation, Language, Post, PostTranslation, Role, User, Comment, CommentLike, CommentTranslation, PostLike };

const table = (tableName: string): ClassDecorator =>
  Table({ tableName, timestamps: false, underscored: true, freezeTableName: true }) as ClassDecorator;


@table('translation_attempts')
export class TranslationAttempt extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_translation_id: string;
  @Column({ type: DataType.STRING(50), allowNull: false }) declare provider: string;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 }) declare attempt_order: number;
  @Column({ type: DataType.ENUM('success', 'failed', 'rate_limited', 'timeout'), allowNull: false })
  declare status: 'success' | 'failed' | 'rate_limited' | 'timeout';
  @Column(DataType.TEXT) declare error_message: string | null;
  @Column(DataType.INTEGER.UNSIGNED) declare char_count: number | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare started_at: Date;
  @Column(DataType.DATE) declare finished_at: Date | null;
}


@table('subscriptions')
export class Subscription extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare subscriber_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare author_id: string;
  @Column(DataType.DATE) declare last_viewed_at: Date | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}

export const databaseModels = [
  Role,
  Language,
  User,
  Category,
  CategoryTranslation,
  Post,
  PostTranslation,
  TranslationAttempt,
  Comment,
  CommentTranslation,
  PostLike,
  CommentLike,
  Subscription,
  RefreshToken,
];
