import type { Post } from '../../posts/models/post.model';

export interface SubscriptionAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface SubscriptionData {
  authors: SubscriptionAuthor[];
  posts: Post[];
}
