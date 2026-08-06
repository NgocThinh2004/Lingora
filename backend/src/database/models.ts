import { RefreshToken } from '../modules/auth/models/refresh-token.model';
import { CategoryTranslation } from '../modules/categories/models/category-translation.model';
import { Category } from '../modules/categories/models/category.model';
import { Comment } from '../modules/comments/models/comment.model';
import { CommentTranslation } from '../modules/comments/models/comment-translation.model';
import { Language } from '../modules/languages/models/language.model';
import { CommentLike } from '../modules/likes/models/comment-like.model';
import { PostLike } from '../modules/likes/models/post-like.model';
import { PostTranslation } from '../modules/posts/models/post-translation.model';
import { Post } from '../modules/posts/models/post.model';
import { Subscription } from '../modules/subscriptions/models/subscription.model';
import { Role } from '../modules/users/models/role.model';
import { User } from '../modules/users/models/user.model';
import { MediaAsset } from '../modules/uploads/models/media-asset.model';

export {
  Category,
  CategoryTranslation,
  Comment,
  CommentTranslation,
  CommentLike,
  Language,
  Post,
  PostLike,
  PostTranslation,
  RefreshToken,
  Role,
  Subscription,
  User,
  MediaAsset,
};

export const databaseModels = [
  Role,
  Language,
  User,
  Category,
  CategoryTranslation,
  Post,
  PostTranslation,
  Comment,
  CommentTranslation,
  PostLike,
  CommentLike,
  Subscription,
  RefreshToken,
  MediaAsset,
];
