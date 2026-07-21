import { Column, DataType, Model, Table } from 'sequelize-typescript';

const table = (tableName: string): ClassDecorator =>
  Table({ tableName, timestamps: false, underscored: true, freezeTableName: true }) as ClassDecorator;

@table('roles')
export class Role extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: number;
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true }) declare name: string;
}

@table('languages')
export class Language extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: number;
  @Column({ type: DataType.STRING(10), allowNull: false, unique: true }) declare code: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) declare name: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) declare native_name: string;
  @Column(DataType.STRING(5)) declare flag_code: string | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false }) declare is_default: boolean;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) declare is_active: boolean;
}

@table('users')
export class User extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.STRING(150), allowNull: false, unique: true }) declare username: string;
  @Column(DataType.STRING(150)) declare display_name: string | null;
  @Column({ type: DataType.STRING(150), allowNull: false, unique: true }) declare email: string;
  @Column({ type: DataType.STRING(255), allowNull: false }) declare password: string;
  @Column(DataType.STRING(255)) declare avatar: string | null;
  @Column(DataType.TEXT) declare bio: string | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare role_id: number;
  @Column({ type: DataType.ENUM('active', 'inactive', 'banned'), allowNull: false, defaultValue: 'active' })
  declare status: 'active' | 'inactive' | 'banned';
  @Column(DataType.STRING(255)) declare password_reset_otp_hash: string | null;
  @Column(DataType.DATE) declare password_reset_expires_at: Date | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare password_reset_attempts: number;
  @Column(DataType.DATE) declare password_reset_sent_at: Date | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
  @Column({ type: DataType.DATE, allowNull: false }) declare updated_at: Date;
  @Column(DataType.DATE) declare deleted_at: Date | null;
}

@table('categories')
export class Category extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: number;
  @Column({ type: DataType.STRING(150), allowNull: false, unique: true }) declare slug: string;
  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'active' }) declare status: string;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
  @Column({ type: DataType.DATE, allowNull: false }) declare updated_at: Date;
}

@table('category_translations')
export class CategoryTranslation extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare category_id: number;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare language_id: number;
  @Column({ type: DataType.STRING(150), allowNull: false }) declare name: string;
  @Column({ type: DataType.STRING(150), allowNull: false }) declare slug: string;
}

@table('posts')
export class Post extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare author_id: string;
  @Column(DataType.INTEGER.UNSIGNED) declare category_id: number | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare original_language_id: number;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }) declare view_count: number;
  @Column({
    type: DataType.ENUM('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  })
  declare status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';
  @Column(DataType.TEXT) declare review_note: string | null;
  @Column(DataType.DATE) declare published_at: Date | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
  @Column({ type: DataType.DATE, allowNull: false }) declare updated_at: Date;
  @Column(DataType.DATE) declare deleted_at: Date | null;
}

@table('post_translations')
export class PostTranslation extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_id: string;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare language_id: number;
  @Column(DataType.STRING(255)) declare title: string | null;
  @Column(DataType.STRING(200)) declare slug: string | null;
  @Column(DataType.TEXT) declare summary: string | null;
  @Column(DataType.TEXT('long')) declare content: string | null;
  @Column({
    type: DataType.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'not_started',
  })
  declare translation_status: 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';
  @Column(DataType.STRING(50)) declare translation_provider: string | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
  @Column({ type: DataType.DATE, allowNull: false }) declare updated_at: Date;
}

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

@table('comments')
export class Comment extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare user_id: string;
  @Column(DataType.BIGINT.UNSIGNED) declare parent_id: string | null;
  @Column(DataType.BIGINT.UNSIGNED) declare reply_to_comment_id: string | null;
  @Column(DataType.BIGINT.UNSIGNED) declare reply_to_user_id: string | null;
  @Column(DataType.STRING(150)) declare reply_to_username: string | null;
  @Column({ type: DataType.TEXT, allowNull: false }) declare content: string;
  @Column({ type: DataType.ENUM('pending', 'approved', 'rejected', 'hidden'), allowNull: false, defaultValue: 'approved' })
  declare status: 'pending' | 'approved' | 'rejected' | 'hidden';
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
  @Column({ type: DataType.DATE, allowNull: false }) declare updated_at: Date;
}

@table('post_likes')
export class PostLike extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare user_id: string;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}

@table('comment_likes')
export class CommentLike extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare comment_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare user_id: string;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}

@table('subscriptions')
export class Subscription extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare subscriber_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare author_id: string;
  @Column(DataType.DATE) declare last_viewed_at: Date | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}

@table('refresh_tokens')
export class RefreshToken extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare user_id: string;
  @Column({ type: DataType.STRING(255), allowNull: false, unique: true }) declare token_hash: string;
  @Column(DataType.STRING(255)) declare device_info: string | null;
  @Column(DataType.STRING(45)) declare ip_address: string | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare expires_at: Date;
  @Column(DataType.DATE) declare last_used_at: Date | null;
  @Column(DataType.DATE) declare revoked_at: Date | null;
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
  PostLike,
  CommentLike,
  Subscription,
  RefreshToken,
];
