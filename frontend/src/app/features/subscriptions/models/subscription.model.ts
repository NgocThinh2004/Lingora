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

export interface SubscriptionAuthorView { 
  id: string; 
  username: string; 
  name: string; 
  displayName?: string; 
  role: string; 
  avatar: string; 
  avatarUrl?: string; 
  bio?: string; 
}
