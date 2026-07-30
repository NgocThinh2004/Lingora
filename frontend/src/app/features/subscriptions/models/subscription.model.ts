import type { Post } from '../../posts/models/post.model';

export interface SubscriptionAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface SubscriptionAuthorsPage {
  items: SubscriptionAuthor[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface SubscriptionData {
  authors: SubscriptionAuthor[];
  posts: Post[];
}
